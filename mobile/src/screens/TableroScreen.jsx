import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import useStore from '../store/useStore';

export default function TableroScreen({ route, navigation }) {
  const { tableroId } = route.params || {};
  const { empresas, activeEmpresaId, activeProyectoId, updateTableroInspeccion } = useStore();

  const activeEmpresa = empresas.find((e) => e.id === activeEmpresaId) || empresas[0];
  const activeProyecto = activeEmpresa?.proyectos?.find((p) => p.id === activeProyectoId) || activeEmpresa?.proyectos?.[0];
  const tableroData = activeProyecto?.tableros?.find((t) => t.id === tableroId) || activeProyecto?.tableros?.[0];

  // Estado del Formulario
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [voltaje, setVoltaje] = useState('');
  const [corriente, setCorriente] = useState('');
  const [gradoIp, setGradoIp] = useState('');
  const [marcas, setMarcas] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [estadoInspeccion, setEstadoInspeccion] = useState('Pendiente');

  // Checklist Items
  const [checklist, setChecklist] = useState({
    limpiezaGeneral: false,
    rotulacionSeñalizacion: false,
    aprieteConexiones: false,
    medicionAislamiento: false,
    sistemaPuestaTierra: false,
  });

  useEffect(() => {
    if (tableroData) {
      setNombre(tableroData.nombre || '');
      setUbicacion(tableroData.ubicacion || '');
      setVoltaje(tableroData.voltajeNominal || '');
      setCorriente(tableroData.corrienteNominal || '');
      setGradoIp(tableroData.gradoProteccion || '');
      setMarcas(tableroData.marcasEquipos || '');
      setObservaciones(tableroData.observaciones || '');
      setEstadoInspeccion(tableroData.estadoInspeccion || 'Pendiente');

      if (tableroData.itemsChecklist) {
        setChecklist(tableroData.itemsChecklist);
      }
    }
  }, [tableroData]);

  const handleToggleChecklist = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    if (!tableroId) return;

    const updatedData = {
      nombre,
      ubicacion,
      voltajeNominal: voltaje,
      corrienteNominal: corriente,
      gradoProteccion: gradoIp,
      marcasEquipos: marcas,
      observaciones,
      estadoInspeccion,
      itemsChecklist: checklist,
    };

    updateTableroInspeccion(tableroId, updatedData);
    Alert.alert('Inspección Guardada', 'Los cambios se han registrado localmente y se sincronizarán.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  if (!tableroData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Tablero no encontrado</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Volver al Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Navigation Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
            <Text style={styles.headerBackText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ficha Técnica e Inspección</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card Resumen de Ficha */}
          <View style={styles.infoCard}>
            <View style={styles.badgeId}>
              <Text style={styles.badgeIdText}>{tableroData.id}</Text>
            </View>
            <Text style={styles.tableroTitle}>{nombre}</Text>
            <Text style={styles.tableroSub}>📍 {ubicacion}</Text>
          </View>

          {/* Sección 1: Datos Eléctricos de Placa */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>⚡ Especificaciones Eléctricas</Text>

            <View style={styles.rowTwoCols}>
              <View style={styles.col}>
                <Text style={styles.label}>Voltaje Nominal</Text>
                <TextInput
                  style={styles.input}
                  value={voltaje}
                  onChangeText={setVoltaje}
                  placeholder="ej: 440V / 220V"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Corriente Nominal</Text>
                <TextInput
                  style={styles.input}
                  value={corriente}
                  onChangeText={setCorriente}
                  placeholder="ej: 800A"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={styles.col}>
                <Text style={styles.label}>Grado NEMA / IP</Text>
                <TextInput
                  style={styles.input}
                  value={gradoIp}
                  onChangeText={setGradoIp}
                  placeholder="ej: IP54"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Marcas de Componentes</Text>
                <TextInput
                  style={styles.input}
                  value={marcas}
                  onChangeText={setMarcas}
                  placeholder="ej: Schneider / ABB"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>
          </View>

          {/* Sección 2: Estado de la Inspección */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>📋 Estado de la Inspección</Text>

            <View style={styles.statusPickerRow}>
              {['Pendiente', 'En Proceso', 'Completado'].map((status) => {
                const isSelected = estadoInspeccion === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      isSelected && styles.statusChipActive,
                    ]}
                    onPress={() => setEstadoInspeccion(status)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isSelected && styles.statusChipTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sección 3: Lista de Verificación (Checklist Técnico) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>✅ Checklist de Verificación</Text>

            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Limpieza y despolvado general</Text>
              <Switch
                value={checklist.limpiezaGeneral}
                onValueChange={() => handleToggleChecklist('limpiezaGeneral')}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={checklist.limpiezaGeneral ? '#38bdf8' : '#94a3b8'}
              />
            </View>

            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Rotulación y señalización de riesgo</Text>
              <Switch
                value={checklist.rotulacionSeñalizacion}
                onValueChange={() => handleToggleChecklist('rotulacionSeñalizacion')}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={checklist.rotulacionSeñalizacion ? '#38bdf8' : '#94a3b8'}
              />
            </View>

            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Revisión y apriete de torque en barras</Text>
              <Switch
                value={checklist.aprieteConexiones}
                onValueChange={() => handleToggleChecklist('aprieteConexiones')}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={checklist.aprieteConexiones ? '#38bdf8' : '#94a3b8'}
              />
            </View>

            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Medición de aislamiento dieléctrico</Text>
              <Switch
                value={checklist.medicionAislamiento}
                onValueChange={() => handleToggleChecklist('medicionAislamiento')}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={checklist.medicionAislamiento ? '#38bdf8' : '#94a3b8'}
              />
            </View>

            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Verificación de puesta a tierra</Text>
              <Switch
                value={checklist.sistemaPuestaTierra}
                onValueChange={() => handleToggleChecklist('sistemaPuestaTierra')}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={checklist.sistemaPuestaTierra ? '#38bdf8' : '#94a3b8'}
              />
            </View>
          </View>

          {/* Sección 4: Observaciones Técnicas */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>📝 Observaciones y Recomendaciones</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Escriba aquí los hallazgos, anomalías o tareas pendientes..."
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Botón de Guardado */}
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={handleSave}>
            <Text style={styles.saveBtnText}>💾 Guardar Inspección</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerBackBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  headerBackText: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeId: {
    backgroundColor: '#0369a1',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeIdText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableroTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tableroSub: {
    color: '#94a3b8',
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  col: {
    flex: 1,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  statusChipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  checkLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    flex: 1,
    paddingRight: 10,
  },
  textArea: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 14,
  },
});
