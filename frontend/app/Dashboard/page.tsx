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
import { Moon, Sun } from "lucide-react";
import { Toggle } from "@radix-ui/react-toggle";
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

const Dashboard = () => {
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setAnalysisResult(null);
    }, [selectedFile]);

    if (!mounted) return null; // Prevents hydration mismatch

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
            <div className="flex justify-between shadow-md bg-[#9CAFB7] dark:shadow-gray-800 h-auto">
                <div className="flex gap-2 items-center">
                    <Image src="/images/logo.svg" alt="Job Sync AI Logo" width={50} height={50} className="m-2" />
                    <h2 className="font-bold text-xl text-logo">Job Sync AI</h2>
                </div>
                <div className="flex gap-5">

                    <NavigationMenu>
                        <NavigationMenuList>
                            {["Home", "About", "Contact", "Help"].map((item) => (
                                <NavigationMenuItem key={item}>
                                    <Link href={`/${item}`} legacyBehavior passHref>
                                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>{item}</NavigationMenuLink>
                                    </Link>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
            </div >

            <div className="flex justify-center mt-20">
                <div className="w-3/4">
                    <div className="p-6 text-center border border-dashed dark:border-gray-500 light:border-gray-200">
                        <h1 className="text-2xl font-bold mb-4">Upload Your File</h1>
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
                </div>
            </div>
        </>
    );
};

export default Dashboard;
