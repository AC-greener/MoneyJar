package com.example.moneyjar.data.repository

import com.example.moneyjar.data.model.CategorySummary
import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.PeriodSummary
import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.model.TransactionDraft
import com.example.moneyjar.data.model.TransactionType
import com.example.moneyjar.data.remote.VoiceCommittedTransactionResponse
import com.example.moneyjar.data.remote.toLocalTransaction
import java.time.LocalDate
import java.time.LocalDateTime
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class FakeTransactionRepository : TransactionRepository, CommittedTransactionMirror {
    private val transactionState = MutableStateFlow(seedTransactions())
    private var nextId = transactionState.value.maxOfOrNull { it.id }?.plus(1) ?: 1

    override val transactions: StateFlow<List<MoneyJarTransaction>> = transactionState.asStateFlow()

    override fun createTransaction(draft: TransactionDraft): MoneyJarTransaction {
        val transaction = MoneyJarTransaction(
            id = nextId++,
            type = draft.type,
            amount = draft.amount,
            category = draft.category,
            note = draft.note.ifBlank { draft.category },
            createdAt = LocalDateTime.now()
        )
        transactionState.value = (transactionState.value + transaction)
            .sortedByDescending { it.createdAt }
        return transaction
    }

    override fun getSummary(period: SummaryPeriod): PeriodSummary {
        val today = LocalDate.now()
        val filtered = transactionState.value.filter { transaction ->
            val date = transaction.createdAt.toLocalDate()
            when (period) {
                SummaryPeriod.WEEK -> !date.isBefore(today.minusDays(6))
                SummaryPeriod.MONTH -> date.year == today.year && date.month == today.month
            }
        }

        if (filtered.isEmpty()) {
            return PeriodSummary.empty(period)
        }

        val income = filtered
            .filter { it.type == TransactionType.INCOME }
            .sumOf { it.amount }
        val expense = filtered
            .filter { it.type == TransactionType.EXPENSE }
            .sumOf { it.amount }
        val categories = filtered
            .filter { it.type == TransactionType.EXPENSE }
            .groupBy { it.category }
            .map { (category, items) ->
                CategorySummary(category = category, amount = items.sumOf { it.amount })
            }
            .sortedByDescending { it.amount }

        return PeriodSummary(
            period = period,
            income = income,
            expense = expense,
            categories = categories,
        )
    }

    override suspend fun upsertCommittedTransactions(
        committedTransactions: List<VoiceCommittedTransactionResponse>,
        ownerId: String?
    ): List<MoneyJarTransaction> {
        val mirrored = committedTransactions.map { committed ->
            val existing = transactionState.value.firstOrNull { it.remoteId == committed.id }
            committed.toLocalTransaction(
                existingLocalId = existing?.id ?: nextId++,
                ownerId = ownerId,
            )
        }

        val remoteIds = mirrored.mapNotNull { it.remoteId }.toSet()
        transactionState.value = (transactionState.value.filterNot { it.remoteId in remoteIds } + mirrored)
            .sortedByDescending { it.createdAt }
        return mirrored
    }

    private fun seedTransactions(): List<MoneyJarTransaction> {
        val now = LocalDateTime.now()
        return listOf(
            MoneyJarTransaction(1, TransactionType.EXPENSE, 32.0, "餐饮", "工作日午饭", now.minusHours(3)),
            MoneyJarTransaction(2, TransactionType.EXPENSE, 18.0, "交通", "地铁通勤", now.minusDays(1)),
            MoneyJarTransaction(3, TransactionType.EXPENSE, 76.0, "购物", "补充生活用品", now.minusDays(2)),
            MoneyJarTransaction(4, TransactionType.INCOME, 4200.0, "工资", "四月自由职业结算", now.minusDays(4)),
            MoneyJarTransaction(5, TransactionType.EXPENSE, 45.5, "娱乐", "周末电影", now.minusDays(6)),
            MoneyJarTransaction(6, TransactionType.EXPENSE, 88.0, "餐饮", "朋友聚餐分摊", now.minusDays(10)),
            MoneyJarTransaction(7, TransactionType.EXPENSE, 199.0, "数码", "键盘配件", now.minusDays(15)),
            MoneyJarTransaction(8, TransactionType.INCOME, 600.0, "副业", "短视频合作尾款", now.minusDays(21)),
        ).sortedByDescending { it.createdAt }
    }
}
