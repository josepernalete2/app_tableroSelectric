package com.selectric.tableros.presentation.subestaciones

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.selectric.tableros.data.remote.dto.InspeccionSubestacion
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class SubestacionUiState {
    object Idle : SubestacionUiState()
    object Loading : SubestacionUiState()
    object SavedSuccess : SubestacionUiState()
    data class Error(val message: String) : SubestacionUiState()
}

class SubestacionViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<SubestacionUiState>(SubestacionUiState.Idle)
    val uiState: StateFlow<SubestacionUiState> = _uiState

    fun guardarInspeccion(inspeccion: InspeccionSubestacion) {
        _uiState.value = SubestacionUiState.Loading
        viewModelScope.launch {
            try {
                // Sincronizar o guardar localmente
                _uiState.value = SubestacionUiState.SavedSuccess
            } catch (e: Exception) {
                _uiState.value = SubestacionUiState.Error(e.localizedMessage ?: "Error al guardar inspección")
            }
        }
    }
}
