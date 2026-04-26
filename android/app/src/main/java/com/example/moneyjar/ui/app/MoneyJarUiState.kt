package com.example.moneyjar.ui.app

import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.PeriodSummary
import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.remote.VoiceTransactionDraftResponse

data class MoneyJarUiState(
    val isLoading: Boolean = true,
    val transactions: List<MoneyJarTransaction> = emptyList(),
    val weeklySummary: PeriodSummary = PeriodSummary.empty(SummaryPeriod.WEEK),
    val monthlySummary: PeriodSummary = PeriodSummary.empty(SummaryPeriod.MONTH),
    val amountInput: String = "",
    val noteInput: String = "",
    val selectedCategory: String = DEFAULT_CATEGORIES.first(),
    val recordComposerText: String = "",
    val voiceEntrySource: VoiceEntrySource = VoiceEntrySource.MANUAL,
    val voiceSpeechState: VoiceSpeechState = VoiceSpeechState.IDLE,
    val voiceSubmitState: VoiceSubmitState = VoiceSubmitState.IDLE,
    val voiceConfirmation: VoiceConfirmationState? = null,
    val shouldNavigateToVoiceConfirmation: Boolean = false,
    val formError: String? = null,
    val successMessage: String? = null,
) {
    val recentTransactions: List<MoneyJarTransaction>
        get() = transactions.take(6)

    companion object {
        val DEFAULT_CATEGORIES = listOf("餐饮", "交通", "购物", "娱乐", "数码", "其他")
    }
}

enum class VoiceEntrySource(val apiValue: String) {
    MANUAL("manual"),
    VOICE("voice"),
}

enum class VoiceSpeechState {
    IDLE,
    REQUESTING_PERMISSION,
    LISTENING,
    RECOGNIZED,
    CANCELLED,
    FAILED,
}

enum class VoiceSubmitState {
    IDLE,
    SUBMITTING,
    READY_COMMITTED,
    NEEDS_CONFIRMATION,
    PARSE_FAILED,
    NETWORK_FAILED,
    AUTH_FAILED,
    SERVER_FAILED,
}

data class VoiceConfirmationState(
    val sourceText: String,
    val drafts: List<EditableVoiceTransactionDraft>,
    val isConfirming: Boolean = false,
    val errorMessage: String? = null,
)

data class EditableVoiceTransactionDraft(
    val type: String,
    val amountInput: String,
    val category: String,
    val note: String,
    val occurredAt: String,
    val confidence: Double,
    val missingFields: List<String>,
) {
    val isValid: Boolean
        get() = amountInput.toDoubleOrNull()?.let { it > 0 } == true && category.isNotBlank()

    fun toResponse(): VoiceTransactionDraftResponse {
        return VoiceTransactionDraftResponse(
            type = type,
            amount = amountInput.toDoubleOrNull(),
            category = category.ifBlank { null },
            note = note.ifBlank { null },
            occurredAt = occurredAt.ifBlank { null },
            confidence = confidence,
            missingFields = missingFields,
        )
    }
}

fun VoiceTransactionDraftResponse.toEditableDraft(): EditableVoiceTransactionDraft {
    return EditableVoiceTransactionDraft(
        type = type,
        amountInput = amount?.toString().orEmpty(),
        category = category.orEmpty(),
        note = note.orEmpty(),
        occurredAt = occurredAt.orEmpty(),
        confidence = confidence,
        missingFields = missingFields,
    )
}
