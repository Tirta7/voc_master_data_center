import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Pada Next.js, setiap proses build akan menghasilkan file .next/BUILD_ID
        const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
        if (fs.existsSync(buildIdPath)) {
            const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
            return NextResponse.json({ version: buildId });
        }
    } catch (e) {
        console.error('Failed to read BUILD_ID', e);
    }

    // Fallback jika tidak ada BUILD_ID
    return NextResponse.json({ version: process.env.npm_package_version || '1.0.0' });
}
