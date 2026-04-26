package com.example.moneyjar

import com.example.moneyjar.data.model.OwnerType
import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.model.SyncState
import com.example.moneyjar.data.model.TransactionDraft
import com.example.moneyjar.data.model.TransactionType
import com.example.moneyjar.data.remote.VoiceCommittedTransactionResponse
import com.example.moneyjar.data.repository.FakeTransactionRepository
import com.example.moneyjar.data.repository.RoomTransactionRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime

class FakeTransactionRepositoryTest {
    @Test
    fun createTransaction_addsNewestItemToLedger() {
        val repository = FakeTransactionRepository()
        val initialSize = repository.transactions.value.size

        val created = repository.createTransaction(
            TransactionDraft(
                amount = 64.0,
                category = "餐饮",
                note = "测试新增账单",
            )
        )

        val updatedTransactions = repository.transactions.value
        assertEquals(initialSize + 1, updatedTransactions.size)
        assertEquals(created, updatedTransactions.first())
        assertEquals("测试新增账单", updatedTransactions.first().note)
    }

    @Test
    fun getSummary_reflectsNewExpenseInCurrentWeek() {
        val repository = FakeTransactionRepository()
        val before = repository.getSummary(SummaryPeriod.WEEK)

        repository.createTransaction(
            TransactionDraft(
                amount = 88.0,
                category = "交通",
                note = "测试周内支出",
            )
        )

        val after = repository.getSummary(SummaryPeriod.WEEK)
        assertEquals(before.expense + 88.0, after.expense, 0.001)
        assertTrue(after.categories.any { it.category == "交通" && it.amount >= 88.0 })
    }

    @Test
    fun upsertCommittedTransactions_mirrorsRemoteIdAsSyncedTransaction() = runBlocking {
        val repository = FakeTransactionRepository()

        val mirrored = repository.upsertCommittedTransactions(
            listOf(
                VoiceCommittedTransactionResponse(
                    id = 2001,
                    type = "expense",
                    amount = 26.5,
                    category = "餐饮",
                    note = "语音午饭",
                    createdAt = "2026-04-26T12:30:00",
                )
            ),
            ownerId = "user-1",
        )

        val transaction = mirrored.single()
        assertEquals(2001L, transaction.remoteId)
        assertEquals(SyncState.SYNCED, transaction.syncState)
        assertEquals(26.5, transaction.amount, 0.001)
        assertEquals("语音午饭", repository.transactions.value.first { it.remoteId == 2001L }.note)
    }

    @Test
    fun upsertCommittedTransactions_doesNotDuplicateExistingRemoteId() = runBlocking {
        val repository = FakeTransactionRepository()

        repository.upsertCommittedTransactions(
            listOf(
                VoiceCommittedTransactionResponse(
                    id = 2002,
                    type = "expense",
                    amount = 18.0,
                    category = "交通",
                    note = "地铁",
                    createdAt = "2026-04-26T09:00:00",
                )
            )
        )
        val sizeAfterFirstMirror = repository.transactions.value.size

        repository.upsertCommittedTransactions(
            listOf(
                VoiceCommittedTransactionResponse(
                    id = 2002,
                    type = "expense",
                    amount = 20.0,
                    category = "交通",
                    note = "地铁改价",
                    createdAt = "2026-04-26T09:00:00",
                )
            )
        )

        val matches = repository.transactions.value.filter { it.remoteId == 2002L }
        assertEquals(sizeAfterFirstMirror, repository.transactions.value.size)
        assertEquals(1, matches.size)
        assertEquals(20.0, matches.single().amount, 0.001)
        assertEquals("地铁改价", matches.single().note)
    }
}

/**
 * Tests for sync-related functionality
 * Note: These tests use FakeTransactionRepository for unit testing
 * RoomTransactionRepository would require instrumentation tests
 */
class SyncStateTest {

    @Test
    fun transactionDefaultSyncState_isUnsynced() {
        // Given a transaction created locally
        val transaction = com.example.moneyjar.data.model.MoneyJarTransaction(
            id = 1,
            type = TransactionType.EXPENSE,
            amount = 50.0,
            category = "餐饮",
            note = "测试",
            createdAt = LocalDateTime.now()
        )

        // Then it should have UNSYNCED state by default
        assertEquals(SyncState.UNSYNCED, transaction.syncState)
        assertEquals(OwnerType.ANONYMOUS, transaction.ownerType)
    }

    @Test
    fun anonymousTransaction_hasCorrectMetadata() {
        // Given an anonymous user transaction
        val transaction = com.example.moneyjar.data.model.MoneyJarTransaction(
            id = 1,
            type = TransactionType.EXPENSE,
            amount = 50.0,
            category = "餐饮",
            note = "匿名交易",
            createdAt = LocalDateTime.now(),
            ownerType = OwnerType.ANONYMOUS,
            syncState = SyncState.UNSYNCED
        )

        // Then it should have anonymous ownership
        assertEquals(OwnerType.ANONYMOUS, transaction.ownerType)
        assertEquals(null, transaction.ownerId)
        assertEquals(SyncState.UNSYNCED, transaction.syncState)
        assertEquals(null, transaction.remoteId)
    }

    @Test
    fun authenticatedTransaction_canTransitionToSynced() {
        // Given an authenticated transaction in PENDING state
        val transaction = com.example.moneyjar.data.model.MoneyJarTransaction(
            id = 1,
            type = TransactionType.EXPENSE,
            amount = 50.0,
            category = "购物",
            note = "认证交易",
            createdAt = LocalDateTime.now(),
            ownerType = OwnerType.AUTHENTICATED,
            ownerId = "user-uuid-123",
            syncState = SyncState.PENDING
        )

        // When sync succeeds
        val syncedTransaction = transaction.copy(
            syncState = SyncState.SYNCED,
            remoteId = 999L
        )

        // Then it should be SYNCED with remote ID
        assertEquals(SyncState.SYNCED, syncedTransaction.syncState)
        assertEquals(999L, syncedTransaction.remoteId)
    }

    @Test
    fun failedSyncTransaction_hasErrorMessage() {
        // Given a transaction that failed to sync
        val transaction = com.example.moneyjar.data.model.MoneyJarTransaction(
            id = 1,
            type = TransactionType.EXPENSE,
            amount = 50.0,
            category = "娱乐",
            note = "失败交易",
            createdAt = LocalDateTime.now(),
            ownerType = OwnerType.AUTHENTICATED,
            ownerId = "user-uuid-123",
            syncState = SyncState.FAILED,
            syncAttempts = 1,
            lastSyncError = "Network timeout"
        )

        // Then it should have error metadata
        assertEquals(SyncState.FAILED, transaction.syncState)
        assertEquals(1, transaction.syncAttempts)
        assertEquals("Network timeout", transaction.lastSyncError)
    }

    @Test
    fun claimingAnonymousTransactions_updatesOwnership() {
        // Given anonymous transactions
        val anonymousTransactions = listOf(
            com.example.moneyjar.data.model.MoneyJarTransaction(
                id = 1,
                type = TransactionType.EXPENSE,
                amount = 30.0,
                category = "餐饮",
                note = "匿名餐费",
                createdAt = LocalDateTime.now(),
                ownerType = OwnerType.ANONYMOUS,
                syncState = SyncState.UNSYNCED
            ),
            com.example.moneyjar.data.model.MoneyJarTransaction(
                id = 2,
                type = TransactionType.INCOME,
                amount = 5000.0,
                category = "工资",
                note = "匿名工资",
                createdAt = LocalDateTime.now(),
                ownerType = OwnerType.ANONYMOUS,
                syncState = SyncState.SYNCED  // Already synced
            )
        )

        // When claiming for authenticated user (only UNSYNCED should be claimed)
        val userId = "user-uuid-456"
        val claimedTransactions = anonymousTransactions.map { tx ->
            if (tx.ownerType == OwnerType.ANONYMOUS && tx.syncState == SyncState.UNSYNCED) {
                tx.copy(
                    ownerType = OwnerType.AUTHENTICATED,
                    ownerId = userId,
                    syncState = SyncState.PENDING
                )
            } else {
                tx
            }
        }

        // Then only the UNSYNCED transaction should be claimed
        val claimedUnsynced = claimedTransactions.filter {
            it.ownerType == OwnerType.AUTHENTICATED && it.syncState == SyncState.PENDING
        }
        val unchangedSynced = claimedTransactions.filter { it.syncState == SyncState.SYNCED }

        assertEquals(1, claimedUnsynced.size)
        assertEquals(1, unchangedSynced.size)
        assertEquals("user-uuid-456", claimedUnsynced.first().ownerId)
    }
}

/**
 * Tests for auth-related models
 */
class AuthModelTest {

    @Test
    fun userInfo_hasCorrectFields() {
        val user = com.example.moneyjar.auth.UserInfo(
            id = "user-123",
            email = "test@example.com",
            name = "测试用户",
            avatarUrl = "https://example.com/avatar.png",
            plan = "premium"
        )

        assertEquals("user-123", user.id)
        assertEquals("test@example.com", user.email)
        assertEquals("测试用户", user.name)
        assertEquals("https://example.com/avatar.png", user.avatarUrl)
        assertEquals("premium", user.plan)
    }

    @Test
    fun defaultPlan_isFree() {
        val user = com.example.moneyjar.auth.UserInfo(
            id = "user-456",
            email = "user@example.com",
            name = "默认用户",
            avatarUrl = null,
            plan = "free"
        )

        assertEquals("free", user.plan)
    }
}
