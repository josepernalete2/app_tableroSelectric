import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Briefcase,
  Search,
  ChevronRight,
  Zap,
  Radio,
  MapPin,
  FileText
} from 'lucide-react-native';
import useStore from '../store/useStore';

export default function ProyectosScreen({ navigation, route }) {
  const { empresaId } = route.params || {};
  const { empresas, activeEmpresaId, setActiveProyecto } = useStore();

  const currentEmpresaId = empresaId || activeEmpresaId;
  const currentEmpresa = empresas.find((e) => e.id === currentEmpresaId) || empresas[0];
  const proyectos = currentEmpresa?.proyectos || [];

  const [searchText, setSearchText] = useState('');

  const filteredProyectos = proyectos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchText.toLowerCase())) ||
      (p.direccion && p.direccion.toLowerCase().includes(searchText.toLowerCase()))
  );

  const handleSelectProyecto = (proyectoId) => {
    setActiveProyecto(proyectoId);
    navigation.navigate('DashboardScreen', { empresaId: currentEmpresa?.id, proyectoId });
  };

  const handleOpenSubestaciones = (proyectoId) => {
    setActiveProyecto(proyectoId);
    navigation.navigate('SubestacionesScreen', { empresaId: currentEmpresa?.id, proyectoId });
  };

  const renderProyectoItem = ({ item }) => {
    const totalTableros = item.tableros?.length || 0;
    const totalSubestaciones = item.subestaciones?.length || 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Briefcase size={20} color="#38bdf8" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.proyectoNombre}>{item.nombre}</Text>
            {item.direccion ? (
              <View style={styles.addressRow}>
                <MapPin size={11} color="#94a3b8" />
                <Text style={styles.addressText} numberOfLines={1}>
                  {item.direccion}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {item.descripcion ? (
          <Text style={styles.descripcionText} numberOfLines={2}>
            {item.descripcion}
          </Text>
        ) : null}

        <View style={styles.cardDivider} />

        {/* Acciones de Navegación por Módulo */}
        <View style={styles.actionsRow}>
          {/* Botón Tableros */}
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            activeOpacity={0.8}
            onPress={() => handleSelectProyecto(item.id)}
          >
            <Zap size={14} color="#0f172a" />
            <Text style={styles.actionBtnPrimaryText}>
              Tableros ({totalTableros})
            </Text>
            <ChevronRight size={14} color="#0f172a" />
          </TouchableOpacity>

          {/* Botón Subestaciones (si existen) */}
          {totalSubestaciones > 0 && (
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              activeOpacity={0.8}
              onPress={() => handleOpenSubestaciones(item.id)}
            >
              <Radio size={14} color="#38bdf8" />
              <Text style={styles.actionBtnSecondaryText}>
                Subestación ({totalSubestaciones})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerCompany} numberOfLines={1}>
            {currentEmpresa?.nombre || 'Empresa'}
          </Text>
          <Text style={styles.headerSubtitle}>Proyectos Eléctricos</Text>
        </View>
      </View>

      {/* Barra de Búsqueda */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrapper}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar proyecto por nombre, área..."
            placeholderTextColor="#64748b"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Listado de Proyectos */}
      <FlatList
        data={filteredProyectos}
        keyExtractor={(item) => item.id}
        renderItem={renderProyectoItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={44} color="#334155" />
            <Text style={styles.emptyTitle}>No hay proyectos registrados</Text>
            <Text style={styles.emptySubtitle}>
              Esta empresa no tiene proyectos asignados actualmente.
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
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerCompany: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    gap: 14,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  proyectoNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  addressText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  descripcionText: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 10,
    lineHeight: 17,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
    opacity: 0.6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
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
