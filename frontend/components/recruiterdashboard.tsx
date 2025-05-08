"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import axios from "axios";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CandidateMatchResult from "@/components/CandidateMatchResult";
import JobPostingForm from "@/components/JobPostingForm";

const recruiterdashboard = () => {
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    
    const [jobDescription, setJobDescription] = useState('');
    const [matchResult, setMatchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState("candidates");

    useEffect(() => {
        setMounted(true);
        
        // Set active tab based on URL parameter if it exists
        if (tabParam === 'post-job' || tabParam === 'candidates') {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setJobDescription(e.target.value);
    };

    const handleMatchCandidates = async () => {
        if (!jobDescription.trim()) {
            toast({
                title: "Error",
                description: "Please enter a job description to match candidates.",
                variant: "destructive",
            });
            return;
        }

        setIsSearching(true);
        setMatchResult(null);

        try {
            const response = await axios.post("http://localhost:8000/match-candidates/", {
                job_description: jobDescription,
            });

            if (response.data) {
                setMatchResult(response.data);
                toast({
                    title: "Candidates Found",
                    description: `Found ${response.data.matched_candidates?.length || 0} potential candidates for your job.`,
                    action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
                });
            }
        } catch (error) {
            console.error("Error matching candidates:", error);
            toast({
                title: "Search Failed",
                description: "Failed to match candidates. Please try again.",
                variant: "destructive",
                action: <ToastAction altText="Retry">Retry</ToastAction>,
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleJobPostSuccess = () => {
        // Switch to the candidates tab after successful job posting
        setActiveTab("candidates");
        
        toast({
            title: "Job Posted Successfully",
            description: "Now you can search for matching candidates.",
            action: <ToastAction altText="Find Candidates">Find Candidates</ToastAction>,
        });
    };

    return (
        <>
            <div className="flex justify-between shadow-md bg-[#9CAFB7] dark:shadow-gray-800 h-auto">
                <div className="flex gap-2 items-center">
                    <Image src="/images/logo.svg" alt="Job Sync AI Logo" width={50} height={50} className="m-2" />
                    <h2 className="font-bold text-xl text-logo">Job Sync AI - Recruiter Portal</h2>
                </div>
                <div className="flex gap-5">
                    <NavigationMenu>
                        <NavigationMenuList>
                            {["Home", "Dashboard", "Jobs", "Settings"].map((item) => (
                                <NavigationMenuItem key={item}>
                                    <Link href={`/${item.toLowerCase()}`} legacyBehavior passHref>
                                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>{item}</NavigationMenuLink>
                                    </Link>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Toggle Theme"
                        className="mr-6"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                        {theme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                    </Button>
                </div>
            </div>

            <div className="flex justify-center mt-20">
                <div className="w-3/4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="candidates">Find Candidates</TabsTrigger>
                            <TabsTrigger value="post-job">Post a Job</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="candidates">
                            <div className="p-6 text-center border border-dashed dark:border-gray-500 light:border-gray-200 mb-6">
                                <h1 className="text-2xl font-bold mb-4">Find Best Matching Candidates</h1>
                                <div className="flex flex-col items-center gap-4">
                                    <Textarea
                                        value={jobDescription}
                                        onChange={handleJobDescriptionChange}
                                        placeholder="Enter job description to find matching candidates..."
                                        className="w-full h-40"
                                    />
                                    <Button 
                                        onClick={handleMatchCandidates} 
                                        disabled={isSearching || !jobDescription.trim()}
                                        className="mt-4"
                                    >
                                        {isSearching ? "Searching..." : "Find Matching Candidates"}
                                    </Button>
                                </div>
                            </div>
                            <CandidateMatchResult
                                matchResult={matchResult}
                                handleMatchCandidates={handleMatchCandidates}
                            />
                        </TabsContent>
                        
                        <TabsContent value="post-job">
                            <JobPostingForm onSubmitSuccess={handleJobPostSuccess} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </>
    );
};

export default recruiterdashboard;