package com.selectric.tableros.data.repository

import com.selectric.tableros.data.local.TokenManager
import com.selectric.tableros.data.remote.ApiService
import com.selectric.tableros.data.remote.dto.LoginRequest
import com.selectric.tableros.data.remote.dto.UserDto

class AuthRepository(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) {
    suspend fun login(username: String, pass: String): Result<UserDto> {
        return try {
            val response = apiService.login(LoginRequest(username.trim(), pass))
            if (response.isSuccessful && response.body()?.ok == true) {
                val body = response.body()!!
                val user = body.user ?: return Result.failure(Exception("Datos de usuario vacíos"))
                tokenManager.saveAuth(
                    token = body.token ?: "",
                    userId = user.id,
                    username = user.username,
                    role = user.role,
                    companyId = user.companyId
                )
                Result.success(user)
            } else {
                val errMsg = response.body()?.error ?: "Error en la autenticación"
                Result.failure(Exception(errMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()

    fun logout() {
        tokenManager.clear()
    }
}
