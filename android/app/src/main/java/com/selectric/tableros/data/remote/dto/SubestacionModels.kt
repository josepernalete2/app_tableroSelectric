package com.selectric.tableros.data.remote.dto

data class InspeccionSubestacion(
    val id: String? = null,
    val subestacionId: String,
    val fecha: String,
    val inspector: String,
    val supervisor: String?,
    val estadoEntorno: String = "BUENO",
    val obrasCiviles: String = "BUENO",
    val equiposPrincipales: String = "BUENO",
    val puestaATierra: String = "BUENO",
    val edificioControl: String = "BUENO",
    val observaciones: String? = null,
    val firmaInspectorBase64: String? = null,
    val firmaSupervisorBase64: String? = null
)

data class GavetaCcm(
    val id: String,
    val nombre: String,
    val cubiculo: String,
    val potenciaHp: Double?,
    val releTermicoA: Double?,
    val contactorModelo: String?,
    val estadoOperativo: String = "OPERATIVO" // OPERATIVO, MANTENIMIENTO, FUERA_DE_SERVICIO
)

data class PuntoMedicion(
    val id: String,
    val nombre: String,
    val tensionLL: Double, // V L-L
    val tensionLN: Double, // V L-N
    val corrienteA: Double,
    val factorPotencia: Double, // FP 0.0 - 1.0
    val frecuenciaHz: Double = 60.0,
    val fechaHora: String
)
