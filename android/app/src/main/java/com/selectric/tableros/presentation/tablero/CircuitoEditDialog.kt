package com.selectric.tableros.presentation.tablero

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.selectric.tableros.data.remote.dto.Circuito
import com.selectric.tableros.domain.validation.ReglasElectricasValidator

@Composable
fun CircuitoEditDialog(
    circuito: Circuito?,
    tableroId: String,
    maxPolos: Int = 42,
    circuitosExistentes: List<Circuito> = emptyList(),
    posicionPoloDefault: Int = 1,
    onDismiss: () -> Unit,
    onSave: (Circuito) -> Unit
) {
    var poloText by remember { mutableStateOf(circuito?.posicionPolo?.toString() ?: posicionPoloDefault.toString()) }
    var numPolosText by remember { mutableStateOf(circuito?.numPolos?.toString() ?: "1") }
    var amperajeText by remember { mutableStateOf(circuito?.amperaje?.toString() ?: "20") }
    var descripcion by remember { mutableStateOf(circuito?.descripcion ?: "") }
    var estado by remember { mutableStateOf(circuito?.estado ?: "ACTIVO") }
    var validationError by remember { mutableStateOf<String?>(null) }

    val estados = listOf("ACTIVO", "RESERVA", "DISPONIBLE")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                if (circuito?.id == null) "Nuevo Circuito / Breaker" else "Editar Circuito #${circuito.posicionPolo}",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = poloText,
                        onValueChange = {
                            poloText = it
                            validationError = null
                        },
                        label = { Text("Polo #") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                    OutlinedTextField(
                        value = numPolosText,
                        onValueChange = {
                            numPolosText = it
                            validationError = null
                        },
                        label = { Text("Polos (1P/2P/3P)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    )
                }

                OutlinedTextField(
                    value = amperajeText,
                    onValueChange = { amperajeText = it },
                    label = { Text("Amperaje (A)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = descripcion,
                    onValueChange = { descripcion = it },
                    label = { Text("Descripción / Carga") },
                    placeholder = { Text("Ej. Iluminación Pasillo Norte") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Text("Estado del Interruptor:", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    estados.forEach { item ->
                        FilterChip(
                            selected = estado == item,
                            onClick = { estado = item },
                            label = { Text(item, fontSize = 11.sp) }
                        )
                    }
                }

                validationError?.let { err ->
                    Text(
                        text = err,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val pos = poloText.toIntOrNull() ?: 1
                    val poles = numPolosText.toIntOrNull() ?: 1
                    val amp = amperajeText.toDoubleOrNull() ?: 20.0

                    val validation = ReglasElectricasValidator.validarCircuito(
                        posicionPolo = pos,
                        numPolos = poles,
                        maxPolos = maxPolos,
                        circuitosExistentes = circuitosExistentes,
                        circuitoActualId = circuito?.id
                    )

                    if (!validation.isValid) {
                        validationError = validation.errorMessage
                    } else {
                        val updated = Circuito(
                            id = circuito?.id,
                            tableroId = tableroId,
                            posicionPolo = pos,
                            numPolos = poles,
                            amperaje = amp,
                            descripcion = descripcion.trim(),
                            estado = estado
                        )
                        onSave(updated)
                    }
                }
            ) {
                Text("Guardar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}
