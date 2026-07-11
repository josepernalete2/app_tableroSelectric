import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Zap, ShieldCheck } from 'lucide-react';

export const LoginView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingresa tus credenciales.');
      return;
    }
    // Validación básica simple para tablet offline/local
    if (email.includes('@') && password.length >= 4) {
      login(email, password);
      navigate('/');
    } else {
      setError('El correo debe ser válido y la contraseña tener al menos 4 caracteres.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Tarjeta de Login */}
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col justify-between">
        
        {/* Cabecera */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex bg-amber-500 text-slate-950 p-3 rounded-2xl shadow-lg shadow-amber-500/20 mb-2">
            <Zap className="w-8 h-8 fill-slate-950" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
            TableroSelectric Pro
          </h2>
          <p className="text-sm text-slate-400">
            Plataforma Profesional de Inspección de Tableros
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-400 text-center font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="inspector@empresa.com"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-500 h-12"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-sm focus:outline-none text-slate-100 placeholder-slate-500 h-12"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-amber-500/15 transition-all text-sm cursor-pointer"
          >
            Iniciar Sesión
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Acceso seguro para inspectores de campo (Tablet PWA)</span>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
