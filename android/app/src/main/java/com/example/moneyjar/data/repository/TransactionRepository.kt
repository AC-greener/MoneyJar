package com.example.moneyjar.data.repository

import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.OwnerType
import com.example.moneyjar.data.model.PeriodSummary
import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.model.SyncState
import com.example.moneyjar.data.model.TransactionDraft
import com.example.moneyjar.data.remote.VoiceCommittedTransactionResponse
import kotlinx.coroutines.flow.StateFlow

interface TransactionCreator {
    fun createTransaction(draft: TransactionDraft): MoneyJarTransaction
}

interface SuspendTransactionCreator {
    suspend fun createTransactionSuspend(
        draft: TransactionDraft,
        ownerType: OwnerType = OwnerType.ANONYMOUS,
        ownerId: String? = null
    ): MoneyJarTransaction
}

interface LedgerReader {
    val transactions: StateFlow<List<MoneyJarTransaction>>
}

interface StatsReader {
    fun getSummary(period: SummaryPeriod): PeriodSummary
}

interface SyncableRepository {
    suspend fun getUnsyncedTransactions(): List<MoneyJarTransaction>
    suspend fun getPendingTransactions(): List<MoneyJarTransaction>
    suspend fun updateSyncResult(localId: Long, remoteId: Long?, success: Boolean, error: String?)
    suspend fun claimAnonymousTransactions(userId: String)
    suspend fun clearAuthenticatedData()
    suspend fun getSyncStatusCount(): Map<SyncState, Int>
}

interface CommittedTransactionMirror {
    suspend fun upsertCommittedTransactions(
        committedTransactions: List<VoiceCommittedTransactionResponse>,
        ownerId: String? = null
    ): List<MoneyJarTransaction>
}

interface TransactionRepository : TransactionCreator, LedgerReader, StatsReader
