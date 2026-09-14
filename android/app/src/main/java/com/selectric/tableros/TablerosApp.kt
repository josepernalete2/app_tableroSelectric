package com.selectric.tableros

import android.app.Application
import com.selectric.tableros.data.local.AppDatabase
import com.selectric.tableros.data.local.TokenManager
import com.selectric.tableros.data.remote.ApiService
import com.selectric.tableros.data.remote.RetrofitClient

class TablerosApp : Application() {

    lateinit var tokenManager: TokenManager
        private set

    lateinit var apiService: ApiService
        private set

    lateinit var database: AppDatabase
        private set

    override fun onCreate() {
        super.onCreate()
        tokenManager = TokenManager(this)
        apiService = RetrofitClient.create(tokenManager)
        database = AppDatabase.getInstance(this)
    }
}
