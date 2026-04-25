package com.example.moneyjar.ui.screens

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.CloudDone
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.CloudSync
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.moneyjar.BuildConfig
import com.example.moneyjar.auth.AuthManager
import com.example.moneyjar.auth.AuthResult
import com.example.moneyjar.auth.AuthState
import com.example.moneyjar.auth.UserInfo
import kotlinx.coroutines.launch

enum class SyncBadgeType {
    LOCAL,
    SYNCING,
    SYNCED,
    ERROR
}

@Composable
fun SettingsScreen(
    authManager: AuthManager,
    syncBadgeType: SyncBadgeType = SyncBadgeType.LOCAL,
    onLoginSuccess: () -> Unit,
    onLogoutComplete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val authState by authManager.authState.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val syncDescriptions = mapOf(
        SyncBadgeType.LOCAL to "所有记录仅保存在本地",
        SyncBadgeType.SYNCING to "正在同步到云端...",
        SyncBadgeType.SYNCED to "所有记录已同步",
        SyncBadgeType.ERROR to "部分记录同步失败"
    )

    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK) return@rememberLauncherForActivityResult
        coroutineScope.launch {
            when (authManager.handleGoogleSignInIntent(result.data)) {
                is AuthResult.Success -> onLoginSuccess()
                is AuthResult.Error -> Unit
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "我的",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        AccountCard(
            authState = authState,
            onLoginClick = {
                if (BuildConfig.GOOGLE_CLIENT_ID.isBlank()) {
                    authManager.setConfigurationError("请先配置 MONEYJAR_GOOGLE_CLIENT_ID")
                } else {
                    googleSignInLauncher.launch(authManager.getGoogleSignInIntent())
                }
            },
            onLogoutClick = {
                authManager.logout()
                onLogoutComplete()
            }
        )

        SyncStatusCard(syncBadgeType = syncBadgeType, syncDescriptions = syncDescriptions)

        AppInfoCard()
    }
}

@Composable
private fun AccountCard(
    authState: AuthState,
    onLoginClick: () -> Unit,
    onLogoutClick: () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            when (authState) {
                is AuthState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.size(40.dp))
                    Text("加载中...", style = MaterialTheme.typography.bodyMedium)
                }

                is AuthState.Authenticated -> {
                    AuthenticatedUserView(
                        user = authState.user,
                        onLogoutClick = onLogoutClick
                    )
                }

                is AuthState.Unauthenticated -> {
                    UnauthenticatedUserView(onLoginClick = onLoginClick)
                }

                is AuthState.Error -> {
                    ErrorView(
                        message = authState.message,
                        onRetryClick = onLoginClick
                    )
                }
            }
        }
    }
}

@Composable
private fun AuthenticatedUserView(
    user: UserInfo,
    onLogoutClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = Icons.Outlined.AccountCircle,
            contentDescription = "Account",
            modifier = Modifier.size(72.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Text(text = user.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(
            text = user.email,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (user.plan != "free") {
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = MaterialTheme.shapes.small
            ) {
                Text(
                    text = user.plan.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
        Button(onClick = onLogoutClick) {
            Icon(Icons.Outlined.Logout, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("退出登录")
        }
    }
}

@Composable
private fun UnauthenticatedUserView(onLoginClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = Icons.Outlined.AccountCircle,
            contentDescription = "Account",
            modifier = Modifier.size(72.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(text = "未登录", style = MaterialTheme.typography.titleLarge)
        Text(
            text = "登录后自动同步记账数据",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Button(onClick = onLoginClick) {
            Text("登录")
        }
    }
}

@Composable
private fun ErrorView(message: String, onRetryClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            imageVector = Icons.Outlined.Warning,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.error
        )
        Text(text = "登录错误", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.error)
        Text(text = message, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Button(onClick = onRetryClick) { Text("重试") }
    }
}

@Composable
private fun SyncStatusCard(
    syncBadgeType: SyncBadgeType,
    syncDescriptions: Map<SyncBadgeType, String>,
) {
    val (icon, color) = when (syncBadgeType) {
        SyncBadgeType.LOCAL -> Icons.Outlined.CloudOff to MaterialTheme.colorScheme.onSurfaceVariant
        SyncBadgeType.SYNCING -> Icons.Outlined.CloudSync to MaterialTheme.colorScheme.primary
        SyncBadgeType.SYNCED -> Icons.Outlined.CloudDone to MaterialTheme.colorScheme.primary
        SyncBadgeType.ERROR -> Icons.Outlined.Warning to MaterialTheme.colorScheme.error
    }
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(32.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = "同步状态", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    text = syncDescriptions[syncBadgeType] ?: "",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun AppInfoCard() {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Outlined.Info, contentDescription = null)
            Text(text = "MoneyJar", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                text = "离线优先记账应用",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "后端地址: ${BuildConfig.BACKEND_URL}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
