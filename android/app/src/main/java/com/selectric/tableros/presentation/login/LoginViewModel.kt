package com.selectric.tableros.presentation.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.selectric.tableros.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    object Success : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

class LoginViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState

    fun login(username: String, pass: String) {
        if (username.isBlank() || pass.isBlank()) {
            _uiState.value = LoginUiState.Error("Usuario y contraseña son requeridos")
            return
        }

        _uiState.value = LoginUiState.Loading
        viewModelScope.launch {
            val result = authRepository.login(username, pass)
            result.onSuccess {
                _uiState.value = LoginUiState.Success
            }.onFailure { ex ->
                _uiState.value = LoginUiState.Error(ex.localizedMessage ?: "Error al iniciar sesión")
            }
        }
    }
}
