package com.example.moneyjar.ui.screens

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.example.moneyjar.ui.app.MoneyJarUiState
import com.example.moneyjar.ui.app.VoiceSpeechState
import com.example.moneyjar.ui.app.VoiceSubmitState
import com.example.moneyjar.ui.components.TransactionList

@Composable
fun RecordScreen(
    uiState: MoneyJarUiState,
    onComposerChange: (String) -> Unit,
    onSubmitVoiceText: () -> Unit,
    onRequestSpeechPermission: () -> Unit,
    onStartListening: () -> Unit,
    onSpeechResult: (String) -> Unit,
    onSpeechFailed: (String) -> Unit,
    onDismissMessage: () -> Unit,
) {
    val context = LocalContext.current
    var recognizer by remember { mutableStateOf<SpeechRecognizer?>(null) }

    fun startRecognition() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            onSpeechFailed("当前设备不支持语音识别，请手动输入。")
            return
        }
        onStartListening()
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(context).also { speechRecognizer ->
            speechRecognizer.setRecognitionListener(
                MoneyJarRecognitionListener(
                    onResult = onSpeechResult,
                    onError = onSpeechFailed,
                )
            )
            speechRecognizer.startListening(createRecognizerIntent())
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            startRecognition()
        } else {
            onSpeechFailed("没有麦克风权限，也可以继续手动输入。")
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            recognizer?.destroy()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "记一笔",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        ElevatedCard(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.elevatedCardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "AI 记账",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "说一句或打一段，提交后先解析，必要时再确认",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    AssistChip(
                        onClick = {},
                        enabled = false,
                        label = { Text(speechStatusText(uiState.voiceSpeechState)) },
                        leadingIcon = {
                            Icon(Icons.Outlined.Mic, contentDescription = null)
                        }
                    )
                }

                OutlinedTextField(
                    value = uiState.recordComposerText,
                    onValueChange = onComposerChange,
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4,
                    label = { Text("记账内容") },
                    placeholder = { Text("例如：午饭 32 元，打车回家 18 元") },
                    trailingIcon = {
                        IconButton(
                            onClick = {
                                if (ContextCompat.checkSelfPermission(
                                        context,
                                        Manifest.permission.RECORD_AUDIO,
                                    ) == PackageManager.PERMISSION_GRANTED
                                ) {
                                    startRecognition()
                                } else {
                                    onRequestSpeechPermission()
                                    permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                }
                            },
                            enabled = uiState.voiceSubmitState != VoiceSubmitState.SUBMITTING,
                        ) {
                            Icon(Icons.Outlined.Mic, contentDescription = "语音输入")
                        }
                    },
                )

                uiState.formError?.let {
                    MessageCard(message = it, isError = true, onDismiss = onDismissMessage)
                }
                uiState.successMessage?.let {
                    MessageCard(message = it, isError = false, onDismiss = onDismissMessage)
                }

                Button(
                    onClick = onSubmitVoiceText,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = uiState.voiceSubmitState != VoiceSubmitState.SUBMITTING
                ) {
                    if (uiState.voiceSubmitState == VoiceSubmitState.SUBMITTING) {
                        CircularProgressIndicator(
                            modifier = Modifier.padding(end = 10.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                    } else {
                        Icon(
                            Icons.Outlined.Send,
                            contentDescription = null,
                            modifier = Modifier.padding(end = 8.dp)
                        )
                    }
                    Text("提交解析")
                }
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "最近记录预览",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                TransactionList(
                    transactions = uiState.recentTransactions,
                    emptyTitle = "还没有账单",
                    emptySubtitle = "先在上面录入一笔，下面就会立刻刷新。"
                )
            }
        }
    }
}

private fun createRecognizerIntent(): Intent {
    return Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-CN")
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    }
}

private fun speechStatusText(state: VoiceSpeechState): String {
    return when (state) {
        VoiceSpeechState.REQUESTING_PERMISSION -> "等待授权"
        VoiceSpeechState.LISTENING -> "正在听"
        VoiceSpeechState.RECOGNIZED -> "已识别"
        VoiceSpeechState.CANCELLED -> "已取消"
        VoiceSpeechState.FAILED -> "识别失败"
        VoiceSpeechState.IDLE -> "可语音输入"
    }
}

private class MoneyJarRecognitionListener(
    private val onResult: (String) -> Unit,
    private val onError: (String) -> Unit,
) : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) = Unit
    override fun onBeginningOfSpeech() = Unit
    override fun onRmsChanged(rmsdB: Float) = Unit
    override fun onBufferReceived(buffer: ByteArray?) = Unit
    override fun onEndOfSpeech() = Unit
    override fun onPartialResults(partialResults: Bundle?) = Unit
    override fun onEvent(eventType: Int, params: Bundle?) = Unit

    override fun onError(error: Int) {
        onError("语音识别失败，可以重试或手动输入。")
    }

    override fun onResults(results: Bundle?) {
        val text = results
            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull()
            .orEmpty()
        if (text.isBlank()) {
            onError("没有识别到可用内容，可以重试或手动输入。")
        } else {
            onResult(text)
        }
    }
}

@Composable
private fun MessageCard(
    message: String,
    isError: Boolean,
    onDismiss: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isError) {
                MaterialTheme.colorScheme.errorContainer
            } else {
                MaterialTheme.colorScheme.tertiaryContainer
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = message,
                modifier = Modifier.weight(1f),
                color = if (isError) {
                    MaterialTheme.colorScheme.onErrorContainer
                } else {
                    MaterialTheme.colorScheme.onTertiaryContainer
                }
            )
            TextButton(onClick = onDismiss) {
                Text("知道了")
            }
        }
    }
}
