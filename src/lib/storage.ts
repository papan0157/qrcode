import { QRCodeItem, QRScanItem, AppSettings, QRStatus, DestinationType } from '../types';
import { getSupabaseClient } from './supabase';
import { broadcastRealtimeScan } from './realtime';

const STORAGE_KEY_SETTINGS = 'papan_qr_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Papan Media',
  qrBaseDomain: 'https://qr.papanmedia.com.br',
  useCurrentOriginForLinks: true,
  defaultPrefix: 'PAPAN',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error reading settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export function getSettings(): AppSettings {
  return getStoredSettings();
}

// -------------------------------------------------------------
// SUPABASE HEALTH & SCHEMA DIAGNOSTIC
// -------------------------------------------------------------

export interface SupabaseHealthStatus {
  isConfigured: boolean;
  isConnected: boolean;
  tablesExist: boolean;
  tableError: string | null;
  totalQRCodes: number;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) {
    return {
      isConfigured: false,
      isConnected: false,
      tablesExist: false,
      tableError: 'Supabase não configurado (URL ou Chave ausente).',
      totalQRCodes: 0,
    };
  }

  try {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('id', { count: 'exact' });

    if (error) {
      // If error code is PGRST205 or message mentions table does not exist
      const isMissingTable =
        error.code === 'PGRST205' ||
        error.message.includes('relation') ||
        error.message.includes('does not exist') ||
        error.message.includes('schema cache');

      return {
        isConfigured: true,
        isConnected: true,
        tablesExist: !isMissingTable,
        tableError: error.message,
        totalQRCodes: 0,
      };
    }

    // Also check qr_scans table
    const { error: scansError } = await supabase
      .from('qr_scans')
      .select('id')
      .limit(1);

    if (scansError) {
      return {
        isConfigured: true,
        isConnected: true,
        tablesExist: false,
        tableError: `Tabela qr_scans: ${scansError.message}`,
        totalQRCodes: data ? data.length : 0,
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      tablesExist: true,
      tableError: null,
      totalQRCodes: data ? data.length : 0,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      tablesExist: false,
      tableError: err.message || 'Falha de conexão com o Supabase.',
      totalQRCodes: 0,
    };
  }
}

// -------------------------------------------------------------
// REAL SUPABASE DATA OPERATIONS (NO MOCK DATA)
// -------------------------------------------------------------

/**
 * Fetches all QR Codes directly from the Supabase qr_codes table.
 */
export async function fetchAllQRCodes(): Promise<QRCodeItem[]> {
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) {
    throw new Error('Supabase não está configurado.');
  }

  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao consultar qr_codes no Supabase:', error);
    throw error;
  }

  return (data || []) as QRCodeItem[];
}

/**
 * Fetches a single QR Code by its code string (e.g. 'PAPAN-0001') directly from Supabase.
 */
export async function fetchQRCodeByCode(code: string): Promise<QRCodeItem | null> {
  const normalized = code.trim().toUpperCase();
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) {
    throw new Error('Supabase não está configurado.');
  }

  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (error) {
    console.error(`Erro ao consultar QR Code ${normalized} no Supabase:`, error);
    throw error;
  }

  return data as QRCodeItem | null;
}

/**
 * Fetches a QR Code by its UUID directly from Supabase.
 */
export async function fetchQRCodeById(id: string): Promise<QRCodeItem | null> {
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) {
    throw new Error('Supabase não está configurado.');
  }

  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`Erro ao consultar QR Code por ID no Supabase:`, error);
    throw error;
  }

  return data as QRCodeItem | null;
}

/**
 * Gets the first available QR code from Supabase stock.
 */
export async function getFirstAvailableQRCode(): Promise<QRCodeItem | null> {
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) return null;

  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('status', 'DISPONIVEL')
    .order('code', { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0] as QRCodeItem;
}

/**
 * Generates batch QR codes and inserts them directly into the Supabase database.
 */
export async function generateBatchQRCodes(
  quantity: number,
  prefix: string = 'PAPAN'
): Promise<{ added: number; firstCode: string; lastCode: string }> {
  const cleanPrefix = prefix.trim().toUpperCase() || 'PAPAN';
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) {
    throw new Error('Supabase não está configurado. Conecte o Supabase nas Configurações.');
  }

  // 1. Query existing codes from Supabase to prevent collisions
  const { data: existing, error: fetchErr } = await supabase
    .from('qr_codes')
    .select('code');

  if (fetchErr) {
    throw new Error(`Erro ao verificar códigos existentes no Supabase: ${fetchErr.message}`);
  }

  let maxNum = 0;
  (existing || []).forEach((item: { code: string }) => {
    if (item.code.startsWith(cleanPrefix)) {
      const numPart = item.code.replace(cleanPrefix, '').replace(/^-/, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });

  const now = new Date().toISOString();
  const newItems: any[] = [];

  for (let i = 1; i <= quantity; i++) {
    const nextNum = maxNum + i;
    const formattedNum = String(nextNum).padStart(4, '0');
    const code = `${cleanPrefix}-${formattedNum}`;

    newItems.push({
      code,
      company_name: null,
      destination_url: null,
      destination_type: null,
      status: 'DISPONIVEL',
      created_at: now,
      activated_at: null,
      updated_at: now,
      last_access_at: null,
      total_scans: 0,
    });
  }

  // 2. Insert directly into Supabase in chunks
  const chunkSize = 200;
  for (let i = 0; i < newItems.length; i += chunkSize) {
    const chunk = newItems.slice(i, i + chunkSize);
    const { error: insertErr } = await supabase.from('qr_codes').insert(chunk);
    if (insertErr) {
      throw new Error(`Erro ao gravar registros no Supabase: ${insertErr.message}`);
    }
  }

  return {
    added: newItems.length,
    firstCode: newItems[0].code,
    lastCode: newItems[newItems.length - 1].code,
  };
}

/**
 * Activates a QR Code directly in the Supabase database.
 */
export async function activateQRCode(params: {
  id: string;
  company_name: string;
  destination_url: string;
  destination_type: DestinationType;
}): Promise<QRCodeItem> {
  const now = new Date().toISOString();
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) {
    throw new Error('Supabase não está configurado.');
  }

  const { data, error } = await supabase
    .from('qr_codes')
    .update({
      company_name: params.company_name.trim(),
      destination_url: params.destination_url.trim(),
      destination_type: params.destination_type,
      status: 'ATIVO',
      activated_at: now,
      updated_at: now,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao ativar QR Code no Supabase: ${error.message}`);
  }

  return data as QRCodeItem;
}

/**
 * Updates a QR Code directly in the Supabase database.
 */
export async function updateQRCode(
  id: string,
  data: Partial<Pick<QRCodeItem, 'company_name' | 'destination_url' | 'destination_type' | 'status'>>
): Promise<QRCodeItem> {
  const now = new Date().toISOString();
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) {
    throw new Error('Supabase não está configurado.');
  }

  const payload: any = {
    ...data,
    updated_at: now,
  };

  if (data.status === 'ATIVO') {
    payload.activated_at = now;
  }

  const { data: updated, error } = await supabase
    .from('qr_codes')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar QR Code no Supabase: ${error.message}`);
  }

  return updated as QRCodeItem;
}

/**
 * Records a scan directly in the Supabase database (qr_scans table and updates qr_codes table)
 * and broadcasts the event immediately to all listening clients in real-time.
 */
export async function recordScan(
  code: string,
  existingQr?: QRCodeItem | null,
  userAgent: string = (typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconhecido'),
  referrer: string = (typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct')
): Promise<QRCodeItem | null> {
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) return null;

  // Use already fetched QR or query by code
  const qr = existingQr || (await fetchQRCodeByCode(code));
  if (!qr || qr.status !== 'ATIVO') {
    return null;
  }

  const now = new Date().toISOString();
  const newScanCount = (qr.total_scans || 0) + 1;

  try {
    // 1 & 2. Execute insert in qr_scans and update on qr_codes in parallel for maximum speed
    const [scanResult, updateResult] = await Promise.all([
      supabase
        .from('qr_scans')
        .insert({
          qr_code_id: qr.id,
          code: qr.code,
          scanned_at: now,
          user_agent: userAgent,
          referrer: referrer || null,
        })
        .select()
        .maybeSingle(),
      supabase
        .from('qr_codes')
        .update({
          total_scans: newScanCount,
          last_access_at: now,
        })
        .eq('id', qr.id)
        .select()
        .single(),
    ]);

    if (scanResult.error) {
      console.error('Erro ao gravar scan no Supabase:', scanResult.error);
    }

    if (updateResult.error) {
      console.error('Erro ao atualizar contagem de acessos no Supabase:', updateResult.error);
    }

    const updatedQr: QRCodeItem = (updateResult.data as QRCodeItem) || {
      ...qr,
      total_scans: newScanCount,
      last_access_at: now,
    };

    const newScanRecord: QRScanItem = (scanResult.data as QRScanItem) || {
      id: `scan-${Date.now()}`,
      qr_code_id: qr.id,
      code: qr.code,
      scanned_at: now,
      user_agent: userAgent,
      referrer: referrer || null,
    };

    // Broadcast in real-time across Supabase Realtime, BroadcastChannel, and LocalStorage
    broadcastRealtimeScan({
      code: qr.code,
      qrId: qr.id,
      totalScans: updatedQr.total_scans,
      lastAccessAt: now,
      newScan: newScanRecord,
      source: 'redirect',
    });

    return updatedQr;
  } catch (err) {
    console.error('Erro no registro do scan:', err);
    return qr;
  }
}

/**
 * Fetches real scan logs for a given QR code from Supabase qr_scans table.
 */
export async function getScansForQRCode(qrId: string): Promise<QRScanItem[]> {
  const settings = getSettings();
  const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);

  if (!supabase) return [];

  const { data, error } = await supabase
    .from('qr_scans')
    .select('*')
    .eq('qr_code_id', qrId)
    .order('scanned_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar acessos no Supabase:', error);
    return [];
  }

  return (data || []) as QRScanItem[];
}
