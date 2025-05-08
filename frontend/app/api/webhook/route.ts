import { NextRequest } from 'next/server';
import axios from 'axios';

const DJANGO_BACKEND_URL = process.env.DJANGO_BACKEND_URL || 'https://your-ngrok-url.ngrok.io/webhook/';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const params = searchParams.toString();

    try {
        const verificationUrl = `${DJANGO_BACKEND_URL}?${params}`;
        const response = await axios.get(verificationUrl);

        return new Response(response.data, { status: response.status });
    } catch (error: any) {
        console.error('GET webhook error:', error.message);
        return new Response(JSON.stringify({ error: true, message: 'Error forwarding GET request' }), {
            status: 500,
        });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const response = await axios.post(DJANGO_BACKEND_URL, body, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return new Response(JSON.stringify(response.data), { status: response.status });
    } catch (error: any) {
        console.error('POST webhook error:', error.message);
        return new Response(JSON.stringify({ error: true, message: 'Error forwarding POST request' }), {
            status: 500,
        });
    }
}
