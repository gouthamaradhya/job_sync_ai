// File: app/api/webhook/route.ts
import { NextRequest } from 'next/server';
import axios from 'axios';

const DJANGO_BACKEND_URL =
    process.env.DJANGO_BACKEND_URL || 'https://your-ngrok-url.ngrok.io/webhook/';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const params = url.searchParams.toString();
    const forwardUrl = `${DJANGO_BACKEND_URL}?${params}`;

    try {
        const response = await axios.get(forwardUrl);
        return new Response(response.data, { status: response.status });
    } catch (error: any) {
        console.error('GET webhook proxy error:', error);
        return new Response('Webhook verification failed', { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const response = await axios.post(DJANGO_BACKEND_URL, body, {
            headers: { 'Content-Type': 'application/json' },
        });

        return new Response(JSON.stringify(response.data), {
            status: response.status,
        });
    } catch (error: any) {
        console.error('POST webhook proxy error:', error);
        return new Response('Webhook forwarding failed', { status: 500 });
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};
