package com.example.moneyjar.auth

import kotlinx.serialization.json.JsonObject
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * Retrofit API interface for backend auth endpoints
 */
interface AuthApi {

    /**
     * POST /api/auth/google
     * Native Google login - exchange Google ID Token for backend tokens
     */
    @POST("api/auth/google")
    suspend fun googleLogin(
        @Body body: GoogleLoginRequest
    ): Response<LoginResponse>

    /**
     * POST /api/auth/refresh
     * Refresh access token using refresh token
     */
    @POST("api/auth/refresh")
    suspend fun refreshToken(
        @Body body: RefreshRequest
    ): Response<RefreshResponse>

    /**
     * POST /api/auth/logout
     * Logout and revoke refresh token
     */
    @POST("api/auth/logout")
    suspend fun logout(
        @Body body: LogoutRequest
    ): Response<LogoutResponse>

    /**
     * GET /api/auth/me
     * Get current user info (requires Bearer token)
     */
    @GET("api/auth/me")
    suspend fun getCurrentUser(): Response<UserInfo>
}

/**
 * Request body for Google login
 */
@kotlinx.serialization.Serializable
data class GoogleLoginRequest(
    val id_token: String,
)

/**
 * Request body for token refresh
 */
@kotlinx.serialization.Serializable
data class RefreshRequest(
    val refresh_token: String,
)

/**
 * Request body for logout
 */
@kotlinx.serialization.Serializable
data class LogoutRequest(
    val refresh_token: String,
)

/**
 * Response for logout
 */
@kotlinx.serialization.Serializable
data class LogoutResponse(
    val message: String,
)
