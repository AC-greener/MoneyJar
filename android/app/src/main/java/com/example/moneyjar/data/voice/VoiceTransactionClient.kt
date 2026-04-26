package com.example.moneyjar.data.voice

import com.example.moneyjar.data.remote.TransactionApi
import com.example.moneyjar.data.remote.VoiceTransactionConfirmRequest
import com.example.moneyjar.data.remote.VoiceTransactionDraftResponse
import com.example.moneyjar.data.remote.VoiceTransactionSubmitRequest
import com.example.moneyjar.data.remote.VoiceTransactionSubmitResponse
import kotlinx.serialization.json.Json
import retrofit2.Response
import java.io.IOException

interface VoiceTransactionClient {
    suspend fun submit(request: VoiceTransactionSubmitRequest): VoiceTransactionClientResult

    suspend fun confirm(
        sourceText: String,
        drafts: List<VoiceTransactionDraftResponse>,
    ): VoiceTransactionClientResult
}

sealed interface VoiceTransactionClientResult {
    data class Success(val response: VoiceTransactionSubmitResponse) : VoiceTransactionClientResult
    data object NetworkFailure : VoiceTransactionClientResult
    data object AuthRequired : VoiceTransactionClientResult
    data class ServerFailure(val message: String) : VoiceTransactionClientResult
}

class RetrofitVoiceTransactionClient(
    private val api: TransactionApi,
    private val json: Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    },
) : VoiceTransactionClient {
    override suspend fun submit(request: VoiceTransactionSubmitRequest): VoiceTransactionClientResult {
        return callVoiceEndpoint { api.submitVoiceTransaction(request) }
    }

    override suspend fun confirm(
        sourceText: String,
        drafts: List<VoiceTransactionDraftResponse>,
    ): VoiceTransactionClientResult {
        return callVoiceEndpoint {
            api.confirmVoiceTransaction(
                VoiceTransactionConfirmRequest(
                    sourceText = sourceText,
                    drafts = drafts,
                )
            )
        }
    }

    private suspend fun callVoiceEndpoint(
        block: suspend () -> Response<VoiceTransactionSubmitResponse>,
    ): VoiceTransactionClientResult {
        return try {
            val response = block()
            response.toClientResult()
        } catch (_: IOException) {
            VoiceTransactionClientResult.NetworkFailure
        } catch (e: Exception) {
            VoiceTransactionClientResult.ServerFailure(e.message ?: "Unknown voice transaction error")
        }
    }

    private fun Response<VoiceTransactionSubmitResponse>.toClientResult(): VoiceTransactionClientResult {
        val body = body()
        if (isSuccessful && body != null) {
            return VoiceTransactionClientResult.Success(body)
        }

        if (code() == 401 || code() == 403) {
            return VoiceTransactionClientResult.AuthRequired
        }

        val errorText = errorBody()?.string()
        val parsedError = errorText?.let {
            runCatching { json.decodeFromString<VoiceTransactionSubmitResponse>(it) }.getOrNull()
        }
        if (parsedError != null) {
            return VoiceTransactionClientResult.Success(parsedError)
        }

        return VoiceTransactionClientResult.ServerFailure(errorText ?: "HTTP ${code()}")
    }
}
