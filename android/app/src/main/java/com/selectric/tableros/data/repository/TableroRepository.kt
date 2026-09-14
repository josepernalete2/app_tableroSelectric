package com.selectric.tableros.data.repository

import com.selectric.tableros.data.local.dao.TablerosDao
import com.selectric.tableros.data.local.entities.CircuitoEntity
import com.selectric.tableros.data.local.entities.TableroEntity
import com.selectric.tableros.data.remote.ApiService
import com.selectric.tableros.data.remote.dto.Circuito
import com.selectric.tableros.data.remote.dto.Tablero
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TableroRepository(
    private val apiService: ApiService,
    private val tablerosDao: TablerosDao
) {
    fun getTablerosLocal(empresaId: String): Flow<List<Tablero>> {
        return tablerosDao.getTablerosByEmpresa(empresaId).map { list ->
            list.map { it.toDomain() }
        }
    }

    suspend fun fetchTablerosRemote(empresaId: String): Result<List<Tablero>> {
        return try {
            val response = apiService.getTablerosPorEmpresa(empresaId)
            val body = response.body()
            if (response.isSuccessful && body != null && body.ok) {
                val tableros = body.data ?: emptyList()
                // Guardar en Room para caché offline
                tablerosDao.insertTableros(tableros.map { TableroEntity.fromDomain(it) })
                for (tablero in tableros) {
                    if (tablero.circuitos.isNotEmpty()) {
                        tablerosDao.insertCircuitos(tablero.circuitos.map { CircuitoEntity.fromDomain(it) })
                    }
                }
                Result.success(tableros)
            } else {
                val err = body?.error ?: "Error al cargar tableros del servidor (${response.code()})"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTableroDetail(tableroId: String): Result<Tablero> {
        return try {
            val response = apiService.getTableroById(tableroId)
            val body = response.body()
            if (response.isSuccessful && body != null && body.ok && body.data != null) {
                val tablero = body.data
                tablerosDao.insertTablero(TableroEntity.fromDomain(tablero))
                tablerosDao.insertCircuitos(tablero.circuitos.map { CircuitoEntity.fromDomain(it) })
                Result.success(tablero)
            } else {
                // Fallback a Room local
                val cached = tablerosDao.getTableroById(tableroId)
                if (cached != null) {
                    val circuitos = tablerosDao.getCircuitosByTableroSync(tableroId).map { it.toDomain() }
                    Result.success(cached.toDomain(circuitos))
                } else {
                    Result.failure(Exception(body?.error ?: "Tablero no encontrado"))
                }
            }
        } catch (e: Exception) {
            // Offline fallback
            val cached = tablerosDao.getTableroById(tableroId)
            if (cached != null) {
                val circuitos = tablerosDao.getCircuitosByTableroSync(tableroId).map { it.toDomain() }
                Result.success(cached.toDomain(circuitos))
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun saveOrUpdateCircuito(tableroId: String, circuito: Circuito): Result<Circuito> {
        return try {
            val response = if (circuito.id.isNullOrBlank()) {
                apiService.createCircuito(tableroId, circuito)
            } else {
                apiService.updateCircuito(circuito.id, circuito)
            }

            val body = response.body()
            if (response.isSuccessful && body != null && body.ok && body.data != null) {
                val saved = body.data
                tablerosDao.insertCircuito(CircuitoEntity.fromDomain(saved, isPendingSync = false))
                Result.success(saved)
            } else {
                // Guardar local con flag pendiente de sync
                tablerosDao.insertCircuito(CircuitoEntity.fromDomain(circuito, isPendingSync = true))
                Result.success(circuito)
            }
        } catch (e: Exception) {
            // Guardar local offline
            tablerosDao.insertCircuito(CircuitoEntity.fromDomain(circuito, isPendingSync = true))
            Result.success(circuito)
        }
    }
}
