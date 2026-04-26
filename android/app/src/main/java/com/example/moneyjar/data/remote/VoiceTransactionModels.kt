package com.example.moneyjar.data.remote

import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.OwnerType
import com.example.moneyjar.data.model.SyncState
import com.example.moneyjar.data.model.TransactionType
import kotlinx.serialization.Serializable
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

@Serializable
data class VoiceTransactionSubmitRequest(
    val text: String,
    val source: String? = null,
    val locale: String? = null,
    val timezone: String? = null,
)

@Serializable
data class VoiceTransactionConfirmRequest(
    val sourceText: String,
    val drafts: List<VoiceTransactionDraftResponse>,
)

@Serializable
data class VoiceTransactionDraftResponse(
    val type: String,
    val amount: Double? = null,
    val category: String? = null,
    val note: String? = null,
    val occurredAt: String? = null,
    val confidence: Double,
    val missingFields: List<String> = emptyList(),
)

@Serializable
data class VoiceCommittedTransactionResponse(
    val id: Long,
    val type: String,
    val amount: Double,
    val category: String,
    val note: String? = null,
    val createdAt: String,
)

@Serializable
data class VoiceTransactionSubmitResponse(
    val status: String,
    val sourceText: String,
    val drafts: List<VoiceTransactionDraftResponse> = emptyList(),
    val committedTransactions: List<VoiceCommittedTransactionResponse> = emptyList(),
    val error: String? = null,
)

fun VoiceCommittedTransactionResponse.toLocalTransaction(
    existingLocalId: Long = 0,
    ownerId: String? = null,
): MoneyJarTransaction {
    return MoneyJarTransaction(
        id = existingLocalId,
        type = type.toTransactionType(),
        amount = amount,
        category = category,
        note = note?.takeIf { it.isNotBlank() } ?: category,
        createdAt = parseServerDateTime(createdAt),
        ownerType = OwnerType.AUTHENTICATED,
        ownerId = ownerId,
        remoteId = id,
        syncState = SyncState.SYNCED,
    )
}

private fun String.toTransactionType(): TransactionType {
    return when (lowercase()) {
        "income" -> TransactionType.INCOME
        else -> TransactionType.EXPENSE
    }
}

private fun parseServerDateTime(value: String): LocalDateTime {
    return runCatching {
        OffsetDateTime.parse(value, DateTimeFormatter.ISO_DATE_TIME).toLocalDateTime()
    }.getOrElse {
        LocalDateTime.parse(value, DateTimeFormatter.ISO_DATE_TIME)
    }
}
