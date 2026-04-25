package com.example.moneyjar.data.remote

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit API interface for backend transaction endpoints
 * All endpoints require Bearer token authentication
 */
interface TransactionApi {

    /**
     * POST /api/transactions
     * Create a new transaction
     */
    @POST("api/transactions")
    suspend fun createTransaction(
        @Body body: CreateTransactionRequest
    ): Response<TransactionResponse>

    /**
     * GET /api/transactions
     * Get transaction list or summary
     */
    @GET("api/transactions")
    suspend fun getTransactions(
        @Query("period") period: String? = null
    ): Response<List<TransactionResponse>>

    /**
     * GET /api/transactions/{id}
     * Get single transaction by ID
     */
    @GET("api/transactions/{id}")
    suspend fun getTransaction(
        @Path("id") id: Long
    ): Response<TransactionResponse>

    /**
     * DELETE /api/transactions/{id}
     * Soft delete a transaction
     */
    @DELETE("api/transactions/{id}")
    suspend fun deleteTransaction(
        @Path("id") id: Long
    ): Response<MessageResponse>
}

/**
 * Request body for creating a transaction
 */
@Serializable
data class CreateTransactionRequest(
    val type: String,           // "income" or "expense"
    val amount: Double,
    val category: String,
    val note: String? = null,
    val created_at: String? = null  // ISO datetime string
)

/**
 * Response body for a transaction
 */
@Serializable
data class TransactionResponse(
    val id: Long,
    val type: String,
    val amount: Double,
    val category: String,
    val note: String?,
    val createdAt: String
)

/**
 * Simple message response
 */
@Serializable
data class MessageResponse(
    val message: String
)
