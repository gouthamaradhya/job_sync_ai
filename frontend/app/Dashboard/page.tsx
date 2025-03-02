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
} from "@/components/ui/card"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"


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
                <Image src={preview} alt="Preview" className="max-w-full max-h-64" />
            ) : file.type === "application/pdf" ? (
                <p className="text-sm">PDF selected: {file.name}</p>
            ) : (
                <p>Unsupported file type.</p>
            )}
        </div>
    );
};

const Dashboard = () => {
    const { toast } = useToast()
    const { theme, setTheme } = useTheme();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    /* eslint-disable */
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    /* eslint-enable */




    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;

        if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
            setSelectedFile(file);
        } else {
            alert("Only images and PDF files are allowed.");
            setSelectedFile(null);
        }
    };
    useEffect(() => {
        setAnalysisResult(null);
    }, [selectedFile])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await axios.post("http://localhost:8000/upload_resume/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (response.status === 201) {
                console.log("File uploaded successfully!");
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
                variant: "destructive", // Optional: styling for error notifications
            });
        }
    };

    const handleAnalyzeResume = async () => {
        try {
            const response = await axios.get("http://localhost:8000/analyze-resume/");

            if (response.status === 200) {
                setAnalysisResult(JSON.parse(response.data));
            } else {
                alert("Analysis failed.");
            }
        } catch (error) {
            console.error("Error during resume analysis:", error);
            alert("An error occurred while analyzing the resume.");
        }
    };

    return (
        <>
            <div className="flex justify-between shadow-md dark:shadow-gray-800 h-12">
                <div>
                    {theme === "dark" ? (
                        <Image
                            src="/images/logo_dark.png"
                            alt="logo"
                            width={100}
                            height={10}
                            style={{ objectFit: "fill", width: "100px", height: "30px" }}
                            className="mt-2  ml-2"
                        />
                    ) : (
                        <Image
                            src="/images/logo_light.png"
                            alt="logo"
                            width={100}
                            height={10}
                            style={{ objectFit: "fill", width: "100px", height: "30px" }}
                            className="mt-2"
                        />
                    )}
                </div>
                <div className="flex gap-5">
                    <Toggle onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                        {theme === "dark" ? (
                            <Sun className="h-[1.3rem] w-[1.3rem]" />
                        ) : (
                            <Moon className="h-[1.3rem] w-[1.3rem]" />
                        )}
                        <span className="sr-only">Toggle theme</span>
                    </Toggle>
                    <NavigationMenu>
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <Link href="/">
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        Home
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/About">
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        About
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/contact">
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        Contact
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/help">
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        Help
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
            </div>

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
                    <div className="flex justify-center">
                        <Button onClick={handleAnalyzeResume} className="mt-4">
                            Analyze Resume
                        </Button>
                    </div>
                    {console.log(analysisResult)}
                    {analysisResult && (
                        <div className="mt-4 w-full">
                            <Card className="w-full mx-auto shadow-lg">
                                <CardHeader>
                                    <CardTitle>Analysis Result</CardTitle>
                                    <CardDescription>Details from the uploaded resume</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p >
                                        <strong>Predicted Job:</strong> {analysisResult.predicted_job}
                                    </p>
                                    <p className="mt-4">
                                        <strong>Current Skills:</strong> {analysisResult.skills}
                                    </p>
                                    <p className="mt-4">
                                        <strong>Skills Required:</strong> {analysisResult.skills_required.join(", ")}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <p className="text-sm text-gray-500">Analysis completed successfully.</p>
                                </CardFooter>
                            </Card>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
};

export default Dashboard;
