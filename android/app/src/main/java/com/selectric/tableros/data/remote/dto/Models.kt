package com.selectric.tableros.data.remote.dto

import com.google.gson.annotations.SerializedName

// --- AUTENTICACIÓN ---
data class LoginRequest(
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String
)

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("username") val username: String,
    @SerializedName("role") val role: String,
    @SerializedName("companyId") val companyId: String? = null
)

data class LoginResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("token") val token: String? = null,
    @SerializedName("user") val user: UserDto? = null,
    @SerializedName("error") val error: String? = null
)

// --- MODELOS DE LA APLICACIÓN ---
data class Empresa(
    @SerializedName("id") val id: String,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("rif") val rif: String,
    @SerializedName("direccionFiscal") val direccionFiscal: String,
    @SerializedName("direccion") val direccion: String? = null,
    @SerializedName("gerente1Nombre") val gerente1Nombre: String? = null,
    @SerializedName("gerente1Telefono") val gerente1Telefono: String? = null,
    @SerializedName("proyectos") val proyectos: List<Proyecto>? = null
)

data class Proyecto(
    @SerializedName("id") val id: String,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("direccion") val direccion: String,
    @SerializedName("descripcion") val descripcion: String? = null,
    @SerializedName("empresaId") val empresaId: String,
    @SerializedName("responsableNombre") val responsableNombre: String? = null,
    @SerializedName("responsableTelefono") val responsableTelefono: String? = null,
    @SerializedName("tableros") val tableros: List<Tablero>? = null
)

data class Circuito(
    @SerializedName("id") val id: String? = null,
    @SerializedName("tableroId") val tableroId: String,
    @SerializedName("posicionPolo") val posicionPolo: Int,
    @SerializedName("numPolos") val numPolos: Int = 1,
    @SerializedName("amperaje") val amperaje: Double? = null,
    @SerializedName("descripcion") val descripcion: String? = null,
    @SerializedName("estado") val estado: String = "ACTIVO", // ACTIVO, RESERVA, DISPONIBLE
    @SerializedName("elementoDestinoId") val elementoDestinoId: String? = null,
    @SerializedName("tipoElementoDestino") val tipoElementoDestino: String? = null,
    @SerializedName("version") val version: Int = 1
)

data class Tablero(
    @SerializedName("id") val id: String,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("ubicacion") val ubicacion: String? = null,
    @SerializedName("maxPolos") val maxPolos: Int = 42,
    @SerializedName("tension") val tension: String? = null,
    @SerializedName("fases") val fases: Int = 3,
    @SerializedName("alimentadorId") val alimentadorId: String? = null,
    @SerializedName("proyectoId") val proyectoId: String,
    @SerializedName("empresaId") val empresaId: String? = null,
    @SerializedName("version") val version: Int = 1,
    @SerializedName("circuitos") val circuitos: List<Circuito> = emptyList()
)

data class Subestacion(
    @SerializedName("id") val id: String,
    @SerializedName("nombre") val nombre: String,
    @SerializedName("ubicacion") val ubicacion: String,
    @SerializedName("fecha") val fecha: String,
    @SerializedName("hora") val hora: String,
    @SerializedName("inspector") val inspector: String,
    @SerializedName("nivelTension") val nivelTension: String,
    @SerializedName("proyectoId") val proyectoId: String,
    @SerializedName("empresaId") val empresaId: String? = null
)

data class HealthResponse(
    @SerializedName("status") val status: String,
    @SerializedName("uptime") val uptime: Double? = null,
    @SerializedName("date") val date: String? = null
)

// --- SYNC BATCH DTO ---
data class SyncMutation(
    @SerializedName("type") val type: String, // CREATE_TABLERO, UPDATE_CIRCUITO, etc.
    @SerializedName("payload") val payload: Any,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

data class SyncBatchRequest(
    @SerializedName("mutations") val mutations: List<SyncMutation>
)
