package com.selectric.tableros.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.selectric.tableros.data.remote.dto.Circuito
import com.selectric.tableros.data.remote.dto.Empresa
import com.selectric.tableros.data.remote.dto.Proyecto
import com.selectric.tableros.data.remote.dto.Tablero

@Entity(tableName = "empresas_cache")
data class EmpresaEntity(
    @PrimaryKey val id: String,
    val nombre: String,
    val rif: String,
    val direccionFiscal: String,
    val direccion: String? = null
) {
    fun toDomain() = Empresa(
        id = id,
        nombre = nombre,
        rif = rif,
        direccionFiscal = direccionFiscal,
        direccion = direccion
    )

    companion object {
        fun fromDomain(e: Empresa) = EmpresaEntity(
            id = e.id,
            nombre = e.nombre,
            rif = e.rif,
            direccionFiscal = e.direccionFiscal,
            direccion = e.direccion
        )
    }
}

@Entity(tableName = "tableros_cache")
data class TableroEntity(
    @PrimaryKey val id: String,
    val nombre: String,
    val ubicacion: String?,
    val maxPolos: Int,
    val tension: String?,
    val fases: Int,
    val proyectoId: String,
    val empresaId: String?,
    val version: Int,
    val isPendingSync: Boolean = false
) {
    fun toDomain(circuitos: List<Circuito> = emptyList()) = Tablero(
        id = id,
        nombre = nombre,
        ubicacion = ubicacion,
        maxPolos = maxPolos,
        tension = tension,
        fases = fases,
        proyectoId = proyectoId,
        empresaId = empresaId,
        version = version,
        circuitos = circuitos
    )

    companion object {
        fun fromDomain(t: Tablero, isPendingSync: Boolean = false) = TableroEntity(
            id = t.id,
            nombre = t.nombre,
            ubicacion = t.ubicacion,
            maxPolos = t.maxPolos,
            tension = t.tension,
            fases = t.fases,
            proyectoId = t.proyectoId,
            empresaId = t.empresaId,
            version = t.version,
            isPendingSync = isPendingSync
        )
    }
}

@Entity(tableName = "circuitos_cache")
data class CircuitoEntity(
    @PrimaryKey val id: String,
    val tableroId: String,
    val posicionPolo: Int,
    val numPolos: Int,
    val amperaje: Double?,
    val descripcion: String?,
    val estado: String,
    val elementoDestinoId: String?,
    val version: Int,
    val isPendingSync: Boolean = false
) {
    fun toDomain() = Circuito(
        id = id,
        tableroId = tableroId,
        posicionPolo = posicionPolo,
        numPolos = numPolos,
        amperaje = amperaje,
        descripcion = descripcion,
        estado = estado,
        elementoDestinoId = elementoDestinoId,
        version = version
    )

    companion object {
        fun fromDomain(c: Circuito, isPendingSync: Boolean = false) = CircuitoEntity(
            id = c.id ?: java.util.UUID.randomUUID().toString(),
            tableroId = c.tableroId,
            posicionPolo = c.posicionPolo,
            numPolos = c.numPolos,
            amperaje = c.amperaje,
            descripcion = c.descripcion,
            estado = c.estado,
            elementoDestinoId = c.elementoDestinoId,
            version = c.version,
            isPendingSync = isPendingSync
        )
    }
}
