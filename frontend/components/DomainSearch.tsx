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
import { Loader2, Briefcase, MapPin, Calendar, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JobListing {
  id: number;
  title: string;
  contact_info: string;
  description: string;
  domain: string;
  application_link: string;
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
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [searchCount, setSearchCount] = useState<number>(0);

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
      setSearchCount(prevCount => prevCount + 1);
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

  const formatDescription = (description: string) => {
    const formattedDescription = description.replaceAll("\\n", "\n");
    return formattedDescription;
  };

  const extractHighlights = (description: string) => {
    const formattedDescription = formatDescription(description);
    const lines = formattedDescription.split('\n');
    const bulletPoints = lines.filter(line => line.trim().startsWith('*'));
    return bulletPoints.length > 0 ? bulletPoints : lines.slice(0, 3);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <h1 className="text-3xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Career Explorer</h1>
      <p className="text-gray-500 dark:text-gray-400 text-center mb-8">Find your next opportunity in your preferred domain</p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
        <Select value={selectedDomain} onValueChange={handleDomainChange}>
          <SelectTrigger className="w-full sm:w-[280px] shadow-sm">
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

        <Button
          onClick={searchJobs}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            "Discover Jobs"
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {jobs.length > 0 ? (
          <motion.div
            key={`search-${searchCount}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {jobs.map((job) => {
              const highlights = extractHighlights(job.description);

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: job.id * 0.05 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow duration-300 overflow-hidden border-t-4 border-t-blue-500 flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge className="mb-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800">
                          {job.domain}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedJob(job)}>
                          <ExternalLink size={16} />
                        </Button>
                      </div>
                      <CardTitle className="text-lg line-clamp-2">{job.title || "Position Available"}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin size={14} className="mr-1 text-gray-500" />
                        {job.contact_info || "Remote / Various Locations"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-2 flex-grow">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Highlights:</h3>
                        <ul className="space-y-1">
                          {highlights.slice(0, 3).map((highlight, index) => (
                            <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex">
                              <span className="mr-2">•</span>
                              <span className="line-clamp-1">{highlight.replace('*', '').trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 flex justify-between items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900"
                        onClick={() => setSelectedJob(job)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => window.open(job.application_link, "_blank")}
                      >
                        Apply Now
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          !loading &&
          selectedDomain && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Briefcase className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No jobs found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                We couldn't find any jobs in the {selectedDomain} domain. Please try another domain or check back later.
              </p>
            </motion.div>
          )
        )}

        {!selectedDomain && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Briefcase className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Start your job search</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Select a domain and click "Discover Jobs" to view available positions that match your interests.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Details Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge className="mb-2">{selectedJob?.domain}</Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-8 mr-5"
                onClick={() => selectedJob && window.open(selectedJob.application_link, "_blank")}
              >
                Apply Now <ExternalLink size={14} className="mr-1" />
              </Button>
            </div>
            <DialogTitle className="text-xl">{selectedJob?.title || "Job Details"}</DialogTitle>
            <div className="flex items-center gap-4 mt-1 text-gray-500">
              <div className="flex items-center">
                <MapPin size={16} className="mr-1" />
                <span className="text-sm">{selectedJob?.contact_info}</span>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-grow mt-4 pr-4 overflow-y-scroll">
            <div className="prose dark:prose-invert max-w-none text-sm">
              {selectedJob && (
                <ReactMarkdown>{formatDescription(selectedJob.description)}</ReactMarkdown>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
            <Button
              onClick={() => selectedJob && window.open(selectedJob.application_link, "_blank")}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              Apply for this Position
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DomainSearch;