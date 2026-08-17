import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import useStore, { formatElementTitleWithId } from './store/useStore';

// Vistas
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import EmpresaView from './views/EmpresaView';
import ProyectoView from './views/ProyectoView';
import TableroComponent from './components/TableroComponent';
import SubestacionComponent from './components/SubestacionComponent';
import PuntoMedicionComponent from './components/PuntoMedicionComponent';
import CcmComponent from './components/CcmComponent';
import FichaTecnicaComponent from './components/FichaTecnicaComponent';
import InformeCompiladoView from './views/InformeCompiladoView';
import SidebarLayout from './components/SidebarLayout';
import { ArrowLeft, User, LogOut, Printer } from 'lucide-react';

// Wrapper para Rutas Protegidas
const ProtectedRoute = ({ children }) => {
  const user = useStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Wrapper para cargar el TableroComponent, SubestacionComponent, PuntoMedicionComponent o CcmComponent con los parámetros de la URL
const TableroWrapper = () => {
  const { companyId, tableroId } = useParams();
  const navigate = useNavigate();
  const { companies, updateTablero, updateSubestacion, updatePuntoMedicion, updateCcm, updateElementoUnifilar } = useStore();
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  let company = companies.find((c) => c.id === companyId);

  // Buscar en elementos unifilares, subestaciones, puntos de medición o CCM
  let element = null;
  let subestacion = null;
  let puntoMedicion = null;
  let ccmItem = null;
  let targetProyecto = null;

  // 1. Buscar en la empresa especificada por URL
  if (company) {
    const compElList = company.elementosUnifilares || [];
    const compEl = compElList.find((e) => e.id === tableroId);
    if (compEl) {
      element = compEl;
    } else if (company.proyectos) {
      for (const p of company.proyectos) {
        const elList = p.elementosUnifilares || p.tableros || [];
        const el = elList.find((e) => e.id === tableroId);
        if (el) {
          element = el;
          targetProyecto = p;
          break;
        }
        const subList = p.inspeccionesSubestacion || p.subestaciones || [];
        const s = subList.find((sub) => sub.id === tableroId);
        if (s) {
          subestacion = s;
          targetProyecto = p;
          break;
        }
        const pmList = p.puntosMedicion || [];
        const pm = pmList.find((item) => item.id === tableroId);
        if (pm) {
          puntoMedicion = pm;
          targetProyecto = p;
          break;
        }
        const ccmList = p.ccmList || [];
        const ccm = ccmList.find((item) => item.id === tableroId);
        if (ccm) {
          ccmItem = ccm;
          targetProyecto = p;
          break;
        }
      }
    }
  }

  // 2. Si no se encontró en la empresa dada, buscar transversalmente en todas las empresas de la tienda
  if (!element && !subestacion && !puntoMedicion && !ccmItem) {
    for (const c of companies) {
      if (c.proyectos) {
        for (const p of c.proyectos) {
          const elList = p.elementosUnifilares || p.tableros || [];
          const el = elList.find((e) => e.id === tableroId);
          if (el) {
            element = el;
            targetProyecto = p;
            company = c;
            break;
          }
          const subList = p.inspeccionesSubestacion || p.subestaciones || [];
          const s = subList.find((sub) => sub.id === tableroId);
          if (s) {
            subestacion = s;
            targetProyecto = p;
            company = c;
            break;
          }
          const pmList = p.puntosMedicion || [];
          const pm = pmList.find((item) => item.id === tableroId);
          if (pm) {
            puntoMedicion = pm;
            targetProyecto = p;
            company = c;
            break;
          }
          const ccmList = p.ccmList || [];
          const ccm = ccmList.find((item) => item.id === tableroId);
          if (ccm) {
            ccmItem = ccm;
            targetProyecto = p;
            company = c;
            break;
          }
        }
      }
      if (element || subestacion || puntoMedicion || ccmItem) break;
    }
  }

  // 3. Fallback a arreglos de estado local si el elemento fue recién creado
  if (!element && !subestacion && !puntoMedicion && !ccmItem) {
    const puntosLocales = useStore.getState().puntosMedicionLocales || [];
    const pmLocal = puntosLocales.find((item) => item.id === tableroId);
    if (pmLocal) {
      puntoMedicion = pmLocal;
    }

    const ccmLocales = useStore.getState().ccmLocales || [];
    const ccmLocal = ccmLocales.find((item) => item.id === tableroId);
    if (ccmLocal) {
      ccmItem = ccmLocal;
    }
  }

  const backPath = targetProyecto
    ? `/empresa/${companyId}/proyecto/${targetProyecto.id}`
    : `/empresa/${companyId}`;

  if (!element && !subestacion && !puntoMedicion && !ccmItem) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <h2 className="text-lg font-bold">Elemento o Empresa no encontrado</h2>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-800 rounded-lg text-xs">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 1. Renderizar Inspección de Subestación
  if (subestacion) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
        {/* Top Navbar */}
        <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-md no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(backPath)}
              className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Volver al Proyecto"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                Subestación en: {company.nombre}
              </span>
              <h1 className="text-base font-bold text-slate-100 animate-fade-in">
                {subestacion.nombre}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black shadow-sm"
              title="Guardar como PDF o Imprimir esta Inspección"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Guardar PDF</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-900 hover:bg-red-950/40 hover:text-red-400 border border-slate-800 hover:border-red-900/60 rounded-xl transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Formulario de Subestación */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 md:px-6 md:py-8">
          <SubestacionComponent
            subestacionData={subestacion}
            onUpdate={(updatedData) => updateSubestacion(targetProyecto.id, tableroId, updatedData)}
            readOnly={user?.role === 'CLIENT'}
          />
        </main>
      </div>
    );
  }

  // 1.5. Renderizar Punto de Medición y Suministro
  if (puntoMedicion) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
        {/* Top Navbar */}
        <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-md no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(backPath)}
              className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Volver al Proyecto"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                Punto de Medición en: {company.nombre}
              </span>
              <h1 className="text-base font-bold text-slate-100 animate-fade-in">
                {puntoMedicion.nombre}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black shadow-sm"
              title="Guardar como PDF o Imprimir este Levantamiento"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Guardar PDF</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-900 hover:bg-red-950/40 hover:text-red-400 border border-slate-800 hover:border-red-900/60 rounded-xl transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Formulario de Punto de Medición */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 md:px-6 md:py-8">
          <PuntoMedicionComponent
            puntoData={puntoMedicion}
            onUpdate={(updatedData) => updatePuntoMedicion(targetProyecto?.id || puntoMedicion?.proyectoId, tableroId, updatedData)}
            readOnly={user?.role === 'CLIENT'}
          />
        </main>
      </div>
    );
  }

  // 1.2 Renderizar Centro de Control de Motores (CCM)
  if (ccmItem) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
        {/* Top Navbar */}
        <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-md no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(backPath)}
              className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Volver al Proyecto"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                Levantamiento de CCM
              </span>
              <h1 className="text-base font-bold text-slate-100 animate-fade-in">
                {ccmItem.nombre}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black shadow-sm"
              title="Guardar como PDF o Imprimir este Levantamiento"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Guardar PDF</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-900 hover:bg-red-950/40 hover:text-red-400 border border-slate-800 hover:border-red-900/60 rounded-xl transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Formulario de CCM */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 md:px-6 md:py-8">
          <CcmComponent
            ccmData={ccmItem}
            onUpdate={(updatedData) => updateCcm(targetProyecto?.id || ccmItem?.proyectoId, tableroId, updatedData)}
            readOnly={user?.role === 'CLIENT'}
          />
        </main>
      </div>
    );
  }

  // 2. Renderizar Elemento Especial (Generador / Transfer / Otro)
  if (element && element.tipoElemento !== 'TABLERO') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
        {/* Top Navbar */}
        <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-md no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(backPath)}
              className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Volver al Proyecto"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                Ficha Técnica en: {company.nombre}
              </span>
              <h1 className="text-base font-bold text-slate-100">
                {element.nombre}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black shadow-sm"
              title="Guardar como PDF o Imprimir esta Ficha Técnica"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Guardar PDF</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-900 hover:bg-red-950/40 hover:text-red-400 border border-slate-800 hover:border-red-900/60 rounded-xl transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Ficha Técnica del Elemento */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 md:px-6 md:py-8">
          <FichaTecnicaComponent
            elementoData={element}
            onUpdate={(updatedData) => updateElementoUnifilar(targetProyecto?.id || null, tableroId, updatedData)}
            readOnly={user?.role === 'CLIENT'}
          />
        </main>
      </div>
    );
  }

  // 3. Renderizar Ficha de Tablero Termográfico (TABLERO)
  const enrichedTablero = {
    id: element?.id || tableroId,
    nombre: element?.nombre || 'Tablero Eléctrico',
    ubicacion: element?.ubicacion || '',
    alimentadoPor: element?.alimentadoPor || '',
    foto: element?.foto || null,
    fotoBlob: element?.fotoBlob || null,
    observacionesGenerales: element?.observacionesGenerales || '',
    ...(element?.datosTecnicos || {}),
    circuits: Array.isArray(element?.datosTecnicos?.circuits)
      ? element.datosTecnicos.circuits
      : (Array.isArray(element?.circuits) ? element.circuits : []),
    nombreEmpresa: company?.nombre || ''
  };

  const handleUpdateTablero = (updatedData) => {
    const { 
      id, nombre, ubicacion, alimentadoPor, foto, fotoBlob, observacionesGenerales, 
      nombreEmpresa, ...datosTecnicos 
    } = updatedData;

    updateElementoUnifilar(targetProyecto?.id || null, tableroId, {
      nombre,
      ubicacion,
      alimentadoPor,
      foto,
      fotoBlob,
      observacionesGenerales,
      datosTecnicos
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-md no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Volver al Proyecto"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
              Inspeccionando para: {company.nombre}
            </span>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-slate-100">
                {formatElementTitleWithId(element.nombre, element.id)}
              </h1>
              <span className="font-mono font-black text-amber-400 bg-slate-900 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-xs shadow-sm">
                ID: {element.id}
              </span>
            </div>
          </div>
        </div>

        {/* User / Logout */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-black shadow-sm"
            title="Guardar como PDF o Imprimir esta Plantilla"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Guardar PDF</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 bg-slate-900 hover:bg-red-950/40 hover:text-red-400 border border-slate-800 hover:border-red-900/60 rounded-xl transition-all cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Renders Tablero Component */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 md:px-6 md:py-8">
        <TableroComponent
          tableroData={enrichedTablero}
          onUpdateTablero={handleUpdateTablero}
          readOnly={user?.role === 'CLIENT'}
        />
      </main>
    </div>
  );
};

import SyncStatusBanner from './components/SyncStatusBanner';
import ToastNotification from './components/ToastNotification';

export function App() {
  return (
    <BrowserRouter>
      <SyncStatusBanner />
      <ToastNotification />
      <Routes>
        <Route path="/login" element={<LoginView />} />
        
        {/* Rutas protegidas bajo el Layout con Barra Lateral */}
        <Route element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardView />} />
          <Route path="/empresa/:companyId" element={<EmpresaView />} />
          <Route path="/empresa/:companyId/proyecto/:proyectoId" element={<ProyectoView />} />
          <Route path="/empresa/:companyId/proyecto/:proyectoId/informe" element={<InformeCompiladoView />} />
          <Route path="/empresa/:companyId/tablero/:tableroId" element={<TableroWrapper />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
