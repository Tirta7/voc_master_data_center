import { QRUtils } from './qr.utils';

describe('QRUtils', () => {
  const testData = {
    code: 'VOC-2026-0001',
    v: 1,
    t: Date.now(),
  };

  it('should generate a token for valid data', () => {
    const token = QRUtils.generateToken(testData);
    expect(token).toBeDefined();
    expect(token).toContain('.');

    const parts = token.split('.');
    expect(parts.length).toBe(2);
  });

  it('should verify and decode a valid token', () => {
    const token = QRUtils.generateToken(testData);
    const verified = QRUtils.verifyToken(token);

    expect(verified).toBeDefined();
    expect(verified?.code).toBe(testData.code);
    expect(verified?.v).toBe(testData.v);
  });

  it('should reject a tampered token (payload change)', () => {
    const token = QRUtils.generateToken(testData);
    const [payload, signature] = token.split('.');

    // Mutate payload: Change version 1 to 2
    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString(),
    );
    decodedPayload.v = 2;
    const tamperedPayload = Buffer.from(
      JSON.stringify(decodedPayload),
    ).toString('base64url');

    const tamperedToken = `${tamperedPayload}.${signature}`;
    const verified = QRUtils.verifyToken(tamperedToken);

    expect(verified).toBeNull();
  });

  it('should reject a tampered token (signature change)', () => {
    const token = QRUtils.generateToken(testData);
    const [payload, signature] = token.split('.');

    const tamperedSignature =
      signature.substring(0, signature.length - 1) +
      (signature.endsWith('a') ? 'b' : 'a');
    const tamperedToken = `${payload}.${tamperedSignature}`;
    const verified = QRUtils.verifyToken(tamperedToken);

    expect(verified).toBeNull();
  });

  it('should reject an invalid format string', () => {
    expect(QRUtils.verifyToken('not-a-token')).toBeNull();
    expect(QRUtils.verifyToken('just.one.dot.but.not.base64')).toBeNull();
  });
});
