package com.example.moneyjar.ui.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.model.TransactionDraft
import com.example.moneyjar.data.repository.SuspendTransactionCreator
import com.example.moneyjar.data.repository.TransactionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MoneyJarViewModel(
    private val repository: TransactionRepository,
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
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MoneyJarViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MoneyJarViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
