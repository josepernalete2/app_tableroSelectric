package com.selectric.tableros.presentation.tablero

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.selectric.tableros.data.remote.dto.Circuito
import com.selectric.tableros.data.remote.dto.Tablero
import com.selectric.tableros.presentation.theme.StatusActive
import com.selectric.tableros.presentation.theme.StatusDisponible
import com.selectric.tableros.presentation.theme.StatusReserva

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TableroScreen(
    tableroId: String,
    viewModel: TableroViewModel,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedCircuitoForEdit by remember { mutableStateOf<Circuito?>(null) }
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
                        }
                    )
                }
            }

            if (showDialog) {
                CircuitoEditDialog(
                    circuito = selectedCircuitoForEdit,
                    tableroId = tableroId,
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

@Composable
fun TableroContent(
    tablero: Tablero,
    onCircuitoClick: (Circuito) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Encabezado Técnico
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

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "Circuitos e Interruptores (${tablero.circuitos.size})",
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(tablero.circuitos.sortedBy { it.posicionPolo }) { circuito ->
                CircuitoCardItem(circuito = circuito, onClick = { onCircuitoClick(circuito) })
            }
        }
    }
}

@Composable
fun CircuitoCardItem(circuito: Circuito, onClick: () -> Unit) {
    val statusColor = when (circuito.estado) {
        "ACTIVO" -> StatusActive
        "RESERVA" -> StatusReserva
        else -> StatusDisponible
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "#${circuito.posicionPolo}",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontSize = 14.sp
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = circuito.descripcion?.ifBlank { "Sin descripción" } ?: "Sin descripción",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "${circuito.numPolos} Polo(s) • ${circuito.amperaje ?: 20.0}A",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(statusColor.copy(alpha = 0.15f))
                    .padding(horizontal = 10.dp, vertical = 5.dp)
            ) {
                Text(
                    text = circuito.estado,
                    color = statusColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
