import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CandidateMatchProps {
    matchResult: any;
    handleMatchCandidates: () => void;
}

const CandidateMatchResult: React.FC<CandidateMatchProps> = ({ matchResult, handleMatchCandidates }) => {
    // Check if matchResult exists and has candidate_analysis property
    const hasCandidateAnalysis = matchResult && matchResult.candidate_analysis;
    const hasMatchedCandidates = matchResult && matchResult.matched_candidates && matchResult.matched_candidates.length > 0;

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="flex justify-center">
                <Button onClick={handleMatchCandidates} className="mt-4">
                    Find Matching Candidates
                </Button>
            </div>

            {matchResult && (
                <div className="mt-6 w-full space-y-6">
                    {/* AI Analysis Card with Markdown */}
                    {hasCandidateAnalysis && (
                        <Card className="w-full shadow-lg">
                            <CardHeader>
                                <CardTitle>Candidate Analysis</CardTitle>
                                <CardDescription>AI-powered ranking and evaluation of candidates</CardDescription>
                            </CardHeader>
                            <CardContent className="prose max-w-none">
                                <ReactMarkdown>
                                    {matchResult.candidate_analysis}
                                </ReactMarkdown>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-gray-500">AI-powered analysis based on your job description and matched candidate profiles.</p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Matched Candidates List */}
                    {hasMatchedCandidates && (
                        <Card className="w-full shadow-lg">
                            <CardHeader>
                                <CardTitle>Matched Candidates</CardTitle>
                                <CardDescription>Top candidates that match your job requirements</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {matchResult.matched_candidates.map((candidate: any, index: number) => (
                                        <div key={candidate.resume_id || index} className="p-4 border rounded-md">
                                            <h3 className="font-bold text-lg">{candidate.name || `Candidate ${index + 1}`}</h3>
                                            <div className="mt-2">
                                                <p className="text-sm line-clamp-3">
                                                    {candidate.text ? candidate.text.substring(0, 200) + '...' : 'No resume text available'}
                                                </p>
                                            </div>
                                            {candidate.similarity && (
                                                <p className="mt-2 text-sm text-gray-500">
                                                    Match score: {Math.round(candidate.similarity * 100)}%
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-gray-500">Found {matchResult.matched_candidates.length} matching candidates.</p>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default CandidateMatchResult;