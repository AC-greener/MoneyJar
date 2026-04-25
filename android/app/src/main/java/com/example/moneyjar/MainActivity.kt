package com.example.moneyjar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.moneyjar.data.repository.FakeTransactionRepository
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
                val repository = remember { FakeTransactionRepository() }
                val appViewModel: MoneyJarViewModel = viewModel(
                    factory = MoneyJarViewModelFactory(repository)
                )

                MoneyJarApp(viewModel = appViewModel)
            }
        }
    }
}
