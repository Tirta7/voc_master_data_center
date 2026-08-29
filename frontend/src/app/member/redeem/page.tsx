"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, Gift, Search, Coffee, CircleOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { getFullImageUrl /*, API_URL */ } from "@/utils/urlUtils";


export default function RedeemPage() {

  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '1';
  
  const [category, setCategory] = useState("SEMUA");
  const [catalog, setCatalog] = useState<any[]>([]);
  const [points, setPoints] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [redeemToken, setRedeemToken] = useState("");

  useEffect(() => {
    // Fetch Catalog
    axios.get(`/loyalty/catalog`)
      .then(res => setCatalog(res.data))
      .catch(err => console.error(err));

    // Fetch Points
    if (id) {
       axios.get(`/loyalty/portal/member/${id}`)
         .then(res => setPoints(res.data.points))
         .catch(err => console.error(err));
    }
  }, [id]);

  const filtered = category === "SEMUA" ? catalog : catalog.filter(c => c.category === category);


  const handleTukar = (item: any) => {
    if (points >= item.pointCost) {
      setSelectedItem(item);
      // Format: REDEEM-memberId-rewardId-timestamp (menggunakan '-' agar kebal terhadap salah kaprah USB Barcode Scanner layout keyboard lokal)
      setRedeemToken(`REDEEM-${id}-${item.id}-${Date.now()}`);

      setShowModal(true);
    } else {
      alert("Poin tidak cukup!");
    }
  };


  return (
    <div className="flex flex-col h-full bg-gray-950 relative z-10 pt-6 pb-24 min-h-screen">
      {/* Header */}
      <div className="px-6 flex items-center justify-between mb-8">
        <Link href={`/member/dashboard?id=${id}`} className="p-2 bg-gray-800 rounded-full border border-gray-700">

          <ChevronLeft className="text-gray-300 w-5 h-5"/>
        </Link>
        <h1 className="text-xl font-bold tracking-wider">TUKAR POIN</h1>
        <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full border border-yellow-500/30">
          <Gift className="text-yellow-400 w-4 h-4"/>
          <span className="text-yellow-400 font-bold text-sm">{points}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 mb-6 flex space-x-3 overflow-x-auto scb-hide pb-2">
         {["SEMUA", "BILLIARD", "CAFE", "MERCHANDISE"].map(cat => (
           <button 
             key={cat}
             onClick={() => setCategory(cat)}
             className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${category === cat ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]" : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-white"}`}

           >
             {cat}
           </button>
         ))}
      </div>

      {/* Grid */}
      <div className="px-6 grid grid-cols-2 gap-4">
          {filtered.length === 0 && (
             <div className="col-span-2 py-10 text-center text-gray-500 font-mono text-sm">
                 <Coffee className="w-10 h-10 mx-auto mb-3 opacity-50" />
                 BELUM ADA ITEM<br/>DI KATALOG INI
             </div>
          )}
         {filtered.map(item => (
            <div key={item.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-700/50 flex flex-col group relative">
                <div className="h-32 w-full bg-gray-700 relative overflow-hidden flex items-center justify-center">
                    {item.image ? (
                        <img src={getFullImageUrl(item.image)} alt={item.name} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                        <Gift className="w-10 h-10 text-gray-500 opacity-50" />
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded backdrop-blur border border-white/10">

                        <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">
                           <Gift className="w-3 h-3"/> {item.pointCost}
                        </span>
                    </div>
                </div>
                <div className="p-4 flex flex-col justify-between flex-grow">
                   <h3 className="font-semibold text-sm mb-3 leading-tight text-gray-100">{item.name}</h3>
                   <button 
                     disabled={points < item.pointCost}
                     onClick={() => handleTukar(item)}
                     className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${points >= item.pointCost ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-lg" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}

                   >
                     {points >= item.pointCost ? "TUKAR" : "POIN KURANG"}
                   </button>
                </div>
            </div>
         ))}
      </div>

      {/* Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/80  animate-in fade-in duration-200">
           <div className="bg-gradient-to-b from-gray-900 to-black w-full max-w-sm rounded-3xl p-6 border border-gray-700 shadow-2xl relative">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white">
                 <CircleOff className="w-5 h-5"/>
              </button>
              
              <div className="text-center mt-4">
                 <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">Konfirmasi Penukaran</h2>
                 <p className="text-gray-400 text-sm mb-6">Tunjukkan QR ini ke kasir atau waiter untuk menukar <span className="text-white font-semibold">{selectedItem.name}</span></p>
                 
                 <div className="bg-white p-4 rounded-2xl mx-auto w-max mb-6 shadow-xl relative">
                     <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-20 transform scale-110 -z-10"></div>
                     <QRCodeSVG value={redeemToken} size={200} />
                 </div>
                 
                 <p className="font-mono text-cyan-400 tracking-widest text-lg font-bold bg-gray-950/50 py-2 rounded-lg border border-gray-800">{redeemToken}</p>
                 <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                   Saldo poin Anda akan terpotong secara otomatis sebesar {selectedItem.pointCost} Pts setelah QR ini di-scan oleh Waiter/Kasir.
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
