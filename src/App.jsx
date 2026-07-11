import React, { useState, useEffect } from 'react';
import { initialTablerosData } from './data/mockTableros';
import TableroComponent from './components/TableroComponent';
import wiringImg from './assets/tablero_wiring.png';
import { 
  Zap, 
  Download, 
  Printer, 
  RotateCcw, 
  Layers, 
  Sliders, 
  FileCode, 
  Plus, 
  Trash2,
  AlertTriangle,
  Info
} from 'lucide-react';

function App() {
  const [tableros, setTableros] = useState(() => {
    const saved = localStorage.getItem('tableros_data');
    return saved ? JSON.parse(saved) : initialTablerosData;
  });
  const [activeTableroId, setActiveTableroId] = useState('11');
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('tableros_data', JSON.stringify(tableros));
  }, [tableros]);

  const activeTablero = tableros[activeTableroId];

  // Update active tablero state
  const handleUpdateTablero = (updatedData) => {
    setTableros(prev => ({
      ...prev,
      [activeTableroId]: updatedData
    }));
  };

  // Reset active tablero to original mock values
  const handleResetTablero = () => {
    if (window.confirm(`¿Está seguro de que desea restablecer el Tablero No. ${activeTableroId} a su estado de fábrica original?`)) {
      setTableros(prev => ({
        ...prev,
        [activeTableroId]: JSON.parse(JSON.stringify(initialTablerosData[activeTableroId]))
      }));
    }
  };

  // Export active tablero as a JSON file
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeTablero, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tablero_inspeccion_no_${activeTableroId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Create a brand new blank tablero template
  const handleCreateNewTablero = () => {
    const newId = prompt("Ingrese el número del nuevo tablero:", "21");
    if (!newId || newId.trim() === "") return;
    if (tableros[newId]) {
      alert("El tablero con ese número ya existe.");
      return;
    }

    const newTablero = {
      id: newId,
      ubicacion: "NUEVA UBICACIÓN",
      alimentadoPor: "LÍNEA GENERAL",
      tipo: "superficial",
      barrasPrincipales: { ia: "0", ib: "0", ic: "0" },
      breakerPrincipal: { marca: "", tipo: "", amp: "" },
      voltaje: { va: "220", vb: "220", vc: "220" },
      acometida: "",
      maxPoles: 24,
      circuits: [],
      neutroLlegada: { calibre: "", observaciones: "" },
      puestaTierra: { calibre: "", observaciones: "" },
      observacionesGenerales: ""
    };

    setTableros(prev => ({
      ...prev,
      [newId]: newTablero
    }));
    setActiveTableroId(newId);
  };

  // Delete active tablero
  const handleDeleteTablero = () => {
    const ids = Object.keys(tableros);
    if (ids.length <= 1) {
      alert("Debe haber al menos un tablero en el sistema.");
      return;
    }
    if (window.confirm(`¿Está seguro de que desea eliminar permanentemente el Tablero No. ${activeTableroId}?`)) {
      const nextId = ids.find(id => id !== activeTableroId);
      const newTableros = { ...tableros };
      delete newTableros[activeTableroId];
      setTableros(newTableros);
      setActiveTableroId(nextId);
    }
  };

  // Adjust pole quantity (maxPoles)
  const handleAdjustPoles = (e) => {
    const newMax = parseInt(e.target.value, 10);
    if (isNaN(newMax) || newMax < 6 || newMax > 60 || newMax % 2 !== 0) {
      alert("El número de polos debe ser un número par entre 6 y 60.");
      return;
    }

    // Filter out circuits that have poles larger than the new limit
    const updatedCircuits = activeTablero.circuits.filter(c => {
      return Math.max(...c.poles) <= newMax;
    });

    handleUpdateTablero({
      ...activeTablero,
      maxPoles: newMax,
      circuits: updatedCircuits
    });
  };

  // Calculations for stats
  const calculateStats = () => {
    if (!activeTablero) return { totalBreakers: 0, polesUsed: 0, ampSum: 0, multiPoles: 0 };
    
    let totalBreakers = 0;
    let polesUsed = 0;
    let ampSum = 0;
    let multiPoles = 0;

    activeTablero.circuits.forEach(c => {
      if (c.equipo && c.equipo !== 'RESERVA') {
        polesUsed += c.poles.length;
      }
      const amp = parseInt(c.breaker.amp, 10);
      if (!isNaN(amp) && amp > 0) {
        totalBreakers++;
        ampSum += amp;
        if (c.poles.length > 1) {
          multiPoles++;
        }
      }
    });

    return { totalBreakers, polesUsed, ampSum, multiPoles };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased pb-8 select-text">
      
      {/* TOOLBAR SUPERIOR (No se imprime) */}
      <header className="no-print sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-lg shadow-md shadow-amber-500/20">
            <Zap className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              TableroSelectric - Pro
            </h1>
            <p className="text-xs text-slate-400">Inspección Técnica de Tableros Eléctricos para Tabletas</p>
          </div>
        </div>

        {/* Controles del Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Tablero */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tablero:</span>
            <select
              value={activeTableroId}
              onChange={(e) => setActiveTableroId(e.target.value)}
              className="bg-transparent text-sm font-bold text-amber-400 focus:outline-none pr-4 cursor-pointer"
            >
              {Object.keys(tableros).map(id => (
                <option key={id} value={id} className="bg-slate-900 text-slate-100">
                  No. {id} - {tableros[id].ubicacion.substring(0, 18)}...
                </option>
              ))}
            </select>
          </div>

          {/* Botones de acción */}
          <button
            onClick={handleCreateNewTablero}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-colors"
            title="Crear Nueva Plantilla"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>

          <button
            onClick={handleDeleteTablero}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 text-red-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            title="Eliminar Tablero Activo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>

          <button
            onClick={handleResetTablero}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            title="Restablecer a valores iniciales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            title="Exportar Reporte a JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shadow-md shadow-amber-500/10 transition-colors"
            title="Imprimir Plantilla de Inspección"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </header>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-6 grid grid-cols-1 xl:grid-cols-4 gap-6 print-container print:p-0">
        
        {/* COLUMNA DE LA TABLA (Ocupa 3 de 4 columnas en XL) */}
        <section className="xl:col-span-3 flex flex-col gap-4 print-card bg-slate-950/40 border border-slate-800 p-6 rounded-2xl shadow-xl">
          {/* Instrucciones rápidas Tap-to-Edit (No se imprime) */}
          <div className="no-print flex items-center justify-between gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                <strong>Modo Tap-to-Edit:</strong> Haz clic/tap en cualquier celda para editar el equipo, breaker, calibre o datos de placa. Haz clic fuera o pulsa <code>Enter</code> para guardar.
              </span>
            </div>
            
            <div className="flex items-center gap-4 border-l border-slate-800 pl-4 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Polo de Breaker</span>
              </div>
              <div className="flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-white bg-amber-500 rounded-full p-0.5" />
                <span>Agrupar fases</span>
              </div>
            </div>
          </div>

          {/* COMPONENTE PRINCIPAL (TABLA) */}
          <TableroComponent 
            tableroData={activeTablero} 
            onUpdateTablero={handleUpdateTablero} 
          />
        </section>

        {/* SIDEBAR DE CONTROL & STATS (No se imprime) */}
        <aside className="no-print flex flex-col gap-6">
          
          {/* Card de Configuración de Polos */}
          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
              <Sliders className="w-4 h-4 text-amber-500" />
              Configuración de Capacidad
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Número máximo de Polos:</label>
              <select
                value={activeTablero ? activeTablero.maxPoles : 30}
                onChange={handleAdjustPoles}
                className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value={12}>12 Polos (Corto)</option>
                <option value={18}>18 Polos</option>
                <option value={24}>24 Polos</option>
                <option value={30}>30 Polos (Estándar)</option>
                <option value={36}>36 Polos</option>
                <option value={42}>42 Polos (Largo)</option>
              </select>
            </div>
            
            <div className="text-[10px] text-slate-500 leading-relaxed">
              * Reducir los polos recortará los circuitos que excedan el nuevo límite. Asegúrese de guardar los datos.
            </div>
          </div>

          {/* Card de Métricas Rápidas */}
          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
              <Layers className="w-4 h-4 text-amber-500" />
              Resumen de Carga
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 p-3 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase">Fases Ocupadas</span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {stats.polesUsed} <span className="text-xs text-slate-500 font-normal">/ {activeTablero?.maxPoles}</span>
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase">Total Breakers</span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {stats.totalBreakers}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase">Multipolares</span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {stats.multiPoles}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase">Suma Amp</span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {stats.ampSum}A
                </span>
              </div>
            </div>

            {/* Alerta de Carga Máxima (Informativo de Seguridad) */}
            {activeTablero?.breakerPrincipal?.amp && activeTablero.breakerPrincipal.amp !== 'N/A' && (
              <div className="flex gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <strong className="block font-bold mb-0.5">Breaker Principal: {activeTablero.breakerPrincipal.amp}A</strong>
                  <span className="text-[10px] leading-relaxed text-slate-400">
                    Asegúrese de balancear los polos para evitar sobrecalentar las barras principales.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Visualización de Imagen del Cableado (Wow Factor / Premium Asset) */}
          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
              Diagrama Físico del Tablero
            </h3>
            <div className="relative overflow-hidden rounded-xl border border-slate-800 aspect-square group shadow-inner">
              <img
                src={wiringImg}
                alt="Wiring diagrams of circuit board"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-[10px] text-slate-300 bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-700">
                  Esquema de conexiones e interruptores
                </span>
              </div>
            </div>
          </div>

          {/* Visor de JSON en Tiempo Real (Developer Utility / Interactive) */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <button
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="flex items-center justify-between w-full px-5 py-4 text-sm font-bold text-slate-300 uppercase tracking-wide hover:bg-slate-800/20 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-500" />
                Inspector JSON (Tiempo Real)
              </span>
              <span className="text-xs text-amber-400 font-mono">
                {showJsonInspector ? 'Ocultar' : 'Mostrar'}
              </span>
            </button>

            {showJsonInspector && (
              <div className="p-4 bg-slate-950 border-t border-slate-800">
                <pre className="text-[10px] font-mono text-slate-400 max-h-60 overflow-y-auto whitespace-pre-wrap p-2 rounded bg-slate-900/50 scrollbar">
                  {JSON.stringify({
                    id: activeTablero.id,
                    ubicacion: activeTablero.ubicacion,
                    barras: activeTablero.barrasPrincipales,
                    breaker: activeTablero.breakerPrincipal,
                    circuitosCount: activeTablero.circuits.length
                  }, null, 2)}
                </pre>
                <div className="mt-2 text-[9px] text-slate-500 text-center">
                  * El JSON completo se actualiza al instante con el modo Tap-to-Edit.
                </div>
              </div>
            )}
          </div>

        </aside>

      </main>
    </div>
  );
}

export default App;
