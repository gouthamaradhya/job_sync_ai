// File: pages/api/webhook.js
import axios from 'axios';

// Configure this to your ngrok URL during development
// This should be stored in environment variables in production
const DJANGO_BACKEND_URL = process.env.DJANGO_BACKEND_URL || 'https://your-ngrok-url.ngrok.io/webhook/';

export default async function handler(req: any, res: any) {
    try {
        // Handle GET request (webhook verification)
        if (req.method === 'GET') {
            // Forward query parameters to Django backend
            const params = new URLSearchParams(req.query).toString();
            const verificationUrl = `${DJANGO_BACKEND_URL}?${params}`;

            const response = await axios.get(verificationUrl);

            // Return the verification challenge code
            return res.status(response.status).send(response.data);
        }

        // Handle POST request (incoming WhatsApp messages)
        else if (req.method === 'POST') {
            // Forward the request body to Django backend
            const response = await axios.post(DJANGO_BACKEND_URL, req.body, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            return res.status(response.status).json(response.data);
        }

        // Handle other methods
        else {
            return res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error: any) {
        console.error('Error forwarding webhook request:', error);

        // If there's a response error, forward the status and error message
        if (error.response) {
            return res.status(error.response.status).json({
                error: true,
                message: 'Error from Django backend',
                details: error.response.data,
            });
        }

        // For connection errors or other issues
        return res.status(500).json({
            error: true,
            message: 'Failed to connect to Django backend',
        });
    }
}

// Increase the body size limit for file uploads (if needed)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};