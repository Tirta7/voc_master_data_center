import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const secret = req.headers.get('x-vocml-secret') || req.headers.get('X-VOCML-Secret') || '';
        const body = await req.json().catch(() => ({}));

        // URL Backend NestJS internal
        const backendUrl = process.env.NEXT_INTERNAL_API_URL || process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:4000';

        const backendRes = await fetch(`${backendUrl}/api/webhook/payment-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VOCML-Secret': secret,
            },
            body: JSON.stringify(body),
        });

        const data = await backendRes.json().catch(() => ({}));

        if (!backendRes.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    message: data.message || 'Gagal memproses pembayaran di backend',
                    statusCode: backendRes.status,
                },
                { status: backendRes.status }
            );
        }

        return NextResponse.json(
            {
                ok: true,
                message: 'Pembayaran berhasil diproses',
                ...data,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('[Next.js Webhook Proxy Error]:', error);
        return NextResponse.json(
            {
                ok: false,
                message: error.message || 'Internal proxy error connecting to backend server',
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        ok: true,
        endpoint: '/api/webhook/payment-notification',
        message: 'Endpoint Webhook Notifikasi Pembayaran Aktif (Gunakan method POST)',
        timestamp: new Date().toISOString(),
    });
}
