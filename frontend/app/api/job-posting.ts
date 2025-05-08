// pages/api/job-posting.ts or app/api/job-posting/route.ts (depending on your Next.js version)

import { NextApiRequest, NextApiResponse } from 'next';

// For Next.js 13+ App Router
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Replace with your Django backend URL
    const DJANGO_API_URL = process.env.DJANGO_BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${DJANGO_API_URL}/api/upload-job-posting/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any auth headers if needed
        // 'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(responseData), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(responseData), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in job posting API route:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// For Next.js Pages Router
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // Replace with your Django backend URL
    const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

    const response = await fetch(`${DJANGO_API_URL}/api/upload-job-posting/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any auth headers if needed
        // 'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(responseData);
    }

    return res.status(201).json(responseData);
  } catch (error) {
    console.error('Error in job posting API route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}