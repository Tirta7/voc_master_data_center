import * as crypto from 'crypto';

export interface QRTokenData {
  code: string;
  v: number;
  t: number; // timestamp
}

export class QRUtils {
  private static readonly ALGORITHM = 'sha256';
  private static readonly SECRET =
    process.env.QR_SECRET || 'billiard-secure-qr-2026-secret-key';

  /**
   * Generate a secure, signed token string
   */
  static generateToken(data: QRTokenData): string {
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const signature = crypto
      .createHmac(this.ALGORITHM, this.SECRET)
      .update(payload)
      .digest('base64url');

    return `${payload}.${signature}`;
  }

  /**
   * Verify and decode a token string
   */
  static verifyToken(token: string): QRTokenData | null {
    try {
      const [payload, signature] = token.split('.');
      if (!payload || !signature) return null;

      const expectedSignature = crypto
        .createHmac(this.ALGORITHM, this.SECRET)
        .update(payload)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return decoded as QRTokenData;
    } catch (err) {
      return null;
    }
  }
}
