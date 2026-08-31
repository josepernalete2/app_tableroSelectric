import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Search, ChevronRight, RefreshCw, LogOut, Zap, Briefcase } from 'lucide-react-native';
import useStore from '../store/useStore';

export default function EmpresasScreen({ navigation }) {
  const {
    empresas,
    user,
    logout,
    setActiveEmpresa,
    fetchEmpresas,
    syncOfflineData,
    pendingSyncList,
    isLoading,
    isOnline,
  } = useStore();

  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const filteredEmpresas = empresas.filter(
    (emp) =>
      emp.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
      (emp.rif && emp.rif.toLowerCase().includes(searchText.toLowerCase()))
  );

  const handleSelectEmpresa = (empresaId) => {
    setActiveEmpresa(empresaId);
    navigation.navigate('ProyectosScreen', { empresaId });
  };

  const handleSync = async () => {
    const res = await syncOfflineData();
    if (res.success) {
      Alert.alert('Sincronización Exitosa', `Se sincronizaron ${res.count} registros con el servidor.`);
    } else {
      Alert.alert('Modo Offline', 'No se pudo contactar al servidor. Los datos se mantienen protegidos localmente.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.replace('LoginScreen');
        },
      },
    ]);
  };

  const renderEmpresaItem = ({ item }) => {
    const totalProyectos = item.proyectos?.length || 0;
    const totalTableros = (item.proyectos || []).reduce(
      (acc, p) => acc + (p.tableros?.length || 0),
      0
    );

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => handleSelectEmpresa(item.id)}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconContainer}>
            <Building2 size={22} color="#f59e0b" />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.empresaNombre} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={styles.empresaRif}>{item.rif || 'RIF no especificado'}</Text>
          </View>
          <ChevronRight size={20} color="#64748b" />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.statPill}>
            <Briefcase size={12} color="#38bdf8" />
            <Text style={styles.statText}>{totalProyectos} {totalProyectos === 1 ? 'Proyecto' : 'Proyectos'}</Text>
          </View>
          <View style={styles.statPill}>
            <Zap size={12} color="#34d399" />
            <Text style={styles.statText}>{totalTableros} Tableros</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Superior */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.logoBadgeSmall}>
            <Zap size={18} color="#0f172a" fill="#0f172a" />
          </View>
          <View>
            <Text style={styles.brandTitle}>SELECTRIC</Text>
            <Text style={styles.userRoleText}>
              {user?.role === 'ADMIN' ? '👑 Administrador' : '👷 Inspector'}: {user?.username || 'Operador'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.syncButton, pendingSyncList.length > 0 && styles.syncButtonPending]}
            activeOpacity={0.7}
            onPress={handleSync}
          >
            <RefreshCw size={15} color={pendingSyncList.length > 0 ? '#f59e0b' : '#38bdf8'} />
            <Text style={styles.syncButtonText}>
              {pendingSyncList.length > 0 ? `${pendingSyncList.length}` : isOnline ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Título de Sección y Buscador */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Selección de Empresa / Cliente</Text>
        <Text style={styles.sectionSubtitle}>
          Elige la empresa para visualizar sus proyectos e instalaciones eléctricas
        </Text>

        <View style={styles.searchWrapper}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o RIF..."
            placeholderTextColor="#64748b"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Lista de Empresas */}
      {isLoading && empresas.length === 0 ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loaderText}>Cargando empresas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmpresas}
          keyExtractor={(item) => item.id}
          renderItem={renderEmpresaItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Building2 size={44} color="#334155" />
              <Text style={styles.emptyTitle}>No se encontraron empresas</Text>
              <Text style={styles.emptySubtitle}>
                Verifica el texto de búsqueda o sincroniza con el servidor.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Slate 900
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadgeSmall: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  userRoleText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  syncButtonPending: {
    borderColor: '#f59e0b',
    backgroundColor: '#78350f22',
  },
  syncButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 14,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  empresaNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  empresaRif: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#94a3b8',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
    opacity: 0.6,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
