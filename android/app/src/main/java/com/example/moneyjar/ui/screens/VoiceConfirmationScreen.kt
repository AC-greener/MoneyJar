package com.example.moneyjar.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.moneyjar.ui.app.EditableVoiceTransactionDraft
import com.example.moneyjar.ui.app.MoneyJarUiState

@Composable
fun VoiceConfirmationScreen(
    uiState: MoneyJarUiState,
    categories: List<String>,
    onBack: () -> Unit,
    onUpdateDraft: (
        index: Int,
        type: String?,
        amountInput: String?,
        category: String?,
        note: String?,
        occurredAt: String?,
    ) -> Unit,
    onConfirm: () -> Unit,
) {
    val confirmation = uiState.voiceConfirmation

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "返回")
            }
            Text(
                text = "确认 AI 记账",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
        }

        if (confirmation == null) {
            Text(
                text = "没有需要确认的草稿",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            return@Column
        }

        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
            )
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = "原文",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(text = confirmation.sourceText)
            }
        }

        confirmation.errorMessage?.let {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Text(
                    text = it,
                    modifier = Modifier.padding(12.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            itemsIndexed(confirmation.drafts) { index, draft ->
                DraftEditorCard(
                    index = index,
                    draft = draft,
                    categories = categories,
                    onUpdateDraft = onUpdateDraft,
                )
            }
        }

        Button(
            onClick = onConfirm,
            modifier = Modifier.fillMaxWidth(),
            enabled = !confirmation.isConfirming && confirmation.drafts.all { it.isValid }
        ) {
            Icon(
                Icons.Outlined.Check,
                contentDescription = null,
                modifier = Modifier.padding(end = 8.dp)
            )
            Text(if (confirmation.isConfirming) "确认中" else "确认保存")
        }
    }
}

@Composable
private fun DraftEditorCard(
    index: Int,
    draft: EditableVoiceTransactionDraft,
    categories: List<String>,
    onUpdateDraft: (
        index: Int,
        type: String?,
        amountInput: String?,
        category: String?,
        note: String?,
        occurredAt: String?,
    ) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "草稿 ${index + 1}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = draft.type == "expense",
                    onClick = {
                        onUpdateDraft(index, "expense", null, null, null, null)
                    },
                    label = { Text("支出") },
                )
                FilterChip(
                    selected = draft.type == "income",
                    onClick = {
                        onUpdateDraft(index, "income", null, null, null, null)
                    },
                    label = { Text("收入") },
                )
            }

            OutlinedTextField(
                value = draft.amountInput,
                onValueChange = { onUpdateDraft(index, null, it, null, null, null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                isError = draft.amountInput.toDoubleOrNull()?.let { it > 0 } != true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                label = { Text("金额") },
            )

            Text(
                text = "分类",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                categories.take(4).forEach { category ->
                    FilterChip(
                        selected = draft.category == category,
                        onClick = {
                            onUpdateDraft(index, null, null, category, null, null)
                        },
                        label = { Text(category) },
                    )
                }
            }
            OutlinedTextField(
                value = draft.category,
                onValueChange = { onUpdateDraft(index, null, null, it, null, null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                isError = draft.category.isBlank(),
                label = { Text("分类") },
            )

            OutlinedTextField(
                value = draft.note,
                onValueChange = { onUpdateDraft(index, null, null, null, it, null) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("备注") },
            )

            if (draft.missingFields.isNotEmpty()) {
                Text(
                    text = "需要确认：${draft.missingFields.joinToString()}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
            Text(
                text = "置信度 ${"%.0f".format(draft.confidence * 100)}%",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
