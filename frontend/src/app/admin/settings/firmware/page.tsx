import React from 'react';
import FirmwareCenter from '@/components/FirmwareCenter';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Firmware Management - VOC Admin',
  description: 'Remote ESP32 OTA update center',
};

export default function FirmwarePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Hardware Management
        </h1>
        <p className="text-gray-400">
          Kelola firmware ESP32 secara jarak jauh melalui jalur WiFi (OTA).
        </p>
      </div>

      <FirmwareCenter />
    </div>
  );
}
