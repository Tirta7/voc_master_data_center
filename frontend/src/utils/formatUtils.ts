/**
 * Formats a number with Indonesian locale (dots for thousands, commas for decimals)
 */
export const formatNumber = (n: number | string, decimals: number = 0): string => {
    const val = typeof n === 'string' ? parseFloat(n) : n;
    if (isNaN(val)) return '0';
    return val.toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

/**
 * Formats a number as Rupiah (Rp x.xxx.xxx,xx)
 */
export const formatRupiah = (n: number | string, decimals: number = 0): string => {
    const val = typeof n === 'string' ? parseFloat(n) : n;
    if (isNaN(val)) return 'Rp 0';
    return `Rp ${formatNumber(val, decimals)}`;
};

/**
 * Compatible with legacy 'fmtK' but returns full Rupiah.
 * User requested no more 'K', 'M', or 'B' abbreviations.
 */
export const formatCompact = (n: number | string): string => {
    return formatRupiah(n);
};
