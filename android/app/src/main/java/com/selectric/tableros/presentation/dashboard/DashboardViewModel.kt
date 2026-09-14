package com.selectric.tableros.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.selectric.tableros.data.local.TokenManager
import com.selectric.tableros.data.remote.ApiService
import com.selectric.tableros.data.remote.dto.Empresa
import com.selectric.tableros.data.remote.dto.HealthResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class DashboardUiState(
    val isLoading: Boolean = false,
    val username: String = "",
    val role: String = "",
    val serverStatus: String = "Conectado",
    val empresasCount: Int = 0,
    val errorMessage: String? = null
)

class DashboardViewModel(
    private val tokenManager: TokenManager,
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        DashboardUiState(
            username = tokenManager.getUsername() ?: "Inspector",
            role = tokenManager.getRole() ?: "WORKER"
        )
    )
    val uiState: StateFlow<DashboardUiState> = _uiState

    init {
        loadDashboardData()
    }

    fun loadDashboardData() {
        _uiState.value = _uiState.value.copy(isLoading = true)
        viewModelScope.launch {
            try {
                val empresasRes = apiService.getEmpresas()
                val count = if (empresasRes.isSuccessful) empresasRes.body()?.size ?: 0 else 0
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    empresasCount = count,
                    serverStatus = "En línea (OK)",
                    errorMessage = null
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    serverStatus = "Modo Offline",
                    errorMessage = null
                )
            }
        }
    }

    fun logout() {
        tokenManager.clear()
    }
}
