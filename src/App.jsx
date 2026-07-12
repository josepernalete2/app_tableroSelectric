import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import useStore from './store/useStore';

// Vistas
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import EmpresaView from './views/EmpresaView';
import TableroComponent from './components/TableroComponent';
import SubestacionComponent from './components/SubestacionComponent';
import { ArrowLeft, User, LogOut, Zap } from 'lucide-react';

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
  const { companies, updateTablero, updateSubestacion } = useStore();
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  const company = companies.find((c) => c.id === companyId);
  
  // Buscar en tableros o subestaciones
  const tablero = company?.tableros?.find((t) => t.id === tableroId);
  const subestacion = company?.subestaciones?.find((s) => s.id === tableroId);

  if (!company || (!tablero && !subestacion)) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
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

  // Renderizar Inspección de Subestación
  if (subestacion) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
        {/* Top Navbar */}
        <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-md no-print">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/empresa/${companyId}`)}
              className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Volver a la Empresa"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                Subestación: {company.nombre}
              </span>
              <h1 className="text-base font-bold text-slate-100">
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
            onUpdate={(updatedData) => updateSubestacion(companyId, tableroId, updatedData)}
          />
        </main>
      </div>
    );
  }

  // Renderizar Ficha de Tablero Termográfico
  const enrichedTablero = {
    ...tablero,
    nombreEmpresa: company.nombre
  };

  const handleUpdateTablero = (updatedData) => {
    updateTablero(companyId, tableroId, updatedData);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-md no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/empresa/${companyId}`)}
            className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Volver a la Empresa"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
              Inspeccionando para: {company.nombre}
            </span>
            <h1 className="text-base font-bold text-slate-100">
              {tablero.nombre} (ID: {tablero.id})
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
