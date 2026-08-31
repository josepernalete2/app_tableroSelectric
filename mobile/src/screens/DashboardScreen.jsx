import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Zap,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
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
    isOnline,
  } = useStore();

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'Completado' | 'En Proceso' | 'Pendiente'

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const activeEmpresa = empresas.find((e) => e.id === activeEmpresaId) || empresas[0];
  const activeProyecto = activeEmpresa?.proyectos?.find((p) => p.id === activeProyectoId) || activeEmpresa?.proyectos?.[0];
  const tablerosList = activeProyecto?.tableros || [];

  // Filtrado por texto y por estado
  const filteredTableros = tablerosList.filter((tab) => {
    const matchesSearch =
      (tab.nombre && tab.nombre.toLowerCase().includes(searchText.toLowerCase())) ||
      (tab.codigo && tab.codigo.toLowerCase().includes(searchText.toLowerCase())) ||
      (tab.id && tab.id.toLowerCase().includes(searchText.toLowerCase())) ||
      (tab.ubicacion && tab.ubicacion.toLowerCase().includes(searchText.toLowerCase()));

    const matchesStatus =
      filterStatus === 'ALL' ? true : tab.estadoInspeccion === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Estadísticas de Inspección
  const totalCount = tablerosList.length;
  const completadosCount = tablerosList.filter((t) => t.estadoInspeccion === 'Completado').length;
  const enProcesoCount = tablerosList.filter((t) => t.estadoInspeccion === 'En Proceso').length;
  const pendientesCount = tablerosList.filter((t) => t.estadoInspeccion === 'Pendiente').length;

  const handleSelectTablero = (tableroId) => {
    setActiveTablero(tableroId);
    navigation.navigate('TableroScreen', { tableroId });
  };

  const handleSync = async () => {
    const res = await syncOfflineData();
    if (res.success) {
      Alert.alert('Sincronización Exitosa', `Se sincronizaron ${res.count} registros con el servidor.`);
    } else {
      Alert.alert('Modo Offline', 'Sin conexión al servidor. Los datos se guardan de forma local en el dispositivo.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completado':
        return {
          bg: '#065f46',
          text: '#34d399',
          label: 'Listo',
          icon: CheckCircle2,
        };
      case 'En Proceso':
        return {
          bg: '#78350f',
          text: '#fbbf24',
          label: 'En Proceso',
          icon: Clock,
        };
      default:
        return {
          bg: '#7f1d1d',
          text: '#f87171',
          label: 'Pendiente',
          icon: AlertCircle,
        };
    }
  };

  const renderTableroItem = ({ item }) => {
    const badge = getStatusBadge(item.estadoInspeccion);
    const StatusIcon = badge.icon;
    const circuitosCount = item.circuitos?.length || 0;

    return (
      <TouchableOpacity
        style={styles.tableroCard}
        activeOpacity={0.8}
        onPress={() => handleSelectTablero(item.id)}
      >
        {/* Cabecera de la Tarjeta */}
        <View style={styles.cardHeader}>
          {/* Badge Código Tablero */}
          <View style={styles.codigoBadge}>
            <Text style={styles.codigoBadgeText}>{item.codigo || item.id}</Text>
          </View>

          {/* Badge Estado */}
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <StatusIcon size={11} color={badge.text} />
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Título y Ubicación */}
        <Text style={styles.tableroNombre} numberOfLines={2}>
          {item.nombre}
        </Text>

        <View style={styles.ubicacionRow}>
          <MapPin size={13} color="#94a3b8" />
          <Text style={styles.ubicacionText} numberOfLines={1}>
            {item.ubicacion || 'Ubicación no especificada'}
          </Text>
        </View>

        {/* Separador */}
        <View style={styles.cardDivider} />

        {/* Parámetros Eléctricos y Datos Técnicos */}
        <View style={styles.cardFooterGrid}>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>TENSIÓN / FASES</Text>
            <Text style={styles.specValue}>
              {item.tension || item.voltajeNominal || '208V'} • {item.fases || 3}F
            </Text>
          </View>

          <View style={styles.specItem}>
            <Text style={styles.specLabel}>CAPACIDAD</Text>
            <Text style={styles.specValue}>{item.corrienteNominal || '400A'}</Text>
          </View>

          <View style={styles.specItem}>
            <Text style={styles.specLabel}>POLOS / GRADO</Text>
            <Text style={styles.specValue}>
              {circuitosCount}/{item.maxPolos || 42}P • {item.gradoProteccion || 'IP54'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Principal */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={18} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerCompany} numberOfLines={1}>
            {activeEmpresa?.nombre || 'Empresa'}
          </Text>
          <Text style={styles.headerProject} numberOfLines={1}>
            {activeProyecto?.nombre || 'Inspección de Tableros'}
          </Text>
        </View>

        {/* Badge Offline / Sync */}
        <TouchableOpacity
          style={[styles.syncBadge, pendingSyncList.length > 0 && styles.syncBadgePending]}
          activeOpacity={0.7}
          onPress={handleSync}
        >
          <View
            style={[
              styles.syncDot,
              { backgroundColor: pendingSyncList.length > 0 ? '#f59e0b' : isOnline ? '#34d399' : '#f87171' },
            ]}
          />
          <Text style={styles.syncBadgeText}>
            {pendingSyncList.length > 0 ? `${pendingSyncList.length} Pend.` : isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Barra de Métricas Rápidas (4 Cajas) */}
      <View style={styles.metricsContainer}>
        {/* Total */}
        <TouchableOpacity
          style={[styles.metricCard, filterStatus === 'ALL' && styles.metricCardActive]}
          activeOpacity={0.7}
          onPress={() => setFilterStatus('ALL')}
        >
          <Text style={styles.metricLabel}>TOTAL</Text>
          <Text style={[styles.metricNumber, { color: '#38bdf8' }]}>{totalCount}</Text>
        </TouchableOpacity>

        {/* Listo */}
        <TouchableOpacity
          style={[styles.metricCard, filterStatus === 'Completado' && styles.metricCardActive]}
          activeOpacity={0.7}
          onPress={() => setFilterStatus(filterStatus === 'Completado' ? 'ALL' : 'Completado')}
        >
          <Text style={styles.metricLabel}>LISTO</Text>
          <Text style={[styles.metricNumber, { color: '#34d399' }]}>{completadosCount}</Text>
        </TouchableOpacity>

        {/* En Proceso */}
        <TouchableOpacity
          style={[styles.metricCard, filterStatus === 'En Proceso' && styles.metricCardActive]}
          activeOpacity={0.7}
          onPress={() => setFilterStatus(filterStatus === 'En Proceso' ? 'ALL' : 'En Proceso')}
        >
          <Text style={styles.metricLabel}>PROCESO</Text>
          <Text style={[styles.metricNumber, { color: '#fbbf24' }]}>{enProcesoCount}</Text>
        </TouchableOpacity>

        {/* Pendiente */}
        <TouchableOpacity
          style={[styles.metricCard, filterStatus === 'Pendiente' && styles.metricCardActive]}
          activeOpacity={0.7}
          onPress={() => setFilterStatus(filterStatus === 'Pendiente' ? 'ALL' : 'Pendiente')}
        >
          <Text style={styles.metricLabel}>PENDIENTE</Text>
          <Text style={[styles.metricNumber, { color: '#f87171' }]}>{pendientesCount}</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Barra de Búsqueda */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrapper}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código, nombre, ubicación..."
            placeholderTextColor="#64748b"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearSearch}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4. Lista de Tableros */}
      <FlatList
        data={filteredTableros}
        keyExtractor={(item) => item.id}
        renderItem={renderTableroItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Zap size={40} color="#334155" />
            <Text style={styles.emptyTitle}>No hay tableros disponibles</Text>
            <Text style={styles.emptySubtitle}>
              No se encontraron tableros con el filtro seleccionado.
            </Text>
          </View>
        }
      />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerCompany: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
  },
  headerProject: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b', // Slate 800
    borderWidth: 1,
    borderColor: '#334155', // Slate 700
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  syncBadgePending: {
    borderColor: '#f59e0b',
    backgroundColor: '#78350f22',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#cbd5e1',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    alignItems: 'center',
  },
  metricCardActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f172a',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#ffffff',
  },
  clearSearch: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },
  tableroCard: {
    backgroundColor: '#1e293b', // Slate 800
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155', // Slate 700
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codigoBadge: {
    backgroundColor: '#1e3a8a', // Azul oscuro
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codigoBadgeText: {
    color: '#60a5fa', // Azul claro
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tableroNombre: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  ubicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  ubicacionText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 10,
    opacity: 0.7,
  },
  cardFooterGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  },
});
