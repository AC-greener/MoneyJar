package com.example.moneyjar.data.model

data class TransactionDraft(
    val amount: Double,
    val category: String,
    val note: String,
    val type: TransactionType = TransactionType.EXPENSE,
)
