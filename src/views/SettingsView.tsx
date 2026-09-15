import React, { useState } from 'react';
import {
  Settings,
  Database,
  Globe,
  Tag,
  Save,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AppSettings } from '../types';
import { saveSettings } from '../lib/storage';
import { SUPABASE_SQL_SCHEMA, getSupabaseClient } from '../lib/supabase';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
}) => {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [qrBaseDomain, setQrBaseDomain] = useState(settings.qrBaseDomain);
  const [useCurrentOrigin, setUseCurrentOrigin] = useState(settings.useCurrentOriginForLinks);
  const [defaultPrefix, setDefaultPrefix] = useState(settings.defaultPrefix);
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      companyName: companyName.trim() || 'Papan Media',
      qrBaseDomain: qrBaseDomain.trim() || 'https://qr.papanmedia.com.br',
      useCurrentOriginForLinks: useCurrentOrigin,
      defaultPrefix: defaultPrefix.trim().toUpperCase() || 'PAPAN',
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    };

    saveSettings(updated);
    onUpdateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseStatus(null);

    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setSupabaseStatus({
        tested: true,
        success: false,
        message: 'Preencha a URL e a Anon Key do Supabase antes de testar.',
      });
      setTestingSupabase(false);
      return;
    }

    try {
      const client = getSupabaseClient(supabaseUrl.trim(), supabaseAnonKey.trim());
      if (!client) {
        throw new Error('Parâmetros inválidos');
      }

      const { data, error } = await client.from('qr_codes').select('id').limit(1);

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          setSupabaseStatus({
            tested: true,
            success: false,
            message: 'Conectou ao Supabase, mas as tabelas ainda não foram criadas. Execute o script SQL abaixo.',
          });
        } else {
          setSupabaseStatus({
            tested: true,
            success: false,
            message: `Erro na consulta: ${error.message}`,
          });
        }
      } else {
        setSupabaseStatus({
          tested: true,
          success: true,
          message: 'Conexão com Supabase bem-sucedida! Tabela qr_codes acessível.',
        });
      }
    } catch (err: any) {
      setSupabaseStatus({
        tested: true,
        success: false,
        message: `Falha na conexão: ${err.message}`,
      });
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Title */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Configurações do Sistema
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Personalize a identidade da Papan Media, domínios de redirecionamento e conexão com o Supabase.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand & Domain Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Identidade e Domínio dos QR Codes</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Papan Media"
                className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Permite futuramente alterar a marca da solução.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prefixo Padrão dos Códigos
              </label>
              <input
                type="text"
                value={defaultPrefix}
                onChange={(e) => setDefaultPrefix(e.target.value.toUpperCase())}
                placeholder="PAPAN"
                className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm uppercase font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Usado para gerar sequências (ex: PAPAN-0001, PAPAN-0002).
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Domínio dos QR Codes Dinâmicos
            </label>
            <input
              type="text"
              value={qrBaseDomain}
              onChange={(e) => setQrBaseDomain(e.target.value)}
              placeholder="https://qr.papanmedia.com.br"
              className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Endereço gravado nas placas físicas de produção. Ex: https://qr.papanmedia.com.br/q/PAPAN-0001
            </p>
          </div>

          {/* Dev/Preview helper toggle */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useCurrentOrigin}
                onChange={(e) => setUseCurrentOrigin(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Resolver links no domínio atual desta aplicação durante testes
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Recomendado para testar o escaneamento e redirecionamento de imediato neste ambiente de preview.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Supabase Integration Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Banco de Dados Supabase</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {supabaseUrl && supabaseAnonKey ? 'Configurado' : 'Modo Local Ativo'}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            O Papan QR possui persistência local imediata e sincroniza em tempo real com seu projeto do Supabase quando configurado.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Anon Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={testingSupabase}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {testingSupabase ? 'Testando conexão...' : 'Testar Conexão Supabase'}
              </button>
            </div>

            {supabaseStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  supabaseStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {supabaseStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <span>{supabaseStatus.message}</span>
              </div>
            )}
          </div>

          {/* SQL Script Box */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Script SQL de Criação das Tabelas
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40 scrollbar-thin">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Save & Sync Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              onResetData();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recarregar dados do Supabase
          </button>

          <button
            id="btn-save-settings"
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>
    </div>
  );
};
