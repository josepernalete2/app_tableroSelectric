package com.selectric.tableros.data.repository

import com.selectric.tableros.data.local.dao.TablerosDao
import com.selectric.tableros.data.local.entities.EmpresaEntity
import com.selectric.tableros.data.remote.ApiService
import com.selectric.tableros.data.remote.dto.Empresa
import com.selectric.tableros.data.remote.dto.Proyecto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class EmpresasRepository(
    private val apiService: ApiService,
    private val tablerosDao: TablerosDao
) {
    fun getEmpresasLocal(): Flow<List<Empresa>> {
        return tablerosDao.getAllEmpresas().map { list ->
            list.map { it.toDomain() }
        }
    }

    suspend fun fetchEmpresasRemote(): Result<List<Empresa>> {
        return try {
            val response = apiService.getEmpresas()
            val body = response.body()
            if (response.isSuccessful && body != null && body.ok) {
                val empresas = body.data ?: emptyList()
                tablerosDao.insertEmpresas(empresas.map { EmpresaEntity.fromDomain(it) })
                Result.success(empresas)
            } else {
                val err = body?.error ?: "Error al consultar empresas (${response.code()})"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchProyectos(empresaId: String): Result<List<Proyecto>> {
        return try {
            val response = apiService.getProyectosPorEmpresa(empresaId)
            val body = response.body()
            if (response.isSuccessful && body != null && body.ok) {
                Result.success(body.data ?: emptyList())
            } else {
                val err = body?.error ?: "Error al consultar proyectos (${response.code()})"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
