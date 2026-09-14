package com.selectric.tableros.presentation.proyectos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.selectric.tableros.data.remote.dto.Proyecto
import com.selectric.tableros.data.remote.dto.Tablero
import com.selectric.tableros.data.repository.EmpresasRepository
import com.selectric.tableros.data.repository.TableroRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class ProyectosUiState {
    object Loading : ProyectosUiState()
    data class Success(
        val proyectos: List<Proyecto>,
        val tableros: List<Tablero>
    ) : ProyectosUiState()
    data class Error(val message: String) : ProyectosUiState()
}

class ProyectosViewModel(
    private val empresasRepository: EmpresasRepository,
    private val tableroRepository: TableroRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProyectosUiState>(ProyectosUiState.Loading)
    val uiState: StateFlow<ProyectosUiState> = _uiState

    fun loadData(empresaId: String) {
        _uiState.value = ProyectosUiState.Loading
        viewModelScope.launch {
            try {
                val proyectosResult = empresasRepository.fetchProyectos(empresaId)
                val tablerosResult = tableroRepository.fetchTablerosRemote(empresaId)

                val proyectos = proyectosResult.getOrDefault(emptyList())
                val tableros = tablerosResult.getOrDefault(emptyList())

                _uiState.value = ProyectosUiState.Success(proyectos, tableros)
            } catch (e: Exception) {
                _uiState.value = ProyectosUiState.Error(e.localizedMessage ?: "Error al cargar datos")
            }
        }
    }
}
