'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertOctagon, ShieldCheck } from 'lucide-react';
import { getApiUrl, getSocketUrl } from '@/utils/urlUtils';
import { socket } from '@/lib/socket';

/**
 * Notifikasi "Dynamic Island" untuk pesan yang dikirim dari VOCML dashboard.
 *
 * Alur: VOCML → (backend billiard poll /api/v1/messages tiap 1 menit) → SSE /api/license/stream → komponen ini.
 * - intervalMenit : pesan muncul lagi tiap N menit setelah ditutup / hilang. 0 = sekali saja.
 * - durasiDetik   : lama tampil sebelum otomatis hilang. 0 = tetap tampil sampai ditutup.
 * - Pesan yang dinonaktifkan / dihapus di VOCML langsung hilang dari layar.
 */
export interface BroadcastMessage {
  id: string | number;
  judul?: string;
  pesan: string;
  tipe: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
  intervalMenit?: number;
  durasiDetik?: number;
  versi?: string;
}

const TOAST_CONFIG = {
  INFO:    { color: '#3b82f6', icon: Info },
  SUCCESS: { color: '#22c55e', icon: CheckCircle },
  WARNING: { color: '#f59e0b', icon: AlertTriangle },
  DANGER:  { color: '#ef4444', icon: AlertOctagon },
};

const STORAGE_KEY = 'voc_broadcast_last_shown';

const msgKey = (m: BroadcastMessage) => `${m.id}:${m.versi || ''}`;

function loadLastShown(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveLastShown(map: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}

export function BroadcastToast() {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<string[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [renewedPopup, setRenewedPopup] = useState<{
    expiredAt?: string | null;
    daysLeft?: number;
  } | null>(null);

  const lastRenewPopupAtRef = useRef<number>(0);
  const renewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showRenewedPopup = useCallback((detail?: any) => {
    // Validasi ketat: Jangan pernah tampilkan popup perpanjangan jika lisensi terkunci / expired / sisa hari <= 0
    const daysLeft = typeof detail?.daysLeft === 'number' ? detail.daysLeft : undefined;
    const isExpiredOrBlocked = detail?.status === 'EXPIRED' || detail?.status === 'BLOCKED' || (daysLeft !== undefined && daysLeft <= 0);
    if (isExpiredOrBlocked) {
      setRenewedPopup(null);
      return;
    }
    if (detail?.expiredAt && new Date(detail.expiredAt).getTime() < Date.now()) {
      setRenewedPopup(null);
      return;
    }

    const now = Date.now();
    if (now - lastRenewPopupAtRef.current < 5000) return;
    lastRenewPopupAtRef.current = now;
    setRenewedPopup({
      expiredAt: detail?.expiredAt || null,
      daysLeft: daysLeft,
    });
    if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
    renewTimerRef.current = setTimeout(() => {
      setRenewedPopup(null);
    }, 10000);
  }, []);

  const messagesRef = useRef<BroadcastMessage[]>([]);
  const visibleRef = useRef<Set<string>>(new Set());
  const lastShownRef = useRef<Record<string, number>>({});
  const hideTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const syncVisible = () => setVisibleKeys(Array.from(visibleRef.current));

  const hide = useCallback((key: string) => {
    const wasVisible = visibleRef.current.delete(key);
    if (hideTimersRef.current[key]) {
      clearTimeout(hideTimersRef.current[key]);
      delete hideTimersRef.current[key];
    }
    // Interval dihitung sejak pesan MUNCUL (lihat show()), sehingga "tiap 1 menit"
    // benar-benar muncul tiap 60 detik. Pengecualian: pesan dengan lama tampil 0
    // (tampil sampai ditutup) → interval dihitung sejak ditutup, agar tidak langsung muncul lagi.
    const m = messagesRef.current.find(x => msgKey(x) === key);
    if (wasVisible && m && Number(m.durasiDetik ?? 15) <= 0) {
      lastShownRef.current[key] = Date.now();
      saveLastShown(lastShownRef.current);
    }
    syncVisible();
  }, []);

  const show = useCallback((m: BroadcastMessage) => {
    const key = msgKey(m);
    if (visibleRef.current.has(key)) return;
    visibleRef.current.add(key);
    lastShownRef.current[key] = Date.now();
    saveLastShown(lastShownRef.current);
    const dur = Number(m.durasiDetik ?? 15);
    if (dur > 0) {
      hideTimersRef.current[key] = setTimeout(() => hide(key), dur * 1000);
    }
    syncVisible();
  }, [hide]);

  /** Cek pesan mana yang sudah waktunya tampil. */
  const evaluate = useCallback(() => {
    const now = Date.now();
    for (const m of messagesRef.current) {
      const key = msgKey(m);
      if (visibleRef.current.has(key)) continue;
      const last = lastShownRef.current[key];
      const interval = Number(m.intervalMenit ?? 0);
      if (last === undefined) { show(m); continue; }
      if (interval > 0 && now - last >= interval * 60_000) show(m);
    }
  }, [show]);

  /** Ganti seluruh daftar pesan (server selalu mengirim daftar lengkap). */
  const applyMessages = useCallback((list: BroadcastMessage[]) => {
    if (!Array.isArray(list)) return;
    const valid = list.filter(m => m && m.id !== undefined && m.pesan);
    const keys = new Set(valid.map(msgKey));

    // Pesan yang dihapus / dinonaktifkan di VOCML → langsung hilang
    Array.from(visibleRef.current).forEach(k => { if (!keys.has(k)) hide(k); });
    // Bersihkan riwayat pesan yang sudah tidak ada
    Object.keys(lastShownRef.current).forEach(k => { if (!keys.has(k)) delete lastShownRef.current[k]; });
    saveLastShown(lastShownRef.current);

    messagesRef.current = valid;
    setMessages(valid);
    evaluate();
  }, [evaluate, hide]);

  // Init: riwayat + snapshot awal + SSE real-time
  useEffect(() => {
    lastShownRef.current = loadLastShown();
    const API_BASE = getApiUrl();
    fetch(`${API_BASE}/api/license/messages`).then(r => r.json()).then(applyMessages).catch(() => {});

    let evtSource: EventSource | null = null;
    let retry: NodeJS.Timeout | null = null;
    const connect = () => {
      evtSource = new EventSource(`${getSocketUrl()}/api/license/stream`);
      evtSource.onmessage = (event) => {
        if (!event.data) return;
        try { applyMessages(JSON.parse(event.data)); } catch {}
      };
      evtSource.addEventListener('renew', (event) => {
        try {
          const data = (event as MessageEvent).data ? JSON.parse((event as MessageEvent).data) : {};
          showRenewedPopup(data);
        } catch {
          showRenewedPopup();
        }
      });
      evtSource.onerror = () => {
        evtSource?.close();
        retry = setTimeout(connect, 5000); // auto-reconnect tiap 5 detik
      };
    };
    connect();

    const onSocketRenewed = (data: any) => showRenewedPopup(data);
    const onWindowRenewed = (ev: Event) => showRenewedPopup((ev as CustomEvent)?.detail);
    socket.on('license_renewed', onSocketRenewed);
    window.addEventListener('vocml:license_renewed', onWindowRenewed);

    const tick = setInterval(evaluate, 1000);
    return () => {
      evtSource?.close();
      if (retry) clearTimeout(retry);
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      socket.off('license_renewed', onSocketRenewed);
      window.removeEventListener('vocml:license_renewed', onWindowRenewed);
      clearInterval(tick);
      Object.values(hideTimersRef.current).forEach(clearTimeout);
    };
  }, [applyMessages, evaluate, showRenewedPopup]);

  const visible = messages.filter(m => visibleKeys.includes(msgKey(m)));
  if (visible.length === 0 && !renewedPopup) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 'max(12px, calc(env(safe-area-inset-top) + 8px))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000000, // di atas layar terkunci (/activate memakai 999999)
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {renewedPopup && (
        <div
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            borderRadius: '18px',
            padding: '14px 18px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            width: 'min(440px, 92vw)',
            pointerEvents: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,211,153,0.45)',
            animation: 'vocIslandIn .4s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{
            background: '#10b981',
            width: '36px', height: '36px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 0 16px rgba(16,185,129,0.55)',
          }}>
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: 800 }}>
              Lisensi anda berhasil diperpanjang
            </p>
            {(renewedPopup.expiredAt || (typeof renewedPopup.daysLeft === 'number' && renewedPopup.daysLeft > 0)) && (
              <p style={{ margin: '2px 0 0', color: '#d1fae5', fontSize: '12px', fontWeight: 600 }}>
                {renewedPopup.expiredAt
                  ? `Berlaku s/d ${new Date(renewedPopup.expiredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : ''}
                {typeof renewedPopup.daysLeft === 'number' && renewedPopup.daysLeft > 0
                  ? `${renewedPopup.expiredAt ? ' • ' : ''}Sisa ${renewedPopup.daysLeft} Hari`
                  : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => setRenewedPopup(null)}
            style={{
              flexShrink: 0, background: 'rgba(255,255,255,0.14)', border: 'none',
              width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', borderRadius: '50%',
            }}
            title="Tutup"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {visible.map((m) => {
        const key = msgKey(m);
        const cfg = TOAST_CONFIG[m.tipe] || TOAST_CONFIG.INFO;
        const Icon = cfg.icon;
        const expanded = expandedKey === key;
        return (
          <div
            key={key}
            onClick={() => setExpandedKey(expanded ? null : key)}
            className="voc-island"
            style={{
              background: '#000',
              borderRadius: expanded ? '22px' : '9999px',
              minHeight: '36px',
              padding: expanded ? '10px 12px 10px 8px' : '4px 10px 4px 4px',
              display: 'flex',
              gap: '10px',
              alignItems: expanded ? 'flex-start' : 'center',
              width: expanded ? 'min(460px, 92vw)' : 'max-content',
              maxWidth: '92vw',
              pointerEvents: 'auto',
              cursor: 'pointer',
              boxShadow: `0 8px 30px rgba(0,0,0,.35), 0 0 0 1px ${cfg.color}33`,
              transition: 'all .35s cubic-bezier(0.16, 1, 0.3, 1)',
              animation: 'vocIslandIn .45s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{
              background: cfg.color,
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: `0 0 12px ${cfg.color}88`,
            }}>
              <Icon size={15} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: '4px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {m.judul && (
                <p style={{ margin: 0, color: cfg.color, fontSize: '11px', fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase' }}>
                  {m.judul}
                </p>
              )}
              <p style={{
                margin: 0, color: '#fff', fontSize: '12.5px', lineHeight: 1.4, fontWeight: 600,
                whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: expanded ? 'none' : 'min(520px, 70vw)',
                wordBreak: 'break-word',
              }}>
                {m.pesan}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); hide(key); if (expanded) setExpandedKey(null); }}
              style={{
                flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: 'none',
                width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#cbd5e1', borderRadius: '50%',
              }}
              title={Number(m.intervalMenit) > 0 ? `Tutup (muncul lagi ${m.intervalMenit} menit)` : 'Tutup'}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes vocIslandIn {
          from { transform: translateY(-24px) scale(.6); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
