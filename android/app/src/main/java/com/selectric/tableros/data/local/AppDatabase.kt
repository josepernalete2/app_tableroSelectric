package com.selectric.tableros.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.selectric.tableros.data.local.dao.SyncQueueDao
import com.selectric.tableros.data.local.dao.TablerosDao
import com.selectric.tableros.data.local.entities.CircuitoEntity
import com.selectric.tableros.data.local.entities.EmpresaEntity
import com.selectric.tableros.data.local.entities.SyncQueueEntity
import com.selectric.tableros.data.local.entities.TableroEntity

@Database(
    entities = [
        EmpresaEntity::class,
        TableroEntity::class,
        CircuitoEntity::class,
        SyncQueueEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun tablerosDao(): TablerosDao
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "tableros_selectric.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
