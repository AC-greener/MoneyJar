package com.example.moneyjar.data.local

import androidx.room.TypeConverter
import com.example.moneyjar.data.model.OwnerType
import com.example.moneyjar.data.model.SyncState
import com.example.moneyjar.data.model.TransactionType
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

class Converters {
    private val formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME

    @TypeConverter
    fun fromLocalDateTime(value: LocalDateTime?): String? {
        return value?.format(formatter)
    }

    @TypeConverter
    fun toLocalDateTime(value: String?): LocalDateTime? {
        return value?.let { LocalDateTime.parse(it, formatter) }
    }

    @TypeConverter
    fun fromTransactionType(value: TransactionType): String {
        return value.name
    }

    @TypeConverter
    fun toTransactionType(value: String): TransactionType {
        return TransactionType.valueOf(value)
    }

    @TypeConverter
    fun fromSyncState(value: SyncState): String {
        return value.name
    }

    @TypeConverter
    fun toSyncState(value: String): SyncState {
        return SyncState.valueOf(value)
    }

    @TypeConverter
    fun fromOwnerType(value: OwnerType): String {
        return value.name
    }

    @TypeConverter
    fun toOwnerType(value: String): OwnerType {
        return OwnerType.valueOf(value)
    }
}
