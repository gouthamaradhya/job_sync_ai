"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JobListing {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  domain: string;
  posted_date: string;
  // Add other job fields as needed
}

const DomainSearch = () => {
  const { toast } = useToast();
  const [domains, setDomains] = useState<string[]>([
    "Software Development",
    "Data Science",
    "Marketing",
    "Finance",
    "Healthcare",
    "Design",
    "Education",
    "Engineering",
    "Customer Service",
    "Human Resources",
  ]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDomainChange = (value: string) => {
    setSelectedDomain(value);
  };

  const searchJobs = async () => {
    if (!selectedDomain) {
      toast({
        title: "Please select a domain",
        description: "You need to select a domain to search for jobs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:8000/api/jobs/domain/?domain=${selectedDomain}`
      );
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs by domain:", error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border border-dashed dark:border-gray-500 light:border-gray-200 mt-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Browse Jobs by Domain</h1>
      
      <div className="flex gap-4 justify-center mb-8">
        <Select value={selectedDomain} onValueChange={handleDomainChange}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a domain" />
          </SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (
              <SelectItem key={domain} value={domain}>
                {domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button onClick={searchJobs} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            "Search Jobs"
          )}
        </Button>
      </div>

      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <Card key={job.id} className="h-full">
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <CardDescription>{job.company} • {job.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {job.description.length > 150
                    ? `${job.description.substring(0, 150)}...`
                    : job.description}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-gray-500">
                  Posted: {new Date(job.posted_date).toLocaleDateString()}
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        !loading && selectedDomain && (
          <p className="text-center text-gray-500">
            No jobs found for this domain. Please try another domain.
          </p>
        )
      )}

      {!selectedDomain && !loading && (
        <p className="text-center text-gray-500">
          Select a domain and click "Search Jobs" to view available positions.
        </p>
      )}
    </div>
  );
};

export default DomainSearch;