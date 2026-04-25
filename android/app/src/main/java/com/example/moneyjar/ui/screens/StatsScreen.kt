package com.example.moneyjar.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.moneyjar.data.model.CategorySummary
import com.example.moneyjar.data.model.PeriodSummary
import com.example.moneyjar.ui.app.MoneyJarUiState
import java.util.Locale
import kotlin.math.roundToInt

@Composable
fun StatsScreen(uiState: MoneyJarUiState) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "统计",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SummaryCard(
                modifier = Modifier.weight(1f),
                title = "本周",
                summary = uiState.weeklySummary,
            )
            SummaryCard(
                modifier = Modifier.weight(1f),
                title = "本月",
                summary = uiState.monthlySummary,
            )
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = "本月分类占比",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                if (uiState.monthlySummary.categories.isEmpty()) {
                    Text(
                        text = "还没有可展示的支出分类，先去记一笔吧。",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    uiState.monthlySummary.categories.forEach { category ->
                        CategoryBreakdownRow(category, uiState.monthlySummary.expense)
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(
    modifier: Modifier = Modifier,
    title: String,
    summary: PeriodSummary,
) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            StatLine("收入", formatCurrency(summary.income))
            StatLine("支出", formatCurrency(summary.expense))
            StatLine("结余", formatCurrency(summary.balance))
        }
    }
}

@Composable
private fun StatLine(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun CategoryBreakdownRow(
    category: CategorySummary,
    totalExpense: Double,
) {
    val ratio = if (totalExpense <= 0) 0f else (category.amount / totalExpense).toFloat()
    val percentage = (ratio * 100).roundToInt()

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = category.category, fontWeight = FontWeight.Medium)
            Text(
                text = "${formatCurrency(category.amount)}  $percentage%",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(ratio.coerceIn(0f, 1f))
                    .height(10.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(MaterialTheme.colorScheme.primary)
            )
        }
    }
}

private fun formatCurrency(amount: Double): String = String.format(Locale.US, "¥%.2f", amount)
