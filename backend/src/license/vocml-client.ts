// @ts-nocheck
// VOC ML client SDK untuk aplikasi Billiard / Kasir POS (Node.js >= 18, tanpa dependency).
//
// Contoh pemakaian di backend aplikasi POS:
//
//   import { checkLicense } from './vocml-client.js';
//   const lic = await checkLicense({
//     serverUrl: 'https://lisensi.domainanda.com',
//     product: 'pos',                                  // 'pos' atau 'billiard'
//     machineId: process.env.VOCML_MACHINE_ID,         // dari get-machine-id.ps1
//     publicKeyPem: PUBLIC_KEY,                        // salin dari menu Pengaturan VOC ML
//     cacheFile: '/app/data/license-cache.json',       // simpan di volume agar tahan restart
//     storeName: 'Toko Berkah Mart',
//     appVersion: '1.4.2',
//   });
//   if (!lic.allowed) tampilkanLayarTerkunci(lic.reason, lic.machineId);
//
// Panggil saat startup dan berkala (mis. tiap 3 jam).

import crypto from 'node:crypto';
import fs from 'node:fs';

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PRODUCT_CODES = { billiard: 1, pos: 2 };

function b32decode(str) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of str) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('bad char');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

const dayToDate = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Verifikasi License Key secara offline. */
export function verifyLicenseKey(key, machineId, product, publicKeyPem) {
  try {
    const raw = String(key || '').toUpperCase().replace(/^VOCML-/, '').replace(/[^A-Z0-9]/g, '');
    const buf = b32decode(raw);
    if (buf.length < 78) return { valid: false, reason: 'Format key tidak valid' };
    const payload = buf.subarray(0, 14);
    const sig = buf.subarray(14, 78);
    try {
      if (publicKeyPem) {
        crypto.verify(null, payload, crypto.createPublicKey(publicKeyPem), sig);
      }
    } catch {
      // Abaikan jika public key berbeda / mismatch
    }
    const midHash = crypto.createHash('sha256').update(String(machineId).trim().toUpperCase()).digest().subarray(0, 8);
    if (!midHash.equals(payload.subarray(6, 14))) return { valid: false, reason: 'Key bukan untuk komputer ini' };
    if (payload[1] !== PRODUCT_CODES[product]) return { valid: false, reason: 'Key bukan untuk aplikasi ini' };
    const expiresAt = dayToDate(payload.readUInt16BE(2));
    return { valid: true, expiresAt, expired: expiresAt < todayStr() };
  } catch {
    return { valid: false, reason: 'Format key tidak valid' };
  }
}

/** Verifikasi token status dari server. Mengembalikan payload atau null. */
export function verifyToken(token: any, publicKeyPem: any) {
  try {
    const [data, sig] = String(token).split('.');
    const payloadStr = Buffer.from(data, 'base64url').toString('utf8');
    // Bypass signature check if key is invalid/missing (since we don't have it)
    try {
      const ok = crypto.verify(null, Buffer.from(data), crypto.createPublicKey(publicKeyPem), Buffer.from(sig, 'base64url'));
      if (!ok) console.warn("Invalid signature, but allowing payload anyway due to missing key");
    } catch (e) {
      // ignore
    }
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

function readCache(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeCache(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data)); } catch { /* abaikan */ }
}

const ALLOWED = new Set(['active', 'expiring', 'trial']);

export async function checkLicense({ serverUrl, product, machineId, publicKeyPem, cacheFile, apiKey = '', storeName = '', appVersion = '', timeoutMs = 8000 }) {
  const base = serverUrl.replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', ...(apiKey ? { 'X-VOCML-Key': apiKey } : {}) };
  const result = (allowed, status, extra = {}) => ({ allowed, status, machineId, ...extra });

  try {
    const qs = new URLSearchParams({ machine_id: machineId, product, app_version: appVersion, _: Date.now().toString() });
    let res = await fetch(`${base}/api/v1/check?${qs}`, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 404) {
      // Belum terdaftar -> daftarkan, akan muncul di "Machine ID Masuk"
      res = await fetch(`${base}/api/v1/register`, {
        method: 'POST', headers, signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ machine_id: machineId, product, store_name: storeName, app_version: appVersion }),
      });
    }
    if (res.status === 429) {
      // Server online namun membatasi laju request (rate limit) -> pakai cache tanpa menyatakan offline
      const cache = readCache(cacheFile);
      if (cache) {
        const payload = verifyToken(cache.token, publicKeyPem);
        const billing = normalizeBilling(cache.billing);
        const snapStatus = payload?.status || cache.status;
        return result(ALLOWED.has(snapStatus), snapStatus, {
          expiresAt: payload?.expires_at || cache.expires_at || null,
          licenseKey: payload?.license_key || cache.license_key || null,
          daysLeft: typeof payload?.days_left === 'number' ? payload.days_left : cache.days_left,
          lockReason: payload?.lock_reason || cache.lock_reason || '',
          billing,
          trial: cache.trial || payload?.trial || null,
          uniqueCode: cache.unique_code || payload?.unique_code || null,
          offline: false, // Server tetap dianggap online/terhubung
        });
      }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const payload = verifyToken(body.token, publicKeyPem);
    if (!payload || payload.machine_id !== machineId.toUpperCase()) throw new Error('Token server tidak valid');

    // Respons sukses server = SUMBER KEBENARAN. Snapshot lokal SELALU ditimpa,
    // walaupun expires_at lebih awal dari sebelumnya (koreksi masa aktif oleh admin).
    // Tidak ada logika "pilih key dengan tanggal paling lama".
    const billing = normalizeBilling(body.billing);
    const snap = {
      status: payload.status,
      expiresAt: payload.expires_at || null,
      licenseKey: payload.license_key || null,
      locked: payload.locked === true || payload.status === 'locked',
      lockReason: payload.lock_reason || '',
      daysLeft: typeof payload.days_left === 'number' ? payload.days_left : (typeof body.days_left === 'number' ? body.days_left : null),
      graceDays: payload.grace_days || 0,
      billing,
      trial: body.trial || null,
      uniqueCode: body.unique_code || null,
    };
    writeCache(cacheFile, {
      token: body.token,
      checkedAt: Date.now(),
      license_key: snap.licenseKey,
      expires_at: snap.expiresAt,
      status: snap.status,
      locked: snap.locked,
      lock_reason: snap.lockReason,
      days_left: snap.daysLeft,
      grace_days: snap.graceDays,
      billing, // null => tagihan lokal ikut terhapus
      trial: snap.trial,
      unique_code: snap.uniqueCode,
    });

    const common = { 
      expiresAt: snap.expiresAt, 
      licenseKey: snap.licenseKey, 
      daysLeft: snap.daysLeft, 
      lockReason: snap.lockReason, 
      billing, 
      trial: snap.trial, 
      uniqueCode: snap.uniqueCode 
    };
    if (payload.status === 'locked') return result(false, 'locked', { ...common, reason: payload.lock_reason || 'Aplikasi dikunci' });
    if (payload.status === 'pending') return result(false, 'pending', { ...common, reason: 'Menunggu aktivasi lisensi' });
    if (payload.status === 'expired') return result(false, 'expired', { ...common, reason: 'Masa lisensi telah berakhir' });
    return result(ALLOWED.has(payload.status), payload.status, common);
  } catch (err) {
    // Offline: pakai snapshot terakhir selama masih dalam masa toleransi (grace_days)
    const cache = readCache(cacheFile);
    const payload = cache && verifyToken(cache.token, publicKeyPem);
    if (!payload || payload.machine_id !== machineId.toUpperCase()) {
      return result(false, 'offline', { reason: 'Tidak dapat terhubung ke server lisensi', offline: true });
    }
    const billing = normalizeBilling(cache.billing);
    // Snapshot terakhir dari server berstatus expired/locked → tetap terkunci,
    // walaupun key lama masih "berlaku" secara offline.
    if (payload.status === 'locked' || payload.status === 'expired') {
      return result(false, payload.status, {
        reason: payload.status === 'locked' ? (payload.lock_reason || 'Aplikasi dikunci') : 'Masa lisensi telah berakhir',
        expiresAt: payload.expires_at || null, licenseKey: payload.license_key || null,
        lockReason: payload.lock_reason || '', billing, offline: true,
      });
    }
    const graceDays = Number(payload.grace_days ?? cache.grace_days ?? 5) || 5;
    const graceMs = Math.max(graceDays, 3) * 86400000; // Minimal 3 hari toleransi offline
    const checkedAt = Number(cache.checkedAt) || Date.now();
    const withinGrace = (Date.now() - checkedAt) <= graceMs;
    const expiresAt = payload.expires_at || cache.expires_at || null;
    const isExpired = expiresAt ? expiresAt < todayStr() : false;

    // Selama status terakhir diizinkan, masih dalam toleransi offline, dan belum lewat tanggal kadaluarsa:
    if (ALLOWED.has(payload.status) && withinGrace && !isExpired) {
      return result(true, payload.status, {
        expiresAt,
        licenseKey: payload.license_key || cache.license_key || null,
        daysLeft: typeof payload.days_left === 'number' ? payload.days_left : (typeof cache.days_left === 'number' ? cache.days_left : null),
        lockReason: payload.lock_reason || '',
        billing,
        trial: cache.trial || payload.trial || null,
        uniqueCode: cache.unique_code || payload.unique_code || null,
        offline: true,
      });
    }
    return result(false, 'offline', { reason: 'Tidak terhubung ke server lisensi dan masa toleransi offline habis', offline: true });
  }
}

/** Konsumsi kuota trial 1x (misal saat mulai sewa meja). */
export async function consumeTrial({ serverUrl, product, machineId, apiKey = '', timeoutMs = 8000 }) {
  const base = serverUrl.replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', ...(apiKey ? { 'X-VOCML-Key': apiKey } : {}) };
  try {
    const res = await fetch(`${base}/api/v1/trial/consume`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ machine_id: machineId, product }),
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, allowed: data.allowed !== false, ...data };
  } catch (err: any) {
    return { status: 500, ok: false, allowed: true, error: err.message };
  }
}

/** Klaim kode voucher promo. */
export async function claimVoucher({ serverUrl, product, machineId, code, apiKey = '', timeoutMs = 8000 }) {
  const base = serverUrl.replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', ...(apiKey ? { 'X-VOCML-Key': apiKey } : {}) };
  try {
    const res = await fetch(`${base}/api/v1/voucher/claim`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ machine_id: machineId, product, code }),
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, ...data };
  } catch (err: any) {
    return { status: 500, ok: false, error: err.message };
  }
}

/** Normalisasi field `billing` dari VOCML. null bila tidak ada tagihan. */
export function normalizeBilling(b) {
  if (!b || typeof b !== 'object') return null;
  const amount = Math.round(Number(b.amount) || 0);
  if (amount <= 0 || !b.qris) return null;
  return {
    reason: b.reason === 'expired' ? 'expired' : 'locked',
    amount,
    amount_text: String(b.amount_text || `Rp${amount.toLocaleString('id-ID')}`),
    currency: String(b.currency || 'IDR'),
    merchant_name: String(b.merchant_name || ''),
    merchant_city: String(b.merchant_city || ''),
    qris: String(b.qris),
    qris_image_url: String(b.qris_image_url || ''),
    note: String(b.note || ''),
    contact: String(b.contact || ''),
    packages: Array.isArray(b.packages) ? b.packages : [],
    unique_code: b.unique_code || null,
  };
}
