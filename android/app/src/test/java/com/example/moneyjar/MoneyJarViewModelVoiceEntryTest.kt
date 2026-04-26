package com.example.moneyjar

import com.example.moneyjar.data.remote.VoiceCommittedTransactionResponse
import com.example.moneyjar.data.remote.VoiceTransactionDraftResponse
import com.example.moneyjar.data.remote.VoiceTransactionSubmitRequest
import com.example.moneyjar.data.remote.VoiceTransactionSubmitResponse
import com.example.moneyjar.data.repository.FakeTransactionRepository
import com.example.moneyjar.data.voice.VoiceTransactionClient
import com.example.moneyjar.data.voice.VoiceTransactionClientResult
import com.example.moneyjar.ui.app.MoneyJarViewModel
import com.example.moneyjar.ui.app.VoiceSubmitState
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class MoneyJarViewModelVoiceEntryTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun submitVoiceText_readyToCommitMirrorsTransactionAndClearsComposer() = runTest {
        val repository = FakeTransactionRepository()
        val client = FakeVoiceTransactionClient(
            submitResult = VoiceTransactionClientResult.Success(
                VoiceTransactionSubmitResponse(
                    status = "ready_to_commit",
                    sourceText = "午饭 32 元",
                    drafts = emptyList(),
                    committedTransactions = listOf(
                        VoiceCommittedTransactionResponse(
                            id = 3001,
                            type = "expense",
                            amount = 32.0,
                            category = "餐饮",
                            note = "午饭",
                            createdAt = "2026-04-26T12:00:00",
                        )
                    ),
                )
            )
        )
        val viewModel = MoneyJarViewModel(repository, client)

        viewModel.updateRecordComposer("午饭 32 元")
        viewModel.submitVoiceText()

        assertEquals("", viewModel.state.value.recordComposerText)
        assertEquals(VoiceSubmitState.READY_COMMITTED, viewModel.state.value.voiceSubmitState)
        assertTrue(repository.transactions.value.any { it.remoteId == 3001L })
    }

    @Test
    fun submitVoiceText_needsConfirmationPreservesSourceAndRequestsNavigation() = runTest {
        val client = FakeVoiceTransactionClient(
            submitResult = VoiceTransactionClientResult.Success(
                VoiceTransactionSubmitResponse(
                    status = "needs_confirmation",
                    sourceText = "买东西 20",
                    drafts = listOf(
                        VoiceTransactionDraftResponse(
                            type = "expense",
                            amount = 20.0,
                            confidence = 0.5,
                            missingFields = listOf("category"),
                        )
                    ),
                )
            )
        )
        val viewModel = MoneyJarViewModel(FakeTransactionRepository(), client)

        viewModel.updateRecordComposer("买东西 20")
        viewModel.submitVoiceText()

        assertEquals("买东西 20", viewModel.state.value.recordComposerText)
        assertEquals(VoiceSubmitState.NEEDS_CONFIRMATION, viewModel.state.value.voiceSubmitState)
        assertTrue(viewModel.state.value.shouldNavigateToVoiceConfirmation)
        assertEquals("买东西 20", viewModel.state.value.voiceConfirmation?.sourceText)
        assertEquals(1, viewModel.state.value.voiceConfirmation?.drafts?.size)
    }

    @Test
    fun submitVoiceText_failedParseKeepsComposerForRetry() = runTest {
        val client = FakeVoiceTransactionClient(
            submitResult = VoiceTransactionClientResult.Success(
                VoiceTransactionSubmitResponse(
                    status = "failed",
                    sourceText = "无法解析",
                    error = "PARSE_FAILED",
                )
            )
        )
        val viewModel = MoneyJarViewModel(FakeTransactionRepository(), client)

        viewModel.updateRecordComposer("无法解析")
        viewModel.submitVoiceText()

        assertEquals("无法解析", viewModel.state.value.recordComposerText)
        assertEquals(VoiceSubmitState.PARSE_FAILED, viewModel.state.value.voiceSubmitState)
        assertNotNull(viewModel.state.value.formError)
    }

    @Test
    fun submitVoiceText_networkFailureKeepsComposerForRetry() = runTest {
        val viewModel = MoneyJarViewModel(
            FakeTransactionRepository(),
            FakeVoiceTransactionClient(submitResult = VoiceTransactionClientResult.NetworkFailure),
        )

        viewModel.updateRecordComposer("午饭 32 元")
        viewModel.submitVoiceText()

        assertEquals("午饭 32 元", viewModel.state.value.recordComposerText)
        assertEquals(VoiceSubmitState.NETWORK_FAILED, viewModel.state.value.voiceSubmitState)
        assertFalse(viewModel.state.value.shouldNavigateToVoiceConfirmation)
    }

    @Test
    fun submitVoiceText_authRequiredKeepsComposerForLoginRecovery() = runTest {
        val viewModel = MoneyJarViewModel(
            FakeTransactionRepository(),
            FakeVoiceTransactionClient(submitResult = VoiceTransactionClientResult.AuthRequired),
        )

        viewModel.updateRecordComposer("午饭 32 元")
        viewModel.submitVoiceText()

        assertEquals("午饭 32 元", viewModel.state.value.recordComposerText)
        assertEquals(VoiceSubmitState.AUTH_FAILED, viewModel.state.value.voiceSubmitState)
        assertNotNull(viewModel.state.value.formError)
    }

    @Test
    fun speechFailureKeepsExistingComposerText() {
        val viewModel = MoneyJarViewModel(FakeTransactionRepository(), FakeVoiceTransactionClient())

        viewModel.updateRecordComposer("已有文本")
        viewModel.markSpeechFailed()

        assertEquals("已有文本", viewModel.state.value.recordComposerText)
        assertNotNull(viewModel.state.value.formError)
    }

    @Test
    fun confirmVoiceDrafts_blocksMissingRequiredFields() = runTest {
        val client = FakeVoiceTransactionClient(
            submitResult = VoiceTransactionClientResult.Success(
                VoiceTransactionSubmitResponse(
                    status = "needs_confirmation",
                    sourceText = "买东西 20",
                    drafts = listOf(
                        VoiceTransactionDraftResponse(
                            type = "expense",
                            amount = 20.0,
                            confidence = 0.5,
                            missingFields = listOf("category"),
                        )
                    ),
                )
            ),
            confirmResult = VoiceTransactionClientResult.NetworkFailure,
        )
        val viewModel = MoneyJarViewModel(FakeTransactionRepository(), client)

        viewModel.updateRecordComposer("买东西 20")
        viewModel.submitVoiceText()
        viewModel.confirmVoiceDrafts()

        assertEquals(0, client.confirmCalls)
        assertNotNull(viewModel.state.value.voiceConfirmation?.errorMessage)
    }

    @Test
    fun confirmVoiceDrafts_successMirrorsTransactionsAndClearsConfirmation() = runTest {
        val repository = FakeTransactionRepository()
        val client = FakeVoiceTransactionClient(
            submitResult = VoiceTransactionClientResult.Success(
                VoiceTransactionSubmitResponse(
                    status = "needs_confirmation",
                    sourceText = "买东西 20",
                    drafts = listOf(
                        VoiceTransactionDraftResponse(
                            type = "expense",
                            amount = 20.0,
                            confidence = 0.5,
                            missingFields = listOf("category"),
                        )
                    ),
                )
            ),
            confirmResult = VoiceTransactionClientResult.Success(
                VoiceTransactionSubmitResponse(
                    status = "ready_to_commit",
                    sourceText = "买东西 20",
                    committedTransactions = listOf(
                        VoiceCommittedTransactionResponse(
                            id = 3002,
                            type = "expense",
                            amount = 20.0,
                            category = "购物",
                            note = "买东西",
                            createdAt = "2026-04-26T13:00:00",
                        )
                    ),
                )
            ),
        )
        val viewModel = MoneyJarViewModel(repository, client)

        viewModel.updateRecordComposer("买东西 20")
        viewModel.submitVoiceText()
        viewModel.updateConfirmationDraft(index = 0, category = "购物")
        viewModel.confirmVoiceDrafts()

        assertEquals(1, client.confirmCalls)
        assertEquals("", viewModel.state.value.recordComposerText)
        assertEquals(null, viewModel.state.value.voiceConfirmation)
        assertTrue(repository.transactions.value.any { it.remoteId == 3002L })
    }

    @Test
    fun confirmVoiceDrafts_networkFailurePreservesDraftEdits() = runTest {
        val client = FakeVoiceTransactionClient(
            submitResult = VoiceTransactionClientResult.Success(
                VoiceTransactionSubmitResponse(
                    status = "needs_confirmation",
                    sourceText = "买东西 20",
                    drafts = listOf(
                        VoiceTransactionDraftResponse(
                            type = "expense",
                            amount = 20.0,
                            category = "其他",
                            confidence = 0.5,
                            missingFields = emptyList(),
                        )
                    ),
                )
            ),
            confirmResult = VoiceTransactionClientResult.NetworkFailure,
        )
        val viewModel = MoneyJarViewModel(FakeTransactionRepository(), client)

        viewModel.updateRecordComposer("买东西 20")
        viewModel.submitVoiceText()
        viewModel.updateConfirmationDraft(index = 0, category = "购物")
        viewModel.confirmVoiceDrafts()

        assertEquals("购物", viewModel.state.value.voiceConfirmation?.drafts?.single()?.category)
        assertNotNull(viewModel.state.value.voiceConfirmation?.errorMessage)
    }
}

private class FakeVoiceTransactionClient(
    private val submitResult: VoiceTransactionClientResult = VoiceTransactionClientResult.NetworkFailure,
    private val confirmResult: VoiceTransactionClientResult = VoiceTransactionClientResult.NetworkFailure,
) : VoiceTransactionClient {
    var confirmCalls = 0

    override suspend fun submit(request: VoiceTransactionSubmitRequest): VoiceTransactionClientResult {
        return submitResult
    }

    override suspend fun confirm(
        sourceText: String,
        drafts: List<VoiceTransactionDraftResponse>
    ): VoiceTransactionClientResult {
        confirmCalls++
        return confirmResult
    }
}
