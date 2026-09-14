package com.selectric.tableros.presentation.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Dashboard : Screen("dashboard")
    object Empresas : Screen("empresas")
    object Proyectos : Screen("proyectos/{empresaId}/{empresaNombre}") {
        fun createRoute(empresaId: String, empresaNombre: String) = "proyectos/$empresaId/$empresaNombre"
    }
    object Tablero : Screen("tablero/{tableroId}") {
        fun createRoute(tableroId: String) = "tablero/$tableroId"
    }
    object SubestacionDetail : Screen("subestacion/{subestacionId}") {
        fun createRoute(subestacionId: String) = "subestacion/$subestacionId"
    }
    object Ccm : Screen("ccm/{ccmId}") {
        fun createRoute(ccmId: String) = "ccm/$ccmId"
    }
    object Medicion : Screen("medicion/{puntoId}") {
        fun createRoute(puntoId: String) = "medicion/$puntoId"
    }
    object Unifilar : Screen("unifilar/{proyectoId}") {
        fun createRoute(proyectoId: String) = "unifilar/$proyectoId"
    }
}
