package com.selectric.tableros.presentation.tablero

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.selectric.tableros.data.remote.dto.Circuito
import com.selectric.tableros.data.remote.dto.Tablero
import com.selectric.tableros.domain.usecase.CalcularBalanceFasesUseCase
import com.selectric.tableros.presentation.theme.StatusActive
import com.selectric.tableros.presentation.theme.StatusDisponible
import com.selectric.tableros.presentation.theme.StatusReserva
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TableroScreen(
    tableroId: String,
    viewModel: TableroViewModel,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedCircuitoForEdit by remember { mutableStateOf<Circuito?>(null) }
    var selectedPoloDefault by remember { mutableStateOf(1) }
    var showDialog by remember { mutableStateOf(false) }

    LaunchedEffect(tableroId) {
        viewModel.loadTablero(tableroId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    val title = (uiState as? TableroUiState.Success)?.tablero?.nombre ?: "Tablero Eléctrico"
                    Text(title, fontWeight = FontWeight.Bold)
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadTablero(tableroId) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Recargar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    selectedCircuitoForEdit = null
                    selectedPoloDefault = 1
                    showDialog = true
                },
                containerColor = MaterialTheme.colorScheme.secondary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nuevo Circuito")
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (val state = uiState) {
                is TableroUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                is TableroUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(state.message, color = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(onClick = { viewModel.loadTablero(tableroId) }) {
                            Text("Reintentar")
                        }
                    }
                }
                is TableroUiState.Success -> {
                    val tablero = state.tablero
                    TableroContent(
                        tablero = tablero,
                        onCircuitoClick = { circ ->
                            selectedCircuitoForEdit = circ
                            showDialog = true
                        },
                        onEmptyPoloClick = { polo ->
                            selectedCircuitoForEdit = null
                            selectedPoloDefault = polo
                            showDialog = true
                        }
                    )

                    if (showDialog) {
                        CircuitoEditDialog(
                            circuito = selectedCircuitoForEdit,
                            tableroId = tableroId,
                            maxPolos = tablero.maxPolos,
                            circuitosExistentes = tablero.circuitos,
                            posicionPoloDefault = selectedPoloDefault,
                            onDismiss = { showDialog = false },
                            onSave = { updatedCirc ->
                                viewModel.saveCircuito(tableroId, updatedCirc)
                                showDialog = false
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TableroContent(
    tablero: Tablero,
    onCircuitoClick: (Circuito) -> Unit,
    onEmptyPoloClick: (Int) -> Unit
) {
    val balanceUseCase = remember { CalcularBalanceFasesUseCase() }
    val balance = remember(tablero) {
        balanceUseCase.execute(
            maxPolos = tablero.maxPolos,
            circuitos = tablero.circuitos,
            fases = tablero.fases
        )
    }

    val circuitosMap = remember(tablero.circuitos) {
        val map = mutableMapOf<Int, Circuito>()
        for (c in tablero.circuitos) {
            val start = c.posicionPolo
            for (i in 0 until c.numPolos) {
                map[start + (i * 2)] = c
            }
        }
        map
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Resumen General del Tablero
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(14.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Capacidad: ${tablero.maxPolos} Polos", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Fases: ${tablero.fases}Ф", color = MaterialTheme.colorScheme.outline, fontSize = 13.sp)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Tensión: ${tablero.tension ?: "208/120V"}", fontWeight = FontWeight.Medium, fontSize = 15.sp)
                        Text("Ubicación: ${tablero.ubicacion ?: "N/D"}", color = MaterialTheme.colorScheme.outline, fontSize = 13.sp)
                    }
                }
            }
        }

        // Dashboard de Balance de Fases
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Dashboard de Balance de Cargas", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        MetricItem("Fase A", "${String.format(Locale.getDefault(), "%.1f", balance.corrienteFaseA)} A")
                        MetricItem("Fase B", "${String.format(Locale.getDefault(), "%.1f", balance.corrienteFaseB)} A")
                        MetricItem("Fase C", "${String.format(Locale.getDefault(), "%.1f", balance.corrienteFaseC)} A")
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Ocupación: ${String.format(Locale.getDefault(), "%.1f", balance.porcentajeOcupacion)}%", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text("Desbalance: ${String.format(Locale.getDefault(), "%.1f", balance.porcentajeDesbalance)}%", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }

        // Grilla Técnica de Polos Impares (Izquierda) y Pares (Derecha)
        item {
            Text(
                "Diagrama Físico de Polos (${tablero.maxPolos} Polos)",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }

        val rows = (tablero.maxPolos + 1) / 2
        items(rows) { rowIndex ->
            val oddPolo = (rowIndex * 2) + 1
            val evenPolo = (rowIndex * 2) + 2

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Polo Impar (Izquierda)
                Box(modifier = Modifier.weight(1f)) {
                    if (oddPolo <= tablero.maxPolos) {
                        PoleSlotItem(
                            poloNumber = oddPolo,
                            circuito = circuitosMap[oddPolo],
                            onCircuitoClick = onCircuitoClick,
                            onEmptyClick = { onEmptyPoloClick(oddPolo) }
                        )
                    }
                }

                // Polo Par (Derecha)
                Box(modifier = Modifier.weight(1f)) {
                    if (evenPolo <= tablero.maxPolos) {
                        PoleSlotItem(
                            poloNumber = evenPolo,
                            circuito = circuitosMap[evenPolo],
                            onCircuitoClick = onCircuitoClick,
                            onEmptyClick = { onEmptyPoloClick(evenPolo) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MetricItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.outline)
        Text(value, fontSize = 16.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun PoleSlotItem(
    poloNumber: Int,
    circuito: Circuito?,
    onCircuitoClick: (Circuito) -> Unit,
    onEmptyClick: () -> Unit
) {
    if (circuito != null) {
        val statusColor = when (circuito.estado) {
            "ACTIVO" -> StatusActive
            "RESERVA" -> StatusReserva
            else -> StatusDisponible
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onCircuitoClick(circuito) },
            shape = RoundedCornerShape(8.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text("$poloNumber", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.width(6.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = circuito.descripcion?.ifBlank { "Circuito" } ?: "Circuito",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        maxLines = 1
                    )
                    Text(
                        text = "${circuito.numPolos}P • ${circuito.amperaje ?: 20.0}A",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(statusColor)
                )
            }
        }
    } else {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                .clickable { onEmptyClick() }
                .padding(vertical = 10.dp, horizontal = 8.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "$poloNumber",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "+ Disponible",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.7f)
                )
            }
        }
    }
}
