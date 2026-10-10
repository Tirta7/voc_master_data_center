export class QrisUtil {
  /**
   * Menghitung CRC16 (CCITT-FALSE) dari sebuah string
   * Sesuai standar EMVCo untuk QRIS
   */
  static calculateCrc16(str: string): string {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }
    crc = crc & 0xffff;
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /** Parse TLV level-atas EMVCo: [{ tag, value }] */
  static parseTlv(payload: string): { tag: string; value: string }[] {
    const out: { tag: string; value: string }[] = [];
    let i = 0;
    while (i + 4 <= payload.length) {
      const tag = payload.substr(i, 2);
      const len = parseInt(payload.substr(i + 2, 2), 10);
      if (isNaN(len)) throw new Error('Format QRIS tidak valid');
      const value = payload.substr(i + 4, len);
      if (value.length !== len) throw new Error('Format QRIS terpotong');
      out.push({ tag, value });
      i += 4 + len;
    }
    return out;
  }

  /** Ambil nama merchant (Tag 59) dari string QRIS. */
  static getMerchantName(qris: string): string | null {
    try {
      return this.parseTlv(qris.trim()).find((t) => t.tag === '59')?.value || null;
    } catch {
      return null;
    }
  }

  /**
   * Menyisipkan nominal tagihan (Tag 54) ke dalam string QRIS statis
   * dan menghitung ulang CRC-nya. Aman untuk QRIS yang sudah punya Tag 54.
   *
   * @param staticQris String QRIS statis (contoh: 000201...6304XXXX)
   * @param amount Nominal tagihan (contoh: 550000)
   * @returns String QRIS dinamis yang siap di-render
   */
  static generateDynamicQris(staticQris: string, amount: number): string {
    if (!staticQris || typeof staticQris !== 'string') {
      throw new Error('String QRIS tidak valid');
    }
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) throw new Error('Nominal tidak valid');

    const fields = this.parseTlv(staticQris.trim())
      // buang CRC lama & nominal lama
      .filter((f) => f.tag !== '63' && f.tag !== '54')
      // Tag 01: 11 (statis) → 12 (dinamis)
      .map((f) => (f.tag === '01' ? { tag: '01', value: '12' } : f));

    const amountField = { tag: '54', value: String(amt) };
    const idx53 = fields.findIndex((f) => f.tag === '53');
    if (idx53 >= 0) fields.splice(idx53 + 1, 0, amountField);
    else {
      // Sisipkan sebelum tag 58 (country) bila tag 53 tidak ada
      const idx58 = fields.findIndex((f) => f.tag === '58');
      fields.splice(idx58 >= 0 ? idx58 : fields.length, 0, amountField);
    }

    const body = fields.map((f) => `${f.tag}${String(f.value.length).padStart(2, '0')}${f.value}`).join('') + '6304';
    return body + this.calculateCrc16(body);
  }
}
