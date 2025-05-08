// File: app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Environment variables configuration
const ENV = {
    UPLOAD_ENDPOINT: process.env.UPLOAD_ENDPOINT || 'http://localhost:8000/upload_resume/',
    ANALYZE_ENDPOINT: process.env.ANALYZE_ENDPOINT || 'http://localhost:8000/analyze-resume',
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_API_URL: 'https://graph.facebook.com/v18.0'
};

// Type definitions
interface UserSession {
    state: 'new' | 'awaiting_confirmation' | 'awaiting_resume' | 'analysis_complete';
    [key: string]: any;
}

interface WhatsAppContact {
    wa_id: string;
    [key: string]: any;
}

interface WhatsAppMessage {
    id: string;
    from: string;
    timestamp: string;
    text?: { body: string };
    image?: { id: string; mime_type?: string };
    document?: { id: string; mime_type?: string; filename?: string };
    [key: string]: any;
}

interface WhatsAppValue {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts: WhatsAppContact[];
    messages: WhatsAppMessage[];
}

interface WebhookEntry {
    id: string;
    changes: {
        value: WhatsAppValue;
        field: string;
    }[];
}

interface WebhookEvent {
    object: string;
    entry: WebhookEntry[];
}

interface UploadResponse {
    success: boolean;
    filePath?: string;
    error?: string;
}

interface MatchedJob {
    job_id: string;
    domain: string;
    similarity: number;
    application_link?: string;
    description?: string;
}

interface ResumeAnalysis {
    skills: string[];
    experience_years?: number;
    education?: string;
    missing_keywords: string[];
    improvement_suggestions: string[];
    matched_jobs: MatchedJob[];
    job_analysis?: string;
}

interface JobAnalysis {
    job_id: string;
    title: string;
    match: {
        level: 'High' | 'Moderate' | 'Low';
        assessment: string;
    };
    skills: {
        matching: string[];
        missing: string[];
    };
    learning_recommendations: string[];
}

// In-memory session store (use Redis or database in production)
const userSessions: Record<string, UserSession> = {};

/**
 * Simple logging utility
 */
function createLogger(context: string) {
    return {
        info: (message: string) => console.log(`[${context}] INFO: ${message}`),
        warn: (message: string) => console.warn(`[${context}] WARN: ${message}`),
        error: (message: string) => console.error(`[${context}] ERROR: ${message}`)
    };
}

/**
 * Parse job analysis markdown text into structured data
 */
function parseJobAnalysisForWebhook(markdownText: string): JobAnalysis[] {
    const jobs: JobAnalysis[] = [];
    const jobSections = markdownText.split('### Job');

    // Skip the first empty section if it exists
    for (let i = 1; i < jobSections.length; i++) {
        const section = jobSections[i];

        // Extract job title
        const titleMatch = section.match(/(\d+): ([^\n]+)/);
        const jobNumber = titleMatch ? titleMatch[1] : i.toString();
        const jobTitle = titleMatch ? titleMatch[2].trim() : `Job ${i}`;

        // Extract match assessment
        const matchAssessmentMatch = section.match(/#### Match Assessment\s*([^\n]+)/);
        const matchAssessment = matchAssessmentMatch ? matchAssessmentMatch[1].trim() : "";

        // Determine match level
        let matchLevel: 'High' | 'Moderate' | 'Low' = "Low";
        if (matchAssessment.includes("well") && !matchAssessment.includes("not")) {
            matchLevel = "High";
        } else if (matchAssessment.includes("moderately")) {
            matchLevel = "Moderate";
        }

        // Extract key matching skills
        const keySkillsMatch = section.match(/#### Key Matching Skills\s*([\s\S]*?)(?=####|$)/);
        const keySkills = keySkillsMatch
            ? keySkillsMatch[1]
                .split('*')
                .filter(item => item.trim())
                .map(item => item.trim())
            : [];

        // Extract missing skills
        const missingSkillsMatch = section.match(/#### Missing Skills\s*([\s\S]*?)(?=####|$)/);
        const missingSkills = missingSkillsMatch
            ? missingSkillsMatch[1]
                .split('*')
                .filter(item => item.trim())
                .map(item => item.trim())
            : [];

        // Extract recommended learning
        const learningMatch = section.match(/#### Recommended Learning\s*([\s\S]*?)(?=###|$)/);
        const recommendedLearning = learningMatch
            ? learningMatch[1]
                .split('*')
                .filter(item => item.trim())
                .map(item => item.trim())
            : [];

        // Create job object
        jobs.push({
            job_id: jobNumber,
            title: jobTitle,
            match: {
                level: matchLevel,
                assessment: matchAssessment
            },
            skills: {
                matching: keySkills,
                missing: missingSkills
            },
            learning_recommendations: recommendedLearning
        });
    }

    return jobs;
}



/**
 * Send formatted analysis results to user
 */
async function sendAnalysisResult(phoneNumber: string, analysis: ResumeAnalysis): Promise<void> {
    const logger = createLogger('sendAnalysisResult');

    // Format the overall analysis summary
    let message = "📄 *Resume Analysis Complete* 📄\n\n";

    // Add key skills
    if (analysis.skills && analysis.skills.length > 0) {
        message += "*Key Skills Identified:*\n";
        analysis.skills.slice(0, 5).forEach(skill => {
            message += `• ${skill}\n`;
        });

        if (analysis.skills.length > 5) {
            message += `• ...and ${analysis.skills.length - 5} more\n`;
        }
        message += "\n";
    }

    // Add improvement suggestions
    if (analysis.improvement_suggestions && analysis.improvement_suggestions.length > 0) {
        message += "*Improvement Suggestions:*\n";
        analysis.improvement_suggestions.forEach(suggestion => {
            message += `• ${suggestion}\n`;
        });
        message += "\n";
    }

    // Add job matches if available
    if (analysis.matched_jobs && analysis.matched_jobs.length > 0) {
        message += "*Top Job Matches:*\n";

        for (let i = 0; i < Math.min(3, analysis.matched_jobs.length); i++) {
            const job = analysis.matched_jobs[i];
            const matchPercentage = Math.round((job.similarity || 0) * 100);

            message += `${i + 1}. ${job.domain} (${matchPercentage}% match)\n`;
        }

        message += "\nFor detailed job analysis, say 'jobs'.\n";
    }

    // Send the message
    await sendMessage(phoneNumber, message);

    logger.info(`Sent analysis results to ${phoneNumber}`);
}

/**
 * Send WhatsApp message
 */
async function sendMessage(phoneNumber: string, messageText: string): Promise<boolean> {
    const logger = createLogger('sendMessage');
    logger.info(`Sending message to ${phoneNumber}: ${messageText.substring(0, 50)}...`);

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ENV.WHATSAPP_ACCESS_TOKEN}`
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
        const url = `${ENV.WHATSAPP_API_URL}/${ENV.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        logger.info(`Sending message to WhatsApp API: ${url}`);

        const response = await axios.post(url, payload, { headers });

        if (response.status !== 200) {
            logger.error(`Error sending message: ${response.status}, ${JSON.stringify(response.data)}`);
            return false;
        }

        logger.info(`Message sent successfully to ${phoneNumber}`);
        return true;

    } catch (error) {
        logger.error(`Error sending message: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Upload resume to backend service
 */
async function uploadResume(fileData: Buffer, mediaId: string): Promise<UploadResponse> {
    const logger = createLogger('uploadResume');

    try {
        logger.info(`Uploading resume with mediaId: ${mediaId}`);

        // Create FormData for file upload
        const formData = new FormData();
        const blob = new Blob([fileData], { type: 'application/octet-stream' });
        formData.append('file', blob, `resume_${mediaId}.pdf`);

        // Upload to backend
        const response = await axios.post(ENV.UPLOAD_ENDPOINT, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response.status !== 200 && response.status !== 201) {
            logger.error(`Failed to upload resume: ${response.status}, ${response.statusText}`);
            return { success: false, error: `Upload failed with status ${response.status}` };
        }

        logger.info('Resume uploaded successfully');
        return {
            success: true,
            filePath: response.data.file_path || mediaId
        };

    } catch (error) {
        logger.error(`Error uploading resume: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown upload error'
        };
    }
}

/**
 * Analyze resume using backend service
 */
async function analyzeResume(filePathOrId: string): Promise<ResumeAnalysis | null> {
    const logger = createLogger('analyzeResume');

    try {
        logger.info(`Analyzing resume: ${filePathOrId}`);

        // Call analysis endpoint
        const response = await axios.get(`${ENV.ANALYZE_ENDPOINT}`);

        if (response.status !== 200) {
            logger.error(`Failed to analyze resume: ${response.status}, ${response.statusText}`);
            return null;
        }

        logger.info('Resume analysis complete');
        return response.data;

    } catch (error) {
        logger.error(`Error analyzing resume: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Download media from WhatsApp API
 */
async function downloadMedia(mediaId: string): Promise<Buffer | null> {
    const logger = createLogger('downloadMedia');

    try {
        logger.info(`Attempting to download media with ID: ${mediaId}`);

        // Get media URL
        const headers = {
            "Authorization": `Bearer ${ENV.WHATSAPP_ACCESS_TOKEN}`
        };
        const url = `${ENV.WHATSAPP_API_URL}/${mediaId}`;

        logger.info(`Requesting media URL from: ${url}`);
        const response = await axios.get(url, { headers });

        if (response.status !== 200) {
            logger.error(`Failed to get media URL: ${response.status}, ${response.statusText}`);
            return null;
        }

        const mediaData = response.data;
        const mediaUrl = mediaData.url;

        logger.info(`Got media URL: ${mediaUrl.substring(0, 50)}...`);

        // Download the file
        const mediaResponse = await axios.get(mediaUrl, {
            headers,
            responseType: 'arraybuffer'
        });

        if (mediaResponse.status !== 200) {
            logger.error(`Failed to download media content: ${mediaResponse.status}, ${mediaResponse.statusText}`);
            return null;
        }

        logger.info(`Downloaded media content, size: ${mediaResponse.data.length} bytes`);
        return Buffer.from(mediaResponse.data);

    } catch (error) {
        logger.error(`Error downloading media: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Handle file messages (resume uploads)
 */
async function handleFileMessage(phoneNumber: string, message: WhatsAppMessage): Promise<void> {
    const logger = createLogger('handleFileMessage');
    const session = userSessions[phoneNumber];

    logger.info(`Handling file message from ${phoneNumber} (state: ${session.state})`);

    // Check if we're expecting a resume
    if (session.state !== 'awaiting_resume' && session.state !== 'analysis_complete') {
        await sendMessage(
            phoneNumber,
            "I wasn't expecting a file yet. Please say 'hi' to start the resume analysis process."
        );
        return;
    }

    // Determine file type and media ID
    let mediaId: string | null = null;
    let fileType: 'image' | 'document' | null = null;

    if (message.image) {
        fileType = 'image';
        mediaId = message.image.id;
        logger.info(`Received image with media ID: ${mediaId}`);
    } else if (message.document) {
        fileType = 'document';
        mediaId = message.document.id;
        logger.info(`Received document with media ID: ${mediaId}, mime_type: ${message.document.mime_type || 'unknown'}`);
    }

    if (!mediaId) {
        logger.warn(`Could not determine media ID from message`);
        await sendMessage(
            phoneNumber,
            "I couldn't process your file. Please upload a PDF or image file of your resume."
        );
        return;
    }

    // Process the resume
    try {
        // Download step
        await sendMessage(phoneNumber, "Downloading your resume... Please wait.");
        const fileData = await downloadMedia(mediaId);

        if (!fileData) {
            throw new Error(`Failed to download media with ID ${mediaId}`);
        }

        logger.info(`Successfully downloaded media with ID ${mediaId}`);

        // Upload step
        await sendMessage(phoneNumber, "Analyzing your resume... This may take a moment.");
        const uploadResponse = await uploadResume(fileData, mediaId);

        if (!uploadResponse.success) {
            throw new Error("Resume upload failed");
        }

        // Analysis step
        const analysisResult = await analyzeResume(uploadResponse.filePath!);

        if (!analysisResult) {
            throw new Error("Resume analysis failed");
        }

        logger.info(`Analysis complete for ${phoneNumber}`);

        // Send analysis results
        await sendAnalysisResult(phoneNumber, analysisResult);
        session.state = 'analysis_complete';

    } catch (error) {
        logger.error(`Error processing resume: ${error instanceof Error ? error.message : String(error)}`);
        await sendMessage(
            phoneNumber,
            "I encountered an error while processing your resume. Please try uploading it again."
        );
    }
}

/**
 * Handle text messages based on user state
 */
async function handleTextMessage(phoneNumber: string, messageText: string): Promise<void> {
    const logger = createLogger('handleTextMessage');
    messageText = messageText.toLowerCase().trim();
    const session = userSessions[phoneNumber];

    logger.info(`Handling text message '${messageText}' from ${phoneNumber} (state: ${session.state})`);

    switch (true) {
        // Welcome message
        case messageText === 'hi' || messageText === 'hello':
            await sendMessage(
                phoneNumber,
                "👋 Welcome to Job Sync AI!\n\n" +
                "I can help analyze your resume and provide personalized feedback. " +
                "Would you like to upload your resume now? (Reply with 'yes' to proceed)"
            );
            session.state = 'awaiting_confirmation';
            break;

        // Resume upload prompt
        case session.state === 'awaiting_confirmation' && (messageText === 'yes' || messageText === 'y'):
            await sendMessage(
                phoneNumber,
                "Great! Please upload your resume as a PDF or image file."
            );
            session.state = 'awaiting_resume';
            break;

        // Analysis completed, user wants to analyze another resume
        case session.state === 'analysis_complete':
            await sendMessage(
                phoneNumber,
                "Do you want to analyze another resume? Reply with 'yes' to proceed."
            );
            session.state = 'awaiting_confirmation';
            break;

        // Default response
        default:
            await sendMessage(
                phoneNumber,
                "I'm here to help analyze your resume. Say 'hi' to start over, or upload your resume if you're ready."
            );
            break;
    }
}

/**
 * Process an incoming WhatsApp message
 */
async function processMessage(value: WhatsAppValue): Promise<void> {
    const logger = createLogger('processMessage');

    try {
        const message = value.messages[0];
        const messageId = message.id;
        const phoneNumber = value.contacts[0].wa_id;

        logger.info(`Processing message from ${phoneNumber}, message_id: ${messageId}`);

        // Initialize user session if it doesn't exist
        if (!userSessions[phoneNumber]) {
            userSessions[phoneNumber] = { state: 'new' };
            logger.info(`New user session created for ${phoneNumber}`);
        }

        // Handle different message types
        if (message.text) {
            const textContent = message.text.body;
            logger.info(`Received text message: ${textContent}`);
            await handleTextMessage(phoneNumber, textContent);
        } else if (message.image || message.document) {
            logger.info(`Received ${message.image ? 'image' : 'document'} message from ${phoneNumber}`);
            await handleFileMessage(phoneNumber, message);
        } else {
            // Unsupported message type
            logger.info(`Received unsupported message type from ${phoneNumber}`);
            await sendMessage(phoneNumber, "I can only process text messages and files. Please send a message or your resume.");
        }
    } catch (error) {
        logger.error(`Error in processMessage: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * GET handler for webhook verification
 */
export async function GET(request: NextRequest) {
    const logger = createLogger('GET webhook verification');
    logger.info("Processing webhook verification request");

    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    logger.info(`Verification params - Mode: ${mode}, Token: ${token ? '*****' : 'none'}, Challenge: ${challenge}`);

    if (!mode || !token) {
        logger.warn("Bad verification request - missing parameters");
        return new NextResponse(null, { status: 400 }); // Bad request
    }

    if (mode === 'subscribe' && token === ENV.WHATSAPP_VERIFY_TOKEN) {
        logger.info("Webhook verified successfully!");
        return new NextResponse(challenge, { status: 200 });
    }

    logger.warn("Failed webhook verification - invalid token or mode");
    return new NextResponse(null, { status: 403 }); // Forbidden
}

/**
 * POST handler for incoming messages
 */
export async function POST(request: NextRequest) {
    const logger = createLogger('POST webhook');

    try {
        // Parse the request body
        const data: WebhookEvent = await request.json();
        logger.info(`Received webhook data: ${JSON.stringify(data).substring(0, 200)}...`);

        // Check if this is a WhatsApp Business API message
        if (data.object === 'whatsapp_business_account') {
            for (const entry of data.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'messages' && change.value?.messages?.length > 0) {
                        await processMessage(change.value);
                    }
                }
            }
        }

        return new NextResponse(null, { status: 200 });
    } catch (error) {
        logger.error(`Error processing webhook: ${error instanceof Error ? error.message : String(error)}`);
        return new NextResponse(null, { status: 500 });
    }
}