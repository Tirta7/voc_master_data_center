'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * Rotating one-time QR token for attendance.
 * Server TTL is ~3s; we rotate faster (every 1.5s) so the token on screen
 * always has enough life left for the kiosk to decode & submit it.
 */
export const QR_ROTATE_MS = 1500;

export function useRotatingQrToken(mode: 'CHECKIN' | 'CHECKOUT', enabled: boolean) {
    const [token, setToken] = useState<string | null>(null);
    const [ttlMs, setTtlMs] = useState(3000);
    const [issuedAt, setIssuedAt] = useState<number>(0);
    const [error, setError] = useState(false);
    const inFlight = useRef(false);

    const refresh = useCallback(async () => {
        if (inFlight.current) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        inFlight.current = true;
        try {
            const res = await axios.get('/attendance/qr-token', { params: { mode } });
            setToken(res.data.token);
            setTtlMs((res.data.ttlSeconds ?? 3) * 1000);
            // Use local receipt time (avoids phone/server clock skew)
            setIssuedAt(Date.now());
            setError(false);
        } catch (e) {
            console.error('Failed to fetch QR token', e);
            setError(true);
        } finally {
            inFlight.current = false;
        }
    }, [mode]);

    useEffect(() => {
        if (!enabled) { setToken(null); return; }
        refresh();
        const id = setInterval(refresh, QR_ROTATE_MS);
        const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [enabled, refresh]);

    const clear = useCallback(() => setToken(null), []);

    return { token, ttlMs, issuedAt, error, refresh, clear };
}
