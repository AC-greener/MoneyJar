package com.example.moneyjar.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ListAlt
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.ui.graphics.vector.ImageVector

enum class MoneyJarDestination(
    val route: String,
    val label: String,
    val icon: ImageVector,
) {
    Record("record", "记一笔", Icons.Outlined.EditNote),
    Ledger("ledger", "明细", Icons.AutoMirrored.Outlined.ListAlt),
    Stats("stats", "统计", Icons.Outlined.BarChart),
    Settings("settings", "我的", Icons.Outlined.Settings),
}
