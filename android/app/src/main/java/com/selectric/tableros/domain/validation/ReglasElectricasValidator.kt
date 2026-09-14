package com.selectric.tableros.domain.validation

import com.selectric.tableros.data.remote.dto.Circuito

data class ValidationResult(
    val isValid: Boolean,
    val errorMessage: String? = null
)

object ReglasElectricasValidator {

    /**
     * Valida si un circuito (breaker) puede colocarse en una posición sin colisionar
     * con otros breakers y respetando el máximo de polos del tablero.
     * En tableros eléctricos residenciales/industriales:
     * - Columna izquierda: Polos Impares (1, 3, 5, 7...)
     * - Columna derecha: Polos Pares (2, 4, 6, 8...)
     * Un breaker multipolar (2P o 3P) desde la posición P ocupa P, P+2, P+4.
     */
    fun validarCircuito(
        posicionPolo: Int,
        numPolos: Int,
        maxPolos: Int,
        circuitosExistentes: List<Circuito>,
        circuitoActualId: String? = null
    ): ValidationResult {

        if (posicionPolo < 1 || posicionPolo > maxPolos) {
            return ValidationResult(false, "La posición del polo ($posicionPolo) debe estar entre 1 y $maxPolos.")
        }

        if (numPolos !in 1..3) {
            return ValidationResult(false, "El número de polos debe ser 1P, 2P o 3P.")
        }

        // Determinar los polos físicos ocupados por este breaker
        val polosOcupadosNuevos = (0 until numPolos).map { posicionPolo + (it * 2) }

        // Validar que no sobrepase el máximo de polos
        val maxPoloOcupado = polosOcupadosNuevos.maxOrNull() ?: posicionPolo
        if (maxPoloOcupado > maxPolos) {
            return ValidationResult(
                false,
                "Un breaker $numPolos P en la posición $posicionPolo requiere ocupar hasta el polo $maxPoloOcupado, superando el máximo del tablero ($maxPolos)."
            )
        }

        // Obtener todos los polos ocupados por circuitos existentes (excluyendo el que se está editando)
        val otrosCircuitos = circuitosExistentes.filter { it.id != circuitoActualId }
        val polosOcupadosExistentes = mutableSetOf<Int>()

        for (circuito in otrosCircuitos) {
            val start = circuito.posicionPolo
            val count = circuito.numPolos
            for (i in 0 until count) {
                polosOcupadosExistentes.add(start + (i * 2))
            }
        }

        // Verificar colisión
        val colisiones = polosOcupadosNuevos.filter { it in polosOcupadosExistentes }
        if (colisiones.isNotEmpty()) {
            return ValidationResult(
                false,
                "Colisión detectada: El polo(s) ${colisiones.joinToString(", ")} ya se encuentra(n) ocupado(s)."
            )
        }

        return ValidationResult(true)
    }
}
