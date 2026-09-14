package com.selectric.tableros.presentation.tablero

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.selectric.tableros.data.remote.dto.Circuito
import com.selectric.tableros.data.remote.dto.Tablero
import com.selectric.tableros.data.repository.TableroRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class TableroUiState {
    object Loading : TableroUiState()
    data class Success(val tablero: Tablero) : TableroUiState()
    data class Error(val message: String) : TableroUiState()
}

class TableroViewModel(
    private val repository: TableroRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<TableroUiState>(TableroUiState.Loading)
    val uiState: StateFlow<TableroUiState> = _uiState

    fun loadTablero(id: String) {
        _uiState.value = TableroUiState.Loading
        viewModelScope.launch {
            val result = repository.getTableroDetail(id)
            result.onSuccess { tab ->
                _uiState.value = TableroUiState.Success(tab)
            }.onFailure { ex ->
                _uiState.value = TableroUiState.Error(ex.localizedMessage ?: "Error al cargar tablero")
            }
        }
    }

    fun saveCircuito(tableroId: String, circuito: Circuito) {
        viewModelScope.launch {
            val result = repository.saveOrUpdateCircuito(tableroId, circuito)
            result.onSuccess {
                loadTablero(tableroId)
            }
        }
    }
}
