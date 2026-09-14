package com.selectric.tableros.presentation.unifilar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class UnifilarNode(
    val id: String,
    val nombre: String,
    val tipo: String, // ACOMETIDA, SUBESTACION, TABLERO_PRINCIPAL, TABLERO_SECUNDARIO
    val detalles: String,
    val hijos: List<UnifilarNode> = emptyList()
)

sealed class UnifilarUiState {
    object Loading : UnifilarUiState()
    data class Success(val rootNode: UnifilarNode) : UnifilarUiState()
    data class Error(val message: String) : UnifilarUiState()
}

class UnifilarViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<UnifilarUiState>(UnifilarUiState.Loading)
    val uiState: StateFlow<UnifilarUiState> = _uiState

    fun loadUnifilarTree(proyectoId: String) {
        _uiState.value = UnifilarUiState.Loading
        viewModelScope.launch {
            val root = UnifilarNode(
                id = "root",
                nombre = "Acometida General 13.8 kV",
                tipo = "ACOMETIDA",
                detalles = "Transformador 500 kVA",
                hijos = listOf(
                    UnifilarNode(
                        id = "sub1",
                        nombre = "Subestación Principal",
                        tipo = "SUBESTACION",
                        detalles = "480/277 V",
                        hijos = listOf(
                            UnifilarNode("tab1", "Tablero General TG-01", "TABLERO_PRINCIPAL", "42 Polos • 800A"),
                            UnifilarNode("tab2", "Tablero Emergencia TE-01", "TABLERO_SECUNDARIO", "24 Polos • 400A")
                        )
                    )
                )
            )
            _uiState.value = UnifilarUiState.Success(root)
        }
    }
}
