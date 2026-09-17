import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(url?: string, key?: string): SupabaseClient | null {
  const finalUrl = url || import.meta.env.VITE_SUPABASE_URL;
  const finalKey = key || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!finalUrl || !finalKey || finalUrl.includes('your-project') || finalKey.includes('your-anon-key')) {
    return null;
  }

  const configKey = `${finalUrl}:::${finalKey}`;
  if (!supabaseClient || currentConfigKey !== configKey) {
    try {
      supabaseClient = createClient(finalUrl, finalKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          fetch: (input, init) => {
            return fetch(input, {
              ...init,
              keepalive: true,
            });
          },
        },
      });
      currentConfigKey = configKey;
    } catch (err) {
      console.error('Error creating Supabase client:', err);
      return null;
    }
  }

  return supabaseClient;
}

export const SUPABASE_SQL_SCHEMA = `-- Script SQL Oficial para o Supabase (Papan QR - Papan Media)
-- Execute este script no menu "SQL Editor" do seu painel Supabase

-- 1. Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Criação da tabela de QR Codes
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  company_name VARCHAR(255),
  destination_url TEXT,
  destination_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_access_at TIMESTAMPTZ,
  total_scans INTEGER NOT NULL DEFAULT 0
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_company ON public.qr_codes(company_name);

-- 4. Criação da tabela de Escaneamentos (Scans)
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  code VARCHAR(50),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON public.qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_code ON public.qr_scans(code);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON public.qr_scans(scanned_at DESC);

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso para a Chave Anon/Publishable e Autenticados
DROP POLICY IF EXISTS "Allow all on qr_codes" ON public.qr_codes;
CREATE POLICY "Allow all on qr_codes" ON public.qr_codes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on qr_scans" ON public.qr_scans;
CREATE POLICY "Allow all on qr_scans" ON public.qr_scans
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Concessão explícita de permissões
GRANT ALL ON TABLE public.qr_codes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.qr_scans TO anon, authenticated, service_role;

-- 8. Habilitar Supabase Realtime para escutas de banco em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_scans;
`;
