package com.example.moneyjar.auth

import android.content.Context
import android.content.Intent
import android.util.Log
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

    private companion object {
        const val TAG = "MoneyJarAuth"
    }

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
        Log.d(
            TAG,
            "AuthManager initialized backendUrl=$backendUrl googleClientId=${BuildConfig.GOOGLE_CLIENT_ID.maskClientId()}"
        )
        viewModelScope.launch {
            initializeAuthState()
        }
    }

    private suspend fun initializeAuthState() {
        val user = sessionManager.userInfo.first()
        val accessToken = sessionManager.getAccessToken()
        if (user != null && accessToken != null) {
            Log.d(TAG, "Restored authenticated session user=${user.email.maskEmail()} hasAccessToken=true")
            _authState.value = AuthState.Authenticated(user, accessToken)
        } else {
            Log.d(TAG, "No saved authenticated session found")
            _authState.value = AuthState.Unauthenticated
        }
    }

    fun configureGoogleSignIn(serverClientId: String = BuildConfig.GOOGLE_CLIENT_ID): GoogleSignInClient {
        require(serverClientId.isNotBlank()) {
            "Missing MONEYJAR_GOOGLE_CLIENT_ID Gradle property for Android Google sign-in"
        }
        if (googleSignInClient == null) {
            Log.d(TAG, "Creating GoogleSignInClient serverClientId=${serverClientId.maskClientId()}")
            val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestIdToken(serverClientId)
                .build()

            googleSignInClient = GoogleSignIn.getClient(context, gso)
        } else {
            Log.d(TAG, "Reusing GoogleSignInClient")
        }
        return googleSignInClient!!
    }

    fun getGoogleSignInIntent(): Intent {
        Log.d(TAG, "Launching Google sign-in intent")
        return configureGoogleSignIn().signInIntent
    }

    suspend fun handleGoogleSignInIntent(data: Intent?): AuthResult {
        if (data == null) {
            val error = AuthResult.Error("NO_RESULT_DATA", "Google sign-in returned no data")
            Log.w(TAG, "Google sign-in returned null intent data")
            _authState.value = AuthState.Error(error.message)
            return error
        }

        Log.d(TAG, "Handling Google sign-in result data action=${data.action}")
        return try {
            val account = GoogleSignIn.getSignedInAccountFromIntent(data)
                .getResult(ApiException::class.java)
            Log.d(
                TAG,
                "Google sign-in account parsed email=${account.email.maskEmail()} hasIdToken=${account.idToken != null}"
            )
            exchangeGoogleToken(account)
        } catch (e: ApiException) {
            val error = AuthResult.Error(
                "GOOGLE_SIGN_IN_FAILED",
                e.localizedMessage ?: "Google sign in failed"
            )
            Log.w(
                TAG,
                "Google sign-in failed statusCode=${e.statusCode} status=${e.status} message=${e.localizedMessage}",
                e
            )
            _authState.value = AuthState.Error(error.message)
            error
        }
    }

    suspend fun signInWithGoogle(idToken: String): AuthResult {
        Log.d(TAG, "Exchanging Google ID token with backend tokenLength=${idToken.length}")
        return try {
            val response = authApi.googleLogin(GoogleLoginRequest(idToken))
            Log.d(TAG, "Backend google login response code=${response.code()} successful=${response.isSuccessful}")
            if (response.isSuccessful) {
                val body = response.body()
                if (body == null) {
                    val error = AuthResult.Error("EMPTY_BACKEND_RESPONSE", "Backend login response body is empty")
                    Log.e(TAG, "Backend google login returned empty body")
                    _authState.value = AuthState.Error(error.message)
                    return error
                }
                sessionManager.saveSession(body)
                Log.d(TAG, "Backend login succeeded user=${body.user.email.maskEmail()}")
                _authState.value = AuthState.Authenticated(body.user, body.access_token)
                AuthResult.Success(body.user, body.access_token)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                val error = AuthResult.Error("BACKEND_LOGIN_FAILED", errorBody)
                Log.w(TAG, "Backend google login failed code=${response.code()} body=$errorBody")
                _authState.value = AuthState.Error(error.message)
                error
            }
        } catch (e: Exception) {
            val error = AuthResult.Error("NETWORK_ERROR", e.message ?: "Network error")
            Log.e(TAG, "Backend google login request failed", e)
            _authState.value = AuthState.Error(error.message)
            error
        }
    }

    private suspend fun exchangeGoogleToken(account: GoogleSignInAccount?): AuthResult {
        if (account == null) {
            val error = AuthResult.Error("NO_ACCOUNT", "No Google account")
            Log.w(TAG, "Google sign-in account is null")
            _authState.value = AuthState.Error(error.message)
            return error
        }
        val idToken = account.idToken
        if (idToken == null) {
            val error = AuthResult.Error("NO_ID_TOKEN", "No ID token")
            Log.w(TAG, "Google account has no ID token email=${account.email.maskEmail()}")
            _authState.value = AuthState.Error(error.message)
            return error
        }
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
        Log.w(TAG, "Configuration error: $message")
        _authState.value = AuthState.Error(message)
    }

    fun setLoginError(message: String) {
        Log.w(TAG, "Login error: $message")
        _authState.value = AuthState.Error(message)
    }

    fun logout() {
        viewModelScope.launch {
            try {
                val refreshToken = sessionManager.getRefreshToken()
                if (refreshToken != null) {
                    try {
                        Log.d(TAG, "Calling backend logout")
                        authApi.logout(LogoutRequest(refreshToken))
                    } catch (e: Exception) {
                        Log.w(TAG, "Backend logout request failed; clearing local session anyway", e)
                    }
                }
            } finally {
                sessionManager.clearSession()
                googleSignInClient?.signOut()
                Log.d(TAG, "Local session cleared and Google client signed out")
                _authState.value = AuthState.Unauthenticated
            }
        }
    }

    fun isAuthenticated(): Boolean = _authState.value is AuthState.Authenticated

    fun getCurrentUser(): UserInfo? = (_authState.value as? AuthState.Authenticated)?.user

    suspend fun getAccessToken(): String? = sessionManager.getAccessToken()
}

private fun String?.maskEmail(): String {
    if (this.isNullOrBlank()) return "<missing>"
    val parts = split("@", limit = 2)
    if (parts.size != 2) return "<redacted>"
    val name = parts[0]
    val visiblePrefix = name.take(2)
    return "$visiblePrefix***@${parts[1]}"
}

private fun String.maskClientId(): String =
    if (length <= 16) "<redacted>" else "${take(8)}...${takeLast(12)}"

class AuthManagerFactory(
    private val context: Context,
    private val sessionManager: SessionManager = SessionManager(context),
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthManager::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AuthManager(context, sessionManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
