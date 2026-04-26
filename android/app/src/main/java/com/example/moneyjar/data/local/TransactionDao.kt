package com.example.moneyjar.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.OwnerType
import com.example.moneyjar.data.model.SyncState
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {

    @Query("SELECT * FROM transactions ORDER BY createdAt DESC")
    fun getAllTransactions(): Flow<List<MoneyJarTransaction>>

    @Query("SELECT * FROM transactions WHERE ownerType = :ownerType ORDER BY createdAt DESC")
    fun getTransactionsByOwnerType(ownerType: OwnerType): Flow<List<MoneyJarTransaction>>

    @Query("SELECT * FROM transactions WHERE syncState = :syncState ORDER BY createdAt DESC")
    fun getTransactionsBySyncState(syncState: SyncState): Flow<List<MoneyJarTransaction>>

    @Query("SELECT * FROM transactions WHERE syncState IN (:states) ORDER BY createdAt ASC")
    suspend fun getTransactionsForSync(states: List<SyncState>): List<MoneyJarTransaction>

    @Query("SELECT * FROM transactions WHERE id = :id")
    suspend fun getTransactionById(id: Long): MoneyJarTransaction?

    @Query("SELECT * FROM transactions WHERE remoteId = :remoteId LIMIT 1")
    suspend fun getTransactionByRemoteId(remoteId: Long): MoneyJarTransaction?

    @Query("SELECT * FROM transactions WHERE ownerType = :ownerType AND syncState = :syncState")
    suspend fun getTransactionsByOwnerAndSync(ownerType: OwnerType, syncState: SyncState): List<MoneyJarTransaction>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: MoneyJarTransaction): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransactions(transactions: List<MoneyJarTransaction>)

    @Update
    suspend fun updateTransaction(transaction: MoneyJarTransaction)

    @Delete
    suspend fun deleteTransaction(transaction: MoneyJarTransaction)

    @Query("DELETE FROM transactions WHERE ownerType = :ownerType")
    suspend fun deleteTransactionsByOwnerType(ownerType: OwnerType)

    @Query("UPDATE transactions SET syncState = :syncState, remoteId = :remoteId, lastSyncError = :error, syncAttempts = syncAttempts + 1 WHERE id = :id")
    suspend fun updateSyncState(id: Long, syncState: SyncState, remoteId: Long?, error: String?)

    @Query("UPDATE transactions SET ownerType = :ownerType, ownerId = :ownerId, syncState = :syncState WHERE ownerType = :previousOwnerType AND syncState = :previousSyncState")
    suspend fun claimAnonymousTransactions(
        previousOwnerType: OwnerType,
        previousSyncState: SyncState,
        ownerType: OwnerType,
        ownerId: String,
        syncState: SyncState
    )

    @Query("SELECT COUNT(*) FROM transactions WHERE syncState = :syncState")
    suspend fun countBySyncState(syncState: SyncState): Int
}
