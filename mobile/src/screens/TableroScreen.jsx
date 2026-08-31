import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import {
  ArrowLeft,
  Save,
  Plus,
  Edit2,
  Trash2,
  Zap,
  Layers,
  FileText,
  X
} from 'lucide-react-native';
import useStore from '../store/useStore';

export default function TableroScreen({ route, navigation }) {
  const { tableroId } = route.params || {};
  const {
    empresas,
    activeEmpresaId,
    activeProyectoId,
    updateTableroInspeccion,
    updateCircuito,
    addCircuito,
    deleteCircuito
  } = useStore();

  const activeEmpresa = empresas.find((e) => e.id === activeEmpresaId) || empresas[0];
  const activeProyecto = activeEmpresa?.proyectos?.find((p) => p.id === activeProyectoId) || activeEmpresa?.proyectos?.[0];
  const tableroData = activeProyecto?.tableros?.find((t) => t.id === tableroId) || activeProyecto?.tableros?.[0];

  // Pestaña Activa: 'FICHA' | 'CIRCUITOS' | 'UNIFILAR'
  const [activeTab, setActiveTab] = useState('FICHA');

  // Estado Ficha Técnica
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [tension, setTension] = useState('');
  const [fases, setFases] = useState('3');
  const [maxPolos, setMaxPolos] = useState('42');
  const [gradoIp, setGradoIp] = useState('');
  const [corriente, setCorriente] = useState('');
  const [estadoInspeccion, setEstadoInspeccion] = useState('Pendiente');
  const [observaciones, setObservaciones] = useState('');

  // Breaker Principal
  const [breakerMarca, setBreakerMarca] = useState('');
  const [breakerModelo, setBreakerModelo] = useState('');
  const [breakerAmp, setBreakerAmp] = useState('');
  const [breakerIcu, setBreakerIcu] = useState('');

  // Acometida y Puesta a Tierra
  const [acometidaCalibre, setAcometidaCalibre] = useState('');
  const [tierraCalibre, setTierraCalibre] = useState('');
  const [tierraOhms, setTierraOhms] = useState('');

  // Estado del Modal de Edición de Circuito
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCircuito, setEditingCircuito] = useState(null);
  const [circPolo, setCircPolo] = useState('1');
  const [circNumPolos, setCircNumPolos] = useState('1');
  const [circAmp, setCircAmp] = useState('20');
  const [circFase, setCircFase] = useState('A');
  const [circDesc, setCircDesc] = useState('');
  const [circTipo, setCircTipo] = useState('Termomagnético');
  const [circEstado, setCircEstado] = useState('ACTIVO');

  useEffect(() => {
    if (tableroData) {
      setNombre(tableroData.nombre || '');
      setUbicacion(tableroData.ubicacion || '');
      setTension(tableroData.tension || tableroData.voltajeNominal || '480V / 277V');
      setFases(String(tableroData.fases || 3));
      setMaxPolos(String(tableroData.maxPolos || 42));
      setGradoIp(tableroData.gradoProteccion || 'IP54');
      setCorriente(tableroData.corrienteNominal || '800A');
      setEstadoInspeccion(tableroData.estadoInspeccion || 'Pendiente');
      setObservaciones(tableroData.observaciones || '');

      // Breaker Principal
      const bp = tableroData.breakerPrincipal || {};
      setBreakerMarca(bp.marca || '');
      setBreakerModelo(bp.modelo || '');
      setBreakerAmp(String(bp.amperaje || ''));
      setBreakerIcu(bp.capacidadInterruptiva || '');

      // Acometida y Tierra
      setAcometidaCalibre(tableroData.acometida?.calibre || '');
      setTierraCalibre(tableroData.puestaTierra?.calibre || '');
      setTierraOhms(String(tableroData.puestaTierra?.resistenciaOhms || ''));
    }
  }, [tableroData]);

  const handleSaveFicha = () => {
    if (!tableroId) return;

    const updatedData = {
      nombre,
      ubicacion,
      tension,
      voltajeNominal: tension,
      fases: parseInt(fases, 10) || 3,
      maxPolos: parseInt(maxPolos, 10) || 42,
      gradoProteccion: gradoIp,
      corrienteNominal: corriente,
      estadoInspeccion,
      observaciones,
      breakerPrincipal: {
        marca: breakerMarca,
        modelo: breakerModelo,
        amperaje: parseFloat(breakerAmp) || 0,
        capacidadInterruptiva: breakerIcu,
      },
      acometida: {
        calibre: acometidaCalibre,
      },
      puestaTierra: {
        calibre: tierraCalibre,
        resistenciaOhms: parseFloat(tierraOhms) || 0,
      }
    };

    updateTableroInspeccion(tableroId, updatedData);
    Alert.alert('Ficha Guardada', 'La ficha técnica ha sido actualizada localmente.');
  };

  // Abrir modal para crear o editar circuito
  const handleOpenCircuitoModal = (circuito = null) => {
    if (circuito) {
      setEditingCircuito(circuito);
      setCircPolo(String(circuito.posicionPolo || 1));
      setCircNumPolos(String(circuito.numPolos || 1));
      setCircAmp(String(circuito.amperaje || 20));
      setCircFase(circuito.fase || 'A');
      setCircDesc(circuito.descripcion || '');
      setCircTipo(circuito.tipoBreaker || 'Termomagnético');
      setCircEstado(circuito.estado || 'ACTIVO');
    } else {
      setEditingCircuito(null);
      const nextPolo = ((tableroData?.circuitos || []).length * 2) + 1;
      setCircPolo(String(nextPolo <= (parseInt(maxPolos, 10) || 42) ? nextPolo : 1));
      setCircNumPolos('1');
      setCircAmp('20');
      setCircFase('A');
      setCircDesc('');
      setCircTipo('Termomagnético');
      setCircEstado('ACTIVO');
    }
    setModalVisible(true);
  };

  const handleSaveCircuito = () => {
    if (!circDesc.trim()) {
      Alert.alert('Campo requerido', 'Por favor describe la carga del circuito.');
      return;
    }

    const payload = {
      posicionPolo: parseInt(circPolo, 10) || 1,
      numPolos: parseInt(circNumPolos, 10) || 1,
      amperaje: parseFloat(circAmp) || 0,
      fase: circFase,
      descripcion: circDesc.trim(),
      tipoBreaker: circTipo,
      estado: circEstado,
    };

    if (editingCircuito) {
      updateCircuito(tableroId, editingCircuito.id, payload);
    } else {
      addCircuito(tableroId, payload);
    }

    setModalVisible(false);
  };

  const handleDeleteCircuito = (circuitoId) => {
    Alert.alert('Eliminar Circuito', '¿Confirmas la eliminación de este circuito derivado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteCircuito(tableroId, circuitoId);
          setModalVisible(false);
        },
      },
    ]);
  };

  if (!tableroData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Tablero no encontrado</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
            <Text style={styles.btnPrimaryText}>Volver al Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const circuitos = tableroData.circuitos || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Superior */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={18} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.codeRow}>
            <View style={styles.codigoBadge}>
              <Text style={styles.codigoBadgeText}>{tableroData.codigo || tableroData.id}</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {nombre || 'Tablero'}
            </Text>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            📍 {ubicacion || 'Sin ubicación'}
          </Text>
        </View>

        <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSaveFicha}>
          <Save size={16} color="#0f172a" />
          <Text style={styles.saveHeaderBtnText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Pestañas Segmentadas */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'FICHA' && styles.tabBtnActive]}
          onPress={() => setActiveTab('FICHA')}
        >
          <FileText size={14} color={activeTab === 'FICHA' ? '#38bdf8' : '#94a3b8'} />
          <Text style={[styles.tabBtnText, activeTab === 'FICHA' && styles.tabBtnTextActive]}>
            Ficha Técnica
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'CIRCUITOS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('CIRCUITOS')}
        >
          <Zap size={14} color={activeTab === 'CIRCUITOS' ? '#38bdf8' : '#94a3b8'} />
          <Text style={[styles.tabBtnText, activeTab === 'CIRCUITOS' && styles.tabBtnTextActive]}>
            Circuitos ({circuitos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'UNIFILAR' && styles.tabBtnActive]}
          onPress={() => setActiveTab('UNIFILAR')}
        >
          <Layers size={14} color={activeTab === 'UNIFILAR' ? '#38bdf8' : '#94a3b8'} />
          <Text style={[styles.tabBtnText, activeTab === 'UNIFILAR' && styles.tabBtnTextActive]}>
            Unifilar
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Contenido de la Pestaña Activa */}
      {activeTab === 'FICHA' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Selector de Estado de Inspección */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Estado de la Inspección</Text>
            <View style={styles.statusSelector}>
              {[
                { key: 'Completado', label: 'Listo', bg: '#065f46', text: '#34d399' },
                { key: 'En Proceso', label: 'En Proceso', bg: '#78350f', text: '#fbbf24' },
                { key: 'Pendiente', label: 'Pendiente', bg: '#7f1d1d', text: '#f87171' },
              ].map((st) => {
                const isSelected = estadoInspeccion === st.key;
                return (
                  <TouchableOpacity
                    key={st.key}
                    style={[
                      styles.statusOption,
                      isSelected && { backgroundColor: st.bg, borderColor: st.text },
                    ]}
                    onPress={() => setEstadoInspeccion(st.key)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        isSelected ? { color: st.text, fontWeight: '800' } : { color: '#94a3b8' },
                      ]}
                    >
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Datos Generales */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Datos Generales del Gabinete</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nombre del Tablero</Text>
              <TextInput
                style={styles.formInput}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Tablero General TGD-01"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ubicación Física</Text>
              <TextInput
                style={styles.formInput}
                value={ubicacion}
                onChangeText={setUbicacion}
                placeholder="Ej: Sótano Sala de Tableros"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Tensión (V)</Text>
                <TextInput
                  style={styles.formInput}
                  value={tension}
                  onChangeText={setTension}
                  placeholder="480V / 277V"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Fases</Text>
                <TextInput
                  style={styles.formInput}
                  value={fases}
                  onChangeText={setFases}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Max Polos</Text>
                <TextInput
                  style={styles.formInput}
                  value={maxPolos}
                  onChangeText={setMaxPolos}
                  keyboardType="numeric"
                  placeholder="42"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Capacidad (A)</Text>
                <TextInput
                  style={styles.formInput}
                  value={corriente}
                  onChangeText={setCorriente}
                  placeholder="800A"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Grado IP / NEMA</Text>
                <TextInput
                  style={styles.formInput}
                  value={gradoIp}
                  onChangeText={setGradoIp}
                  placeholder="IP54"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>
          </View>

          {/* Interruptor Principal */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Interruptor Principal (Main Breaker)</Text>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Marca</Text>
                <TextInput
                  style={styles.formInput}
                  value={breakerMarca}
                  onChangeText={setBreakerMarca}
                  placeholder="Schneider / ABB"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Modelo / Serie</Text>
                <TextInput
                  style={styles.formInput}
                  value={breakerModelo}
                  onChangeText={setBreakerModelo}
                  placeholder="NSX800"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Amperaje Nominal (A)</Text>
                <TextInput
                  style={styles.formInput}
                  value={breakerAmp}
                  onChangeText={setBreakerAmp}
                  keyboardType="numeric"
                  placeholder="800"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Capacidad Interrup. (kA)</Text>
                <TextInput
                  style={styles.formInput}
                  value={breakerIcu}
                  onChangeText={setBreakerIcu}
                  placeholder="65 kA"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>
          </View>

          {/* Acometida y Puesta a Tierra */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Acometida & Sistema de Puesta a Tierra</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Calibre Acometida Alimentador</Text>
              <TextInput
                style={styles.formInput}
                value={acometidaCalibre}
                onChangeText={setAcometidaCalibre}
                placeholder="Ej: 3x(3x500 MCM) + 1x500 Neutro"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1.5 }]}>
                <Text style={styles.formLabel}>Calibre Conductor Tierra</Text>
                <TextInput
                  style={styles.formInput}
                  value={tierraCalibre}
                  onChangeText={setTierraCalibre}
                  placeholder="1x4/0 AWG"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Resistencia (Ω)</Text>
                <TextInput
                  style={styles.formInput}
                  value={tierraOhms}
                  onChangeText={setTierraOhms}
                  keyboardType="numeric"
                  placeholder="2.4"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>
          </View>

          {/* Observaciones Generales */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Observaciones de Campo & Hallazgos</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              numberOfLines={4}
              placeholder="Escribe notas sobre termografía, estado de bornes, aprietes..."
              placeholderTextColor="#64748b"
            />
          </View>
        </ScrollView>
      )}

      {/* 4. Pestaña de Circuitos Derivados */}
      {activeTab === 'CIRCUITOS' && (
        <View style={styles.circuitosContainer}>
          <View style={styles.circuitsToolbar}>
            <Text style={styles.circuitsTitle}>Circuitos del Tablero</Text>
            <TouchableOpacity
              style={styles.addCircuitoBtn}
              activeOpacity={0.8}
              onPress={() => handleOpenCircuitoModal()}
            >
              <Plus size={14} color="#0f172a" />
              <Text style={styles.addCircuitoBtnText}>Agregar Circuito</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.circuitsListContent}>
            {circuitos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Zap size={36} color="#334155" />
                <Text style={styles.emptyTitle}>No hay circuitos registrados</Text>
                <Text style={styles.emptySubtitle}>Pulsa "Agregar Circuito" para comenzar el inventario.</Text>
              </View>
            ) : (
              circuitos.map((circ, index) => {
                const isActivo = circ.estado === 'ACTIVO';
                return (
                  <TouchableOpacity
                    key={circ.id || index}
                    style={styles.circuitoRow}
                    activeOpacity={0.7}
                    onPress={() => handleOpenCircuitoModal(circ)}
                  >
                    {/* Polo & Fase */}
                    <View style={styles.circPoloBadge}>
                      <Text style={styles.circPoloText}>P{circ.posicionPolo}</Text>
                      <Text style={styles.circFaseText}>{circ.fase || 'A'}</Text>
                    </View>

                    {/* Descripción y Tipo */}
                    <View style={styles.circInfo}>
                      <Text style={styles.circDesc} numberOfLines={2}>
                        {circ.descripcion || 'Sin descripción'}
                      </Text>
                      <Text style={styles.circSub}>
                        {circ.numPolos || 1}P • {circ.tipoBreaker || 'Termomagnético'}
                      </Text>
                    </View>

                    {/* Amperaje y Estado */}
                    <View style={styles.circAmpContainer}>
                      <Text style={styles.circAmpText}>{circ.amperaje || 20}A</Text>
                      <View style={[styles.circStatusPill, isActivo ? styles.statusActivo : styles.statusReserva]}>
                        <Text style={[styles.circStatusText, isActivo ? styles.textActivo : styles.textReserva]}>
                          {circ.estado || 'ACTIVO'}
                        </Text>
                      </View>
                    </View>

                    <Edit2 size={15} color="#64748b" style={styles.circEditIcon} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* 5. Pestaña de Diagrama Unifilar SVG */}
      {activeTab === 'UNIFILAR' && (
        <ScrollView horizontal style={styles.unifilarScroll} contentContainerStyle={styles.unifilarContainer}>
          <View style={styles.blueprintCard}>
            <View style={styles.blueprintHeader}>
              <Text style={styles.blueprintTitle}>DIAGRAMA UNIFILAR ESQUEMÁTICO</Text>
              <Text style={styles.blueprintCode}>{tableroData.codigo || tableroData.id} • {tension}</Text>
            </View>

            {/* Renderizado SVG del Esquema Unifilar */}
            <Svg width="520" height="420" viewBox="0 0 520 420">
              {/* Fondo del plano */}
              <Rect x="0" y="0" width="520" height="420" fill="#0f172a" rx="12" />

              {/* Alimentador Acometida Principal */}
              <Line x1="260" y1="20" x2="260" y2="70" stroke="#38bdf8" strokeWidth="3" />
              <SvgText x="270" y="45" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                ACOMETIDA {acometidaCalibre || '3x500 MCM'}
              </SvgText>

              {/* Símbolo Interruptor Principal (Breaker) */}
              <Rect x="240" y="70" width="40" height="35" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" rx="4" />
              <Line x1="250" y1="75" x2="270" y2="100" stroke="#f59e0b" strokeWidth="2" />
              <SvgText x="290" y="85" fill="#f8fafc" fontSize="11" fontWeight="bold">
                {breakerMarca || 'MAIN'} {breakerAmp || corriente}A
              </SvgText>
              <SvgText x="290" y="98" fill="#94a3b8" fontSize="9">
                Icu: {breakerIcu || '50kA'}
              </SvgText>

              {/* Conexión a la Barra Principal */}
              <Line x1="260" y1="105" x2="260" y2="135" stroke="#38bdf8" strokeWidth="3" />

              {/* Barraje Principal de Distribución (Busbar Horizontal) */}
              <Line x1="40" y1="135" x2="480" y2="135" stroke="#f59e0b" strokeWidth="5" />
              <SvgText x="40" y="125" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">
                BARRA PRINCIPAL 3F+N+T • {tension}
              </SvgText>

              {/* Derivaciones de Circuitos (Top 4 Circuitos en Diagrama) */}
              {(circuitos.slice(0, 4)).map((c, i) => {
                const xPos = 80 + i * 110;
                return (
                  <G key={c.id || i}>
                    {/* Línea vertical de derivación */}
                    <Line x1={xPos} y1="135" x2={xPos} y2="175" stroke="#38bdf8" strokeWidth="2" />
                    
                    {/* Breaker derivado */}
                    <Rect x={xPos - 15} y="175" width="30" height="25" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                    <Line x1={xPos - 8} y1="180" x2={xPos + 8} y2="195" stroke="#38bdf8" strokeWidth="1.5" />

                    {/* Línea a la carga */}
                    <Line x1={xPos} y1="200" x2={xPos} y2="240" stroke="#38bdf8" strokeWidth="2" />
                    <Circle cx={xPos} cy="245" r="5" fill="#34d399" />

                    {/* Etiquetas */}
                    <SvgText x={xPos} y="265" fill="#f8fafc" fontSize="9" fontWeight="bold" textAnchor="middle">
                      P{c.posicionPolo} ({c.amperaje}A)
                    </SvgText>
                    <SvgText x={xPos} y="280" fill="#94a3b8" fontSize="8" textAnchor="middle">
                      {c.fase} • {c.numPolos}P
                    </SvgText>
                    <SvgText x={xPos} y="295" fill="#cbd5e1" fontSize="7.5" textAnchor="middle">
                      {(c.descripcion || '').substring(0, 14)}
                    </SvgText>
                  </G>
                );
              })}

              {/* Cuadro de Notas de Ingeniería */}
              <Rect x="40" y="325" width="440" height="75" fill="#1e293b" stroke="#334155" strokeWidth="1" rx="6" />
              <SvgText x="52" y="345" fill="#f59e0b" fontSize="9.5" fontWeight="bold">
                ESPECIFICACIONES TÉCNICAS:
              </SvgText>
              <SvgText x="52" y="362" fill="#94a3b8" fontSize="8.5">
                • Interruptor: {breakerMarca} {breakerModelo} ({breakerAmp}A) | Tensión: {tension}
              </SvgText>
              <SvgText x="52" y="377" fill="#94a3b8" fontSize="8.5">
                • Resistencia de Puesta a Tierra: {tierraOhms || '2.4'} Ω ({tierraCalibre || '1x4/0 AWG'})
              </SvgText>
              <SvgText x="52" y="392" fill="#34d399" fontSize="8.5">
                • Total de circuitos derivados: {circuitos.length} polos activos
              </SvgText>
            </Svg>
          </View>
        </ScrollView>
      )}

      {/* MODAL DE EDICIÓN / CREACIÓN DE CIRCUITO */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCircuito ? 'Editar Circuito Derivado' : 'Nuevo Circuito Derivado'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descripción de la Carga</Text>
                <TextInput
                  style={styles.formInput}
                  value={circDesc}
                  onChangeText={setCircDesc}
                  placeholder="Ej: Alumbrado Pasillo o Bomba BCI"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Posición Polo</Text>
                  <TextInput
                    style={styles.formInput}
                    value={circPolo}
                    onChangeText={setCircPolo}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#64748b"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Núm Polos</Text>
                  <TextInput
                    style={styles.formInput}
                    value={circNumPolos}
                    onChangeText={setCircNumPolos}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#64748b"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Amperaje (A)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={circAmp}
                    onChangeText={setCircAmp}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Fase (A, B, C, A-B-C)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={circFase}
                    onChangeText={setCircFase}
                    placeholder="A"
                    placeholderTextColor="#64748b"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1.5 }]}>
                  <Text style={styles.formLabel}>Tipo de Interruptor</Text>
                  <TextInput
                    style={styles.formInput}
                    value={circTipo}
                    onChangeText={setCircTipo}
                    placeholder="Termomagnético"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Estado del Circuito</Text>
                <View style={styles.statusSelector}>
                  {['ACTIVO', 'RESERVA', 'DISPONIBLE'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusOption,
                        circEstado === st && styles.circStatusOptionActive,
                      ]}
                      onPress={() => setCircEstado(st)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          circEstado === st ? { color: '#38bdf8', fontWeight: '800' } : { color: '#94a3b8' },
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Botones de Acción del Modal */}
            <View style={styles.modalActions}>
              {editingCircuito && (
                <TouchableOpacity
                  style={styles.deleteModalBtn}
                  onPress={() => handleDeleteCircuito(editingCircuito.id)}
                >
                  <Trash2 size={16} color="#f87171" />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveCircuito}>
                <Text style={styles.saveModalBtnText}>Guardar Circuito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codigoBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codigoBadgeText: {
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
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  saveHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#38bdf8',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabBtnTextActive: {
    color: '#38bdf8',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.3,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  circStatusOptionActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f172a',
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
  circuitosContainer: {
    flex: 1,
  },
  circuitsToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  circuitsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
  },
  addCircuitoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addCircuitoBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  circuitsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  circuitoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  circPoloBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circPoloText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  circFaseText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94a3b8',
  },
  circInfo: {
    flex: 1,
  },
  circDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  circSub: {
    fontSize: 10,
    color: '#94a3b8',
  },
  circAmpContainer: {
    alignItems: 'flex-end',
    gap: 3,
  },
  circAmpText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f59e0b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  circStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActivo: {
    backgroundColor: '#065f46',
  },
  statusReserva: {
    backgroundColor: '#78350f',
  },
  circStatusText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  textActivo: {
    color: '#34d399',
  },
  textReserva: {
    color: '#fbbf24',
  },
  circEditIcon: {
    marginLeft: 4,
  },
  unifilarScroll: {
    flex: 1,
  },
  unifilarContainer: {
    padding: 16,
  },
  blueprintCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    alignItems: 'center',
  },
  blueprintHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  blueprintTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  blueprintCode: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#94a3b8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  deleteModalBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#7f1d1d22',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalBtn: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f87171',
    marginBottom: 16,
  },
  btnPrimary: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    textAlign: 'center',
  },
});
