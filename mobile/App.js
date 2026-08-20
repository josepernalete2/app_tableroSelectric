import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from './src/screens/DashboardScreen';
import TableroScreen from './src/screens/TableroScreen';

const Stack = createNativeStackNavigator();

// Tema personalizado oscuro para la aplicación móvil
const SelectricTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f172a',
    card: '#1e293b',
    text: '#f8fafc',
    border: '#334155',
    primary: '#38bdf8',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={SelectricTheme}>
        <StatusBar style="light" backgroundColor="#0f172a" />
        <Stack.Navigator
          initialRouteName="DashboardScreen"
          screenOptions={{
            headerShown: false, // Usamos headers personalizados dentro de las vistas
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="DashboardScreen"
            component={DashboardScreen}
            options={{ title: 'Dashboard Selectric' }}
          />
          <Stack.Screen
            name="TableroScreen"
            component={TableroScreen}
            options={{ title: 'Inspección de Tablero' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
