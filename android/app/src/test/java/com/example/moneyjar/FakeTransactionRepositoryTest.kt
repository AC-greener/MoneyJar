package com.example.moneyjar

import com.example.moneyjar.data.model.SummaryPeriod
import com.example.moneyjar.data.model.TransactionDraft
import com.example.moneyjar.data.repository.FakeTransactionRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeTransactionRepositoryTest {
    @Test
    fun createTransaction_addsNewestItemToLedger() {
        val repository = FakeTransactionRepository()
        val initialSize = repository.transactions.value.size

        val created = repository.createTransaction(
            TransactionDraft(
                amount = 64.0,
                category = "餐饮",
                note = "测试新增账单",
            )
        )

        val updatedTransactions = repository.transactions.value
        assertEquals(initialSize + 1, updatedTransactions.size)
        assertEquals(created, updatedTransactions.first())
        assertEquals("测试新增账单", updatedTransactions.first().note)
    }

    @Test
    fun getSummary_reflectsNewExpenseInCurrentWeek() {
        val repository = FakeTransactionRepository()
        val before = repository.getSummary(SummaryPeriod.WEEK)

        repository.createTransaction(
            TransactionDraft(
                amount = 88.0,
                category = "交通",
                note = "测试周内支出",
            )
        )

        val after = repository.getSummary(SummaryPeriod.WEEK)
        assertEquals(before.expense + 88.0, after.expense, 0.001)
        assertTrue(after.categories.any { it.category == "交通" && it.amount >= 88.0 })
    }
}
