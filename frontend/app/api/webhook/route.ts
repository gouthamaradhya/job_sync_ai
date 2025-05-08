// File: app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Environment variables (to be replaced with ngrok URLs in production)
const UPLOAD_ENDPOINT = process.env.UPLOAD_ENDPOINT || 'http://localhost:8000/upload_resume/';
const ANALYZE_ENDPOINT = process.env.ANALYZE_ENDPOINT || 'http://localhost:8000/analyze-resume';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Simple in-memory store for user sessions
// In production, use a database or Redis
interface UserSession {
    state: string;
    [key: string]: any;
}

// Note: This is not ideal for production as it will reset on server restarts
// Use a database or Redis in production
const userSessions: Record<string, UserSession> = {};

// GET handler for webhook verification
export async function GET(request: NextRequest) {
    console.log("Processing webhook verification request");

    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log(`Verification params - Mode: ${mode}, Token: ${token ? '*'.repeat(token.length) : 'none'}, Challenge: ${challenge}`);

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log("Webhook verified successfully!");
            return new NextResponse(challenge, { status: 200 });
        } else {
            console.warn("Failed webhook verification - invalid token or mode");
            return new NextResponse(null, { status: 403 }); // Forbidden
        }
    }

    console.warn("Bad verification request - missing parameters");
    return new NextResponse(null, { status: 400 }); // Bad request
}

// POST handler for incoming messages
export async function POST(request: NextRequest) {
    try {
        // Log request headers for debugging
        console.log(`Headers: ${JSON.stringify(Object.fromEntries(request.headers))}`);

        // Parse the request body
        const data = await request.json();
        console.log(`Received webhook data: ${JSON.stringify(data).substring(0, 500)}...`);

        // Check if this is a WhatsApp Business API message
        if (data.object === 'whatsapp_business_account') {
            for (const entry of data.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'messages') {
                        if (change.value?.messages) {
                            await processMessage(change.value);
                        }
                    }
                }
            }
        }

        return new NextResponse(null, { status: 200 });
    } catch (e) {
        console.error(`Error processing message: ${e}`);
        return new NextResponse(null, { status: 500 });
    }
}

async function processMessage(value: any) {
    try {
        // Extract message information
        const message = value.messages[0];
        const messageId = message.id;
        const phoneNumber = value.contacts[0].wa_id;

        console.log(`Processing message from ${phoneNumber}, message_id: ${messageId}`);

        // Track user session
        if (!userSessions[phoneNumber]) {
            userSessions[phoneNumber] = { state: 'new' };
            console.log(`New user session created for ${phoneNumber}`);
        }

        // Handle message based on type
        if (message.text) {
            const textContent = message.text.body;
            console.log(`Received text message: ${textContent}`);
            await handleTextMessage(phoneNumber, textContent);
        } else if (message.image) {
            console.log(`Received image message from ${phoneNumber}`);
            await handleFileMessage(phoneNumber, message);
        } else if (message.document) {
            console.log(`Received document message from ${phoneNumber}`);
            await handleFileMessage(phoneNumber, message);
        } else {
            // Handle other message types
            console.log(`Received unsupported message type from ${phoneNumber}`);
            await sendMessage(phoneNumber, "I can only process text messages and files. Please send a message or your resume.");
        }
    } catch (e) {
        console.error(`Error in processMessage: ${e}`);
    }
}

async function handleTextMessage(phoneNumber: string, messageText: string) {
    messageText = messageText.toLowerCase().trim();
    const userState = userSessions[phoneNumber].state;

    console.log(`Handling text message '${messageText}' from ${phoneNumber} (state: ${userState})`);

    if (messageText === 'hi' || messageText === 'hello') {
        // Welcome message
        await sendMessage(
            phoneNumber,
            "👋 Welcome to Job Sync AI!\n\n" +
            "I can help analyze your resume and provide personalized feedback. " +
            "Would you like to upload your resume now? (Reply with 'yes' to proceed)"
        );
        userSessions[phoneNumber].state = 'awaiting_confirmation';
    } else if (userState === 'awaiting_confirmation' && (messageText === 'yes' || messageText === 'y')) {
        // Prompt for resume upload
        await sendMessage(
            phoneNumber,
            "Great! Please upload your resume as a PDF or image file."
        );
        userSessions[phoneNumber].state = 'awaiting_resume';
    } else if (userState === 'analysis_complete') {
        // After analysis is complete, reset state if user sends another message
        await sendMessage(
            phoneNumber,
            "Do you want to analyze another resume? Reply with 'yes' to proceed."
        );
        userSessions[phoneNumber].state = 'awaiting_confirmation';
    } else {
        // Default response
        await sendMessage(
            phoneNumber,
            "I'm here to help analyze your resume. Say 'hi' to start over, or upload your resume if you're ready."
        );
    }
}

async function handleFileMessage(phoneNumber: string, message: any) {
    const userState = userSessions[phoneNumber].state;
    console.log(`Handling file message from ${phoneNumber} (state: ${userState})`);

    // Check if we're expecting a resume
    if (userState !== 'awaiting_resume' && userState !== 'analysis_complete') {
        await sendMessage(
            phoneNumber,
            "I wasn't expecting a file yet. Please say 'hi' to start the resume analysis process."
        );
        return;
    }

    // Determine file type
    let fileType = null;
    let mediaId = null;

    if (message.image) {
        fileType = 'image';
        mediaId = message.image.id;
        console.log(`Received image with media ID: ${mediaId}`);
    } else if (message.document) {
        fileType = 'document';
        mediaId = message.document.id;
        const mimeType = message.document.mime_type || 'unknown';
        console.log(`Received document with media ID: ${mediaId}, mime_type: ${mimeType}`);
    }

    if (mediaId) {
        // Download the file
        await sendMessage(phoneNumber, "Downloading your resume... Please wait.");
        const fileData = await downloadMedia(mediaId);

        if (fileData) {
            console.log(`Successfully downloaded media with ID ${mediaId}`);
            // Process the resume
            await sendMessage(phoneNumber, "Analyzing your resume... This may take a moment.");

            try {
                // Upload to your backend service
                const uploadResponse = await uploadResume(fileData, mediaId);

                if (uploadResponse.success) {
                    // Now analyze the resume
                    const analysisResult = await analyzeResume(uploadResponse.filePath);

                    if (analysisResult) {
                        console.log(`Analysis complete for ${phoneNumber}`);

                        // Format and send the analysis
                        await sendAnalysisResult(phoneNumber, analysisResult);
                        userSessions[phoneNumber].state = 'analysis_complete';
                    } else {
                        await sendMessage(
                            phoneNumber,
                            "I encountered an error while analyzing your resume. Please try uploading it again."
                        );
                    }
                } else {
                    await sendMessage(
                        phoneNumber,
                        "I couldn't upload your resume. Please try again."
                    );
                }
            } catch (e) {
                console.error(`Error analyzing resume: ${e}`);
                await sendMessage(
                    phoneNumber,
                    "I encountered an error while analyzing your resume. Please try uploading it again."
                );
            }
        } else {
            console.error(`Failed to download media with ID ${mediaId}`);
            await sendMessage(
                phoneNumber,
                "I couldn't download your file. Please try uploading it again."
            );
        }
    } else {
        console.warn(`Could not determine media ID from message`);
        await sendMessage(
            phoneNumber,
            "I couldn't process your file. Please upload a PDF or image file of your resume."
        );
    }
}

async function sendAnalysisResult(phoneNumber: string, analysisResult: any) {
    console.log(`Sending analysis results to ${phoneNumber}`);

    // Create a formatted message with the analysis results
    let message = "📋 *Your Resume Analysis Results* 📋\n\n";

    // Skills section
    message += "*Skills Identified:*\n";
    const skills = analysisResult.skills.join(", ");
    message += `• ${skills}\n\n`;

    // Experience and education
    message += `*Experience:* ${analysisResult.experience_years} years\n`;
    message += `*Education:* ${analysisResult.education}\n\n`;

    // Missing keywords
    message += "*Missing Keywords:*\n";
    const missing = analysisResult.missing_keywords.join(", ");
    message += `• ${missing}\n\n`;

    // Improvement suggestions
    message += "*Suggestions for Improvement:*\n";
    analysisResult.improvement_suggestions.forEach((suggestion: string, idx: number) => {
        message += `${idx + 1}. ${suggestion}\n`;
    });

    // Conclusion
    message += "\nWould you like to upload another resume? Reply with 'yes' to analyze a different resume.";

    await sendMessage(phoneNumber, message);
}

async function downloadMedia(mediaId: string): Promise<Buffer | null> {
    try {
        console.log(`Attempting to download media with ID: ${mediaId}`);

        // Get media URL
        const headers = {
            "Authorization": `Bearer ${ACCESS_TOKEN}`
        };
        const url = `${WHATSAPP_API_URL}/${mediaId}`;

        console.log(`Requesting media URL from: ${url}`);
        const response = await axios.get(url, { headers });

        if (response.status === 200) {
            const mediaData = response.data;
            const mediaUrl = mediaData.url;

            console.log(`Got media URL: ${mediaUrl.substring(0, 50)}...`);

            // Download the file
            const mediaResponse = await axios.get(mediaUrl, {
                headers,
                responseType: 'arraybuffer'
            });

            if (mediaResponse.status === 200) {
                console.log(`Downloaded media content, size: ${mediaResponse.data.length} bytes`);
                return Buffer.from(mediaResponse.data);
            } else {
                console.error(`Failed to download media content: ${mediaResponse.status}, ${mediaResponse.statusText}`);
            }
        } else {
            console.error(`Failed to get media URL: ${response.status}, ${response.statusText}`);
        }
    } catch (e) {
        console.error(`Error downloading media: ${e}`);
    }

    return null;
}

async function uploadResume(fileData: Buffer, mediaId: string) {
    try {
        console.log(`Uploading resume with mediaId: ${mediaId}`);

        // Create FormData for file upload
        const formData = new FormData();
        const blob = new Blob([fileData], { type: 'application/octet-stream' });
        formData.append('file', blob, `resume_${mediaId}.pdf`);

        // Upload to your Django backend
        const response = await axios.post(UPLOAD_ENDPOINT, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response.status === 200 || response.status === 201) {
            console.log('Resume uploaded successfully');
            return {
                success: true,
                filePath: response.data.file_path || mediaId
            };
        } else {
            console.error(`Failed to upload resume: ${response.status}, ${response.statusText}`);
            return { success: false };
        }
    } catch (e) {
        console.error(`Error uploading resume: ${e}`);
        return { success: false };
    }
}

async function analyzeResume(filePathOrId: string) {
    try {
        console.log(`Analyzing resume: ${filePathOrId}`);

        // Call your Django analysis endpoint
        const response = await axios.post(ANALYZE_ENDPOINT, {
            file_path: filePathOrId
        });

        if (response.status === 200) {
            console.log('Resume analysis complete');
            return response.data;
        } else {
            console.error(`Failed to analyze resume: ${response.status}, ${response.statusText}`);
            return null;
        }
    } catch (e) {
        console.error(`Error analyzing resume: ${e}`);
        return null;
    }
}

async function sendMessage(phoneNumber: string, messageText: string) {
    console.log(`Sending message to ${phoneNumber}: ${messageText.substring(0, 50)}...`);

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`
    };

    const payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phoneNumber,
        "type": "text",
        "text": {
            "body": messageText
        }
    };

    try {
        const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
        console.log(`Sending message to WhatsApp API: ${url}`);

        const response = await axios.post(url, payload, { headers });

        if (response.status === 200) {
            console.log(`Message sent successfully to ${phoneNumber}`);
        } else {
            console.error(`Error sending message: ${response.status}, ${response.data}`);
        }
    } catch (e) {
        console.error(`Error sending message: ${e}`);
    }
}