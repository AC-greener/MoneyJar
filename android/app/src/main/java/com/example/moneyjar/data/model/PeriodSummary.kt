package com.example.moneyjar.data.model

data class PeriodSummary(
    val period: SummaryPeriod,
    val income: Double,
    val expense: Double,
    val categories: List<CategorySummary>,
) {
    val balance: Double
        get() = income - expense

    companion object {
        fun empty(period: SummaryPeriod): PeriodSummary =
            PeriodSummary(
                period = period,
                income = 0.0,
                expense = 0.0,
                categories = emptyList()
            )
    }
}
