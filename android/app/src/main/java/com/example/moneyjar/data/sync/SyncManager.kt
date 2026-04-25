package com.example.moneyjar.data.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.example.moneyjar.auth.SessionManager
import com.example.moneyjar.data.local.TransactionDao
import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.OwnerType
import com.example.moneyjar.data.model.SyncState
import com.example.moneyjar.data.remote.CreateTransactionRequest
import com.example.moneyjar.data.remote.TransactionApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * SyncManager orchestrates synchronization between local Room database
 * and backend transaction API
 */
class SyncManager(
    private val context: Context,
    private val transactionDao: TransactionDao,
    private val transactionApi: TransactionApi,
    private val sessionManager: SessionManager
) {

    companion object {
        const val SYNC_WORK_NAME = "transaction_sync"
        private val ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME
    }

    /**
     * Schedule background sync work
     * Uses WorkManager with network constraint (design decision 2B)
     */
    fun scheduleSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                SYNC_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                syncRequest
            )
    }

    /**
     * Sync all pending transactions
     * Called by WorkManager worker
     */
    suspend fun syncPendingTransactions(accessToken: String): SyncResult = withContext(Dispatchers.IO) {
        check(accessToken.isNotBlank()) { "Access token is required for sync." }
        val pendingTransactions = transactionDao.getTransactionsForSync(
            listOf(SyncState.UNSYNCED, SyncState.FAILED)
        )

        if (pendingTransactions.isEmpty()) {
            return@withContext SyncResult(0, 0)
        }

        var syncedCount = 0
        var failedCount = 0

        for (transaction in pendingTransactions) {
            try {
                // Update state to PENDING
                transactionDao.updateSyncState(
                    transaction.id,
                    SyncState.PENDING,
                    null,
                    null
                )

                // Convert to API request
                val request = CreateTransactionRequest(
                    type = transaction.type.name.lowercase(),
                    amount = transaction.amount,
                    category = transaction.category,
                    note = transaction.note.takeIf { it.isNotBlank() },
                    created_at = transaction.createdAt.format(ISO_FORMATTER)
                )

                // AuthInterceptor attaches the Bearer token for protected transaction APIs.
                val response = transactionApi.createTransaction(request)

                if (response.isSuccessful) {
                    val remoteId = response.body()?.id
                    transactionDao.updateSyncState(
                        transaction.id,
                        SyncState.SYNCED,
                        remoteId,
                        null
                    )
                    syncedCount++
                } else {
                    val error = response.errorBody()?.string() ?: "Unknown error"
                    transactionDao.updateSyncState(
                        transaction.id,
                        SyncState.FAILED,
                        null,
                        error
                    )
                    failedCount++
                }
            } catch (e: Exception) {
                transactionDao.updateSyncState(
                    transaction.id,
                    SyncState.FAILED,
                    null,
                    e.message
                )
                failedCount++
            }
        }

        SyncResult(syncedCount, failedCount)
    }

    /**
     * Claim anonymous transactions for authenticated user
     * Called after successful login
     */
    suspend fun claimAnonymousTransactions(userId: String) = withContext(Dispatchers.IO) {
        transactionDao.claimAnonymousTransactions(
            previousOwnerType = OwnerType.ANONYMOUS,
            previousSyncState = SyncState.UNSYNCED,
            ownerType = OwnerType.AUTHENTICATED,
            ownerId = userId,
            syncState = SyncState.PENDING
        )
    }

    /**
     * Get sync status summary
     */
    suspend fun getSyncStatus(): Map<SyncState, Int> = withContext(Dispatchers.IO) {
        SyncState.entries.associateWith { state ->
            transactionDao.countBySyncState(state)
        }
    }
}

/**
 * Result of a sync operation
 */
data class SyncResult(
    val syncedCount: Int,
    val failedCount: Int
) {
    val isSuccess: Boolean get() = failedCount == 0
}
