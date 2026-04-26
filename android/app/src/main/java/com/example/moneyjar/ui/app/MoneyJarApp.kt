package com.example.moneyjar.ui.app

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.moneyjar.auth.AuthManager
import com.example.moneyjar.ui.navigation.MoneyJarDestination
import com.example.moneyjar.ui.screens.LedgerScreen
import com.example.moneyjar.ui.screens.RecordScreen
import com.example.moneyjar.ui.screens.SettingsScreen
import com.example.moneyjar.ui.screens.StatsScreen
import com.example.moneyjar.ui.screens.SyncBadgeType
import com.example.moneyjar.ui.screens.VoiceConfirmationScreen

private const val VOICE_CONFIRMATION_ROUTE = "voice_confirmation"

@Composable
fun MoneyJarApp(
    viewModel: MoneyJarViewModel,
    authManager: AuthManager
) {
    val navController = rememberNavController()
    val uiState by viewModel.state.collectAsStateWithLifecycle()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // For demo purposes, using LOCAL sync badge
    // In production, this would come from SyncManager
    var syncBadgeType by remember { mutableStateOf(SyncBadgeType.LOCAL) }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            NavigationBar {
                MoneyJarDestination.entries.forEach { destination ->
                    val selected = currentDestination?.hierarchy?.any { it.route == destination.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(destination.route) {
                                popUpTo(navController.graph.startDestinationId) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(destination.icon, contentDescription = destination.label) },
                        label = { Text(destination.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        MoneyJarNavHost(
            paddingValues = innerPadding,
            uiState = uiState,
            onComposerChange = viewModel::updateRecordComposer,
            onSubmitVoiceText = viewModel::submitVoiceText,
            onRequestSpeechPermission = viewModel::markSpeechPermissionRequesting,
            onStartListening = viewModel::markSpeechListening,
            onSpeechResult = viewModel::applyRecognizedSpeech,
            onSpeechFailed = viewModel::markSpeechFailed,
            onConfirmationNavigationHandled = viewModel::onVoiceConfirmationNavigationHandled,
            onUpdateConfirmationDraft = viewModel::updateConfirmationDraft,
            onConfirmVoiceDrafts = viewModel::confirmVoiceDrafts,
            onClearMessage = viewModel::clearTransientMessage,
            authManager = authManager,
            syncBadgeType = syncBadgeType,
            navController = navController,
        )
    }
}

@Composable
private fun MoneyJarNavHost(
    paddingValues: PaddingValues,
    uiState: MoneyJarUiState,
    onComposerChange: (String) -> Unit,
    onSubmitVoiceText: () -> Unit,
    onRequestSpeechPermission: () -> Unit,
    onStartListening: () -> Unit,
    onSpeechResult: (String) -> Unit,
    onSpeechFailed: (String) -> Unit,
    onConfirmationNavigationHandled: () -> Unit,
    onUpdateConfirmationDraft: (
        index: Int,
        type: String?,
        amountInput: String?,
        category: String?,
        note: String?,
        occurredAt: String?,
    ) -> Unit,
    onConfirmVoiceDrafts: () -> Unit,
    onClearMessage: () -> Unit,
    authManager: AuthManager,
    syncBadgeType: SyncBadgeType,
    navController: androidx.navigation.NavHostController,
) {
    NavHost(
        navController = navController,
        startDestination = MoneyJarDestination.Record.route,
        modifier = Modifier.padding(paddingValues)
    ) {
        composable(MoneyJarDestination.Record.route) {
            LaunchedEffect(uiState.shouldNavigateToVoiceConfirmation) {
                if (uiState.shouldNavigateToVoiceConfirmation) {
                    navController.navigate(VOICE_CONFIRMATION_ROUTE)
                    onConfirmationNavigationHandled()
                }
            }
            RecordScreen(
                uiState = uiState,
                onComposerChange = onComposerChange,
                onSubmitVoiceText = onSubmitVoiceText,
                onRequestSpeechPermission = onRequestSpeechPermission,
                onStartListening = onStartListening,
                onSpeechResult = onSpeechResult,
                onSpeechFailed = onSpeechFailed,
                onDismissMessage = onClearMessage,
            )
        }
        composable(VOICE_CONFIRMATION_ROUTE) {
            VoiceConfirmationScreen(
                uiState = uiState,
                categories = MoneyJarUiState.DEFAULT_CATEGORIES,
                onBack = { navController.popBackStack() },
                onUpdateDraft = onUpdateConfirmationDraft,
                onConfirm = onConfirmVoiceDrafts,
            )
        }
        composable(MoneyJarDestination.Ledger.route) {
            LedgerScreen(uiState = uiState)
        }
        composable(MoneyJarDestination.Stats.route) {
            StatsScreen(uiState = uiState)
        }
        composable(MoneyJarDestination.Settings.route) {
            SettingsScreen(
                authManager = authManager,
                syncBadgeType = syncBadgeType,
                onLoginSuccess = { /* Login successful, trigger sync if needed */ },
                onLogoutComplete = { /* Logout complete */ }
            )
        }
    }
}
