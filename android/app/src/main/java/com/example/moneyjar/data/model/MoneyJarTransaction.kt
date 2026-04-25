package com.example.moneyjar.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDateTime

/**
 * Transaction sync state enumeration
 */
enum class SyncState {
    UNSYNCED,   // Created locally, not yet synced
    PENDING,    // Syncing in progress
    SYNCED,     // Successfully synced to backend
    FAILED      // Sync failed, retryable
}

/**
 * Owner type for transaction ownership tracking
 */
enum class OwnerType {
    ANONYMOUS,  // Local-only user (not logged in)
    AUTHENTICATED  // Logged-in authenticated user
}

/**
 * Room Entity for persistent transaction storage
 * Includes sync metadata for local-first architecture
 */
@Entity(tableName = "transactions")
data class MoneyJarTransaction(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val type: TransactionType,
    val amount: Double,
    val category: String,
    val note: String,
    val createdAt: LocalDateTime,

    // Ownership metadata
    val ownerType: OwnerType = OwnerType.ANONYMOUS,
    val ownerId: String? = null,  // UUID for authenticated users

    // Sync metadata
    val remoteId: Long? = null,    // Backend transaction ID after sync
    val syncState: SyncState = SyncState.UNSYNCED,
    val syncAttempts: Int = 0,
    val lastSyncError: String? = null
)
