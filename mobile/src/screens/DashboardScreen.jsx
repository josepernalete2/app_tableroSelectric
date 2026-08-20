import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import useStore from '../store/useStore';

export default function DashboardScreen({ navigation }) {
  const {
    empresas,
    activeEmpresaId,
    activeProyectoId,
    setActiveTablero,
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

  const activeEmpresa = empresas.find((e) => e.id === activeEmpresaId) || empresas[0];
  const activeProyecto = activeEmpresa?.proyectos?.find((p) => p.id === activeProyectoId) || activeEmpresa?.proyectos?.[0];
  const tablerosList = activeProyecto?.tableros || [];

  // Filtrar tableros por búsqueda
  const filteredTableros = tablerosList.filter(
    (tab) =>
      tab.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
      tab.id.toLowerCase().includes(searchText.toLowerCase()) ||
      tab.ubicacion.toLowerCase().includes(searchText.toLowerCase())
  );

  // Estadísticas rápidas
  const totalCount = tablerosList.length;
  const completadosCount = tablerosList.filter((t) => t.estadoInspeccion === 'Completado').length;
  const pendientesCount = tablerosList.filter((t) => t.estadoInspeccion === 'Pendiente').length;
  const enProcesoCount = tablerosList.filter((t) => t.estadoInspeccion === 'En Proceso').length;

  const handleSelectTablero = (tableroId) => {
    setActiveTablero(tableroId);
    navigation.navigate('TableroScreen', { tableroId });
  };

  const handleSync = async () => {
    const res = await syncOfflineData();
    if (res.success) {
      Alert.alert('Sincronización Exitosa', `Se sincronizaron ${res.count} cambios con el servidor.`);
    } else {
      Alert.alert('Error de Sincronización', res.error || 'No fue posible conectar con el servidor.');
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Completado':
        return { container: styles.badgeSuccess, text: styles.badgeSuccessText };
      case 'En Proceso':
        return { container: styles.badgeWarning, text: styles.badgeWarningText };
      default:
        return { container: styles.badgeDanger, text: styles.badgeDangerText };
    }
  };

  const renderTableroItem = ({ item }) => {
    const badgeStyle = getStatusBadgeStyle(item.estadoInspeccion);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => handleSelectTablero(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.idContainer}>
            <Text style={styles.cardId}>{item.id}</Text>
          </View>
          <View style={[styles.badge, badgeStyle.container]}>
            <Text style={badgeStyle.text}>{item.estadoInspeccion || 'Pendiente'}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardSubtitle}>📍 {item.ubicacion}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>⚡ {item.voltajeNominal} | {item.corrienteNominal}</Text>
          <Text style={styles.cardMetaRight}>Protección: {item.gradoProteccion || 'IP54'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Header Principal */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyTitle}>{activeEmpresa?.nombre || 'Selectric Mobile'}</Text>
          <Text style={styles.projectSubtitle}>{activeProyecto?.nombre || 'General'}</Text>
        </View>

        <View style={styles.onlineBadge}>
          <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {/* Botón de Sincronización si hay pendientes */}
      {pendingSyncList.length > 0 && (
        <TouchableOpacity style={styles.syncBanner} onPress={handleSync} disabled={isLoading}>
          <Text style={styles.syncBannerText}>
            🔄 {pendingSyncList.length} cambios pendientes de sincronizar. Tap para Sync.
          </Text>
        </TouchableOpacity>
      )}

      {/* Tarjetas de Resumen Estadístico */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: '#1e293b' }]}>
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#065f46' }]}>
          <Text style={styles.statNumber}>{completadosCount}</Text>
          <Text style={styles.statLabel}>Listo</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#854d0e' }]}>
          <Text style={styles.statNumber}>{enProcesoCount}</Text>
          <Text style={styles.statLabel}>En Proceso</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#991b1b' }]}>
          <Text style={styles.statNumber}>{pendientesCount}</Text>
          <Text style={styles.statLabel}>Pendiente</Text>
        </View>
      </View>

      {/* Barra de Búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar tablero por código, nombre o ubicación..."
          placeholderTextColor="#94a3b8"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Lista de Tableros */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>Cargando datos del proyecto...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTableros}
          keyExtractor={(item) => item.id}
          renderItem={renderTableroItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron tableros que coincidan.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  companyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  projectSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#22c55e',
  },
  dotOffline: {
    backgroundColor: '#f59e0b',
  },
  onlineText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  syncBanner: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncBannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#e2e8f0',
    fontSize: 11,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  idContainer: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cardId: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#064e3b',
  },
  badgeSuccessText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeWarning: {
    backgroundColor: '#713f12',
  },
  badgeWarningText: {
    color: '#fde047',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeDanger: {
    backgroundColor: '#7f1d1d',
  },
  badgeDangerText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    pt: 8,
    paddingTop: 8,
  },
  cardMeta: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  cardMetaRight: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 10,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});
