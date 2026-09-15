import React, { useState } from 'react';
import { QrCode, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuthUser } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { getSettings } from '../lib/storage';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('suporte.papanmedia@gmail.com');
  const [password, setPassword] = useState('matheus0157');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Informe o e-mail e a senha.');
      setLoading(false);
      return;
    }

    try {
      const settings = getSettings();
      const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (data?.user) {
          onLoginSuccess({
            id: data.user.id,
            email: data.user.email || email,
            role: 'admin',
            name: data.user.user_metadata?.name || 'Administrador',
          });
          return;
        }
      }

      // Validação da senha de administrador
      if (password.trim() !== 'matheus0157') {
        setErrorMsg('Senha incorreta. Verifique os dados informados.');
        setLoading(false);
        return;
      }

      // Login de Administrador autorizado
      setTimeout(() => {
        onLoginSuccess({
          id: 'admin-papan-01',
          email: email.trim(),
          role: 'admin',
          name: 'Administrador Papan Media',
        });
      }, 250);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo Papan QR */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10">
            <QrCode className="w-9 h-9 text-blue-400" />
          </div>
        </div>

        <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          Papan QR
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Painel Administrativo • Papan Media
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Login</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Entre com as credenciais de administrador para gerenciar o estoque.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@papanmedia.com.br"
                  className="block w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition-all shadow-sm cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick preset notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Acesso exclusivo Admin
            </span>
            <span className="text-[11px] text-slate-400">Papan QR v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
