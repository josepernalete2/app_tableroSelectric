import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import useStore from './store/useStore';

// Vistas
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import EmpresaView from './views/EmpresaView';
import ProyectoView from './views/ProyectoView';
import TableroComponent from './components/TableroComponent';
import SubestacionComponent from './components/SubestacionComponent';
import FichaTecnicaComponent from './components/FichaTecnicaComponent';
import { ArrowLeft, User, LogOut } from 'lucide-react';

// Wrapper para Rutas Protegidas
const ProtectedRoute = ({ children }) => {
  const user = useStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Wrapper para cargar el TableroComponent o SubestacionComponent con los parámetros de la URL
const TableroWrapper = () => {
  const { companyId, tableroId } = useParams();
  const navigate = useNavigate();
  const { companies, updateTablero, updateSubestacion, updateElementoUnifilar } = useStore();
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  const company = companies.find((c) => c.id === companyId);

  // Buscar en elementos unifilares o subestaciones dentro de los proyectos
  let element = null;
  let subestacion = null;
  let targetProyecto = null;

  if (company?.proyectos) {
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
    }
  }

  const backPath = targetProyecto
    ? `/empresa/${companyId}/proyecto/${targetProyecto.id}`
    : `/empresa/${companyId}`;

  if (!company || (!element && !subestacion)) {
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
            onUpdate={(updatedData) => updateElementoUnifilar(targetProyecto.id, tableroId, updatedData)}
          />
        </main>
      </div>
    );
  }

  // 3. Renderizar Ficha de Tablero Termográfico (TABLERO)
  const enrichedTablero = {
    id: element.id,
    nombre: element.nombre,
    ubicacion: element.ubicacion,
    alimentadoPor: element.alimentadoPor,
    foto: element.foto,
    fotoBlob: element.fotoBlob,
    observacionesGenerales: element.observacionesGenerales,
    ...element.datosTecnicos,
    nombreEmpresa: company.nombre
  };

  const handleUpdateTablero = (updatedData) => {
    const { 
      id, nombre, ubicacion, alimentadoPor, foto, fotoBlob, observacionesGenerales, 
      nombreEmpresa, ...datosTecnicos 
    } = updatedData;

    updateElementoUnifilar(targetProyecto.id, tableroId, {
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
            <h1 className="text-base font-bold text-slate-100">
              {element.nombre} (ID: {element.id})
            </h1>
          </div>
        </div>

        {/* User / Logout */}
        <div className="flex items-center gap-4">
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
        />
      </main>
    </div>
  );
};

import SyncStatusBanner from './components/SyncStatusBanner';

export function App() {
  return (
    <BrowserRouter>
      <SyncStatusBanner />
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empresa/:companyId"
          element={
            <ProtectedRoute>
              <EmpresaView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empresa/:companyId/proyecto/:proyectoId"
          element={
            <ProtectedRoute>
              <ProyectoView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empresa/:companyId/tablero/:tableroId"
          element={
            <ProtectedRoute>
              <TableroWrapper />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
