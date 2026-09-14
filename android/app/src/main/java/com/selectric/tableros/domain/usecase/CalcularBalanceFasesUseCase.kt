package com.selectric.tableros.domain.usecase

import com.selectric.tableros.data.remote.dto.Circuito

data class BalanceFases(
    val corrienteFaseA: Double = 0.0,
    val corrienteFaseB: Double = 0.0,
    val corrienteFaseC: Double = 0.0,
    val cargaTotalAmperios: Double = 0.0,
    val polosOcupados: Int = 0,
    val maxPolos: Int = 0,
    val porcentajeOcupacion: Double = 0.0,
    val porcentajeDesbalance: Double = 0.0
)

class CalcularBalanceFasesUseCase {

    fun execute(maxPolos: Int, circuitos: List<Circuito>, fases: Int = 3): BalanceFases {
        var corrienteA = 0.0
        var corrienteB = 0.0
        var corrienteC = 0.0
        val polosOcupadosSet = mutableSetOf<Int>()

        for (circuito in circuitos) {
            val amp = circuito.amperaje ?: 0.0
            val startPolo = circuito.posicionPolo
            val numPolos = circuito.numPolos

            for (i in 0 until numPolos) {
                val poloFisico = startPolo + (i * 2)
                polosOcupadosSet.add(poloFisico)

                // Asignar corriente a la fase correspondiente según la posición del polo
                val faseIndex = ((poloFisico - 1) / 2) % 3
                when (faseIndex) {
                    0 -> corrienteA += amp
                    1 -> corrienteB += amp
                    2 -> corrienteC += amp
                }
            }
        }

        val totalAmperios = corrienteA + corrienteB + corrienteC
        val polosOcupadosCount = polosOcupadosSet.size
        val porcentajeOcupacion = if (maxPolos > 0) (polosOcupadosCount.toDouble() / maxPolos.toDouble()) * 100.0 else 0.0

        // Cálculo de porcentaje de desbalance entre fases
        val promedio = if (fases > 0) totalAmperios / fases else totalAmperios
        val maxDev = maxOf(
            kotlin.math.abs(corrienteA - promedio),
            kotlin.math.abs(corrienteB - promedio),
            kotlin.math.abs(corrienteC - promedio)
        )
        val porcentajeDesbalance = if (promedio > 0) (maxDev / promedio) * 100.0 else 0.0

        return BalanceFases(
            corrienteFaseA = corrienteA,
            corrienteFaseB = corrienteB,
            corrienteFaseC = corrienteC,
            cargaTotalAmperios = totalAmperios,
            polosOcupados = polosOcupadosCount,
            maxPolos = maxPolos,
            porcentajeOcupacion = porcentajeOcupacion,
            porcentajeDesbalance = porcentajeDesbalance
        )
    }
}
