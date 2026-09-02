import axios from 'axios';
import { getApiUrl } from '@/utils/urlUtils';

// ⚡ Connection Pool: gunakan satu axios instance dengan keep-alive
// Ini mencegah pembuatan koneksi TCP baru setiap request (sangat hemat via Cloudflare Tunnel)
const http = typeof window === 'undefined' ? require('http') : null;
const https = typeof window === 'undefined' ? require('https') : null;

// ⚡ baseURL sengaja dikosongkan — URL penuh ditentukan di interceptor bawah
// sehingga bisa mendeteksi hostname browser saat request terjadi (client-side)
// maupun menggunakan NEXT_PUBLIC_API_URL saat SSR (server-side)
export const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Accept-Encoding': 'gzip, deflate, br',
  },
  // Server-side: gunakan persistent connection pool
  ...(http && https ? {
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 20 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 20 }),
  } : {}),
});

// ⚡ Dynamic baseURL injector: tentukan URL backend saat request terjadi
// - Client-side: getApiUrl() mendeteksi hostname browser → pakai domain yg sesuai
// - Server-side (SSR): fallback ke NEXT_PUBLIC_API_URL atau NEXT_INTERNAL_API_URL
apiClient.interceptors.request.use((config) => {
  if (!config.baseURL) {
    if (typeof window !== 'undefined') {
      // Browser: gunakan getApiUrl() agar otomatis sesuai domain yg dibuka
      config.baseURL = getApiUrl();
    } else {
      // Server-side (SSR/API route): gunakan internal Docker URL
      config.baseURL = process.env.NEXT_INTERNAL_API_URL
        || process.env.NEXT_PUBLIC_API_URL
        || 'http://localhost:4000';
    }
  }
  return config;
});

// ⚡ Token injector: tambah JWT ke semua request otomatis
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ⚡ In-memory request deduplication cache
// Jika dua komponen fetch URL yang sama dalam 100ms, hanya 1 request yang dikirim
const inflight: Map<string, Promise<any>> = new Map();

// ⚡ Static data cache: data yang jarang berubah (settings, packages, menu)
// Disimpan di memory client selama ttlMs, tidak perlu request ke server
const memCache: Map<string, { data: any; expiry: number }> = new Map();

export async function cachedFetch(url: string, ttlMs: number = 30000): Promise<any> {
  const now = Date.now();
  const cached = memCache.get(url);
  
  // Kembalikan dari cache jika masih segar
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  // Dedup: jika sudah ada request yang sedang jalan untuk URL ini, tunggu itu
  if (inflight.has(url)) {
    return inflight.get(url);
  }

  // Buat request baru dan track sebagai inflight
  const req = apiClient.get(url)
    .then(res => {
      memCache.set(url, { data: res.data, expiry: now + ttlMs });
      inflight.delete(url);
      return res.data;
    })
    .catch(err => {
      inflight.delete(url);
      // Jika ada cache lama (stale), kembalikan itu daripada error
      if (cached) return cached.data;
      throw err;
    });

  inflight.set(url, req);
  return req;
}

// Invalidate cache entry (panggil setelah mutation/update)
export function invalidateCache(urlPattern: string) {
  for (const key of Array.from(memCache.keys())) {
    if (key.includes(urlPattern)) {
      memCache.delete(key);
    }
  }
}

// Fetcher legacy (untuk kompatibilitas backward dengan SWR/komponen lama)
export const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data;
};
