package com.selectric.tableros

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.compose.rememberNavController
import com.selectric.tableros.presentation.navigation.AppNavGraph
import com.selectric.tableros.presentation.theme.TablerosSelectricTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as TablerosApp

        setContent {
            TablerosSelectricTheme {
                val navController = rememberNavController()
                AppNavGraph(
                    navController = navController,
                    tokenManager = app.tokenManager,
                    apiService = app.apiService,
                    database = app.database
                )
            }
        }
    }
}
