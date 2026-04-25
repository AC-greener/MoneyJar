package com.example.moneyjar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.moneyjar.auth.AuthManager
import com.example.moneyjar.auth.AuthManagerFactory
import com.example.moneyjar.data.local.MoneyJarDatabase
import com.example.moneyjar.data.repository.RoomTransactionRepository
import com.example.moneyjar.ui.app.MoneyJarApp
import com.example.moneyjar.ui.app.MoneyJarViewModel
import com.example.moneyjar.ui.app.MoneyJarViewModelFactory
import com.example.moneyjar.ui.theme.MoneyJarTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MoneyJarTheme {
                val database = remember { MoneyJarDatabase.getInstance(applicationContext) }
                val repository = remember {
                    RoomTransactionRepository(database.transactionDao())
                }
                val appViewModel: MoneyJarViewModel = viewModel(
                    factory = MoneyJarViewModelFactory(repository)
                )
                val authManager: AuthManager = viewModel(
                    factory = AuthManagerFactory(applicationContext)
                )

                MoneyJarApp(viewModel = appViewModel, authManager = authManager)
            }
        }
    }
}
