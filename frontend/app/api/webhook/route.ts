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
    lastAnalysis?: ResumeAnalysis; // Added to store the last analysis
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

interface WebhookResponseDataMatchedJobAnalysis {
    match_level: 'High' | 'Moderate' | 'Low';
    match_assessment: string;
    matching_skills: string[];
    missing_skills: string[];
    recommended_learning: string[];
}

interface WebhookResponseDataMatchedJob {
    job_id: string | null;
    title: string;
    similarity: number | null;
    application_link: string | null;
    description_preview: string | null;
    analysis?: WebhookResponseDataMatchedJobAnalysis; // For merged analysis
}

interface WebhookResponseData {
    skills: string[];
    experience_years: number | null;
    education: string | null;
    missing_keywords: string[];
    improvement_suggestions: string[];
    matched_jobs: WebhookResponseDataMatchedJob[];
    job_analysis?: JobAnalysis[]; // For when only parsed job_analysis text exists
}

interface FormattedWebhookResponse {
    success: boolean;
    timestamp: string;
    data: WebhookResponseData;
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
 * Format analysis result for webhook API
 */
function formatAnalysisForWebhook(analysisResult: ResumeAnalysis): FormattedWebhookResponse {
    const responseData: WebhookResponseData = { // Use the new interface
        skills: analysisResult.skills || [],
        experience_years: analysisResult.experience_years || null,
        education: analysisResult.education || null,
        missing_keywords: analysisResult.missing_keywords || [],
        improvement_suggestions: analysisResult.improvement_suggestions || [],
        matched_jobs: [] // Initialize as WebhookResponseDataMatchedJob[]
    };

    if (analysisResult.matched_jobs && analysisResult.matched_jobs.length > 0) {
        responseData.matched_jobs = analysisResult.matched_jobs.map(job => ({
            job_id: job.job_id || null,
            title: job.domain || "Unnamed Position",
            similarity: job.similarity ? Math.round(job.similarity * 100) : null,
            application_link: job.application_link || null,
            description_preview: job.description ?
                job.description.substring(0, 150) + (job.description.length > 150 ? "..." : "") :
                null
            // 'analysis' field will be added below if applicable
        }));
    }

    if (analysisResult.job_analysis) {
        const parsedJobs: JobAnalysis[] = parseJobAnalysisForWebhook(analysisResult.job_analysis);

        if (parsedJobs.length > 0) {
            if (responseData.matched_jobs.length > 0) {
                // Merge parsed job details into existing matched_jobs
                responseData.matched_jobs = responseData.matched_jobs.map(matchedJob => {
                    const parsedJobDetail = parsedJobs.find(pj => pj.job_id === matchedJob.job_id);

                    if (parsedJobDetail) {
                        return {
                            ...matchedJob, // matchedJob is now correctly typed
                            analysis: {
                                match_level: parsedJobDetail.match.level,
                                match_assessment: parsedJobDetail.match.assessment,
                                matching_skills: parsedJobDetail.skills.matching,
                                missing_skills: parsedJobDetail.skills.missing,
                                recommended_learning: parsedJobDetail.learning_recommendations
                            }
                        };
                    }
                    return matchedJob;
                });
            } else {
                // If no initial matched_jobs, but we parsed jobs from job_analysis string,
                // store them in the dedicated 'job_analysis' field.
                responseData.job_analysis = parsedJobs;
            }
        }
    }

    return {
        success: true,
        timestamp: new Date().toISOString(),
        data: responseData
    };
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
    formatAnalysisForWebhook(analysis);

    logger.info(`Sent analysis results to ${phoneNumber}`);
}

/**
 * Send WhatsApp message
 */
// File: app/api/webhook/route.ts
// ... (other code) ...

async function sendMessage(phoneNumber: string, messageText: string): Promise<boolean> {
    const logger = createLogger('sendMessage');
    // Limit log preview to avoid overly long log lines, but ensure it's useful.
    const messagePreview = messageText.length > 100 ? messageText.substring(0, 97) + "..." : messageText;
    logger.info(`Sending message to ${phoneNumber}: "${messagePreview}" (Length: ${messageText.length})`);

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ENV.WHATSAPP_ACCESS_TOKEN}`
    };
    const payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phoneNumber,
        "type": "text",
        "text": { "preview_url": true, "body": messageText } // Added preview_url: true (good for links)
    };

    try {
        const url = `${ENV.WHATSAPP_API_URL}/${ENV.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        // logger.info(`Sending message to WhatsApp API: ${url}`); // Already logged in previous turn
        const response = await axios.post(url, payload, { headers });

        if (response.status !== 200) { // Should be 200 for success
            logger.error(`Error sending message: WhatsApp API responded with ${response.status}, Data: ${JSON.stringify(response.data)}`);
            return false;
        }
        logger.info(`Message sent successfully to ${phoneNumber}. Message ID: ${response.data?.messages?.[0]?.id || 'N/A'}`);
        return true;
    } catch (error) {
        let errorMessage = "Unknown error during sendMessage";
        if (axios.isAxiosError(error)) {
            errorMessage = error.message;
            if (error.response) {
                // THIS IS THE CRUCIAL LOG FOR 400 ERRORS
                logger.error(`Error sending message: API Error ${error.response.status} - Data: ${JSON.stringify(error.response.data)}`);
                errorMessage = `API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
            } else if (error.request) {
                logger.error(`Error sending message: No response received. Request: ${JSON.stringify(error.request)}`);
                errorMessage = "No response from API.";
            } else {
                logger.error(`Error sending message: Axios error setup. ${error.message}`);
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
            logger.error(`Error sending message (non-Axios): ${errorMessage}`);
        } else {
            logger.error(`Error sending message (unknown type): ${String(error)}`);
        }
        return false;
    }
}


const WHATSAPP_MAX_MESSAGE_LENGTH = 4096; // Maximum characters for a WhatsApp message

/**
 * Splits a long message into parts suitable for WhatsApp, attempting to preserve readability.
 */
function splitMessageIntoParts(fullMessage: string, maxLength: number, logger: ReturnType<typeof createLogger>): string[] {
    const parts: string[] = [];
    if (!fullMessage) {
        return parts;
    }

    if (fullMessage.length <= maxLength) {
        parts.push(fullMessage);
        return parts;
    }

    logger.info(`Original message length ${fullMessage.length} exceeds ${maxLength}, splitting.`);
    let currentOffset = 0;
    while (currentOffset < fullMessage.length) {
        let endIndex = Math.min(currentOffset + maxLength, fullMessage.length);
        if (endIndex < fullMessage.length) { // If not the last part, try to find a good split point
            let splitAt = -1;
            // Try to split at the last double newline within the current chunk
            let tempSplitAt = fullMessage.substring(currentOffset, endIndex).lastIndexOf("\n\n");
            if (tempSplitAt > 0) {
                splitAt = currentOffset + tempSplitAt + 2; // Include the newlines in the split
            } else {
                // Try to split at the last single newline
                tempSplitAt = fullMessage.substring(currentOffset, endIndex).lastIndexOf("\n");
                if (tempSplitAt > 0) {
                    splitAt = currentOffset + tempSplitAt + 1; // Include the newline
                } else {
                    // Try to split at the last space
                    tempSplitAt = fullMessage.substring(currentOffset, endIndex).lastIndexOf(" ");
                    if (tempSplitAt > 0) {
                        splitAt = currentOffset + tempSplitAt + 1; // Include the space
                    }
                }
            }

            if (splitAt > currentOffset && splitAt < endIndex) { // If a good split point is found
                endIndex = splitAt;
            } else if (endIndex === fullMessage.length) { // Reached the end
                // No action needed, will take full remaining string
            } else {
                // If no good split point, hard split at maxLength (already set by default endIndex)
                logger.warn(`Hard-splitting a message part as no good boundary (newline/space) was found near char ${endIndex} for part starting at ${currentOffset}.`);
            }
        }
        parts.push(fullMessage.substring(currentOffset, endIndex).trim());
        currentOffset = endIndex;
    }
    return parts.filter(part => part.length > 0); // Remove any empty parts that might result from trimming
}

async function sendMultiPartMessage(phoneNumber: string, fullMessage: string, logger: ReturnType<typeof createLogger>): Promise<boolean> {
    const messageParts = splitMessageIntoParts(fullMessage, WHATSAPP_MAX_MESSAGE_LENGTH, logger);

    if (messageParts.length === 0 && fullMessage.length > 0) {
        logger.error("Splitting resulted in no parts for a non-empty message. This should not happen.");
        return false; // Indicates an issue with splitting logic or empty message.
    }
    if (messageParts.length === 0 && fullMessage.length === 0) {
        return true; // Sending an empty message is vacuously successful.
    }


    for (let i = 0; i < messageParts.length; i++) {
        const part = messageParts[i];
        let messageWithPager = part;
        if (messageParts.length > 1) {
            const pager = `(Part ${i + 1}/${messageParts.length})\n`;
            // Only add pager if it fits, otherwise send part as is.
            if ((pager.length + part.length) <= WHATSAPP_MAX_MESSAGE_LENGTH) {
                messageWithPager = pager + part;
            } else {
                logger.warn(`Pager for part ${i + 1} makes it too long, sending without pager.`);
            }
        }

        if (!await sendMessage(phoneNumber, messageWithPager)) {
            logger.error(`Failed to send part ${i + 1}/${messageParts.length} of multi-part message to ${phoneNumber}.`);
            return false; // Stop sending further parts if one fails
        }
        // Optional: Add a small delay between messages if sending multiple parts
        if (i < messageParts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 750)); // 0.75 second delay
        }
    }
    return true;
}


async function sendDetailedJobAnalysisMessage(phoneNumber: string, analysis: ResumeAnalysis): Promise<void> {
    const logger = createLogger('sendDetailedJobAnalysis');
    let jobsMessage = "📄 *Detailed Job Analysis* 📄\n\n";
    let foundDetailedJobs = false;

    if (analysis.job_analysis) {
        const parsedDetailedJobs = parseJobAnalysisForWebhook(analysis.job_analysis);
        if (parsedDetailedJobs.length > 0) {
            foundDetailedJobs = true;
            parsedDetailedJobs.forEach((jobDetail, index) => {
                const originalMatchedJob = analysis.matched_jobs?.find(
                    mj => mj.job_id === jobDetail.job_id || mj.domain === jobDetail.title
                );
                const title = originalMatchedJob?.domain || jobDetail.title;
                const similarityPercentage = originalMatchedJob?.similarity ? Math.round(originalMatchedJob.similarity * 100) : null;

                jobsMessage += `*${index + 1}. ${title}*\n`;
                if (similarityPercentage !== null) {
                    jobsMessage += `  Match Score: ${similarityPercentage}%\n`;
                }
                jobsMessage += `  Assessment: ${jobDetail.match.assessment} (Level: ${jobDetail.match.level})\n`;
                if (jobDetail.skills.matching.length > 0) {
                    jobsMessage += `  Matching Skills: _${jobDetail.skills.matching.join(', ')}_\n`;
                }
                if (jobDetail.skills.missing.length > 0) {
                    jobsMessage += `  Skills to Develop: _${jobDetail.skills.missing.join(', ')}_\n`;
                }
                if (jobDetail.learning_recommendations.length > 0) {
                    jobsMessage += `  Recommended Learning: _${jobDetail.learning_recommendations.join(', ')}_\n`;
                }
                if (originalMatchedJob?.application_link) {
                    jobsMessage += `  Apply Here: ${originalMatchedJob.application_link}\n`;
                }
                jobsMessage += "\n";
            });
        }
    }

    if (!foundDetailedJobs) {
        if (analysis.matched_jobs && analysis.matched_jobs.length > 0) {
            jobsMessage += "A summary of matched jobs was previously sent. The more detailed text-based analysis for each job is not available or couldn't be parsed.\nHere's the summary again:\n\n";
            analysis.matched_jobs.slice(0, 3).forEach((job, i) => {
                const matchPercentage = Math.round((job.similarity || 0) * 100);
                jobsMessage += `${i + 1}. ${job.domain} (${matchPercentage}% match)\n`;
                if (job.application_link) jobsMessage += `   Link: ${job.application_link}\n`;
            });
        } else {
            jobsMessage += "No detailed job analysis data or matched jobs were found in your report.\n";
        }
    }

    // logger.info(`Constructed jobsMessage (length: ${jobsMessage.length}):\n${jobsMessage}`); // Log the full message if needed for debugging, be mindful of log limits

    const mainMessageSent = await sendMultiPartMessage(phoneNumber, jobsMessage, logger);

    if (mainMessageSent) {
        logger.info(`All parts of detailed job analysis sent to ${phoneNumber}`);
        await sendMessage(phoneNumber, "You can say 'hi' to analyze another resume, or ask other questions if supported.");
    } else {
        logger.error(`Failed to send complete detailed job analysis to ${phoneNumber}. Not sending follow-up message.`);
        // Optionally, send a generic error message to the user if the main analysis failed.
        // await sendMessage(phoneNumber, "Sorry, I couldn't send the detailed job analysis due to an issue. Please try again later.");
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

    // It's crucial to handle cases where session might not exist,
    // especially in serverless environments or if an error occurred.
    if (!session) {
        logger.warn(`No session found for ${phoneNumber} during handleFileMessage. Initializing new session and prompting to start over.`);
        // Initialize a new session if it's missing for some reason
        userSessions[phoneNumber] = { state: 'new' };
        await sendMessage(phoneNumber, "Sorry, there was an issue with your session. Please say 'hi' to start over.");
        return;
    }

    logger.info(`Handling file message from ${phoneNumber} (state: ${session.state})`);

    // Valid states to receive a file:
    // 1. 'awaiting_resume': The user has confirmed they want to upload.
    // 2. 'analysis_complete': The user might be sending a new resume for a fresh analysis.
    // Other states ('new', 'awaiting_confirmation') are not expecting a file directly.
    if (session.state !== 'awaiting_resume' && session.state !== 'analysis_complete') {
        let replyMessage = "I wasn't expecting a file right now. ";
        if (session.state === 'new') {
            replyMessage += "Please say 'hi' to begin the resume analysis process.";
        } else if (session.state === 'awaiting_confirmation') {
            replyMessage += "Please reply 'yes' first if you'd like to upload your resume.";
        }
        await sendMessage(phoneNumber, replyMessage);
        return;
    }

    // If session.state is 'analysis_complete', receiving a file implies starting a new analysis.
    // Clear previous analysis data if necessary, or it will be overwritten.
    if (session.state === 'analysis_complete') {
        logger.info(`New resume received while previous analysis was complete for ${phoneNumber}. Starting fresh analysis.`);
        session.lastAnalysis = undefined; // Clear out old analysis
        // The state will naturally transition to 'analysis_complete' again after processing.
    }

    // Determine file type and media ID (original logic from your code)
    let mediaId: string | null = null;
    // ... (rest of your mediaId and fileType logic)
    if (message.image) {
        mediaId = message.image.id;
        logger.info(`Received image with media ID: ${mediaId}`);
    } else if (message.document) {
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

    // Process the resume (try-catch block for download, upload, analyze)
    try {
        await sendMessage(phoneNumber, "Downloading your resume... Please wait.");
        const fileData = await downloadMedia(mediaId);

        if (!fileData) {
            throw new Error(`Failed to download media with ID ${mediaId}`);
        }
        logger.info(`Successfully downloaded media with ID ${mediaId}`);

        await sendMessage(phoneNumber, "Analyzing your resume... This may take a moment.");
        const uploadResponse = await uploadResume(fileData, mediaId);

        if (!uploadResponse.success || !uploadResponse.filePath) {
            throw new Error(uploadResponse.error || "Resume upload failed");
        }

        const analysisResult = await analyzeResume(uploadResponse.filePath);

        if (!analysisResult) {
            throw new Error("Resume analysis failed");
        }
        logger.info(`Analysis complete for ${phoneNumber}`);

        session.lastAnalysis = analysisResult; // Store for 'jobs' command
        await sendAnalysisResult(phoneNumber, analysisResult); // Sends summary
        session.state = 'analysis_complete';

    } catch (error) {
        logger.error(`Error processing resume: ${error instanceof Error ? error.message : String(error)}`);
        await sendMessage(
            phoneNumber,
            "I encountered an error while processing your resume. Please try uploading it again."
        );
        // Optionally, guide the user or reset state, e.g.,
        // session.state = 'awaiting_resume'; // or 'awaiting_confirmation'
    }
}

/**
 * Handle text messages based on user state
 */
async function handleTextMessage(phoneNumber: string, messageText: string): Promise<void> {
    const logger = createLogger('handleTextMessage');
    messageText = messageText.toLowerCase().trim();
    const session = userSessions[phoneNumber];

    // Ensure session exists, crucial for serverless environments
    if (!session) {
        logger.warn(`No session found for ${phoneNumber}. Initializing a new one.`);
        userSessions[phoneNumber] = { state: 'new' };
        // Fall through to 'new' state handling, typically a 'hi' prompt
    }

    logger.info(`Handling text message '${messageText}' from ${phoneNumber} (state: ${session.state})`);

    // Universal commands like 'hi' or 'hello' should reset/start the conversation
    if (messageText === 'hi' || messageText === 'hello') {
        await sendMessage(
            phoneNumber,
            "👋 Welcome to Job Sync AI!\n\n" +
            "I can help analyze your resume and provide personalized feedback. " +
            "Would you like to upload your resume now? (Reply with 'yes' to proceed)"
        );
        session.state = 'awaiting_confirmation';
        return; // Explicit return after handling
    }

    switch (session.state) {
        case 'new': // If session was just initialized or reset to new
            await sendMessage(
                phoneNumber,
                "👋 Welcome to Job Sync AI! Say 'hi' or 'hello' to get started with your resume analysis."
            );
            // State remains 'new' until user says 'hi'
            break;

        case 'awaiting_confirmation':
            if (messageText === 'yes' || messageText === 'y') {
                await sendMessage(
                    phoneNumber,
                    "Great! Please upload your resume as a PDF or image file."
                );
                session.state = 'awaiting_resume';
            } else if (messageText === 'no' || messageText === 'n') {
                await sendMessage(phoneNumber, "Okay, let me know if you change your mind. Say 'hi' to start over.");
                session.state = 'new'; // Or some other appropriate state
            } else {
                await sendMessage(
                    phoneNumber,
                    "Please reply with 'yes' to upload your resume, or 'no' if you don't want to proceed right now. You can always say 'hi' to restart."
                );
            }
            break;

        case 'awaiting_resume':
            // If user sends text instead of a file while awaiting resume
            await sendMessage(
                phoneNumber,
                "I'm waiting for your resume file. Please upload it to continue. If you want to restart, say 'hi'."
            );
            break;

        case 'analysis_complete':
            if (messageText === 'jobs') {
                if (session.lastAnalysis) {
                    await sendDetailedJobAnalysisMessage(phoneNumber, session.lastAnalysis);
                } else {
                    await sendMessage(phoneNumber, "Sorry, I couldn't retrieve your last analysis details. Please try analyzing a resume again by saying 'hi'.");
                    session.state = 'new'; // Reset state
                }
                // State remains 'analysis_complete' so they can ask again or start over
            } else if (messageText === 'yes' || messageText === 'y' || messageText === 'analyze new' || messageText === 'another') {
                // User wants to analyze another resume
                await sendMessage(
                    phoneNumber,
                    "Okay, let's start with a new resume! " +
                    "Would you like to upload your new resume now? (Reply with 'yes' to proceed)"
                );
                session.state = 'awaiting_confirmation';
                session.lastAnalysis = undefined; // Clear previous analysis
            } else {
                await sendMessage(
                    phoneNumber,
                    "Your resume analysis is complete. You can:\n" +
                    "• Say 'jobs' for a detailed job-by-job breakdown.\n" +
                    "• Say 'yes' or 'analyze new' to start over with a different resume."
                );
            }
            break;

        default:
            // This case should ideally not be reached if all states are handled.
            // It can act as a fallback.
            logger.warn(`Unhandled state or message for user ${phoneNumber}: state=${session.state}, message='${messageText}'`);
            await sendMessage(
                phoneNumber,
                "I'm a bit confused. To analyze a resume, please say 'hi' to begin."
            );
            session.state = 'new'; // Reset to a known state
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