package com.example.moneyjar

import com.example.moneyjar.data.remote.VoiceCommittedTransactionResponse
import com.example.moneyjar.data.remote.VoiceTransactionSubmitResponse
import com.example.moneyjar.data.remote.toLocalTransaction
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VoiceTransactionDtoTest {
    private val json = Json {
        ignoreUnknownKeys = true
    }

    @Test
    fun decodesReadyToCommitResponse() {
        val payload = """
            {
              "status": "ready_to_commit",
              "sourceText": "午饭 32 元",
              "drafts": [
                {
                  "type": "expense",
                  "amount": 32,
                  "category": "餐饮",
                  "note": "午饭",
                  "confidence": 0.93,
                  "missingFields": []
                }
              ],
              "committedTransactions": [
                {
                  "id": 42,
                  "type": "expense",
                  "amount": 32,
                  "category": "餐饮",
                  "note": "午饭",
                  "createdAt": "2026-04-26T10:15:30"
                }
              ]
            }
        """.trimIndent()

        val decoded = json.decodeFromString<VoiceTransactionSubmitResponse>(payload)

        assertEquals("ready_to_commit", decoded.status)
        assertEquals("午饭 32 元", decoded.sourceText)
        assertEquals(1, decoded.drafts.size)
        assertEquals(42L, decoded.committedTransactions.single().id)
    }

    @Test
    fun decodesNeedsConfirmationResponseWithMissingFields() {
        val payload = """
            {
              "status": "needs_confirmation",
              "sourceText": "买东西 20",
              "drafts": [
                {
                  "type": "expense",
                  "amount": 20,
                  "confidence": 0.54,
                  "missingFields": ["category"]
                }
              ]
            }
        """.trimIndent()

        val decoded = json.decodeFromString<VoiceTransactionSubmitResponse>(payload)

        assertEquals("needs_confirmation", decoded.status)
        assertEquals("category", decoded.drafts.single().missingFields.single())
        assertNull(decoded.drafts.single().category)
        assertEquals(emptyList<com.example.moneyjar.data.remote.VoiceCommittedTransactionResponse>(), decoded.committedTransactions)
    }

    @Test
    fun decodesFailedResponseWithEmptyDraftDefault() {
        val payload = """
            {
              "status": "failed",
              "sourceText": "完全无法解析",
              "error": "PARSE_FAILED"
            }
        """.trimIndent()

        val decoded = json.decodeFromString<VoiceTransactionSubmitResponse>(payload)

        assertEquals("failed", decoded.status)
        assertEquals("PARSE_FAILED", decoded.error)
        assertEquals(emptyList<com.example.moneyjar.data.remote.VoiceTransactionDraftResponse>(), decoded.drafts)
    }

    @Test
    fun mapsCommittedTransactionWithSqliteDateTime() {
        val committed = VoiceCommittedTransactionResponse(
            id = 35,
            type = "expense",
            amount = 50.0,
            category = "生鲜",
            note = "今天买菜花了50",
            createdAt = "2026-04-26 15:05:43"
        )

        val localTransaction = committed.toLocalTransaction()

        assertEquals(2026, localTransaction.createdAt.year)
        assertEquals(4, localTransaction.createdAt.monthValue)
        assertEquals(26, localTransaction.createdAt.dayOfMonth)
        assertEquals(15, localTransaction.createdAt.hour)
        assertEquals(5, localTransaction.createdAt.minute)
        assertEquals(43, localTransaction.createdAt.second)
    }
}
