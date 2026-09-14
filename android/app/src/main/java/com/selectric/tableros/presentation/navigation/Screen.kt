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
    object Subestaciones : Screen("subestaciones/{proyectoId}") {
        fun createRoute(proyectoId: String) = "subestaciones/$proyectoId"
    }
}
