package com.example.moneyjar.data.remote

import com.example.moneyjar.auth.SessionManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp interceptor that adds Bearer token to authenticated requests
 */
class AuthInterceptor(
    private val sessionManager: SessionManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Skip auth for endpoints that don't require authentication
        val path = originalRequest.url.encodedPath
        if (path.contains("/auth/google") && originalRequest.method == "POST") {
            // Google login endpoint doesn't need Bearer token
            return chain.proceed(originalRequest)
        }

        // Add Bearer token to other requests
        val token = runBlocking { sessionManager.getAccessToken() }

        return if (token != null) {
            val newRequest = originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
            chain.proceed(newRequest)
        } else {
            chain.proceed(originalRequest)
        }
    }
}
