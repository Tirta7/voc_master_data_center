# Frontend Initial Mock State (Skeleton)

Untuk aplikasi baru, saat data dari database belum selesai dimuat (*loading*), frontend sebaiknya memiliki *Initial State* atau *Mock Data* yang bertindak sebagai **Skeleton**. Ini mencegah UI berkedip atau terlihat kosong.

## 1. Mock Data Struktur (TypeScript Interface)
Berikut adalah contoh bagaimana frontend menyimpan "data bayangan" sebelum API merespon.

```typescript
// Contoh Mock State untuk Dashboard Meja
const INITIAL_TABLE_SKELETON = [
  {
    id: 0,
    tableName: "Loading...",
    category: "REGULAR",
    status: "available",
    isLightOn: false,
    startTime: null,
    endTime: null,
    remainingMinutes: 0,
    // Flag untuk menandakan ini data mock/skeleton
    isSkeleton: true 
  }
];
```

## 2. Implementasi Render Skeleton (Tailwind CSS)
Bukan menampilkan data asli, kita menampilkan kotak abu-abu yang berdenyut (*animate-pulse*).

```jsx
function TableCard({ table, isLoading }) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-xl animate-pulse bg-slate-50">
        <div className="h-6 w-24 bg-slate-200 rounded mb-4"></div> {/* Skeleton Judul */}
        <div className="h-10 w-full bg-slate-200 rounded"></div>   {/* Skeleton Status */}
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <h3 className="font-bold text-lg">{table.tableName}</h3>
      <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
        {table.status}
      </div>
    </div>
  );
}
```

## 3. Alur Initial State di Frontend
1. **State Awal**: Inisialisasi variabel state dengan array kosong `[]` atau data dummy.
2. **UseEffect**: Jalankan `fetchData()`.
3. **Skeleton Logic**: Jika `loading === true`, render 4-8 kartu skeleton.
4. **Data Ready**: Setelah data sampai, ganti skeleton dengan data asli dari `voc_billiard_db`.

---

### Maksud "Bukan Data DB":
Mock ini berada **hanya di memori browser** (React/Vue/Next.js state). Saat user melakukan *refresh*, mock ini akan muncul sekilas (0.5 detik) sebelum data dari MySQL `voc_billiard_db` ditampilkan.
