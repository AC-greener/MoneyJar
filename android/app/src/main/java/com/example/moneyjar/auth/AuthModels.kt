package com.example.moneyjar.auth

import kotlinx.serialization.Serializable

/**
 * Google Sign-In ID Token response
 */
@Serializable
data class GoogleSignInResult(
    val idToken: String,
    val displayName: String?,
    val email: String?,
    val photoUrl: String?,
)

/**
 * Backend login response
 */
@Serializable
data class LoginResponse(
    val access_token: String,
    val refresh_token: String,
    val user: UserInfo,
)

/**
 * Token refresh response
 */
@Serializable
data class RefreshResponse(
    val access_token: String,
    val refresh_token: String,
)

/**
 * User information from backend
 */
@Serializable
data class UserInfo(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String?,
    val plan: String = "free",
)

/**
 * Authentication state
 */
sealed class AuthState {
    data object Unauthenticated : AuthState()
    data object Loading : AuthState()
    data class Authenticated(val user: UserInfo, val accessToken: String) : AuthState()
    data class Error(val message: String) : AuthState()
}

/**
 * Auth result for login operations
 */
sealed class AuthResult {
    data class Success(val user: UserInfo, val accessToken: String) : AuthResult()
    data class Error(val code: String, val message: String) : AuthResult()
}
