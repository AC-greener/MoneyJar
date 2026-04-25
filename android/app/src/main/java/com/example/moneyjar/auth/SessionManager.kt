package com.example.moneyjar.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "session")

/**
 * Manages session storage using DataStore
 * Stores access token, refresh token, and user info
 */
class SessionManager(private val context: Context) {

    companion object {
        private val ACCESS_TOKEN_KEY = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val USER_EMAIL_KEY = stringPreferencesKey("user_email")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
        private val USER_AVATAR_KEY = stringPreferencesKey("user_avatar")
        private val USER_PLAN_KEY = stringPreferencesKey("user_plan")
    }

    /**
     * Flow of current access token
     */
    val accessToken: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[ACCESS_TOKEN_KEY]
    }

    /**
     * Flow of current refresh token
     */
    val refreshToken: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[REFRESH_TOKEN_KEY]
    }

    /**
     * Flow of current user info
     */
    val userInfo: Flow<UserInfo?> = context.dataStore.data.map { prefs ->
        val id = prefs[USER_ID_KEY]
        val email = prefs[USER_EMAIL_KEY]
        val name = prefs[USER_NAME_KEY]
        if (id != null && email != null && name != null) {
            UserInfo(
                id = id,
                email = email,
                name = name,
                avatarUrl = prefs[USER_AVATAR_KEY],
                plan = prefs[USER_PLAN_KEY] ?: "free"
            )
        } else {
            null
        }
    }

    /**
     * Check if user is logged in
     */
    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[ACCESS_TOKEN_KEY] != null && prefs[REFRESH_TOKEN_KEY] != null
    }

    /**
     * Get current access token synchronously
     */
    suspend fun getAccessToken(): String? {
        return context.dataStore.data.first()[ACCESS_TOKEN_KEY]
    }

    /**
     * Get current refresh token synchronously
     */
    suspend fun getRefreshToken(): String? {
        return context.dataStore.data.first()[REFRESH_TOKEN_KEY]
    }

    /**
     * Save session after successful login
     */
    suspend fun saveSession(loginResponse: LoginResponse) {
        context.dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN_KEY] = loginResponse.access_token
            prefs[REFRESH_TOKEN_KEY] = loginResponse.refresh_token
            prefs[USER_ID_KEY] = loginResponse.user.id
            prefs[USER_EMAIL_KEY] = loginResponse.user.email
            prefs[USER_NAME_KEY] = loginResponse.user.name
            loginResponse.user.avatarUrl?.let { prefs[USER_AVATAR_KEY] = it }
            prefs[USER_PLAN_KEY] = loginResponse.user.plan
        }
    }

    /**
     * Update tokens after refresh
     */
    suspend fun updateTokens(accessToken: String, refreshToken: String) {
        context.dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN_KEY] = accessToken
            prefs[REFRESH_TOKEN_KEY] = refreshToken
        }
    }

    /**
     * Clear session on logout
     */
    suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
