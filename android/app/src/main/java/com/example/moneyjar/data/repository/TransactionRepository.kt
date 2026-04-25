package com.example.moneyjar.data.repository

import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.PeriodSummary
import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.model.TransactionDraft
import kotlinx.coroutines.flow.StateFlow

interface TransactionCreator {
    fun createTransaction(draft: TransactionDraft): MoneyJarTransaction
}

interface LedgerReader {
    val transactions: StateFlow<List<MoneyJarTransaction>>
}

interface StatsReader {
    fun getSummary(period: SummaryPeriod): PeriodSummary
}

interface TransactionRepository : TransactionCreator, LedgerReader, StatsReader
