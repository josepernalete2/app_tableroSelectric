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
            if (response.isSuccessful && response.body() != null) {
                val empresas = response.body()!!
                tablerosDao.insertEmpresas(empresas.map { EmpresaEntity.fromDomain(it) })
                Result.success(empresas)
            } else {
                Result.failure(Exception("Error al consultar empresas"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchProyectos(empresaId: String): Result<List<Proyecto>> {
        return try {
            val response = apiService.getProyectosPorEmpresa(empresaId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Error al consultar proyectos"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
