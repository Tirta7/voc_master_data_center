'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getApiUrl } from '@/utils/urlUtils';

const LOCKED_STATUSES = ['EXPIRED', 'BLOCKED', 'NOT_REGISTERED'];

export function LicenseGuard() {
  const router   = useRouter();
  const pathname = usePathname();
  const isOnActivatePage = pathname?.startsWith('/activate');

  useEffect(() => {
    if (isOnActivatePage) return;

    const API_BASE = getApiUrl();

    // ── SSE: terima status change INSTAN dari backend ──────────────────
    let evtSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const handleStatusData = (statusData: { status: string }) => {
      if (LOCKED_STATUSES.includes(statusData.status)) {
        router.replace('/activate');
      }
    };

    const startSSE = () => {
      evtSource = new EventSource(`${API_BASE}/api/license/status-stream`);

      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleStatusData(data);
        } catch {}
      };

      evtSource.onerror = () => {
        // SSE gagal → fallback ke polling REST setiap 10 detik
        evtSource?.close();
        evtSource = null;
        startPollingFallback();
      };
    };

    const startPollingFallback = () => {
      const poll = async () => {
        try {
          const res  = await fetch(`${API_BASE}/api/license/status`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) return;
          const data = await res.json();
          handleStatusData(data);
        } catch {}
      };
      poll(); // cek langsung
      fallbackInterval = setInterval(poll, 10000);
    };

    startSSE();

    return () => {
      evtSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [isOnActivatePage, router]);

  return null;
}
