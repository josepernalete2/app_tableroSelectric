import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
} from 'lucide-react-native';
import useStore from '../store/useStore';

export default function SubestacionesScreen({ navigation, route }) {
  const { empresaId, proyectoId } = route.params || {};
  const { empresas, activeEmpresaId, activeProyectoId } = useStore();

  const currentEmpresaId = empresaId || activeEmpresaId;
  const currentProyectoId = proyectoId || activeProyectoId;

  const currentEmpresa = empresas.find((e) => e.id === currentEmpresaId) || empresas[0];
  const currentProyecto = currentEmpresa?.proyectos?.find((p) => p.id === currentProyectoId) || currentEmpresa?.proyectos?.[0];
  const subestacion = currentProyecto?.subestaciones?.[0] || {
    id: 'SUB-01',
    nombre: 'Subestación Principal 13.8kV / 480V',
    ubicacion: 'Patio Exterior Sur',
    nivelTension: '13.8 kV',
    inspector: 'Ing. Carlos Mendoza',
    fecha: '2026-02-28',
    hora: '10:00 AM'
  };

  const [nombre, setNombre] = useState(subestacion.nombre || '');
  const [ubicacion, setUbicacion] = useState(subestacion.ubicacion || '');
  const [nivelTension, setNivelTension] = useState(subestacion.nivelTension || '13.8 kV');
  const [inspector, setInspector] = useState(subestacion.inspector || '');
  const [tierraOhms, setTierraOhms] = useState(subestacion.puestaTierra?.valorMedidoOhms || '2.4');
  const [tempTrafo, setTempTrafo] = useState(subestacion.equiposPrincipales?.temperatura || '58°C');
  const [fugasAceite, setFugasAceite] = useState(false);
  const [observaciones, setObservaciones] = useState(subestacion.observaciones || '');

  const handleSave = () => {
    Alert.alert('Inspección Guardada', 'La inspección de subestación ha sido registrada localmente.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.subBadge}>
              <Text style={styles.subBadgeText}>{subestacion.id}</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {nombre}
            </Text>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentEmpresa?.nombre} • {currentProyecto?.nombre}
          </Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Save size={16} color="#0f172a" />
          <Text style={styles.saveBtnText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 1. Datos Generales */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>1. DATOS GENERALES DE LA SUBESTACIÓN</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Nombre / Código de Subestación</Text>
            <TextInput
              style={styles.formInput}
              value={nombre}
              onChangeText={setNombre}
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Nivel Tensión</Text>
              <TextInput
                style={styles.formInput}
                value={nivelTension}
                onChangeText={setNivelTension}
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1.5 }]}>
              <Text style={styles.formLabel}>Ubicación Física</Text>
              <TextInput
                style={styles.formInput}
                value={ubicacion}
                onChangeText={setUbicacion}
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Inspector a Cargo</Text>
            <TextInput
              style={styles.formInput}
              value={inspector}
              onChangeText={setInspector}
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        {/* 2. Transformador & Equipos Principales */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>2. TRANSFORMADOR DE POTENCIA</Text>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Temperatura (°C)</Text>
              <TextInput
                style={styles.formInput}
                value={tempTrafo}
                onChangeText={setTempTrafo}
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Presencia de Fugas</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, fugasAceite ? styles.toggleDanger : styles.toggleSuccess]}
                onPress={() => setFugasAceite(!fugasAceite)}
              >
                <Text style={styles.toggleBtnText}>{fugasAceite ? 'SÍ (Fuga)' : 'NO (Normal)'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. Sistema de Puesta a Tierra (SPAT) */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>3. SISTEMA DE PUESTA A TIERRA (SPAT)</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Resistencia Medida con Telurómetro (Ω)</Text>
            <TextInput
              style={styles.formInput}
              value={tierraOhms}
              onChangeText={setTierraOhms}
              keyboardType="numeric"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.normaBox}>
            <CheckCircle2 size={14} color="#34d399" />
            <Text style={styles.normaText}>
              IEEE Std 80 / Covenin 200: Resistencia admisible &lt; 5.0 Ω en subestaciones industriales.
            </Text>
          </View>
        </View>

        {/* 4. Observaciones y Conclusiones */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>4. OBSERVACIONES & HALLAZGOS</Text>
          <TextInput
            style={[styles.formInput, styles.formTextArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
            numberOfLines={4}
            placeholder="Registra detalles de herrajes, aisladores, nivel de aceite..."
            placeholderTextColor="#64748b"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subBadgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#ffffff',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleBtn: {
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleSuccess: {
    backgroundColor: '#065f46',
  },
  toggleDanger: {
    backgroundColor: '#7f1d1d',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  normaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  normaText: {
    fontSize: 10.5,
    color: '#cbd5e1',
    flex: 1,
  },
});
