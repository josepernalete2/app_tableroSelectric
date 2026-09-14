package com.selectric.tableros.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.selectric.tableros.data.local.AppDatabase
import com.selectric.tableros.data.local.TokenManager
import com.selectric.tableros.data.remote.ApiService
import com.selectric.tableros.data.repository.AuthRepository
import com.selectric.tableros.data.repository.EmpresasRepository
import com.selectric.tableros.data.repository.TableroRepository
import com.selectric.tableros.presentation.ccm.CcmScreen
import com.selectric.tableros.presentation.ccm.CcmViewModel
import com.selectric.tableros.presentation.dashboard.DashboardScreen
import com.selectric.tableros.presentation.dashboard.DashboardViewModel
import com.selectric.tableros.presentation.empresas.EmpresasScreen
import com.selectric.tableros.presentation.empresas.EmpresasViewModel
import com.selectric.tableros.presentation.login.LoginScreen
import com.selectric.tableros.presentation.login.LoginViewModel
import com.selectric.tableros.presentation.medicion.MedicionScreen
import com.selectric.tableros.presentation.medicion.MedicionViewModel
import com.selectric.tableros.presentation.proyectos.ProyectosScreen
import com.selectric.tableros.presentation.proyectos.ProyectosViewModel
import com.selectric.tableros.presentation.subestaciones.SubestacionScreen
import com.selectric.tableros.presentation.subestaciones.SubestacionViewModel
import com.selectric.tableros.presentation.tablero.TableroScreen
import com.selectric.tableros.presentation.tablero.TableroViewModel
import com.selectric.tableros.presentation.unifilar.UnifilarTreeScreen
import com.selectric.tableros.presentation.unifilar.UnifilarViewModel

@Composable
fun AppNavGraph(
    navController: NavHostController,
    tokenManager: TokenManager,
    apiService: ApiService,
    database: AppDatabase
) {
    val authRepository = AuthRepository(apiService, tokenManager)
    val empresasRepository = EmpresasRepository(apiService, database.tablerosDao())
    val tableroRepository = TableroRepository(apiService, database.tablerosDao())

    val startDestination = if (tokenManager.isLoggedIn()) Screen.Dashboard.route else Screen.Login.route

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // LOGIN
        composable(Screen.Login.route) {
            val viewModel = LoginViewModel(authRepository)
            LoginScreen(
                viewModel = viewModel,
                onLoginSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        // DASHBOARD
        composable(Screen.Dashboard.route) {
            val viewModel = DashboardViewModel(tokenManager, apiService)
            DashboardScreen(
                viewModel = viewModel,
                onNavigateEmpresas = { navController.navigate(Screen.Empresas.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                }
            )
        }

        // EMPRESAS
        composable(Screen.Empresas.route) {
            val viewModel = EmpresasViewModel(empresasRepository)
            EmpresasScreen(
                viewModel = viewModel,
                onEmpresaSelected = { empresa ->
                    navController.navigate(Screen.Proyectos.createRoute(empresa.id, empresa.nombre))
                }
            )
        }

        // PROYECTOS / TABLEROS
        composable(
            route = Screen.Proyectos.route,
            arguments = listOf(
                navArgument("empresaId") { type = NavType.StringType },
                navArgument("empresaNombre") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val empresaId = backStackEntry.arguments?.getString("empresaId") ?: ""
            val empresaNombre = backStackEntry.arguments?.getString("empresaNombre") ?: "Empresa"
            val viewModel = ProyectosViewModel(empresasRepository, tableroRepository)

            ProyectosScreen(
                empresaId = empresaId,
                empresaNombre = empresaNombre,
                viewModel = viewModel,
                onTableroSelected = { tableroId ->
                    navController.navigate(Screen.Tablero.createRoute(tableroId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // TABLERO DETALLE
        composable(
            route = Screen.Tablero.route,
            arguments = listOf(navArgument("tableroId") { type = NavType.StringType })
        ) { backStackEntry ->
            val tableroId = backStackEntry.arguments?.getString("tableroId") ?: ""
            val viewModel = TableroViewModel(tableroRepository)

            TableroScreen(
                tableroId = tableroId,
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }

        // SUBESTACION DETALLE
        composable(
            route = Screen.SubestacionDetail.route,
            arguments = listOf(navArgument("subestacionId") { type = NavType.StringType })
        ) { backStackEntry ->
            val subestacionId = backStackEntry.arguments?.getString("subestacionId") ?: ""
            val viewModel = SubestacionViewModel()

            SubestacionScreen(
                subestacionId = subestacionId,
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }

        // CCM (GAVETAS)
        composable(
            route = Screen.Ccm.route,
            arguments = listOf(navArgument("ccmId") { type = NavType.StringType })
        ) { backStackEntry ->
            val ccmId = backStackEntry.arguments?.getString("ccmId") ?: ""
            val viewModel = CcmViewModel()

            CcmScreen(
                ccmId = ccmId,
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }

        // PUNTO DE MEDICION
        composable(
            route = Screen.Medicion.route,
            arguments = listOf(navArgument("puntoId") { type = NavType.StringType })
        ) { backStackEntry ->
            val puntoId = backStackEntry.arguments?.getString("puntoId") ?: ""
            val viewModel = MedicionViewModel()

            MedicionScreen(
                puntoId = puntoId,
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }

        // DIAGRAMA UNIFILAR
        composable(
            route = Screen.Unifilar.route,
            arguments = listOf(navArgument("proyectoId") { type = NavType.StringType })
        ) { backStackEntry ->
            val proyectoId = backStackEntry.arguments?.getString("proyectoId") ?: ""
            val viewModel = UnifilarViewModel()

            UnifilarTreeScreen(
                proyectoId = proyectoId,
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
