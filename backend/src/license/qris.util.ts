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

  /**
   * Menyisipkan nominal tagihan (Tag 54) ke dalam string QRIS statis
   * dan menghitung ulang CRC-nya.
   *
   * @param staticQris String QRIS statis (contoh: 000201...6304XXXX)
   * @param amount Nominal tagihan (contoh: 350015)
   * @returns String QRIS dinamis yang siap di-render
   */
  static generateDynamicQris(staticQris: string, amount: number): string {
    if (!staticQris || typeof staticQris !== 'string') {
      throw new Error('String QRIS tidak valid');
    }

    // 1. Ubah Tag 01 dari 11 (Statis) menjadi 12 (Dinamis)
    //    Wajib dilakukan agar e-wallet mengetahui ini adalah transaksi dengan nominal tetap.
    let qris = staticQris.replace('010211', '010212');

    // 2. Buang Tag 63 (CRC lama)
    const crcIdx = qris.lastIndexOf('6304');
    let base = qris.substring(0, crcIdx);

    // 3. Buat Tag 54 (Transaction Amount) dan sisipkan setelah Tag 53 (Currency = IDR = 360)
    const amountStr = amount.toString();
    const amountLen = amountStr.length.toString().padStart(2, '0');
    const tag54 = `54${amountLen}${amountStr}`;
    base = base.replace('5303360', '5303360' + tag54);

    // 4. Hitung ulang CRC
    const payload = base + '6304';
    const newCrc = this.calculateCrc16(payload);

    return payload + newCrc;
  }
}
