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
    private static readonly TEMPLATE_PATH = path.join(process.cwd(), 'assets/templates/membership/card_template.png');
    private static readonly OUTPUT_DIR = path.join(process.cwd(), 'public/member-cards');

    static async generateMemberCard(data: CardData): Promise<string> {
        if (!fs.existsSync(this.TEMPLATE_PATH)) {
            throw new Error(`Template not found at ${this.TEMPLATE_PATH}. Please upload card_template.png.`);
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
            width: 940,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });

        // 2. Create SVG Overlay for Text - Scaled for 2352x3748
        const svgText = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .name { fill: #0000FF; font-size: 190px; font-family: sans-serif; font-weight: bold; font-style: italic; text-anchor: middle; }
                .tier { fill: #FFA500; font-size: 95px; font-family: sans-serif; font-weight: bold; text-anchor: middle; }
                .id { fill: #00008B; font-size: 70px; font-family: sans-serif; font-weight: bold; text-anchor: middle; }
                .date-label { fill: #0000FF; font-size: 60px; font-family: sans-serif; font-weight: bold; }
                .date-val { fill: #0000FF; font-size: 60px; font-family: sans-serif; }
            </style>
            
            <!-- Name -->
            <text x="1176" y="880" class="name">${data.name.toUpperCase()}</text>
            
            <!-- Tier -->
            <text x="1176" y="1050" class="tier">Membership ${data.tierName}</text>
            
            <!-- Member ID -->
            <text x="1176" y="1200" class="id">ID:${data.memberCode}</text>
            
            <!-- Join Date -->
            <text x="350" y="2625" class="date-label">Join:</text>
            <text x="520" y="2625" class="date-val">${data.joinDate}</text>
            
            <!-- Expiry Date -->
            <text x="1530" y="2625" class="date-label">Expire:</text>
            <text x="1750" y="2625" class="date-val">${data.expiryDate}</text>
        </svg>
        `;

        const filename = `card_${data.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`;
        const outputPath = path.join(this.OUTPUT_DIR, filename);

        // 3. Composite everything using sharp (NO RESIZE - original dimensions)
        await sharp(this.TEMPLATE_PATH)
            .composite([
                {
                    input: qrBuffer,
                    top: 1375, // Scaled QR Position
                    left: 705,
                },
                {
                    input: Buffer.from(svgText),
                    top: 0,
                    left: 0,
                }
            ])
            .png()
            .toFile(outputPath);

        return filename;
    }
}
