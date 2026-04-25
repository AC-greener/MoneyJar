package com.example.moneyjar.auth

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.moneyjar.BuildConfig
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

/**
 * Authentication manager for the Android app
 * Handles Google Sign-In, backend authentication, token refresh, and logout
 */
class AuthManager(
    private val context: Context,
    private val sessionManager: SessionManager,
    private val backendUrl: String = BuildConfig.BACKEND_URL
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private var googleSignInClient: GoogleSignInClient? = null

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .build()
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(backendUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    private val authApi: AuthApi by lazy {
        retrofit.create(AuthApi::class.java)
    }

    init {
        viewModelScope.launch {
            initializeAuthState()
        }
    }

    private suspend fun initializeAuthState() {
        val user = sessionManager.userInfo.first()
        val accessToken = sessionManager.getAccessToken()
        if (user != null && accessToken != null) {
            _authState.value = AuthState.Authenticated(user, accessToken)
        } else {
            _authState.value = AuthState.Unauthenticated
        }
    }

    fun configureGoogleSignIn(serverClientId: String = BuildConfig.GOOGLE_CLIENT_ID): GoogleSignInClient {
        require(serverClientId.isNotBlank()) {
            "Missing MONEYJAR_GOOGLE_CLIENT_ID Gradle property for Android Google sign-in"
        }
        if (googleSignInClient == null) {
            val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestIdToken(serverClientId)
                .build()

            googleSignInClient = GoogleSignIn.getClient(context, gso)
        }
        return googleSignInClient!!
    }

    fun getGoogleSignInIntent() = configureGoogleSignIn().signInIntent

    suspend fun handleGoogleSignInIntent(data: Intent?): AuthResult {
        if (data == null) {
            val error = AuthResult.Error("NO_RESULT_DATA", "Google sign-in returned no data")
            _authState.value = AuthState.Error(error.message)
            return error
        }

        return try {
            val account = GoogleSignIn.getSignedInAccountFromIntent(data)
                .getResult(ApiException::class.java)
            exchangeGoogleToken(account)
        } catch (e: ApiException) {
            val error = AuthResult.Error(
                "GOOGLE_SIGN_IN_FAILED",
                e.localizedMessage ?: "Google sign in failed"
            )
            _authState.value = AuthState.Error(error.message)
            error
        }
    }

    suspend fun signInWithGoogle(idToken: String): AuthResult {
        return try {
            val response = authApi.googleLogin(GoogleLoginRequest(idToken))
            if (response.isSuccessful) {
                val body = response.body()!!
                sessionManager.saveSession(body)
                _authState.value = AuthState.Authenticated(body.user, body.access_token)
                AuthResult.Success(body.user, body.access_token)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                val error = AuthResult.Error("BACKEND_LOGIN_FAILED", errorBody)
                _authState.value = AuthState.Error(error.message)
                error
            }
        } catch (e: Exception) {
            val error = AuthResult.Error("NETWORK_ERROR", e.message ?: "Network error")
            _authState.value = AuthState.Error(error.message)
            error
        }
    }

    private suspend fun exchangeGoogleToken(account: GoogleSignInAccount?): AuthResult {
        if (account == null) {
            return AuthResult.Error("NO_ACCOUNT", "No Google account")
        }
        val idToken = account.idToken ?: return AuthResult.Error("NO_ID_TOKEN", "No ID token")
        return signInWithGoogle(idToken)
    }

    suspend fun refreshAccessToken(): AuthResult {
        val refreshToken = sessionManager.getRefreshToken()
            ?: return AuthResult.Error("NO_REFRESH_TOKEN", "No refresh token")

        return try {
            val response = authApi.refreshToken(RefreshRequest(refreshToken))
            if (response.isSuccessful) {
                val body = response.body()!!
                sessionManager.updateTokens(body.access_token, body.refresh_token)
                val user = sessionManager.userInfo.first()
                if (user != null) {
                    _authState.value = AuthState.Authenticated(user, body.access_token)
                    AuthResult.Success(user, body.access_token)
                } else {
                    AuthResult.Error("NO_USER", "No user info")
                }
            } else {
                sessionManager.clearSession()
                _authState.value = AuthState.Unauthenticated
                AuthResult.Error("REFRESH_FAILED", "Token refresh failed")
            }
        } catch (e: Exception) {
            AuthResult.Error("NETWORK_ERROR", e.message ?: "Network error")
        }
    }

    suspend fun getValidAccessToken(): String? {
        return sessionManager.getAccessToken()
    }

    fun setConfigurationError(message: String) {
        _authState.value = AuthState.Error(message)
    }

    fun logout() {
        viewModelScope.launch {
            try {
                val refreshToken = sessionManager.getRefreshToken()
                if (refreshToken != null) {
                    try {
                        authApi.logout(LogoutRequest(refreshToken))
                    } catch (e: Exception) {
                        // Ignore network errors on logout
                    }
                }
            } finally {
                sessionManager.clearSession()
                googleSignInClient?.signOut()
                _authState.value = AuthState.Unauthenticated
            }
        }
    }

    fun isAuthenticated(): Boolean = _authState.value is AuthState.Authenticated

    fun getCurrentUser(): UserInfo? = (_authState.value as? AuthState.Authenticated)?.user

    suspend fun getAccessToken(): String? = sessionManager.getAccessToken()
}

class AuthManagerFactory(
    private val context: Context
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthManager::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AuthManager(context, SessionManager(context)) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
