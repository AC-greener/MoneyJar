package com.example.moneyjar

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.example.moneyjar.ui.app.MoneyJarUiState
import com.example.moneyjar.ui.app.VoiceSubmitState
import com.example.moneyjar.ui.screens.RecordScreen
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class RecordScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun manualTypingUpdatesComposerAndSubmitCallsHandler() {
        var composer = ""
        var submitted = false

        composeRule.setContent {
            RecordScreen(
                uiState = MoneyJarUiState(recordComposerText = composer),
                onComposerChange = { composer = it },
                onSubmitVoiceText = { submitted = true },
                onRequestSpeechPermission = {},
                onStartListening = {},
                onSpeechResult = {},
                onSpeechFailed = {},
                onDismissMessage = {},
            )
        }

        composeRule.onNodeWithText("记账内容").performTextInput("午饭 32 元")
        composeRule.onNodeWithText("提交解析").performClick()

        assertEquals("午饭 32 元", composer)
        assertTrue(submitted)
    }

    @Test
    fun speechFilledComposerIsDisplayedForEditing() {
        composeRule.setContent {
            RecordScreen(
                uiState = MoneyJarUiState(recordComposerText = "打车回家 18 元"),
                onComposerChange = {},
                onSubmitVoiceText = {},
                onRequestSpeechPermission = {},
                onStartListening = {},
                onSpeechResult = {},
                onSpeechFailed = {},
                onDismissMessage = {},
            )
        }

        composeRule.onNodeWithText("打车回家 18 元").assertIsDisplayed()
    }

    @Test
    fun offlineRetryMessageIsDisplayed() {
        composeRule.setContent {
            RecordScreen(
                uiState = MoneyJarUiState(
                    recordComposerText = "午饭 32 元",
                    voiceSubmitState = VoiceSubmitState.NETWORK_FAILED,
                    formError = "当前无法连接服务器，内容已保留，请联网后重试。",
                ),
                onComposerChange = {},
                onSubmitVoiceText = {},
                onRequestSpeechPermission = {},
                onStartListening = {},
                onSpeechResult = {},
                onSpeechFailed = {},
                onDismissMessage = {},
            )
        }

        composeRule.onNodeWithText("当前无法连接服务器，内容已保留，请联网后重试。").assertIsDisplayed()
    }
}
