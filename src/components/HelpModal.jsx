import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  ShieldCheck, 
  Key, 
  Lock, 
  BookOpen, 
  FileCode, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Info 
} from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('roles');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Manual de Usuario y Centro de Ayuda</h2>
              <p className="text-xs text-slate-400">Guía operativa, normativas eléctricas y seguridad del sistema</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de Navegación */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'roles', label: 'Roles y Permisos', icon: ShieldCheck },
            { id: 'security', label: 'Seguridad y 2FA', icon: Lock },
            { id: 'normativa', label: 'Normativa Eléctrica', icon: Zap },
            { id: 'dxf', label: 'Exportación DXF / CAD', icon: FileCode },
            { id: 'auditoria', label: 'Auditoría y Alarmas', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  active 
                    ? 'border-amber-500 text-amber-400 font-bold bg-amber-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido del Tab */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-slate-300">
          
          {/* TAB 1: ROLES */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Matriz de Roles y Permisos (RBAC)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="px-2 py-0.5 w-max rounded bg-purple-500/20 text-purple-400 font-bold text-[10px] border border-purple-500/30">ADMIN</div>
                  <h4 className="font-bold text-slate-100">Administrador Total</h4>
                  <ul className="space-y-1 text-slate-400 list-disc list-inside">
                    <li>Crear, editar y eliminar empresas y proyectos.</li>
                    <li>Gestión de usuarios y asignación de roles.</li>
                    <li>Respaldos JSON y sincronización Google Drive.</li>
                    <li>Eliminación de tableros y circuitos.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="px-2 py-0.5 w-max rounded bg-blue-500/20 text-blue-400 font-bold text-[10px] border border-blue-500/30">WORKER</div>
                  <h4 className="font-bold text-slate-100">Ingeniero / Inspector</h4>
                  <ul className="space-y-1 text-slate-400 list-disc list-inside">
                    <li>Levantamiento de tableros y circuitos en campo.</li>
                    <li>Cálculo de balance de fases y factor de potencia.</li>
                    <li>Registro de inspecciones técnicas (Termografía, Tierras).</li>
                    <li>Exportación de informes y diagramas DXF.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="px-2 py-0.5 w-max rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">CLIENT</div>
                  <h4 className="font-bold text-slate-100">Cliente / Observador</h4>
                  <ul className="space-y-1 text-slate-400 list-disc list-inside">
                    <li>Acceso exclusivo a su empresa asociada (Multitenancy).</li>
                    <li>Modo solo lectura de tableros y diagramas.</li>
                    <li>Visualización y descarga de informes compilados.</li>
                    <li>Revisión de alarmas y estado de red.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SEGURIDAD & 2FA */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Recuperación de Contraseña y Autenticación 2FA
              </h3>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" /> Solicitud de Restablecimiento de Clave
                  </h4>
                  <p className="text-slate-400">
                    Si olvidó sus credenciales, puede solicitar el enlace de reseteo mediante el endpoint seguro 
                    <code className="mx-1 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-400">POST /api/users/request-reset</code> 
                    con su nombre de usuario. Se generará un token JWT con vigencia de 1 hora.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Verificación de Dos Factores (2FA)
                  </h4>
                  <p className="text-slate-400">
                    Para elevar la seguridad en operaciones críticas (exportación masiva, reseteo de red), 
                    se valida el código OTP de 6 dígitos mediante <code className="mx-1 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-400">POST /api/users/verify-2fa</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NORMATIVA ELÉCTRICA */}
          {activeTab === 'normativa' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Criterios Normativos (NEC / Fondonorma / COVENIN)
              </h3>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200 block">Límite de Desbalance de Fases: Máx 15%</strong>
                    <span className="text-slate-400">
                      Calculado con la fórmula estandarizada: <code>% Desbalance = (Máxima desviación de corriente / Corriente promedio) * 100</code>.
                      Valores mayores al 15% reducen la vida útil del transformador y provocan calentamiento en el conductor neutro.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200 block">Régimen de Carga Continua: Máx 80%</strong>
                    <span className="text-slate-400">
                      Para cargas activas durante más de 3 horas continuas, la corriente de fase no debe superar el 80% de la capacidad nominal del interruptor principal (Art. 210-20 NEC).
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                  <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200 block">Factor de Potencia Óptimo: FP &gt;= 0.90</strong>
                    <span className="text-slate-400">
                      Cálculo de potencia reactiva requerida: <code>kVAR = kVA * √(1 - FP²)</code> para compensación con bancos de condensadores.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DXF */}
          {activeTab === 'dxf' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <FileCode className="w-4 h-4" /> Exportación DXF a AutoCAD (Capa 3)
              </h3>
              <p className="text-slate-400">
                El sistema genera archivos en formato estándar **ASCII DXF Release 12 (AC1009)**, compatibles con cualquier versión de AutoCAD, LibreCAD, ZWCAD o Visio.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-bold">Fase A (Rojo)</div>
                <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold">Fase B (Amarillo)</div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold">Fase C (Azul)</div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">Tierra (Verde)</div>
              </div>
              <p className="text-slate-400 text-[11px]">
                💡 Para exportar, presione el botón <strong>"Descargar DXF"</strong> ubicado en la cabecera de cualquier tablero eléctrico.
              </p>
            </div>
          )}

          {/* TAB 5: AUDITORÍA */}
          {activeTab === 'auditoria' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Motor de Auditoría y Alarmas Eléctricas (Capas 5 y 8)
              </h3>
              <div className="space-y-2 text-slate-400">
                <p>El motor de auditoría evalúa en tiempo real:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>Elementos Huérfanos:</strong> Equipos sin conexión aguas arriba ni aguas abajo en la red jerárquica.</li>
                  <li><strong>Tableros Sin Carga:</strong> Tableros activos con 0 VA o sin circuitos operativos registrados.</li>
                  <li><strong>Alarmas de Desbalance:</strong> Disparo automático cuando el desbalance entre fases supera el 15%.</li>
                  <li><strong>Alarmas de Sobrecarga:</strong> Alerta inmediata ante sobrepaso del 80% o 100% de la capacidad del interruptor.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
