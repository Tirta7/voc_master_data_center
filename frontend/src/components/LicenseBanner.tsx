'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, X, Sparkles } from 'lucide-react';
import { getApiUrl, getSocketUrl } from '@/utils/urlUtils';
import { socket } from '@/lib/socket';
import TrialExhaustedModal from '@/components/TrialExhaustedModal';

interface LicenseState {
  status: string;
  daysLeft: number;
  graceDaysLeft?: number;
  expiredAt?: string;
  machineId?: string;
  billing?: any;
  trial?: {
    enabled: boolean;
    quota: number;
    used: number;
    remaining: number;
    is_trial: boolean;
  } | null;
}

export function LicenseBanner() {
  const [state, setState] = useState<LicenseState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    // Muncul lagi setelah 1 menit
    setTimeout(() => setDismissed(false), 60 * 1000);
  };

  useEffect(() => {
    const check = async () => {
      try {
        const API_BASE = getApiUrl();
        const res = await fetch(`${API_BASE}/api/license/status`);
        const data = await res.json();
        setState(data);

        // Jika lisensi akan habis atau grace, trigger push notification ke HP owner.
        // Backend otomatis melakukan throttling agar tidak spam (maksimal 1x per 12 jam).
        if ((data.status === 'ACTIVE' && data.daysLeft <= 7) || data.status === 'GRACE') {
          fetch(`${API_BASE}/api/license/notify-warning`, { method: 'POST' }).catch(() => {});
        }
      } catch {}
    };
    check();

    // 1. WebSocket Real-time listener: kuota trial terpotong seketika tanpa perlu refresh
    const handleLicenseUpdated = (data: any) => {
      if (data) {
        setState((prev) => ({
          ...(prev || {}),
          ...data,
          trial: data.trial !== undefined ? data.trial : prev?.trial,
        }));
      }
    };
    socket.on('license_updated', handleLicenseUpdated);

    // 2. SSE fallback listener
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${getSocketUrl()}/api/license/status-stream`);
      es.onmessage = (e) => {
        if (e.data) {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.trial !== undefined) {
              setState((prev) => ({ ...(prev || {}), ...parsed }));
            } else {
              check();
            }
          } catch {
            check();
          }
        }
      };
    } catch {}

    const interval = setInterval(check, 60000);
    const handleOpenTrialModal = () => setShowTrialModal(true);
    window.addEventListener('open_trial_modal', handleOpenTrialModal);

    return () => {
      socket.off('license_updated', handleLicenseUpdated);
      es?.close();
      clearInterval(interval);
      window.removeEventListener('open_trial_modal', handleOpenTrialModal);
    };
  }, []);

  if (!state) return null;
  // Jika lisensi dikunci (BLOCKED) atau EXPIRED, halaman diarahkan ke /activate oleh LicenseGuard
  if (state.status === "BLOCKED" || state.status === "EXPIRED") return null;

  // TRIAL: sedang menggunakan kuota coba gratis
  if (state.status === "TRIAL") {
    const remaining = state.trial?.remaining ?? 0;
    const quota = state.trial?.quota ?? 0;
    const isExhausted = remaining === 0;
    const isLow = remaining <= 2;
    const badgeColor = isExhausted ? '#f87171' : (isLow ? '#f59e0b' : '#38bdf8');

    return (
      <>
        {!dismissed && (
          <div style={{
            position: 'fixed',
            top: 'max(32px, calc(env(safe-area-inset-top) + 16px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              background: '#000000',
              borderRadius: '9999px',
              height: '36px',
              padding: '0 8px 0 4px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              animation: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              width: 'max-content',
              maxWidth: '90vw',
              pointerEvents: 'auto',
              border: isExhausted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                background: '#ffffff',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Sparkles size={14} color={isExhausted ? '#ef4444' : (isLow ? '#f59e0b' : '#0284c7')} />
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingRight: '4px' }}>
                <span style={{
                  margin: 0,
                  color: '#ffffff',
                  fontSize: '12.5px',
                  lineHeight: '1.4',
                  fontWeight: '600',
                  letterSpacing: '0.2px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  whiteSpace: 'nowrap',
                }}>
                  {isExhausted ? (
                    <>
                      Mode Trial: Kuota coba gratis <strong style={{ color: badgeColor }}>telah habis (0 sesi)</strong>. Perpanjang lisensi atau klaim voucher untuk menyalakan meja baru.
                    </>
                  ) : (
                    <>
                      Mode Trial Aktif: Sisa kuota coba gratis <strong style={{ color: badgeColor }}>{remaining} sesi</strong> {quota > 0 ? `(dari ${quota})` : ''}
                    </>
                  )}
                </span>
              </div>

              {isExhausted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowTrialModal(true);
                  }}
                  style={{
                    flexShrink: 0,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                    transition: 'transform 0.15s, opacity 0.15s',
                    pointerEvents: 'auto',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  Beli / Klaim
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                style={{
                  flexShrink: 0,
                  background: 'transparent',
                  border: 'none',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  transition: 'background 0.2s',
                  pointerEvents: 'auto',
                }}
                title="Tutup Peringatan"
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={12} />
              </button>
            </div>
            <style>{`
              @keyframes slideInDown {
                from { transform: translateY(-30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
          </div>
        )}

        <TrialExhaustedModal
          isOpen={showTrialModal}
          onClose={() => setShowTrialModal(false)}
          billingData={state?.billing}
          machineId={state?.machineId}
          onVoucherClaimed={async () => {
            try {
              const API_BASE = getApiUrl();
              const res = await fetch(`${API_BASE}/api/license/status?force=true`);
              const data = await res.json();
              setState(data);
            } catch {}
          }}
        />
      </>
    );
  }

  if (dismissed) return null;

  // GRACE: sudah expired tapi masih dalam 3 hari tenggang
  if (state.status === 'GRACE') {
    return (
      <div style={{
        position: 'fixed',
        top: 'max(32px, calc(env(safe-area-inset-top) + 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: '#000000',
          borderRadius: '9999px',
          height: '36px',
          padding: '0 10px 0 4px',
          boxShadow: 'none',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          animation: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          width: 'max-content',
          maxWidth: '90vw',
          pointerEvents: 'auto',
        }}>
          <div style={{
            background: '#ffffff',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <XCircle size={14} color="#ef4444" />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
            <p style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '12.5px',
              lineHeight: '1.4',
              fontWeight: '600',
              letterSpacing: '0.2px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'nowrap',
            }}>
              Lisensi berakhir! Waktu tenggang: <strong style={{ color: '#fca5a5' }}>{Math.max(0, state.daysLeft ?? 0)} hari</strong>
              {state.trial && state.trial.enabled && state.trial.remaining > 0 && (
                <span style={{ marginLeft: '6px', color: '#cbd5e1', fontSize: '11px', fontWeight: 500 }}>
                  (Sisa kuota trial: <strong style={{ color: '#38bdf8' }}>{state.trial.remaining}x</strong>)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            title="Tutup Peringatan"
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={12} />
          </button>
        </div>
        <style>{`
          @keyframes slideInDown {
            from { transform: translateY(-30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // WARNING: 7 hari atau kurang sebelum expired
  if (state.status === 'ACTIVE' && state.daysLeft <= 7 && state.daysLeft >= 0) {
    const isUrgent = state.daysLeft <= 3;
    const iconBgColor = isUrgent ? '#ef4444' : '#f59e0b';
    const strongColor = isUrgent ? '#fca5a5' : '#fde68a';

    return (
      <div style={{
        position: 'fixed',
        top: 'max(32px, calc(env(safe-area-inset-top) + 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: '#000000',
          borderRadius: '9999px',
          height: '36px',
          padding: '0 10px 0 4px',
          boxShadow: 'none',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          animation: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          width: 'max-content',
          maxWidth: '90vw',
          pointerEvents: 'auto',
        }}>
          <div style={{
            background: '#ffffff',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AlertTriangle size={14} color={iconBgColor} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
            <p style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '12.5px',
              lineHeight: '1.4',
              fontWeight: '600',
              letterSpacing: '0.2px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'nowrap',
            }}>
              Lisensi berakhir dalam <strong style={{ color: strongColor }}>{state.daysLeft} hari</strong>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            title="Tutup Peringatan"
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={12} />
          </button>
        </div>
        <style>{`
          @keyframes slideInDown {
            from { transform: translateY(-30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
