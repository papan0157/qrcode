import { getSupabaseClient } from './supabase';
import { getSettings } from './storage';
import { QRScanItem } from '../types';

export interface RealtimeScanEvent {
  code: string;
  qrId: string;
  totalScans: number;
  lastAccessAt: string;
  newScan?: QRScanItem;
  source?: 'redirect' | 'test' | 'external';
}

const BROADCAST_CHANNEL_NAME = 'papan_qr_realtime_channel';
const LOCAL_STORAGE_KEY = 'papan_realtime_last_scan';

// BroadcastChannel instance for same-browser cross-tab instant messaging
let localBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    localBroadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch (err) {
  console.warn('BroadcastChannel not supported:', err);
}

/**
 * Dispatches a scan event across all channels:
 * 1. HTML5 BroadcastChannel (0ms, same browser, all tabs/windows)
 * 2. Window CustomEvent (same document)
 * 3. localStorage event (fallback for older browsers)
 * 4. Supabase Realtime Broadcast (all devices anywhere in the world)
 */
export function broadcastRealtimeScan(event: RealtimeScanEvent): void {
  // 1. BroadcastChannel
  try {
    if (localBroadcastChannel) {
      localBroadcastChannel.postMessage(event);
    }
  } catch (err) {
    console.error('Error posting to BroadcastChannel:', err);
  }

  // 2. Window CustomEvent
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('papan_qr_scan_event', { detail: event }));
    }
  } catch (err) {
    console.error('Error dispatching CustomEvent:', err);
  }

  // 3. LocalStorage Event
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...event, _t: Date.now() }));
    }
  } catch (err) {
    console.error('Error setting localStorage for realtime sync:', err);
  }

  // 4. Supabase Realtime Broadcast
  try {
    const settings = getSettings();
    const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
    if (supabase) {
      const channel = supabase.channel('papan-global-realtime');
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'scan_recorded',
            payload: event,
          });
        }
      });
    }
  } catch (err) {
    console.error('Error sending Supabase broadcast:', err);
  }
}

/**
 * Subscribes to scan events across all real-time channels:
 * - Supabase Realtime (Broadcast + Postgres Changes)
 * - HTML5 BroadcastChannel
 * - LocalStorage sync
 * - Window CustomEvents
 */
export function subscribeToRealtimeScans(
  onScan: (event: RealtimeScanEvent) => void
): () => void {
  const cleanups: (() => void)[] = [];

  // 1. Listen to HTML5 BroadcastChannel
  if (localBroadcastChannel) {
    const handleBroadcastMsg = (msgEvent: MessageEvent) => {
      if (msgEvent.data && msgEvent.data.code) {
        onScan(msgEvent.data as RealtimeScanEvent);
      }
    };
    localBroadcastChannel.addEventListener('message', handleBroadcastMsg);
    cleanups.push(() => {
      localBroadcastChannel?.removeEventListener('message', handleBroadcastMsg);
    });
  }

  // 2. Listen to Window CustomEvent
  if (typeof window !== 'undefined') {
    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.code) {
        onScan(detail as RealtimeScanEvent);
      }
    };
    window.addEventListener('papan_qr_scan_event', handleCustomEvent);
    cleanups.push(() => {
      window.removeEventListener('papan_qr_scan_event', handleCustomEvent);
    });

    // 3. Listen to LocalStorage storage event
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.code) {
            onScan(parsed as RealtimeScanEvent);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    cleanups.push(() => {
      window.removeEventListener('storage', handleStorageEvent);
    });
  }

  // 4. Listen to Supabase Realtime (Broadcast & Postgres Changes)
  try {
    const settings = getSettings();
    const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
    if (supabase) {
      const globalChannel = supabase.channel('papan-global-realtime');

      // Listen for broadcasts from any device
      globalChannel.on('broadcast', { event: 'scan_recorded' }, (message: any) => {
        if (message && message.payload && message.payload.code) {
          onScan(message.payload as RealtimeScanEvent);
        }
      });

      // Also listen for postgres changes on qr_codes table (in case publication is enabled)
      globalChannel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'qr_codes' },
        (payload: any) => {
          if (payload.new && payload.new.code) {
            onScan({
              code: payload.new.code,
              qrId: payload.new.id,
              totalScans: payload.new.total_scans || 0,
              lastAccessAt: payload.new.last_access_at || new Date().toISOString(),
              source: 'external',
            });
          }
        }
      );

      // Also listen for postgres changes on qr_scans table
      globalChannel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'qr_scans' },
        (payload: any) => {
          if (payload.new && payload.new.code) {
            onScan({
              code: payload.new.code,
              qrId: payload.new.qr_code_id,
              totalScans: 0, // Will trigger a gentle sync
              lastAccessAt: payload.new.scanned_at || new Date().toISOString(),
              newScan: payload.new as QRScanItem,
              source: 'external',
            });
          }
        }
      );

      globalChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected to Supabase realtime
        }
      });

      cleanups.push(() => {
        try {
          supabase.removeChannel(globalChannel);
        } catch {
          // ignore
        }
      });
    }
  } catch (err) {
    console.warn('Supabase realtime subscription failed:', err);
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
  };
}
