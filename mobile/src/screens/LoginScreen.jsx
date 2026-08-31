import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, ShieldCheck, Lock, User } from 'lucide-react-native';
import useStore from '../store/useStore';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('inspector_selectric');
  const [password, setPassword] = useState('123456');
  const { login, isLoading } = useStore();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa usuario y contraseña.');
      return;
    }

    const res = await login(username.trim(), password.trim());
    if (res.success) {
      navigation.replace('EmpresasScreen');
    } else {
      Alert.alert('Error de Autenticación', res.error || 'Usuario o contraseña no válidos.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo y Branding */}
        <View style={styles.brandingContainer}>
          <View style={styles.logoBadge}>
            <Zap size={36} color="#0f172a" fill="#0f172a" />
          </View>
          <Text style={styles.appTitle}>SELECTRIC</Text>
          <Text style={styles.appSubtitle}>Inspección Eléctrica Móvil & Unifilares</Text>
        </View>

        {/* Formulario de Login */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Iniciar Sesión</Text>
          <Text style={styles.cardHeaderSubtitle}>
            Accede a las inspecciones de tableros y subestaciones
          </Text>

          {/* Campo Usuario */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usuario / Correo</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej: inspector_selectric"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Campo Contraseña */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Botón de Entrada */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.btnDisabled]}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0f172a" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Ingresar al Sistema</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Informativo */}
        <View style={styles.footer}>
          <ShieldCheck size={14} color="#64748b" />
          <Text style={styles.footerText}>Modo Offline Activo • Almacenamiento Cifrado</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Slate 900
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#f59e0b', // Amber 500
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94a3b8', // Slate 400
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1e293b', // Slate 800
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155', // Slate 700
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a', // Fondo oscuro dentro de la card
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    height: '100%',
  },
  loginBtn: {
    backgroundColor: '#f59e0b', // Amber
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
});
