package com.selectric.tableros.presentation.ccm

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.selectric.tableros.data.remote.dto.GavetaCcm
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class CcmUiState {
    object Loading : CcmUiState()
    data class Success(val gavetas: List<GavetaCcm>) : CcmUiState()
    data class Error(val message: String) : CcmUiState()
}

class CcmViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<CcmUiState>(CcmUiState.Loading)
    val uiState: StateFlow<CcmUiState> = _uiState

    fun loadGavetas(ccmId: String) {
        _uiState.value = CcmUiState.Loading
        viewModelScope.launch {
            // Ejemplo de gavetas CCM
            val demoList = listOf(
                GavetaCcm("1", "Bomba Agua Potable #1", "Cubículo A1", 25.0, 35.0, "Schneider LC1D32", "OPERATIVO"),
                GavetaCcm("2", "Ventilador Extractor Norte", "Cubículo A2", 10.0, 15.0, "Siemens 3RT2026", "OPERATIVO"),
                GavetaCcm("3", "Compresor Aire Principal", "Cubículo B1", 50.0, 70.0, "ABB AF50", "MANTENIMIENTO")
            )
            _uiState.value = CcmUiState.Success(demoList)
        }
    }
}
