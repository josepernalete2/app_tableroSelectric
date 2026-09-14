package com.selectric.tableros.presentation.empresas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.selectric.tableros.data.remote.dto.Empresa
import com.selectric.tableros.data.repository.EmpresasRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class EmpresasUiState {
    object Loading : EmpresasUiState()
    data class Success(val empresas: List<Empresa>) : EmpresasUiState()
    data class Error(val message: String) : EmpresasUiState()
}

class EmpresasViewModel(
    private val repository: EmpresasRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<EmpresasUiState>(EmpresasUiState.Loading)
    val uiState: StateFlow<EmpresasUiState> = _uiState

    init {
        loadEmpresas()
    }

    fun loadEmpresas() {
        _uiState.value = EmpresasUiState.Loading
        viewModelScope.launch {
            val result = repository.fetchEmpresasRemote()
            result.onSuccess { list ->
                _uiState.value = EmpresasUiState.Success(list)
            }.onFailure { ex ->
                _uiState.value = EmpresasUiState.Error(ex.localizedMessage ?: "Error al cargar empresas")
            }
        }
    }
}
