import sharp from 'sharp';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

export interface CardData {
  name: string;
  tierName: string;
  memberCode: string;
  joinDate: string;
  expiryDate: string;
  qrToken: string;
}

export class CardUtils {
  private static readonly TEMPLATE_PATH = path.join(
    process.cwd(),
    'assets/templates/membership/card_template.png',
  );
  private static readonly OUTPUT_DIR = path.join(
    process.cwd(),
    'public/member-cards',
  );

  static async generateMemberCard(data: CardData): Promise<string> {
    if (!fs.existsSync(this.TEMPLATE_PATH)) {
      throw new Error(
        `Template not found at ${this.TEMPLATE_PATH}. Please upload card_template.png.`,
      );
    }

    if (!fs.existsSync(this.OUTPUT_DIR)) {
      fs.mkdirSync(this.OUTPUT_DIR, { recursive: true });
    }

    const width = 2352;
    const height = 3748;

    // 1. Generate QR Code - Scaled for high res
    const qrBuffer = await QRCode.toBuffer(data.qrToken, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 1600,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // 2. Create SVG Overlay for Text - Scaled for 2352x3748
    const svgText = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .name { fill: #2E3192; font-size: 210px; font-family: sans-serif; font-weight: 900; font-style: italic; text-anchor: middle; }
                .tier { fill: #FBB03B; font-size: 100px; font-family: sans-serif; font-weight: 900; text-anchor: middle; text-transform: uppercase; letter-spacing: 2px;}
                .id { fill: #448AFF; font-size: 75px; font-family: sans-serif; font-weight: 800; text-anchor: middle; letter-spacing: 1px; }
                .date-label { fill: #1A237E; font-size: 65px; font-family: sans-serif; font-weight: 900; text-transform: uppercase; }
                .date-val { fill: #3949AB; font-size: 65px; font-family: sans-serif; font-weight: 600; }
            </style>
            
            <!-- Member ID - Positioned below QR -->
            <text x="1176" y="2250" class="id">ID:${data.memberCode}</text>

            <!-- Name - Large, Blue, Italic -->
            <text x="1176" y="2500" class="name">${data.name.toUpperCase()}</text>
            
            <!-- Tier - Golden Color -->
            <text x="1176" y="2650" class="tier">Membership ${data.tierName}</text>
            
            <!-- Join Date - Left Side near footer -->
            <text x="180" y="2800" class="date-label">Join:</text>
            <text x="360" y="2800" class="date-val">${data.joinDate}</text>
            
            <!-- Expiry Date - Right Side near footer -->
            <text x="1450" y="2800" class="date-label">Expire:</text>
            <text x="1750" y="2800" class="date-val">${data.expiryDate}</text>
        </svg>
        `;

    const filename = `card_${data.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`;
    const outputPath = path.join(this.OUTPUT_DIR, filename);

    // 3. Composite everything using sharp (NO RESIZE - original dimensions)
    await sharp(this.TEMPLATE_PATH)
      .composite([
        {
          input: qrBuffer,
          top: 550, // Shifted up to clear footer
          left: 376, // Re-centered (2352-1600)/2
        },
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toFile(outputPath);

    return filename;
  }
}
