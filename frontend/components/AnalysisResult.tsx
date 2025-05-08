import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Briefcase, FileText, Star, Award } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AnalysisProps {
    analysisResult: any;
    handleAnalyzeResume: () => void;
}

const ResumeAnalysisResult: React.FC<AnalysisProps> = ({ analysisResult, handleAnalyzeResume }) => {
    // State for email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [emailSubmitted, setEmailSubmitted] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    
    // Check if analysisResult exists and has job_analysis property
    const hasJobAnalysis = analysisResult && analysisResult.job_analysis;
    const hasMatchedJobs = analysisResult && analysisResult.matched_jobs && analysisResult.matched_jobs.length > 0;

    const handleApplyClick = (job: any) => {
        setSelectedJob(job);
        setEmailDialogOpen(true);
    };

    const handleEmailSubmit = () => {
        // Email validation
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            return;
        }

        // Here you would typically send the email with the Google Form link
        // For demonstration, we're just showing a success message
        console.log(`Sending feedback form to ${email} for job: ${selectedJob?.domain}`);
        
        // In a real application, you would make an API call here
        // Example: sendFeedbackForm(email, selectedJob.job_id);
        
        setEmailSubmitted(true);
        
        // Redirect to the application link after collecting email
        if (selectedJob?.application_link) {
            // Optional: Open in a new tab
            window.open(selectedJob.application_link, '_blank');
        }
        
        // Reset after 3 seconds
        setTimeout(() => {
            setEmailSubmitted(false);
            setEmailDialogOpen(false);
            setEmail('');
        }, 3000);
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 bg-gradient-to-b from-slate-50 to-white rounded-lg">
            <div className="flex justify-center mb-6">
                <Button 
                    onClick={handleAnalyzeResume} 
                    className="mt-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white px-8 py-2 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                    <FileText className="mr-2 h-5 w-5" />
                    Analyze Resume
                </Button>
            </div>

            {analysisResult && (
                <div className="mt-6 w-full space-y-8">
                    {/* Basic Analysis Card */}
                    <Card className="w-full shadow-lg border-t-4 border-slate-600 overflow-hidden transition-all duration-300 hover:shadow-xl">
                        <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-200">
                            <div className="flex items-center">
                                <FileText className="h-6 w-6 text-slate-700 mr-2" />
                                <div>
                                    <CardTitle className="text-2xl font-bold text-slate-800">Resume Analysis</CardTitle>
                                    <CardDescription className="text-slate-600">Details from your uploaded resume</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {analysisResult.predicted_job && (
                                <div className="mb-6 flex items-start">
                                    <Briefcase className="h-5 w-5 text-slate-600 mr-3 mt-1" />
                                    <div>
                                        <p className="font-semibold text-slate-700">Predicted Job</p>
                                        <p className="text-lg text-slate-900">{analysisResult.predicted_job}</p>
                                    </div>
                                </div>
                            )}
                            
                            {analysisResult.skills && (
                                <div className="mb-6 flex items-start">
                                    <Star className="h-5 w-5 text-slate-600 mr-3 mt-1" />
                                    <div>
                                        <p className="font-semibold text-slate-700">Current Skills</p>
                                        <p className="text-slate-900">{analysisResult.skills}</p>
                                    </div>
                                </div>
                            )}
                            
                            {analysisResult.skills_required && (
                                <div className="mb-2 flex items-start">
                                    <Award className="h-5 w-5 text-slate-600 mr-3 mt-1" />
                                    <div>
                                        <p className="font-semibold text-slate-700">Skills Required</p>
                                        <p className="text-slate-900">{Array.isArray(analysisResult.skills_required)
                                            ? analysisResult.skills_required.join(", ")
                                            : analysisResult.skills_required}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t">
                            <p className="text-sm text-slate-500">Analysis based on your resume content</p>
                        </CardFooter>
                    </Card>

                    {/* Detailed Job Analysis Card with Markdown */}
                    {hasJobAnalysis && (
                        <Card className="w-full shadow-lg border-t-4 border-gray-600 overflow-hidden transition-all duration-300 hover:shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200">
                                <div className="flex items-center">
                                    <CheckCircle2 className="h-6 w-6 text-gray-700 mr-2" />
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-gray-800">Job Opportunities & Skills Analysis</CardTitle>
                                        <CardDescription className="text-gray-600">Detailed breakdown of job matches and skill requirements</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="prose max-w-none pt-6">
                                <ReactMarkdown>
                                    {analysisResult.job_analysis}
                                </ReactMarkdown>
                            </CardContent>
                            <CardFooter className="bg-gray-50 border-t">
                                <p className="text-sm text-gray-500">AI-powered analysis based on your resume and matched jobs</p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Matched Jobs List */}
                    {hasMatchedJobs && (
                        <Card className="w-full shadow-lg border-t-4 border-stone-600 overflow-hidden transition-all duration-300 hover:shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-stone-100 to-stone-200">
                                <div className="flex items-center">
                                    <Briefcase className="h-6 w-6 text-stone-700 mr-2" />
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-stone-800">Matched Job Opportunities</CardTitle>
                                        <CardDescription className="text-stone-600">Jobs that match your skills and experience</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analysisResult.matched_jobs.map((job: any, index: any) => (
                                        <div key={job.job_id || index} className="p-5 border rounded-lg bg-white shadow-md hover:shadow-lg transition-all duration-300">
                                            <h3 className="font-bold text-lg text-stone-700 mb-2">{job.domain || 'Job Opportunity'}</h3>
                                            <div className="mt-4 flex justify-between items-center">
                                                <Button
                                                    onClick={() => handleApplyClick(job)}
                                                    className="bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-700 hover:to-stone-800 text-white px-4 py-1 rounded-full shadow transition-all duration-300"
                                                >
                                                    Apply Now
                                                </Button>
                                                {job.similarity && (
                                                    <div className="text-sm bg-stone-100 text-stone-700 px-3 py-1 rounded-full font-medium">
                                                        Match: {Math.round(job.similarity * 100)}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-stone-50 border-t">
                                <p className="text-sm text-stone-500">Found {analysisResult.matched_jobs.length} matching job opportunities</p>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            )}

            Email Collection Dialog
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{emailSubmitted ? "Thank You!" : "Enter Your Email"}</DialogTitle>
                        <DialogDescription>
                            {emailSubmitted 
                                ? "We've sent you a feedback form. You'll be redirected to the application page." 
                                : "We'll send you a feedback form to improve our job matching."}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {emailSubmitted ? (
                        <div className="flex items-center justify-center py-4">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        placeholder="your.email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="col-span-3"
                                        type="email"
                                    />
                                </div>
                                
                                {email && !/\S+@\S+\.\S+/.test(email) && (
                                    <Alert variant="destructive" className="col-span-4 col-start-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Please enter a valid email address.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                            
                            <DialogFooter className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleEmailSubmit}
                                    disabled={!email || !/\S+@\S+\.\S+/.test(email)}
                                    className="bg-gradient-to-r from-slate-600 to-stone-700"
                                >
                                    Submit
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ResumeAnalysisResult;