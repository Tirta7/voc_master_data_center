/**
 * Helper tampilan tarif per slot (jam + hari).
 * LOGIKA HARUS SAMA dengan backend `calculateCurrentPackagePrice`:
 *  - hari yang dipakai = business day (mengikuti businessDayOffset)
 *  - slot dicocokkan dengan jam sekarang (akhir slot eksklusif, mendukung lewat tengah malam)
 *  - bila tidak ada yang cocok, fallback ke slot pertama yang valid hari ini
 */
import { getBusinessDayCode } from './dateUtils';

export interface PriceSlot {
    start: string;
    end: string;
    price: number | string;
    validDays?: string[] | null;
    discountPercentage?: number | string | null;
    discountNominal?: number | string | null;
}

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = {
    MON: 'Sen', TUE: 'Sel', WED: 'Rab', THU: 'Kam', FRI: 'Jum', SAT: 'Sab', SUN: 'Min',
};

/** "Sen,Sel,Rab,Kam" / "Jum,Sab,Min" / "Setiap hari" */
export const formatSlotDays = (days?: string[] | null): string => {
    if (!Array.isArray(days) || days.length === 0 || days.length === 7) return 'Setiap hari';
    return DAY_ORDER.filter(d => days.includes(d)).map(d => DAY_LABELS[d]).join(',');
};

/** Titik (.) sebagai pemisah jam agar konsisten dengan invoice: 17:00 -> 17.00 */
export const fmtSlotTime = (t: string): string => (t || '').replace(':', '.');

export const isSlotValidToday = (slot: PriceSlot, businessDayOffset?: string): boolean => {
    if (!Array.isArray(slot.validDays) || slot.validDays.length === 0) return true;
    return slot.validDays.includes(getBusinessDayCode(businessDayOffset));
};

/** True bila slot ini yang SEDANG berlaku (hari + jam). */
export const isSlotUsedNow = (slot: PriceSlot, businessDayOffset?: string, now: Date = new Date()): boolean => {
    if (!slot?.start || !slot?.end) return false;
    if (!isSlotValidToday(slot, businessDayOffset)) return false;
    const timeVal = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = slot.start.split(':').map(Number);
    const [eH, eM] = slot.end.split(':').map(Number);
    const startVal = sH * 60 + sM;
    const endVal = eH * 60 + eM;
    return endVal < startVal
        ? timeVal >= startVal || timeVal < endVal
        : timeVal >= startVal && timeVal < endVal;
};

/** Slot yang dipakai backend untuk menghitung harga sekarang (termasuk fallback). */
export const getActiveSlot = <T extends PriceSlot>(slots?: T[] | null, businessDayOffset?: string): T | null => {
    if (!Array.isArray(slots) || slots.length === 0) return null;
    return (
        slots.find(s => isSlotUsedNow(s, businessDayOffset)) ||
        slots.find(s => isSlotValidToday(s, businessDayOffset)) ||
        slots[0]
    );
};

/** Label ringkas untuk kasir, contoh: "Sab · 17.00–03.00" */
export const describeActiveSlot = (slot: PriceSlot | null, businessDayOffset?: string): string => {
    if (!slot) return '';
    const today = DAY_LABELS[getBusinessDayCode(businessDayOffset)] || '';
    return `${today} · ${fmtSlotTime(slot.start)}–${fmtSlotTime(slot.end)}`;
};
