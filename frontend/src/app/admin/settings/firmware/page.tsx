import React from 'react';
import FirmwareCenter from '@/components/FirmwareCenter';
import { Metadata } from 'next';
import { Cpu } from 'lucide-react';


export const metadata: Metadata = {
  title: 'Firmware Management - VOC Admin',
  description: 'Remote ESP32 OTA update center',
};

export default function FirmwarePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-14 lg:w-16 h-14 lg:h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-md">
              <Cpu className="w-7 lg:w-8 h-7 lg:h-8 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                Firmware Center
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Hardware Management • Over-The-Air (OTA) Control • v1.2.0
              </p>
            </div>
          </div>
        </div>

        <FirmwareCenter />
      </div>
    </main>
  );
}

