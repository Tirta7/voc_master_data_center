/**
 * Formats a number as Rupiah (Rp x.xxx.xxx)
 */
export const formatRupiah = (n: number | string): string => {
    const val = typeof n === 'string' ? parseFloat(n) : n;
    if (isNaN(val)) return 'Rp 0';
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
};

/**
 * Compatible with legacy 'fmtK' but returns full Rupiah.
 * User requested no more 'K', 'M', or 'B' abbreviations.
 */
export const formatCompact = (n: number | string): string => {
    return formatRupiah(n);
};
