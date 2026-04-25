package com.example.moneyjar.data.model

import java.time.LocalDateTime

data class MoneyJarTransaction(
    val id: Int,
    val type: TransactionType,
    val amount: Double,
    val category: String,
    val note: String,
    val createdAt: LocalDateTime,
)
