package com.example.moneyjar.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.example.moneyjar.BuildConfig
import com.example.moneyjar.auth.SessionManager
import com.example.moneyjar.data.local.MoneyJarDatabase
import com.example.moneyjar.data.remote.AuthInterceptor
import com.example.moneyjar.data.remote.TransactionApi
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import kotlinx.serialization.json.Json
import java.util.concurrent.TimeUnit

/**
 * WorkManager Worker for background transaction sync
 * Runs when network is available (design decision 2B - background sync)
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val sessionManager = SessionManager(applicationContext)

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(AuthInterceptor(sessionManager))
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.BACKEND_URL)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    private val transactionApi = retrofit.create(TransactionApi::class.java)
    private val database = MoneyJarDatabase.getInstance(applicationContext)
    private val syncManager = SyncManager(
        applicationContext,
        database.transactionDao(),
        transactionApi,
        sessionManager
    )

    override suspend fun doWork(): Result {
        return try {
            val accessToken = sessionManager.getAccessToken()
            if (accessToken == null) {
                // Not authenticated, skip sync
                return Result.success()
            }

            val result = syncManager.syncPendingTransactions(accessToken)

            if (result.isSuccess) {
                Result.success()
            } else if (runAttemptCount < 3) {
                // Retry on failure
                Result.retry()
            } else {
                Result.failure()
            }
        } catch (e: Exception) {
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }
}
