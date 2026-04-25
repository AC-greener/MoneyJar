package com.example.moneyjar.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.moneyjar.data.model.MoneyJarTransaction
import com.example.moneyjar.data.model.TransactionType
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun TransactionList(
    transactions: List<MoneyJarTransaction>,
    emptyTitle: String,
    emptySubtitle: String,
) {
    if (transactions.isEmpty()) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(text = emptyTitle, fontWeight = FontWeight.SemiBold)
                Text(text = emptySubtitle, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        transactions.forEach { transaction ->
            TransactionRow(transaction = transaction)
        }
    }
}

@Composable
private fun TransactionRow(transaction: MoneyJarTransaction) {
    val amountText = String.format(
        Locale.US,
        if (transaction.type == TransactionType.INCOME) "+¥%.2f" else "-¥%.2f",
        transaction.amount
    )

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = transaction.category,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = amountText,
                    color = if (transaction.type == TransactionType.INCOME) {
                        MaterialTheme.colorScheme.tertiary
                    } else {
                        MaterialTheme.colorScheme.primary
                    },
                    fontWeight = FontWeight.Bold
                )
            }
            Text(
                text = transaction.note,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = transaction.createdAt.format(DateTimeFormatter.ofPattern("MM-dd HH:mm")),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
