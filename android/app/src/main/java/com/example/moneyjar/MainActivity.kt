package com.example.moneyjar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.moneyjar.auth.AuthManager
import com.example.moneyjar.auth.AuthManagerFactory
import com.example.moneyjar.auth.SessionManager
import com.example.moneyjar.data.local.MoneyJarDatabase
import com.example.moneyjar.data.remote.AuthInterceptor
import com.example.moneyjar.data.remote.TransactionApi
import com.example.moneyjar.data.repository.RoomTransactionRepository
import com.example.moneyjar.data.voice.RetrofitVoiceTransactionClient
import com.example.moneyjar.ui.app.MoneyJarApp
import com.example.moneyjar.ui.app.MoneyJarViewModel
import com.example.moneyjar.ui.app.MoneyJarViewModelFactory
import com.example.moneyjar.ui.theme.MoneyJarTheme
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MoneyJarTheme {
                val sessionManager = remember { SessionManager(applicationContext) }
                val database = remember { MoneyJarDatabase.getInstance(applicationContext) }
                val transactionApi = remember {
                    val json = Json {
                        ignoreUnknownKeys = true
                        isLenient = true
                    }
                    val okHttpClient = OkHttpClient.Builder()
                        .connectTimeout(30, TimeUnit.SECONDS)
                        .readTimeout(30, TimeUnit.SECONDS)
                        .writeTimeout(30, TimeUnit.SECONDS)
                        .addInterceptor(AuthInterceptor(sessionManager))
                        .addInterceptor(HttpLoggingInterceptor().apply {
                            level = HttpLoggingInterceptor.Level.BODY
                        })
                        .build()
                    Retrofit.Builder()
                        .baseUrl(BuildConfig.BACKEND_URL)
                        .client(okHttpClient)
                        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                        .build()
                        .create(TransactionApi::class.java)
                }
                val repository = remember {
                    RoomTransactionRepository(database.transactionDao())
                }
                val voiceTransactionClient = remember(transactionApi) {
                    RetrofitVoiceTransactionClient(transactionApi)
                }
                val appViewModel: MoneyJarViewModel = viewModel(
                    factory = MoneyJarViewModelFactory(repository, voiceTransactionClient)
                )
                val authManager: AuthManager = viewModel(
                    factory = AuthManagerFactory(applicationContext, sessionManager)
                )

                MoneyJarApp(viewModel = appViewModel, authManager = authManager)
            }
        }
    }
}
