package com.example.moneyjar.ui.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.model.TransactionDraft
import com.example.moneyjar.data.remote.VoiceTransactionSubmitRequest
import com.example.moneyjar.data.repository.SuspendTransactionCreator
import com.example.moneyjar.data.repository.CommittedTransactionMirror
import com.example.moneyjar.data.repository.TransactionRepository
import com.example.moneyjar.data.voice.VoiceTransactionClient
import com.example.moneyjar.data.voice.VoiceTransactionClientResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.ZoneId

class MoneyJarViewModel(
    private val repository: TransactionRepository,
    private val voiceTransactionClient: VoiceTransactionClient? = null,
) : ViewModel() {
    private val uiState = MutableStateFlow(MoneyJarUiState())
    val state: StateFlow<MoneyJarUiState> = uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.transactions.collect { transactions ->
                uiState.update {
                    it.copy(
                        isLoading = false,
                        transactions = transactions,
                        weeklySummary = repository.getSummary(SummaryPeriod.WEEK),
                        monthlySummary = repository.getSummary(SummaryPeriod.MONTH),
                    )
                }
            }
        }
    }

    fun updateAmount(value: String) {
        uiState.update {
            it.copy(amountInput = value, formError = null, successMessage = null)
        }
    }

    fun updateCategory(value: String) {
        uiState.update {
            it.copy(selectedCategory = value, formError = null, successMessage = null)
        }
    }

    fun updateNote(value: String) {
        uiState.update {
            it.copy(noteInput = value, formError = null, successMessage = null)
        }
    }

    fun updateRecordComposer(value: String) {
        uiState.update {
            it.copy(
                recordComposerText = value,
                voiceEntrySource = if (it.voiceEntrySource == VoiceEntrySource.VOICE) {
                    VoiceEntrySource.VOICE
                } else {
                    VoiceEntrySource.MANUAL
                },
                voiceSubmitState = VoiceSubmitState.IDLE,
                formError = null,
                successMessage = null,
            )
        }
    }

    fun markSpeechPermissionRequesting() {
        uiState.update {
            it.copy(voiceSpeechState = VoiceSpeechState.REQUESTING_PERMISSION, formError = null)
        }
    }

    fun markSpeechListening() {
        uiState.update {
            it.copy(voiceSpeechState = VoiceSpeechState.LISTENING, formError = null)
        }
    }

    fun applyRecognizedSpeech(text: String) {
        val recognizedText = text.trim()
        if (recognizedText.isBlank()) {
            markSpeechFailed("没有识别到可用内容，可以重试或手动输入。")
            return
        }

        uiState.update {
            it.copy(
                recordComposerText = recognizedText,
                voiceEntrySource = VoiceEntrySource.VOICE,
                voiceSpeechState = VoiceSpeechState.RECOGNIZED,
                formError = null,
                successMessage = null,
            )
        }
    }

    fun markSpeechCancelled() {
        uiState.update {
            it.copy(voiceSpeechState = VoiceSpeechState.CANCELLED)
        }
    }

    fun markSpeechFailed(message: String = "语音识别失败，可以重试或手动输入。") {
        uiState.update {
            it.copy(
                voiceSpeechState = VoiceSpeechState.FAILED,
                formError = message,
                successMessage = null,
            )
        }
    }

    fun submitVoiceText() {
        val current = uiState.value
        val text = current.recordComposerText.trim()
        if (text.isBlank()) {
            uiState.update {
                it.copy(formError = "请输入要解析的记账内容", successMessage = null)
            }
            return
        }

        val client = voiceTransactionClient
        if (client == null) {
            uiState.update {
                it.copy(
                    voiceSubmitState = VoiceSubmitState.NETWORK_FAILED,
                    formError = "语音记账服务暂不可用，请稍后重试。",
                    successMessage = null,
                )
            }
            return
        }

        uiState.update {
            it.copy(
                voiceSubmitState = VoiceSubmitState.SUBMITTING,
                formError = null,
                successMessage = null,
                shouldNavigateToVoiceConfirmation = false,
            )
        }

        viewModelScope.launch {
            val result = client.submit(
                VoiceTransactionSubmitRequest(
                    text = text,
                    source = current.voiceEntrySource.apiValue,
                    locale = "zh-CN",
                    timezone = ZoneId.systemDefault().id,
                )
            )
            handleVoiceSubmitResult(result)
        }
    }

    fun onVoiceConfirmationNavigationHandled() {
        uiState.update { it.copy(shouldNavigateToVoiceConfirmation = false) }
    }

    fun updateConfirmationDraft(
        index: Int,
        type: String? = null,
        amountInput: String? = null,
        category: String? = null,
        note: String? = null,
        occurredAt: String? = null,
    ) {
        uiState.update { current ->
            val confirmation = current.voiceConfirmation ?: return@update current
            val updatedDrafts = confirmation.drafts.mapIndexed { draftIndex, draft ->
                if (draftIndex != index) {
                    draft
                } else {
                    draft.copy(
                        type = type ?: draft.type,
                        amountInput = amountInput ?: draft.amountInput,
                        category = category ?: draft.category,
                        note = note ?: draft.note,
                        occurredAt = occurredAt ?: draft.occurredAt,
                    )
                }
            }
            current.copy(
                voiceConfirmation = confirmation.copy(
                    drafts = updatedDrafts,
                    errorMessage = null,
                )
            )
        }
    }

    fun confirmVoiceDrafts() {
        val current = uiState.value
        val confirmation = current.voiceConfirmation ?: return
        if (confirmation.drafts.any { !it.isValid }) {
            uiState.update {
                it.copy(
                    voiceConfirmation = confirmation.copy(
                        errorMessage = "请补全每笔草稿的金额和分类。",
                    )
                )
            }
            return
        }

        val client = voiceTransactionClient
        if (client == null) {
            uiState.update {
                it.copy(
                    voiceSubmitState = VoiceSubmitState.NETWORK_FAILED,
                    voiceConfirmation = confirmation.copy(
                        errorMessage = "语音记账服务暂不可用，请稍后重试。",
                    ),
                )
            }
            return
        }

        uiState.update {
            it.copy(
                voiceConfirmation = confirmation.copy(isConfirming = true, errorMessage = null),
                voiceSubmitState = VoiceSubmitState.SUBMITTING,
            )
        }

        viewModelScope.launch {
            val result = client.confirm(
                sourceText = confirmation.sourceText,
                drafts = confirmation.drafts.map { it.toResponse() },
            )
            handleVoiceConfirmResult(result)
        }
    }

    private suspend fun handleVoiceSubmitResult(result: VoiceTransactionClientResult) {
        when (result) {
            is VoiceTransactionClientResult.Success -> handleVoiceResponse(result.response)
            VoiceTransactionClientResult.AuthRequired -> uiState.update {
                it.copy(
                    voiceSubmitState = VoiceSubmitState.AUTH_FAILED,
                    formError = "请先登录后再使用 AI 记账。",
                    successMessage = null,
                )
            }
            VoiceTransactionClientResult.NetworkFailure -> uiState.update {
                it.copy(
                    voiceSubmitState = VoiceSubmitState.NETWORK_FAILED,
                    formError = "当前无法连接服务器，内容已保留，请联网后重试。",
                    successMessage = null,
                )
            }
            is VoiceTransactionClientResult.ServerFailure -> uiState.update {
                it.copy(
                    voiceSubmitState = VoiceSubmitState.SERVER_FAILED,
                    formError = result.message,
                    successMessage = null,
                )
            }
        }
    }

    private suspend fun handleVoiceConfirmResult(result: VoiceTransactionClientResult) {
        when (result) {
            is VoiceTransactionClientResult.Success -> handleVoiceResponse(result.response)
            VoiceTransactionClientResult.AuthRequired -> updateConfirmationFailure(
                submitState = VoiceSubmitState.AUTH_FAILED,
                message = "请先登录后再确认 AI 记账结果。",
            )
            VoiceTransactionClientResult.NetworkFailure -> updateConfirmationFailure(
                submitState = VoiceSubmitState.NETWORK_FAILED,
                message = "当前无法连接服务器，确认内容已保留，请联网后重试。",
            )
            is VoiceTransactionClientResult.ServerFailure -> updateConfirmationFailure(
                submitState = VoiceSubmitState.SERVER_FAILED,
                message = result.message,
            )
        }
    }

    private fun updateConfirmationFailure(
        submitState: VoiceSubmitState,
        message: String,
    ) {
        uiState.update { current ->
            current.copy(
                voiceSubmitState = submitState,
                voiceConfirmation = current.voiceConfirmation?.copy(
                    isConfirming = false,
                    errorMessage = message,
                ),
                formError = null,
                successMessage = null,
            )
        }
    }

    private suspend fun handleVoiceResponse(response: com.example.moneyjar.data.remote.VoiceTransactionSubmitResponse) {
        when (response.status) {
            "ready_to_commit" -> {
                mirrorCommittedTransactions(response.committedTransactions)
                uiState.update {
                    it.copy(
                        recordComposerText = "",
                        voiceEntrySource = VoiceEntrySource.MANUAL,
                        voiceSubmitState = VoiceSubmitState.READY_COMMITTED,
                        voiceConfirmation = null,
                        shouldNavigateToVoiceConfirmation = false,
                        formError = null,
                        successMessage = "已通过 AI 记账保存 ${response.committedTransactions.size} 笔",
                    )
                }
            }
            "needs_confirmation" -> uiState.update {
                it.copy(
                    recordComposerText = response.sourceText,
                    voiceSubmitState = VoiceSubmitState.NEEDS_CONFIRMATION,
                    voiceConfirmation = VoiceConfirmationState(
                        sourceText = response.sourceText,
                        drafts = response.drafts.map { draft -> draft.toEditableDraft() },
                    ),
                    shouldNavigateToVoiceConfirmation = true,
                    formError = null,
                    successMessage = null,
                )
            }
            else -> uiState.update {
                it.copy(
                    recordComposerText = response.sourceText,
                    voiceSubmitState = VoiceSubmitState.PARSE_FAILED,
                    formError = "没能可靠解析这段内容，请修改后重试。",
                    successMessage = null,
                )
            }
        }
    }

    private suspend fun mirrorCommittedTransactions(
        committedTransactions: List<com.example.moneyjar.data.remote.VoiceCommittedTransactionResponse>,
    ) {
        val mirror = repository as? CommittedTransactionMirror
        mirror?.upsertCommittedTransactions(committedTransactions)
    }

    fun submitRecord() {
        val current = uiState.value
        val amount = current.amountInput.toDoubleOrNull()

        if (amount == null || amount <= 0) {
            uiState.update {
                it.copy(formError = "请输入有效金额", successMessage = null)
            }
            return
        }

        val draft = TransactionDraft(
            amount = amount,
            category = current.selectedCategory,
            note = current.noteInput,
        )

        // Use suspend version for Room-based repository
        if (repository is SuspendTransactionCreator) {
            viewModelScope.launch {
                repository.createTransactionSuspend(draft)
            }
        } else {
            repository.createTransaction(draft)
        }

        uiState.update {
            it.copy(
                amountInput = "",
                noteInput = "",
                formError = null,
                successMessage = "已添加一笔 ${"%.2f".format(amount)} 元支出"
            )
        }
    }

    fun clearTransientMessage() {
        uiState.update {
            it.copy(formError = null, successMessage = null)
        }
    }
}

class MoneyJarViewModelFactory(
    private val repository: TransactionRepository,
    private val voiceTransactionClient: VoiceTransactionClient? = null,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MoneyJarViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MoneyJarViewModel(repository, voiceTransactionClient) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
