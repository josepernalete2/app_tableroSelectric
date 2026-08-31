import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import EmpresasScreen from './src/screens/EmpresasScreen';
import ProyectosScreen from './src/screens/ProyectosScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TableroScreen from './src/screens/TableroScreen';
import SubestacionesScreen from './src/screens/SubestacionesScreen';
import useStore from './src/store/useStore';

const Stack = createNativeStackNavigator();

// Tema personalizado oscuro acorde al Design System de Selectric
const SelectricDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f172a', // Slate 900
    card: '#1e293b',       // Slate 800
    text: '#f8fafc',       // Slate 50
    border: '#334155',     // Slate 700
    primary: '#f59e0b',    // Amber 500
  },
};

export default function App() {
  const user = useStore((state) => state.user);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={SelectricDarkTheme}>
        <StatusBar style="light" backgroundColor="#0f172a" />
        <Stack.Navigator
          initialRouteName={user ? 'EmpresasScreen' : 'LoginScreen'}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="EmpresasScreen" component={EmpresasScreen} />
          <Stack.Screen name="ProyectosScreen" component={ProyectosScreen} />
          <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
          <Stack.Screen name="TableroScreen" component={TableroScreen} />
          <Stack.Screen name="SubestacionesScreen" component={SubestacionesScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
