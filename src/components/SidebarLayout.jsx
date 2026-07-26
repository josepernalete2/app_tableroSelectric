import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import useStore from '../store/useStore';
import io from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import { 
  Briefcase, 
  TrendingUp, 
  Database, 
  LogOut, 
  Menu, 
  X, 
  Zap, 
  User, 
  UploadCloud, 
  Download, 
  RefreshCw,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  Users,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const SidebarLayout = () => {
  const isChatEnabled = false;
  const { 
    user, 
    logout, 
    companies, 
    importCompanies,
    usersList,
    addUser,
    updateUser,
    deleteUser,
    messages,
    sendMessage,
    socket,
    setSocket,
    addIncomingMessage,
    markMessagesAsRead,
    fetchUsersList,
    fetchMessagesList,
    showToast
  } = useStore();
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Menú móvil
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Modales
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Estados de backup
  const [gdriveEmail, setGdriveEmail] = useState(() => localStorage.getItem('tableroselectrico_gdrive_email') || '');
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('tableroselectrico_gdrive_autoBackup') === 'true');
  const [syncStatus, setSyncStatus] = useState('Listo para respaldar');
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('tableroselectrico_gdrive_lastSyncTime') || 'Nunca');
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados de control de usuarios
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('WORKER');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingEmail, setEditingEmail] = useState('');
  const [editingPassword, setEditingPassword] = useState('');
  const [editingRole, setEditingRole] = useState('WORKER');
  const [editingCompanyId, setEditingCompanyId] = useState('');

  // Estados de Chat
  const [activeContactId, setActiveContactId] = useState(null);
  const [chatMessageText, setChatMessageText] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Efectos de inicialización de sockets
  useEffect(() => {
    if (isChatEnabled && user && navigator.onLine) {
      fetchUsersList();
      fetchMessagesList(user.id);

      const socketInstance = io(API_BASE_URL);

      socketInstance.on('connect', () => {
        console.log('⚡ Conectado al servidor de Sockets');
        socketInstance.emit('register_user', user.id);
      });

      socketInstance.on('receive_message', (msg) => {
        addIncomingMessage(msg);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        setSocket(null);
      };
    }
  }, [user]);

  // Marcar como leído al abrir la conversación
  useEffect(() => {
    if (showChatModal && activeContactId) {
      markMessagesAsRead(activeContactId);
    }
  }, [showChatModal, activeContactId, messages]);

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    logout();
    navigate('/login');
  };

  // Guardar configuración de Drive
  const handleSaveGDriveConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('tableroselectrico_gdrive_email', gdriveEmail.trim());
    localStorage.setItem('tableroselectrico_gdrive_autoBackup', autoBackup ? 'true' : 'false');
    showToast("Configuración de Google Drive guardada con éxito.", "success");
    setShowSettingsModal(false);
  };

  // Exportar DB PostgreSQL
  const handleExportDb = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/backup/export');
      const result = await res.json();
      if (result.ok) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `respaldo_inspecciones_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast("Base de datos exportada con éxito.", "success");
      } else {
        showToast("Error al exportar base de datos: " + result.error, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error de conexión al servidor backend para exportar.", "error");
    }
  };

  // Importar DB PostgreSQL
  const handleImportDb = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("¿Está seguro de que desea importar este archivo? Se SOBRESCRIBIRÁ por completo la base de datos PostgreSQL.")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const res = await fetch('http://localhost:3001/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: parsed })
        });
        const result = await res.json();

        if (result.ok) {
          showToast("Base de datos importada y restaurada con éxito.", "success");
          importCompanies(parsed);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showToast("Fallo al importar datos: " + result.error, "error");
        }
      } catch (err) {
        console.error(err);
        showToast("El archivo seleccionado no contiene una estructura JSON de respaldo válida.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Sincronizar a Google Drive
  const handleManualGDriveSync = async () => {
    if (!gdriveEmail.trim()) {
      showToast("Debe ingresar un correo electrónico válido de Google Drive.", "warning");
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Sincronizando...');
    try {
      const res = await fetch('http://localhost:3001/api/backup/gdrive-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gdriveEmail.trim()
        })
      });
      const result = await res.json();

      if (result.ok) {
        const time = new Date().toLocaleTimeString();
        setSyncStatus('Sincronizado con éxito');
        setLastSyncTime(time);
        localStorage.setItem('tableroselectrico_gdrive_lastSyncTime', time);
        showToast(result.message || "Respaldo cargado y compartido en Google Drive.", "success");
      } else {
        setSyncStatus('Fallo en sincronización');
        showToast("Error al sincronizar con Google Drive: " + result.error, "error");
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('Error de conexión');
      showToast("Error de conexión al sincronizar con Google Drive.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Respaldo automático
  useEffect(() => {
    const isAutoOn = localStorage.getItem('tableroselectrico_gdrive_autoBackup') === 'true';
    const email = localStorage.getItem('tableroselectrico_gdrive_email');

    if (isAutoOn && email) {
      const doAutoSync = async () => {
        try {
          const res = await fetch('http://localhost:3001/api/backup/gdrive-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim()
            })
          });
          const result = await res.json();
          if (result.ok) {
            const time = new Date().toLocaleTimeString();
            setLastSyncTime(time);
            setSyncStatus('Sincronizado con éxito');
            localStorage.setItem('tableroselectrico_gdrive_lastSyncTime', time);
          } else {
            setSyncStatus('Error en respaldo automático: ' + result.error);
          }
        } catch {
          setSyncStatus('Error de conexión automática');
        }
      };

      const timer = setTimeout(doAutoSync, 4000);
      return () => clearTimeout(timer);
    }
  }, [companies]);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Agregar usuario
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      showToast("Por favor, rellene todos los campos.", "warning");
      return;
    }
    const result = await addUser({
      username: newUserEmail.trim(),
      email: newUserEmail.trim(),
      password: newUserPassword.trim(),
      role: newUserRole,
      companyId: newUserRole === 'CLIENT' ? newUserCompanyId : null
    });
    if (result.success) {
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('WORKER');
      setNewUserCompanyId('');
      showToast("Usuario registrado con éxito.", "success");
    } else {
      showToast(result.error || "Error al registrar usuario.", "error");
    }
  };

  // Guardar edición
  const handleSaveUserEdit = async (userId) => {
    if (!editingEmail.trim() || !editingPassword.trim()) {
      showToast("Por favor, rellene todos los campos.", "warning");
      return;
    }
    const result = await updateUser(userId, {
      username: editingEmail.trim(),
      email: editingEmail.trim(),
      password: editingPassword.trim(),
      role: editingRole,
      companyId: editingRole === 'CLIENT' ? editingCompanyId : null
    });
    if (result.success) {
      setEditingUserId(null);
      setEditingCompanyId('');
      showToast("Usuario actualizado con éxito.", "success");
    } else {
      showToast(result.error || "Error al actualizar usuario.", "error");
    }
  };

  const handleStartEditUser = (u) => {
    setEditingUserId(u.id);
    setEditingEmail(u.username || u.email || '');
    setEditingPassword(u.password);
    setEditingRole(u.role);
    setEditingCompanyId(u.companyId || '');
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("¿Está seguro de que desea eliminar este usuario?")) {
      const result = await deleteUser(userId);
      if (result.success) {
        showToast("Usuario eliminado con éxito.", "success");
      } else {
        showToast(result.error || "Error al eliminar usuario.", "error");
      }
    }
  };

  // Métodos auxiliares de chat
  const getContacts = () => {
    if (!usersList) return [];
    if (user?.role === 'ADMIN') {
      return usersList.filter((u) => u.id !== user.id && (u.role === 'ADMIN' || u.role === 'WORKER' || u.role === 'CLIENT'));
    } else if (user?.role === 'WORKER') {
      return usersList.filter((u) => u.id !== user.id && (u.role === 'ADMIN' || u.role === 'CLIENT'));
    } else if (user?.role === 'CLIENT') {
      return usersList.filter((u) => u.id !== user.id && u.role === 'ADMIN');
    }
    return [];
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !activeContactId) return;
    sendMessage(activeContactId, chatMessageText.trim());
    setChatMessageText('');
  };

  const getActiveMessages = () => {
    if (!messages || !activeContactId) return [];
    return messages.filter(
      (m) =>
        (m.senderId === user?.id && m.receiverId === activeContactId) ||
        (m.senderId === activeContactId && m.receiverId === user?.id)
    );
  };

  const totalUnreadCount = isChatEnabled ? (messages || []).filter((m) => m.receiverId === user?.id && !m.read).length : 0;

  const navLinks = [
    { name: 'Empresas', path: '/', icon: Briefcase },
    { name: 'Mensajería / Chat', onClick: () => setShowChatModal(true), icon: MessageSquare }
  ];

  if (user?.role === 'ADMIN') {
    navLinks.push({ name: 'Gestión de Usuarios', onClick: () => setShowUsersModal(true), icon: Users });
  }

  navLinks.push(
    { name: 'Respaldos y Nube', onClick: () => setShowSettingsModal(true), icon: Database },
    { name: 'Futuros Reportes', onClick: () => setShowReportsModal(true), icon: TrendingUp }
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col lg:flex-row antialiased">
      
      {/* 1. TOP BAR MÓVIL (no-print) */}
      <header className="lg:hidden bg-slate-950/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-md shrink-0 no-print sticky top-0 z-40 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg text-slate-950 shadow-md">
            <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
          </div>
          <span className="font-extrabold text-sm tracking-widest text-slate-100 font-mono">SELECTRIC</span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 border border-slate-800"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* 2. DRAWER DE MENÚ MÓVIL (no-print) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print flex flex-row">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <nav className="relative w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between p-5 animate-in slide-in-from-left duration-250">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-900">
                <Link to="/" className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 rounded-lg text-slate-950">
                    <Zap className="w-4 h-4 fill-slate-950" />
                  </div>
                  <span className="font-extrabold tracking-widest text-slate-100 font-mono text-sm">SELECTRIC</span>
                </Link>
                <button onClick={() => setIsMobileOpen(false)} className="p-1 bg-slate-900 rounded-lg text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = link.path ? location.pathname === link.path : false;
                  return link.path ? (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.name}</span>
                    </Link>
                  ) : (
                    <button
                      key={link.name}
                      onClick={() => {
                        setIsMobileOpen(false);
                        link.onClick();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-left cursor-pointer relative"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.name}</span>
                      {link.name === 'Mensajería / Chat' && totalUnreadCount > 0 && (
                        <span className="ml-auto bg-red-500 text-slate-950 font-bold rounded-full text-[9px] px-1.5 py-0.5 flex items-center justify-center animate-pulse shrink-0">
                          {totalUnreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-900 pt-4">
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl">
                <User className="w-4.5 h-4.5 text-amber-500" />
                <div className="truncate min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">Usuario Activo</p>
                  <p className="text-xs font-semibold text-slate-200 truncate">{user?.username || user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-red-955/20 hover:text-red-400 border border-slate-800 hover:border-red-900/40 rounded-xl transition-all cursor-pointer text-xs font-bold"
              >
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* 3. SIDEBAR ESCRITORIO FIJO (no-print) */}
      <aside className={`relative hidden lg:flex bg-slate-950 border-r border-slate-800/80 flex-col justify-between shrink-0 no-print sticky top-0 h-screen select-none transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20 p-4' : 'w-64 p-6'
      }`}>
        
        {/* Botón de Colapso Flotante en el Borde */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-6 -right-3 z-35 w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer shadow-md hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
          title={isSidebarCollapsed ? "Expandir Menú" : "Colapsar Menú"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <div className="space-y-8">
          {/* Logo / Branding */}
          <div className="flex items-center justify-between gap-2 px-1">
            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl text-slate-950 shadow-md transform hover:rotate-12 transition-transform shrink-0">
                <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
              </div>
              {!isSidebarCollapsed && (
                <div className="animate-in fade-in duration-200">
                  <span className="font-black text-sm tracking-widest text-slate-100 font-mono block leading-none">SELECTRIC</span>
                  <span className="text-[8px] text-amber-500 tracking-widest font-black uppercase">Inspección de Red</span>
                </div>
              )}
            </Link>
          </div>

          {/* Links de Navegación */}
          <div className="space-y-1.5">
            {!isSidebarCollapsed && (
              <span className="block px-2 text-[9px] font-black uppercase tracking-widest text-slate-500 pb-1 animate-in fade-in duration-200">
                Menú Principal
              </span>
            )}
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.path ? location.pathname === link.path : false;
              return link.path ? (
                <Link
                  key={link.name}
                  to={link.path}
                  title={isSidebarCollapsed ? link.name : undefined}
                  className={`flex items-center rounded-xl text-xs font-bold transition-all border ${
                    isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4.5 py-3'
                  }  ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="animate-in fade-in duration-200">{link.name}</span>}
                </Link>
              ) : (
                <button
                  key={link.name}
                  onClick={link.onClick}
                  title={isSidebarCollapsed ? link.name : undefined}
                  className={`w-full flex items-center rounded-xl text-xs font-bold transition-all border bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-left cursor-pointer relative ${
                    isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4.5 py-3'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="animate-in fade-in duration-200">{link.name}</span>}
                  {link.name === 'Mensajería / Chat' && totalUnreadCount > 0 && (
                    isSidebarCollapsed ? (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-slate-950" />
                    ) : (
                      <span className="ml-auto bg-red-500 text-white font-bold rounded-full text-[9px] px-1.5 py-0.5 flex items-center justify-center animate-pulse shrink-0">
                        {totalUnreadCount}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Perfil & Acciones */}
        <div className="space-y-4 border-t border-slate-900 pt-6">
          <div className={`flex items-center bg-slate-900/60 border border-slate-850 rounded-xl ${
            isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
          }`}>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <User className="w-4.5 h-4.5 text-amber-500" />
            </div>
            {!isSidebarCollapsed && (
              <div className="truncate min-w-0 animate-in fade-in duration-200">
                <p className="text-[9px] text-slate-500 uppercase font-mono font-black">
                  {user?.role === 'ADMIN' ? '👑 Administrador' : '👷 Inspector'}
                </p>
                <p className="text-xs font-bold text-slate-250 truncate">{user?.username || user?.email}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Cerrar Sesión" : undefined}
            className={`w-full flex items-center justify-center bg-slate-900 hover:bg-red-955/20 hover:text-red-400 border border-slate-800 hover:border-red-900/40 rounded-xl transition-all cursor-pointer text-xs font-bold text-slate-400 ${
              isSidebarCollapsed ? 'p-3' : 'gap-2 py-3'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span className="animate-in fade-in duration-200">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* 4. MAIN PANEL DE CONTENIDO (Scrollable en Escritorio) */}
      <div className="flex-1 min-w-0 overflow-y-auto max-h-screen">
        <Outlet />
      </div>

      {/* MODAL 1: FUTUROS REPORTES PREDICTIVOS */}
      {showReportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowReportsModal(false)} />
          
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Reportes Futuros y Analíticas IA
              </h3>
              <button 
                onClick={() => setShowReportsModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-550 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Estamos trabajando en el desarrollo de herramientas predictivas de inteligencia artificial y módulos avanzados de análisis de red eléctrica. Próximamente dispondrás de los siguientes reportes automáticos:
              </p>

              <div className="grid grid-cols-1 gap-3.5 pt-2">
                {[
                  {
                    title: "Reporte de Análisis Predictivo IA",
                    desc: "Predice la probabilidad de falla y sobrecarga en interruptores basándose en mediciones de corriente y calibración del conductor.",
                    icon: ShieldCheck,
                    color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/40"
                  },
                  {
                    title: "Seguimiento Termográfico y Tendencia de Calor",
                    desc: "Grafica la evolución de temperaturas máximas detectadas en la placa principal, facilitando la planificación de mantenimientos.",
                    icon: Clock,
                    color: "text-sky-400 bg-sky-950/40 border-sky-900/40"
                  },
                  {
                    title: "Módulo de Auditoría de Carga (CEN)",
                    desc: "Valida automáticamente si las acometidas, barrajes y protecciones cumplen con los límites de capacidad establecidos por el Código Eléctrico Nacional.",
                    icon: FileText,
                    color: "text-purple-400 bg-purple-950/40 border-purple-900/40"
                  }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-inner ${item.color}`}>
                      <div className="p-2 rounded-lg bg-slate-900 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                        <p className="text-[10.5px] text-slate-400 leading-normal">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-900">
                <button
                  onClick={() => setShowReportsModal(false)}
                  className="px-5 py-2.5 bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-98 transition-all font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AJUSTES DE RESPALDO Y DRIVE GLOBAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSettingsModal(false)} />
          
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-500" />
                Configuración del Sistema y Respaldo
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              
              {/* Sección 1: Exportar / Importar PostgreSQL */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide border-l-2 border-amber-500 pl-2">
                  Base de Datos PostgreSQL Local
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportDb}
                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-250 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow transition-colors"
                  >
                    <Download className="w-4 h-4 text-sky-400" />
                    Exportar JSON
                  </button>
                  <label className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-250 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow transition-colors">
                    <UploadCloud className="w-4 h-4 text-amber-500" />
                    Importar JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportDb}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Sección 2: Configuración Google Drive */}
              <form onSubmit={handleSaveGDriveConfig} className="space-y-4 pt-2 border-t border-slate-900">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide border-l-2 border-amber-500 pl-2">
                  Google Drive Administrador (Nube)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Respalda en la nube tus datos. Al ingresar tu correo de Google, el sistema generará y compartirá el respaldo contigo automáticamente en "Compartido Conmigo".
                </p>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Correo Electrónico de Google
                  </label>
                  <input
                    type="email"
                    required
                    value={gdriveEmail}
                    onChange={(e) => setGdriveEmail(e.target.value)}
                    placeholder="ejemplo@gmail.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-600 h-9"
                  />
                </div>

                {/* Toggle de Respaldo Automático */}
                <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-200">Respaldo Automático</span>
                    <span className="text-[10px] text-slate-550">Sincronizar cambios en la nube al instante</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoBackup}
                      onChange={(e) => setAutoBackup(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-950 peer-checked:after:border-slate-950"></div>
                  </label>
                </div>

                {/* Estado de Sincronización */}
                <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Estado del Respaldo:</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${syncStatus.includes('éxito') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <span className="font-bold text-slate-200 font-mono text-[10px]">{syncStatus}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-slate-400 font-medium">Último Respaldo:</p>
                    <p className="font-bold text-slate-300 font-mono text-[10px]">{lastSyncTime}</p>
                  </div>
                </div>

                {/* Botones de configuración */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={handleManualGDriveSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-350 rounded-lg text-xs font-semibold cursor-pointer shadow transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Respaldar Ahora</span>
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

              </form>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GESTIÓN DE USUARIOS Y ROLES (SOLO ACCESIBLE PARA ADMINISTRADORES) */}
      {showUsersModal && user?.role === 'ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowUsersModal(false)} />
          
          <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Gestión de Usuarios y Roles
              </h3>
              <button 
                onClick={() => {
                  setEditingUserId(null);
                  setShowUsersModal(false);
                }}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-y-auto pr-1 flex-1 py-2">
              
              {/* Formulario de registro (col-span-2) */}
              <div className="lg:col-span-2 space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-850 h-fit">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide border-l-2 border-amber-500 pl-2">
                  Registrar Nuevo Usuario
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Crea credenciales para inspectores de campo para que puedan usar la tablet y registrar elementos.
                </p>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="ej. inspector1"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-650 h-9"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs text-slate-100 focus:outline-none placeholder-slate-650 h-9"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                      Rol del Usuario
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs focus:outline-none h-9 font-semibold"
                    >
                      <option value="WORKER" className="text-black bg-white">👷 INSPECTOR / TRABAJADOR</option>
                      <option value="ADMIN" className="text-black bg-white">👑 ADMINISTRADOR</option>
                      <option value="CLIENT" className="text-black bg-white">🏢 CLIENTE (EMPRESA)</option>
                    </select>
                  </div>

                  {newUserRole === 'CLIENT' && (
                    <div className="animate-in slide-in-from-top duration-200">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Empresa Asociada
                      </label>
                      <select
                        value={newUserCompanyId}
                        onChange={(e) => setNewUserCompanyId(e.target.value)}
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs focus:outline-none h-9 font-semibold"
                      >
                        <option value="" className="text-black">-- Seleccionar Empresa --</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id} className="text-black">{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-98 transition-all font-bold rounded-lg text-xs cursor-pointer shadow-md"
                  >
                    + Registrar Usuario
                  </button>
                </form>
              </div>

              {/* Listado de usuarios activos (col-span-3) */}
              <div className="lg:col-span-3 space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide border-l-2 border-amber-500 pl-2">
                  Usuarios Registrados ({usersList?.length || 0})
                </h4>

                <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-850 uppercase text-[9px] tracking-widest">
                        <th className="p-3">Usuario</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {(usersList || []).map((u) => {
                        const isSelf = u.id === user?.id;
                        const isEditing = editingUserId === u.id;

                        return (
                          <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                            {isEditing ? (
                              <>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={editingEmail}
                                    onChange={(e) => setEditingEmail(e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                                  />
                                </td>
                                <td className="p-3 space-y-1.5">
                                  <select
                                    value={editingRole}
                                    disabled={isSelf}
                                    onChange={(e) => setEditingRole(e.target.value)}
                                    className="w-full px-2 py-1 bg-white text-slate-900 border border-slate-700 rounded text-xs font-semibold"
                                  >
                                    <option value="WORKER" className="text-black">INSPECTOR</option>
                                    <option value="ADMIN" className="text-black">ADMIN</option>
                                    <option value="CLIENT" className="text-black">CLIENTE</option>
                                  </select>

                                  {editingRole === 'CLIENT' && (
                                    <select
                                      value={editingCompanyId}
                                      onChange={(e) => setEditingCompanyId(e.target.value)}
                                      className="w-full px-2 py-1 bg-white text-slate-900 border border-slate-700 rounded text-xs font-semibold mt-1"
                                    >
                                      <option value="" className="text-black">-- Seleccionar --</option>
                                      {companies.map((c) => (
                                        <option key={c.id} value={c.id} className="text-black">{c.nombre}</option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                                <td className="p-3 text-right space-y-1 sm:space-y-0 sm:space-x-1 flex flex-col sm:flex-row justify-end">
                                  <button
                                    onClick={() => handleSaveUserEdit(u.id)}
                                    className="px-2 py-1 bg-emerald-500 text-slate-950 rounded font-bold hover:bg-emerald-400 text-[10px]"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2 py-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 text-[10px]"
                                  >
                                    Cancelar
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 font-mono font-medium truncate max-w-[150px]" title={u.username || u.email}>
                                  {u.username || u.email} {isSelf && <span className="text-[10px] text-amber-500 font-sans font-bold">(Tú)</span>}
                                </td>
                                <td className="p-3">
                                  {u.role === 'ADMIN' && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black tracking-wide">
                                      ADMIN
                                    </span>
                                  )}
                                  {u.role === 'WORKER' && (
                                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-black tracking-wide">
                                      INSPECTOR
                                    </span>
                                  )}
                                  {u.role === 'CLIENT' && (
                                    <div className="flex flex-col gap-1 items-start">
                                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black tracking-wide">
                                        CLIENTE
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-mono truncate max-w-[100px]" title={companies.find(c => c.id === u.companyId)?.nombre || 'Sin Empresa'}>
                                        🏢 {companies.find(c => c.id === u.companyId)?.nombre || 'Sin Empresa'}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-right flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleStartEditUser(u)}
                                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-400 transition-colors font-bold text-[10px] cursor-pointer"
                                  >
                                    Editar
                                  </button>
                                  {!isSelf && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="px-2 py-1 bg-slate-900 hover:bg-red-955/20 text-slate-500 hover:text-red-400 rounded border border-slate-800 hover:border-red-900/40 transition-all font-bold text-[10px] cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800 shrink-0">
              <button
                onClick={() => {
                  setEditingUserId(null);
                  setShowUsersModal(false);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CHAT DE SOPORTE E INSPECCIÓN */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowChatModal(false)} />
          
          {!isChatEnabled ? (
            /* Pantalla de bloqueo: Módulo en Desarrollo */
            <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col items-center text-center space-y-6">
              <div className="flex justify-between items-center w-full pb-3 border-b border-slate-800 shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  Chat de Soporte e Inspección
                </h3>
                <button 
                  onClick={() => setShowChatModal(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-6 px-2 space-y-4">
                <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full animate-pulse border border-amber-500/20">
                  <Clock className="w-10 h-10" />
                </div>
                <h4 className="text-base font-bold text-slate-100">Módulo en Desarrollo</h4>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Estamos construyendo un canal de soporte y mensajería en tiempo real para conectar a inspectores, administradores y clientes. Este módulo estará disponible próximamente.
                </p>
                
                <div className="w-full bg-slate-900/40 border border-slate-850 rounded-xl p-4 text-left mt-2 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Características en Desarrollo:</p>
                  <ul className="text-[11px] text-slate-350 space-y-1.5 list-disc pl-4 font-sans">
                    <li>Mensajería instantánea bidireccional.</li>
                    <li>Soporte técnico directo en campo.</li>
                    <li>Compartición de tableros e informes.</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowChatModal(false)}
                className="w-full py-3 bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all font-bold rounded-xl text-xs cursor-pointer shadow-md shrink-0"
              >
                Entendido
              </button>
            </div>
          ) : (
            /* El chat real completo */
            <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  Chat de Soporte e Inspección
                </h3>
                <button 
                  onClick={() => setShowChatModal(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex min-h-0 divide-x divide-slate-850 mt-4">
                
                {/* Panel Izquierdo: Lista de Contactos */}
                <div className="w-1/3 pr-4 flex flex-col min-h-0 overflow-y-auto">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Contactos Disponibles
                  </span>
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    {getContacts().length > 0 ? (
                      getContacts().map((contact) => {
                        const isSelected = activeContactId === contact.id;
                        return (
                          <button
                            key={contact.id}
                            onClick={() => {
                              setActiveContactId(contact.id);
                              markMessagesAsRead(contact.id);
                            }}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                                : 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/80 text-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full gap-2">
                              <div className="truncate text-xs font-mono flex-1">
                                {contact.username || contact.email}
                              </div>
                              {(() => {
                                const contactUnreadCount = (messages || []).filter(
                                  (m) => m.senderId === contact.id && m.receiverId === user?.id && !m.read
                                ).length;
                                return contactUnreadCount > 0 ? (
                                  <span className="bg-red-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold flex items-center justify-center animate-pulse shrink-0">
                                    {contactUnreadCount}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <div>
                              {contact.role === 'ADMIN' ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[8px] font-bold">ADMINISTRADOR</span>
                              ) : contact.role === 'WORKER' ? (
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 text-[8px] font-bold">INSPECTOR</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[8px] font-bold">CLIENTE</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-500 italic text-center py-6">No hay destinatarios disponibles para tu rol.</p>
                    )}
                  </div>
                </div>

                {/* Panel Derecho: Historial de Mensajes y Caja de Envío */}
                <div className="w-2/3 pl-4 flex flex-col min-h-0">
                  {activeContactId ? (
                    <>
                      {/* Encabezado del chat activo */}
                      <div className="pb-3 border-b border-slate-900 flex justify-between items-center shrink-0">
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-100 font-mono">
                            {usersList.find((u) => u.id === activeContactId)?.username || usersList.find((u) => u.id === activeContactId)?.email}
                          </p>
                          <p className="text-[9px] text-slate-550 font-mono">
                            Rol: {usersList.find((u) => u.id === activeContactId)?.role}
                          </p>
                        </div>
                      </div>

                      {/* Mensajes del chat */}
                      <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 font-sans">
                        {getActiveMessages().length > 0 ? (
                          getActiveMessages().map((msg) => {
                            const isMe = msg.senderId === user?.id;
                            return (
                              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`px-3.5 py-2 text-xs rounded-2xl max-w-[80%] ${
                                  isMe 
                                    ? 'bg-amber-500 text-slate-950 font-semibold rounded-tr-none shadow-md shadow-amber-500/5' 
                                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                                }`}>
                                  <p className="leading-relaxed whitespace-pre-wrap select-text">{msg.text}</p>
                                </div>
                                <span className="text-[8px] text-slate-555 font-mono mt-1 px-1">
                                  {isMe ? 'Tú' : (msg.senderUsername || msg.senderEmail || 'Anónimo')} • {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-650 space-y-2 select-none">
                            <MessageSquare className="w-8 h-8 opacity-20" />
                            <p className="text-[11px] italic">No hay mensajes. Escribe algo abajo para iniciar.</p>
                          </div>
                        )}
                      </div>

                      {/* Caja de Entrada de Texto */}
                      <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-900 flex gap-2 shrink-0">
                        <input
                          type="text"
                          required
                          value={chatMessageText}
                          onChange={(e) => setChatMessageText(e.target.value)}
                          placeholder="Escribe un mensaje de soporte..."
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-xs text-slate-100 placeholder-slate-650 focus:outline-none h-10"
                        />
                        <button
                          type="submit"
                          className="px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow-md"
                        >
                          Enviar
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-2.5 select-none">
                      <MessageSquare className="w-12 h-12 opacity-15 animate-bounce" />
                      <p className="text-xs font-bold">Selecciona un contacto del panel izquierdo para chatear</p>
                      <p className="text-[10px] text-slate-550 text-center max-w-xs leading-normal">
                        Los administradores chatean con trabajadores y clientes. Los trabajadores con administradores y clientes. Los clientes solo con administradores.
                      </p>
                    </div>
                  )}
                </div>

              </div>

              <div className="flex justify-end pt-4 border-t border-slate-850 shrink-0 mt-4">
                <button
                  onClick={() => setShowChatModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default SidebarLayout;
