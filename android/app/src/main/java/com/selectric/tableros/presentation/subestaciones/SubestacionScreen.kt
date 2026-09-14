package com.selectric.tableros.presentation.subestaciones

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.selectric.tableros.data.remote.dto.InspeccionSubestacion
import com.selectric.tableros.presentation.components.SignaturePad

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubestacionScreen(
    subestacionId: String,
    viewModel: SubestacionViewModel,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    var inspectorName by remember { mutableStateOf("") }
    var supervisorName by remember { mutableStateOf("") }
    var entorno by remember { mutableStateOf("BUENO") }
    var obrasCiviles by remember { mutableStateOf("BUENO") }
    var equiposPrincipales by remember { mutableStateOf("BUENO") }
    var puestaATierra by remember { mutableStateOf("BUENO") }
    var edificioControl by remember { mutableStateOf("BUENO") }
    var observaciones by remember { mutableStateOf("") }
    var firmaInspector by remember { mutableStateOf<String?>(null) }
    var firmaSupervisor by remember { mutableStateOf<String?>(null) }

    val opcionesEvaluacion = listOf("BUENO", "REGULAR", "MALO", "N/A")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inspección de Subestación", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text("Datos Generales del Inspector", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = inspectorName,
                    onValueChange = { inspectorName = it },
                    label = { Text("Nombre del Inspector") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = supervisorName,
                    onValueChange = { supervisorName = it },
                    label = { Text("Nombre del Supervisor") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
            }

            item {
                Text("Evaluación de Componentes Técnicos", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }

            item {
                EvaluationBlock("Estado del Entorno / Perímetro", entorno, opcionesEvaluacion) { entorno = it }
            }

            item {
                EvaluationBlock("Obras Civiles y Estructuras", obrasCiviles, opcionesEvaluacion) { obrasCiviles = it }
            }

            item {
                EvaluationBlock("Equipos Principales (Transformadores/Celda)", equiposPrincipales, opcionesEvaluacion) { equiposPrincipales = it }
            }

            item {
                EvaluationBlock("Sistema de Puesta a Tierra", puestaATierra, opcionesEvaluacion) { puestaATierra = it }
            }

            item {
                EvaluationBlock("Edificio de Control y Protecciones", edificioControl, opcionesEvaluacion) { edificioControl = it }
            }

            item {
                OutlinedTextField(
                    value = observaciones,
                    onValueChange = { observaciones = it },
                    label = { Text("Observaciones / Hallazgos") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    shape = RoundedCornerShape(10.dp)
                )
            }

            item {
                Text("Firmas Digitales de Validación", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                SignaturePad(title = "Firma del Inspector", onSignatureCaptured = { firmaInspector = it })
                Spacer(modifier = Modifier.height(12.dp))
                SignaturePad(title = "Firma del Supervisor", onSignatureCaptured = { firmaSupervisor = it })
            }

            item {
                Button(
                    onClick = {
                        val inspeccion = InspeccionSubestacion(
                            subestacionId = subestacionId,
                            fecha = java.time.LocalDate.now().toString(),
                            inspector = inspectorName,
                            supervisor = supervisorName,
                            estadoEntorno = entorno,
                            obrasCiviles = obrasCiviles,
                            equiposPrincipales = equiposPrincipales,
                            puestaATierra = puestaATierra,
                            edificioControl = edificioControl,
                            observaciones = observaciones,
                            firmaInspectorBase64 = firmaInspector,
                            firmaSupervisorBase64 = firmaSupervisor
                        )
                        viewModel.guardarInspeccion(inspeccion)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Guardar Inspección", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun EvaluationBlock(
    title: String,
    currentValue: String,
    options: List<String>,
    onSelect: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                options.forEach { option ->
                    FilterChip(
                        selected = currentValue == option,
                        onClick = { onSelect(option) },
                        label = { Text(option, fontSize = 11.sp) }
                    )
                }
            }
        }
    }
}
