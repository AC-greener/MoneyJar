package com.example.moneyjar.ui.app

import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.PeriodSummary
import com.example.moneyjar.data.model.SummaryPeriod

data class MoneyJarUiState(
    val isLoading: Boolean = true,
    val transactions: List<MoneyJarTransaction> = emptyList(),
    val weeklySummary: PeriodSummary = PeriodSummary.empty(SummaryPeriod.WEEK),
    val monthlySummary: PeriodSummary = PeriodSummary.empty(SummaryPeriod.MONTH),
    val amountInput: String = "",
    val noteInput: String = "",
    val selectedCategory: String = DEFAULT_CATEGORIES.first(),
    val formError: String? = null,
    val successMessage: String? = null,
) {
    val recentTransactions: List<MoneyJarTransaction>
        get() = transactions.take(6)

    companion object {
        val DEFAULT_CATEGORIES = listOf("餐饮", "交通", "购物", "娱乐", "数码", "其他")
    }
}
