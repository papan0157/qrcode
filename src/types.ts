export type QRStatus = 'DISPONIVEL' | 'ATIVO' | 'PAUSADO' | 'ARQUIVADO';

export type DestinationType = 
  | 'google_review'
  | 'whatsapp'
  | 'instagram'
  | 'website'
  | 'other';

export interface QRCodeItem {
  id: string;
  code: string; // e.g. 'PAPAN-0047'
  company_name: string | null;
  destination_url: string | null;
  destination_type: DestinationType | null;
  status: QRStatus;
  created_at: string;
  activated_at: string | null;
  updated_at: string;
  last_access_at: string | null;
  total_scans: number;
}

export interface QRScanItem {
  id: string;
  qr_code_id: string;
  code: string;
  scanned_at: string;
  user_agent: string;
  referrer: string | null;
}

export interface AppSettings {
  companyName: string;
  qrBaseDomain: string; // e.g. 'https://qr.papanmedia.com.br' or current window origin
  useCurrentOriginForLinks: boolean;
  defaultPrefix: string; // 'PAPAN'
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin';
  name: string;
}
