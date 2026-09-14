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
    suspend fun getEmpresas(): Response<List<Empresa>>

    @GET("empresas/{id}")
    suspend fun getEmpresaById(@Path("id") id: String): Response<Empresa>

    @POST("empresas")
    suspend fun createEmpresa(@Body empresa: Empresa): Response<Empresa>

    // --- PROYECTOS ---
    @GET("proyectos")
    suspend fun getProyectos(): Response<List<Proyecto>>

    @GET("empresas/{empresaId}/proyectos")
    suspend fun getProyectosPorEmpresa(@Path("empresaId") empresaId: String): Response<List<Proyecto>>

    @GET("proyectos/{id}")
    suspend fun getProyectoById(@Path("id") id: String): Response<Proyecto>

    // --- TABLEROS ---
    @GET("empresas/{empresaId}/tableros")
    suspend fun getTablerosPorEmpresa(@Path("empresaId") empresaId: String): Response<List<Tablero>>

    @GET("tableros/{id}")
    suspend fun getTableroById(@Path("id") id: String): Response<Tablero>

    @POST("tableros")
    suspend fun createTablero(@Body tablero: Tablero): Response<Tablero>

    @PUT("tableros/{id}")
    suspend fun updateTablero(@Path("id") id: String, @Body tablero: Tablero): Response<Tablero>

    @DELETE("tableros/{id}")
    suspend fun deleteTablero(@Path("id") id: String): Response<Unit>

    // --- CIRCUITOS ---
    @POST("tableros/{tableroId}/circuitos")
    suspend fun createCircuito(
        @Path("tableroId") tableroId: String,
        @Body circuito: Circuito
    ): Response<Circuito>

    @PUT("circuitos/{id}")
    suspend fun updateCircuito(
        @Path("id") id: String,
        @Body circuito: Circuito
    ): Response<Circuito>

    @DELETE("circuitos/{id}")
    suspend fun deleteCircuito(@Path("id") id: String): Response<Unit>

    // --- BATCH SYNC ---
    @POST("sync/batch")
    suspend fun syncBatch(@Body request: SyncBatchRequest): Response<Unit>

    // --- HEALTH ---
    @GET("../health")
    suspend fun checkHealth(): Response<HealthResponse>
}
