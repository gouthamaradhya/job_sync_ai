import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

interface JobPostingFormProps {
  onSubmitSuccess?: () => void;
}

const JobPostingForm: React.FC<JobPostingFormProps> = ({ onSubmitSuccess }) => {
  const { toast } = useToast();
  const [domains, setDomains] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    requirements: '',
    location: '',
    domain: '',
  });

  // Fetch available domains from API
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/domains/');
        if (Array.isArray(response.data)) {
          setDomains(response.data);
        }
      } catch (error) {
        console.error('Error fetching domains:', error);
        toast({
          title: 'Error',
          description: 'Failed to load job domains. Please try again.',
          variant: 'destructive',
        });
      }
    };

    fetchDomains();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDomainChange = (value: string) => {
    setFormData((prev) => ({ ...prev, domain: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await axios.post('http://localhost:8000/upload-job-posting/', formData);

      if (response.status === 201) {
        toast({
          title: 'Job Posted Successfully',
          description: 'Your job posting has been created and is now available for candidates.',
          action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
        });

        // Reset form
        setFormData({
          title: '',
          company: '',
          description: '',
          requirements: '',
          location: '',
          domain: '',
        });

        // Call success callback if provided
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      }
    } catch (error) {
      console.error('Error posting job:', error);
      toast({
        title: 'Error',
        description: 'Failed to create job posting. Please try again.',
        variant: 'destructive',
        action: <ToastAction altText="Retry">Retry</ToastAction>,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Post a New Job</CardTitle>
        <CardDescription>Create a new job posting for candidates to discover</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Senior Frontend Developer"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g., Acme Inc."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Remote, New York, NY"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="domain">Job Domain</Label>
            <Select value={formData.domain} onValueChange={handleDomainChange} required>
              <SelectTrigger>
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
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the role, responsibilities, and what a typical day looks like..."
              rows={5}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              placeholder="List required skills, experience, education, etc."
              rows={3}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post Job'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default JobPostingForm;