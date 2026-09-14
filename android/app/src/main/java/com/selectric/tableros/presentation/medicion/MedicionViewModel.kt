package com.selectric.tableros.presentation.medicion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.selectric.tableros.data.remote.dto.PuntoMedicion
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class MedicionUiState {
    object Loading : MedicionUiState()
    data class Success(val punto: PuntoMedicion) : MedicionUiState()
    data class Error(val message: String) : MedicionUiState()
}

class MedicionViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<MedicionUiState>(MedicionUiState.Loading)
    val uiState: StateFlow<MedicionUiState> = _uiState

    fun loadPuntoMedicion(puntoId: String) {
        _uiState.value = MedicionUiState.Loading
        viewModelScope.launch {
            val demo = PuntoMedicion(
                id = puntoId,
                nombre = "Acometida Principal Subestación #1",
                tensionLL = 480.2,
                tensionLN = 277.1,
                corrienteA = 185.4,
                factorPotencia = 0.94,
                frecuenciaHz = 60.01,
                fechaHora = "2026-09-14 12:30:00"
            )
            _uiState.value = MedicionUiState.Success(demo)
        }
    }
}
