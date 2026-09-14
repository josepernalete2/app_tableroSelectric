package com.selectric.tableros.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "secure_auth_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveAuth(token: String, userId: String, username: String, role: String, companyId: String? = null) {
        prefs.edit()
            .putString("auth_token", token)
            .putString("user_id", userId)
            .putString("username", username)
            .putString("role", role)
            .putString("company_id", companyId)
            .apply()
    }

    fun getToken(): String? = prefs.getString("auth_token", null)
    fun getUserId(): String? = prefs.getString("user_id", null)
    fun getUsername(): String? = prefs.getString("username", null)
    fun getRole(): String? = prefs.getString("role", null)
    fun getCompanyId(): String? = prefs.getString("company_id", null)

    fun isLoggedIn(): Boolean = !getToken().isNullOrEmpty()

    fun clear() {
        prefs.edit().clear().apply()
    }
}
