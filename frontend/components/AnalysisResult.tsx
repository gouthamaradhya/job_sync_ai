import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    AlertCircle,
    CheckCircle2,
    Briefcase,
    FileText,
    Star,
    Award,
    XCircle,
    BookOpen,
    ChevronRight,
    GraduationCap
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface AnalysisProps {
    analysisResult: any;
    handleAnalyzeResume: () => void;
}

// Parse job analysis markdown into structured data
const parseJobAnalysis = (markdownText: string) => {
    const jobs = [];
    const jobSections = markdownText.split('### Job');

    // Skip the first empty section if exists
    for (let i = 1; i < jobSections.length; i++) {
        const section = jobSections[i];

        // Extract job title
        const titleMatch = section.match(/(\d+): ([^\n]+)/);
        const jobNumber = titleMatch ? titleMatch[1] : i;
        const jobTitle = titleMatch ? titleMatch[2] : `Job ${i}`;

        // Extract match assessment
        const matchAssessmentMatch = section.match(/#### Match Assessment\s*([^\n]+)/);
        const matchAssessment = matchAssessmentMatch ? matchAssessmentMatch[1] : "";

        // Determine match level
        let matchLevel = "Low";
        let matchColor = "bg-red-100 text-red-700";
        if (matchAssessment.includes("well") && !matchAssessment.includes("not")) {
            matchLevel = "High";
            matchColor = "bg-green-100 text-green-700";
        } else if (matchAssessment.includes("moderately")) {
            matchLevel = "Moderate";
            matchColor = "bg-yellow-100 text-yellow-700";
        }

        // Extract key skills
        const keySkillsMatch = section.match(/#### Key Matching Skills\s*([\s\S]*?)(?=####)/);
        const keySkills = keySkillsMatch
            ? keySkillsMatch[1]
                .split('*')
                .filter(item => item.trim())
                .map(item => item.trim())
            : [];

        // Extract missing skills
        const missingSkillsMatch = section.match(/#### Missing Skills\s*([\s\S]*?)(?=####)/);
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

        jobs.push({
            id: jobNumber,
            title: jobTitle,
            matchLevel,
            matchColor,
            matchAssessment,
            keySkills,
            missingSkills,
            recommendedLearning
        });
    }

    return jobs;
};

const ResumeAnalysisResult: React.FC<AnalysisProps> = ({ analysisResult, handleAnalyzeResume }) => {
    // State for email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [emailSubmitted, setEmailSubmitted] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [parsedJobs, setParsedJobs] = useState<any[]>([]);
    const [activeJobId, setActiveJobId] = useState<string>("1");

    console.log("Analysis Result:", analysisResult);

    // Check if analysisResult exists and has job_analysis property
    const hasJobAnalysis = analysisResult && analysisResult.job_analysis;
    const hasMatchedJobs = analysisResult && analysisResult.matched_jobs && analysisResult.matched_jobs.length > 0;

    useEffect(() => {
        if (hasJobAnalysis) {
            const jobs = parseJobAnalysis(analysisResult.job_analysis);
            setParsedJobs(jobs);
            if (jobs.length > 0) {
                setActiveJobId(jobs[0].id.toString());
            }
        }
    }, [analysisResult]);

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
        console.log(`Sending feedback form to ${email} for job: ${selectedJob?.domain}`);

        setEmailSubmitted(true);

        // Redirect to the application link after collecting email
        if (selectedJob?.application_link) {
            window.open(selectedJob.application_link, '_blank');
        }

        // Reset after 3 seconds
        setTimeout(() => {
            setEmailSubmitted(false);
            setEmailDialogOpen(false);
            setEmail('');
        }, 3000);
    };

    // Get match badge variant
    const getMatchBadgeVariant = (matchLevel: string) => {
        switch (matchLevel) {
            case "High": return "bg-green-100 text-green-700 border-green-200";
            case "Moderate": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            default: return "bg-red-100 text-red-700 border-red-200";
        }
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
                    {/* Detailed Job Analysis Card with Modern UI */}
                    {hasJobAnalysis && parsedJobs.length > 0 && (
                        <Card className="w-full shadow-lg border-t-4 border-gray-600 overflow-hidden transition-all duration-300 hover:shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200">
                                <div className="flex items-center">
                                    <Briefcase className="h-6 w-6 text-gray-700 mr-2" />
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-gray-800">Job Opportunities & Skills Analysis</CardTitle>
                                        <CardDescription className="text-gray-600">Detailed breakdown of job matches and skill requirements</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <div className="flex flex-col md:flex-row">
                                {/* Job Selection Sidebar */}
                                <div className="w-full md:w-1/3 border-r border-gray-200 bg-gray-50">
                                    <div className="p-4">
                                        <h3 className="text-lg font-medium text-gray-800 mb-4">Job Opportunities</h3>
                                        <div className="space-y-2">
                                            {parsedJobs.map((job) => (
                                                <div
                                                    key={job.id}
                                                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex justify-between items-center ${activeJobId === job.id.toString() ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-100'}`}
                                                    onClick={() => setActiveJobId(job.id.toString())}
                                                >
                                                    <div>
                                                        <p className="font-medium text-gray-800">{job.title}</p>
                                                        <div className="mt-1">
                                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getMatchBadgeVariant(job.matchLevel)}`}>
                                                                {job.matchLevel} Match
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={`h-5 w-5 ${activeJobId === job.id.toString() ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Job Details Content */}
                                <div className="w-full md:w-2/3 p-6">
                                    {parsedJobs.map((job) => {
                                        if (activeJobId === job.id.toString()) {
                                            return (
                                                <div key={job.id} className="space-y-6">
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-800 mb-2">Job {job.id}: {job.title}</h2>
                                                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getMatchBadgeVariant(job.matchLevel)}`}>
                                                            {job.matchLevel} Match
                                                        </div>
                                                        <p className="text-gray-600 mt-2">{job.matchAssessment}</p>
                                                    </div>

                                                    <Tabs defaultValue="skills" className="w-full">
                                                        <TabsList className="grid grid-cols-3">
                                                            <TabsTrigger value="skills">
                                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                                Matching Skills
                                                            </TabsTrigger>
                                                            <TabsTrigger value="missing">
                                                                <XCircle className="h-4 w-4 mr-1" />
                                                                Missing Skills
                                                            </TabsTrigger>
                                                            <TabsTrigger value="learning">
                                                                <BookOpen className="h-4 w-4 mr-1" />
                                                                Learning Path
                                                            </TabsTrigger>
                                                        </TabsList>

                                                        <TabsContent value="skills" className="mt-4">
                                                            <Card>
                                                                <CardHeader className="pb-2">
                                                                    <CardTitle className="text-lg font-medium text-green-700">
                                                                        <div className="flex items-center">
                                                                            <CheckCircle2 className="h-5 w-5 mr-2" />
                                                                            Key Matching Skills
                                                                        </div>
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <ul className="space-y-2">
                                                                        {job.keySkills.map((skill: string, index: number) => (
                                                                            <li key={index} className="flex items-start">
                                                                                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                                                <span>{skill}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </CardContent>
                                                            </Card>
                                                        </TabsContent>

                                                        <TabsContent value="missing" className="mt-4">
                                                            <Card>
                                                                <CardHeader className="pb-2">
                                                                    <CardTitle className="text-lg font-medium text-red-700">
                                                                        <div className="flex items-center">
                                                                            <XCircle className="h-5 w-5 mr-2" />
                                                                            Missing Skills
                                                                        </div>
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <ul className="space-y-2">
                                                                        {job.missingSkills.map((skill: string, index: number) => (
                                                                            <li key={index} className="flex items-start">
                                                                                <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                                                                                <span>{skill}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </CardContent>
                                                            </Card>
                                                        </TabsContent>

                                                        <TabsContent value="learning" className="mt-4">
                                                            <Card>
                                                                <CardHeader className="pb-2">
                                                                    <CardTitle className="text-lg font-medium text-blue-700">
                                                                        <div className="flex items-center">
                                                                            <GraduationCap className="h-5 w-5 mr-2" />
                                                                            Recommended Learning
                                                                        </div>
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <ul className="space-y-2">
                                                                        {job.recommendedLearning.map((item: string, index: number) => (
                                                                            <li key={index} className="flex items-start">
                                                                                <BookOpen className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                                                                <span>{item}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </CardContent>
                                                            </Card>
                                                        </TabsContent>
                                                    </Tabs>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>

                            <CardFooter className="bg-gray-50 border-t">
                                <p className="text-sm text-gray-500">AI-powered analysis based on your resume and matched jobs</p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* For backward compatibility, fallback to original markdown display */}
                    {hasJobAnalysis && parsedJobs.length === 0 && (
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
                </div>
            )}

            {/* Matched Jobs List */}
            {hasMatchedJobs && (
                <Card className="w-full shadow-lg border-t-4 border-stone-600 overflow-hidden transition-all duration-300 hover:shadow-xl mt-6">
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
                                    <h3 className="font-bold text-lg text-black mb-2">{job.domain || 'Job Opportunity'}</h3>
                                    <div className="mt-4 flex justify-between items-center">
                                        <Button
                                            onClick={() => window.open(job.application_link, '_blank')
                                            }
                                            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-4 py-1 rounded-full shadow transition-all duration-300"
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
            )
            }
        </div >
    )
}




export default ResumeAnalysisResult;