import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AnalysisProps {
    analysisResult: any;
    handleAnalyzeResume: () => void;
}

const ResumeAnalysisResult: React.FC<AnalysisProps> = ({ analysisResult, handleAnalyzeResume }) => {
    // Check if analysisResult exists and has job_analysis property
    const hasJobAnalysis = analysisResult && analysisResult.job_analysis;
    const hasMatchedJobs = analysisResult && analysisResult.matched_jobs && analysisResult.matched_jobs.length > 0;

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="flex justify-center">
                <Button onClick={handleAnalyzeResume} className="mt-4">
                    Analyze Resume
                </Button>
            </div>

            {analysisResult && (
                <div className="mt-6 w-full space-y-6">
                    {/* Basic Analysis Card */}
                    <Card className="w-full shadow-lg">
                        <CardHeader>
                            <CardTitle>Resume Analysis</CardTitle>
                            <CardDescription>Details from your uploaded resume</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analysisResult.predicted_job && (
                                <p className="mb-4"><strong>Predicted Job:</strong> {analysisResult.predicted_job}</p>
                            )}
                            {analysisResult.skills && (
                                <p className="mb-4"><strong>Current Skills:</strong> {analysisResult.skills}</p>
                            )}
                            {analysisResult.skills_required && (
                                <p className="mb-4"><strong>Skills Required:</strong> {Array.isArray(analysisResult.skills_required)
                                    ? analysisResult.skills_required.join(", ")
                                    : analysisResult.skills_required}
                                </p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-gray-500">Basic analysis completed.</p>
                        </CardFooter>
                    </Card>

                    {/* Detailed Job Analysis Card with Markdown */}
                    {hasJobAnalysis && (
                        <Card className="w-full shadow-lg">
                            <CardHeader>
                                <CardTitle>Job Opportunities & Skills Analysis</CardTitle>
                                <CardDescription>Detailed breakdown of job matches and skill requirements</CardDescription>
                            </CardHeader>
                            <CardContent className="prose max-w-none">
                                <ReactMarkdown>
                                    {analysisResult.job_analysis}
                                </ReactMarkdown>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-gray-500">AI-powered analysis based on your resume and matched jobs.</p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Matched Jobs List */}
                    {hasMatchedJobs && (
                        <Card className="w-full shadow-lg">
                            <CardHeader>
                                <CardTitle>Matched Job Opportunities</CardTitle>
                                <CardDescription>Jobs that match your skills and experience</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {analysisResult.matched_jobs.map((job: any, index: any) => (
                                        <div key={job.job_id || index} className="p-4 border rounded-md">
                                            <h3 className="font-bold text-lg">{job.domain || 'Job Opportunity'}</h3>
                                            {job.application_link && (
                                                <p className="mt-2">
                                                    <a
                                                        href={job.application_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        Apply Now
                                                    </a>
                                                </p>
                                            )}
                                            {job.similarity && (
                                                <p className="mt-2 text-sm text-gray-500">
                                                    Match score: {Math.round(job.similarity * 100)}%
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-gray-500">Found {analysisResult.matched_jobs.length} matching job opportunities.</p>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default ResumeAnalysisResult;