package com.selectric.tableros.data.remote

import com.selectric.tableros.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // --- AUTH ---
    @POST("login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // --- EMPRESAS ---
    @GET("empresas")
    suspend fun getEmpresas(): Response<ApiResponse<List<Empresa>>>

    @GET("empresas/{id}")
    suspend fun getEmpresaById(@Path("id") id: String): Response<ApiResponse<Empresa>>

    @POST("empresas")
    suspend fun createEmpresa(@Body empresa: Empresa): Response<ApiResponse<Empresa>>

    // --- PROYECTOS ---
    @GET("proyectos")
    suspend fun getProyectos(): Response<ApiResponse<List<Proyecto>>>

    @GET("empresas/{empresaId}/proyectos")
    suspend fun getProyectosPorEmpresa(@Path("empresaId") empresaId: String): Response<ApiResponse<List<Proyecto>>>

    @GET("proyectos/{id}")
    suspend fun getProyectoById(@Path("id") id: String): Response<ApiResponse<Proyecto>>

    // --- TABLEROS ---
    @GET("empresas/{empresaId}/tableros")
    suspend fun getTablerosPorEmpresa(@Path("empresaId") empresaId: String): Response<ApiResponse<List<Tablero>>>

    @GET("tableros/{id}")
    suspend fun getTableroById(@Path("id") id: String): Response<ApiResponse<Tablero>>

    @POST("tableros")
    suspend fun createTablero(@Body tablero: Tablero): Response<ApiResponse<Tablero>>

    @PUT("tableros/{id}")
    suspend fun updateTablero(@Path("id") id: String, @Body tablero: Tablero): Response<ApiResponse<Tablero>>

    @DELETE("tableros/{id}")
    suspend fun deleteTablero(@Path("id") id: String): Response<ApiResponse<Unit>>

    // --- CIRCUITOS ---
    @POST("tableros/{tableroId}/circuitos")
    suspend fun createCircuito(
        @Path("tableroId") tableroId: String,
        @Body circuito: Circuito
    ): Response<ApiResponse<Circuito>>

    @PUT("circuitos/{id}")
    suspend fun updateCircuito(
        @Path("id") id: String,
        @Body circuito: Circuito
    ): Response<ApiResponse<Circuito>>

    @DELETE("circuitos/{id}")
    suspend fun deleteCircuito(@Path("id") id: String): Response<ApiResponse<Unit>>

    // --- BATCH SYNC ---
    @POST("sync/batch")
    suspend fun syncBatch(@Body request: SyncBatchRequest): Response<ApiResponse<Unit>>

    // --- HEALTH ---
    @GET("../health")
    suspend fun checkHealth(): Response<HealthResponse>
}
