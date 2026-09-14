package com.selectric.tableros.data.local.dao

import androidx.room.*
import com.selectric.tableros.data.local.entities.CircuitoEntity
import com.selectric.tableros.data.local.entities.EmpresaEntity
import com.selectric.tableros.data.local.entities.TableroEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TablerosDao {

    // Empresas
    @Query("SELECT * FROM empresas_cache ORDER BY nombre ASC")
    fun getAllEmpresas(): Flow<List<EmpresaEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmpresas(empresas: List<EmpresaEntity>)

    // Tableros
    @Query("SELECT * FROM tableros_cache WHERE empresaId = :empresaId ORDER BY nombre ASC")
    fun getTablerosByEmpresa(empresaId: String): Flow<List<TableroEntity>>

    @Query("SELECT * FROM tableros_cache WHERE id = :id LIMIT 1")
    suspend fun getTableroById(id: String): TableroEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTableros(tableros: List<TableroEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTablero(tablero: TableroEntity)

    // Circuitos
    @Query("SELECT * FROM circuitos_cache WHERE tableroId = :tableroId ORDER BY posicionPolo ASC")
    fun getCircuitosByTablero(tableroId: String): Flow<List<CircuitoEntity>>

    @Query("SELECT * FROM circuitos_cache WHERE tableroId = :tableroId ORDER BY posicionPolo ASC")
    suspend fun getCircuitosByTableroSync(tableroId: String): List<CircuitoEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCircuitos(circuitos: List<CircuitoEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCircuito(circuito: CircuitoEntity)

    @Query("DELETE FROM circuitos_cache WHERE id = :id")
    suspend fun deleteCircuito(id: String)

    // Sincronización pendiente
    @Query("SELECT * FROM tableros_cache WHERE isPendingSync = 1")
    suspend fun getPendingSyncTableros(): List<TableroEntity>

    @Query("SELECT * FROM circuitos_cache WHERE isPendingSync = 1")
    suspend fun getPendingSyncCircuitos(): List<CircuitoEntity>
}
