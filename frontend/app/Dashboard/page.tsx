"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import { Bell, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import ResumeAnalysisResult from "@/components/AnalysisResult";
import DomainSearch from "@/components/DomainSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";

const FilePreview = ({ file }: { file: File | null }) => {
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }, [file]);

    if (!file) return null;

    return (
        <div className="mt-4">
            {file.type.startsWith("image/") && preview ? (
                <Image src={preview} alt="Preview" width={200} height={200} className="max-w-full max-h-64" />
            ) : file.type === "application/pdf" ? (
                <p className="text-sm">PDF selected: {file.name}</p>
            ) : (
                <p>Unsupported file type.</p>
            )}
        </div>
    );
};

const dashboard = () => {
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [mounted, setMounted] = useState(false);
    const [notifications, setNotifications] = useState(2);

    useEffect(() => {
        setMounted(true);
        setAnalysisResult(null);
    }, [selectedFile]);

    if (!mounted) return null; // Prevents hydration mismatch

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;

        if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
            setSelectedFile(file);
        } else {
            alert("Only images and PDF files are allowed.");
            setSelectedFile(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await axios.post("http://localhost:8000/upload_resume/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.status === 201) {
                toast({
                    title: "File Uploaded Successfully",
                    description: `Your file "${selectedFile.name}" was uploaded successfully.`,
                    action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
                });
            } else {
                console.error("File upload failed.");
            }
        } catch (error) {
            console.error("Error during file upload:", error);
            toast({
                title: "Upload Failed",
                description: "An error occurred during file upload. Please try again.",
                action: <ToastAction altText="Retry">Retry</ToastAction>,
                variant: "destructive",
            });
        }
    };

    const handleAnalyzeResume = async () => {
        const response = await fetch('http://localhost:8000/analyze-resume');
        const data = await response.json();
        setAnalysisResult(data);
    };

    return (
        <>
            {/* Enhanced professional navbar */}
            <div className="flex justify-between items-center shadow-lg bg-white dark:bg-gray-900 h-16 sticky top-0 z-50 px-4 md:px-8 border-b border-gray-100 dark:border-gray-800 transition-all duration-300">
                <div className="flex gap-3 items-center">
                    <div className="relative group">
                        <Image
                            src="/images/logo.svg"
                            alt="Job Sync AI Logo"
                            width={42}
                            height={42}
                            className="m-1 transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute -bottom-1 left-1/2 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" style={{ transform: 'translateX(-50%)' }}></div>
                    </div>
                    <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Job Sync AI</h2>
                </div>

                <div className="flex items-center gap-5">
                    <NavigationMenu className="hidden md:block">
                        <NavigationMenuList>
                            {["Home", "About", "Contact", "Help"].map((item) => (
                                <NavigationMenuItem key={item}>
                                    <Link href={`/${item.toLowerCase()}`} legacyBehavior passHref>
                                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                            {item}
                                        </NavigationMenuLink>
                                    </Link>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5 text-yellow-400" />
                            ) : (
                                <Moon className="h-5 w-5 text-gray-700" />
                            )}
                        </Button>

                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                {notifications > 0 && (
                                    <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        {notifications}
                                    </span>
                                )}
                            </Button>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="rounded-full p-0 h-10 w-10 overflow-hidden">
                                    <Avatar>
                                        <AvatarImage src="/images/job-seeker-avatar.jpg" alt="Job Seeker" />
                                        <AvatarFallback className="bg-blue-600 text-white">JS</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium">John Seeker</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">john@example.com</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>Settings</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500">Log out</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="flex justify-center mt-20">
                <div className="w-3/4">
                    <Tabs defaultValue="resume" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="resume">Resume Analysis</TabsTrigger>
                            <TabsTrigger value="domain">Domain Search</TabsTrigger>
                        </TabsList>

                        <TabsContent value="resume">
                            <div className="p-6 text-center border border-dashed dark:border-gray-500 light:border-gray-200">
                                <h1 className="text-2xl font-bold mb-4">Upload Your Resume</h1>
                                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                                    <Input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        className="border p-2 w-1/3"
                                    />
                                    {selectedFile && <FilePreview file={selectedFile} />}
                                    <Button type="submit" disabled={!selectedFile} className="mt-4">
                                        Upload
                                    </Button>
                                </form>
                            </div>
                            <ResumeAnalysisResult
                                analysisResult={analysisResult}
                                handleAnalyzeResume={handleAnalyzeResume}
                            />
                        </TabsContent>

                        <TabsContent value="domain">
                            <DomainSearch />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </>
    );
};

export default dashboard;