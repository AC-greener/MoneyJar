package com.example.moneyjar.data.repository

import com.example.moneyjar.data.local.TransactionDao
import com.example.moneyjar.data.model.CategorySummary
import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.OwnerType
import com.example.moneyjar.data.model.PeriodSummary
import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.model.SyncState
import com.example.moneyjar.data.model.TransactionDraft
import com.example.moneyjar.data.model.TransactionType
import com.example.moneyjar.data.remote.VoiceCommittedTransactionResponse
import com.example.moneyjar.data.remote.toLocalTransaction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate

/**
 * Room-based implementation of TransactionRepository
 * Persists transactions locally using Room Database
 */
class RoomTransactionRepository(
    private val transactionDao: TransactionDao,
    seedTransactions: List<MoneyJarTransaction> = emptyList()
) : TransactionRepository, SuspendTransactionCreator, SyncableRepository, CommittedTransactionMirror {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override val transactions: StateFlow<List<MoneyJarTransaction>> =
        transactionDao.getAllTransactions().stateIn(
            scope = scope,
            started = SharingStarted.Eagerly,
            initialValue = seedTransactions
        )

    // TransactionRepository.createTransaction - sync version (not supported for Room)
    override fun createTransaction(draft: TransactionDraft): MoneyJarTransaction {
        throw UnsupportedOperationException("Use createTransactionSuspend for Room implementation")
    }

    // SuspendTransactionCreator.createTransactionSuspend
    override suspend fun createTransactionSuspend(
        draft: TransactionDraft,
        ownerType: OwnerType,
        ownerId: String?
    ): MoneyJarTransaction {
        val transaction = MoneyJarTransaction(
            id = 0,
            type = draft.type,
            amount = draft.amount,
            category = draft.category,
            note = draft.note.ifBlank { draft.category },
            createdAt = java.time.LocalDateTime.now(),
            ownerType = ownerType,
            ownerId = ownerId,
            syncState = if (ownerType == OwnerType.AUTHENTICATED) SyncState.PENDING else SyncState.UNSYNCED,
            syncAttempts = 0
        )

        val id = transactionDao.insertTransaction(transaction)
        return transaction.copy(id = id)
    }

    // StatsReader.getSummary
    override fun getSummary(period: SummaryPeriod): PeriodSummary {
        val today = LocalDate.now()
        val filtered = transactions.value.filter { transaction ->
            val date = transaction.createdAt.toLocalDate()
            when (period) {
                SummaryPeriod.WEEK -> !date.isBefore(today.minusDays(6))
                SummaryPeriod.MONTH -> date.year == today.year && date.month == today.month
            }
        }

        if (filtered.isEmpty()) {
            return PeriodSummary.empty(period)
        }

        val income = filtered
            .filter { it.type == TransactionType.INCOME }
            .sumOf { it.amount }
        val expense = filtered
            .filter { it.type == TransactionType.EXPENSE }
            .sumOf { it.amount }
        val categories = filtered
            .filter { it.type == TransactionType.EXPENSE }
            .groupBy { it.category }
            .map { (category, items) ->
                CategorySummary(category = category, amount = items.sumOf { it.amount })
            }
            .sortedByDescending { it.amount }

        return PeriodSummary(
            period = period,
            income = income,
            expense = expense,
            categories = categories,
        )
    }

    // SyncableRepository
    override suspend fun getUnsyncedTransactions(): List<MoneyJarTransaction> {
        return transactionDao.getTransactionsForSync(listOf(SyncState.UNSYNCED, SyncState.FAILED))
    }

    override suspend fun getPendingTransactions(): List<MoneyJarTransaction> {
        return transactionDao.getTransactionsForSync(listOf(SyncState.PENDING))
    }

    override suspend fun updateSyncResult(
        localId: Long,
        remoteId: Long?,
        success: Boolean,
        error: String?
    ) {
        val newState = if (success) SyncState.SYNCED else SyncState.FAILED
        transactionDao.updateSyncState(localId, newState, remoteId, error)
    }

    override suspend fun claimAnonymousTransactions(userId: String) {
        transactionDao.claimAnonymousTransactions(
            previousOwnerType = OwnerType.ANONYMOUS,
            previousSyncState = SyncState.UNSYNCED,
            ownerType = OwnerType.AUTHENTICATED,
            ownerId = userId,
            syncState = SyncState.PENDING
        )
    }

    override suspend fun clearAuthenticatedData() {
        transactionDao.deleteTransactionsByOwnerType(OwnerType.AUTHENTICATED)
    }

    override suspend fun upsertCommittedTransactions(
        committedTransactions: List<VoiceCommittedTransactionResponse>,
        ownerId: String?
    ): List<MoneyJarTransaction> {
        return committedTransactions.map { committed ->
            val existing = transactionDao.getTransactionByRemoteId(committed.id)
            val local = committed.toLocalTransaction(
                existingLocalId = existing?.id ?: 0,
                ownerId = ownerId,
            )
            val insertedId = transactionDao.insertTransaction(local)
            local.copy(id = existing?.id ?: insertedId)
        }
    }

    override suspend fun getSyncStatusCount(): Map<SyncState, Int> {
        return SyncState.entries.associateWith { state ->
            transactionDao.countBySyncState(state)
        }
    }
}
