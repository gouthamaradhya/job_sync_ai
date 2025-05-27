'use client';
import { useState, FormEvent } from 'react';

export default function UploadJobPosting() {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    requirements: '',
    location: '',
    domain: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setDebugInfo(null);

    try {
      // Check required fields
      if (!formData.title || !formData.company || !formData.description || !formData.domain) {
        throw new Error('Please fill in all required fields');
      }

      // Make a direct request to the Django backend
      // Replace with your actual Django backend URL
      const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const endpoint = `${DJANGO_API_URL}/api/upload-job-posting/`;

      console.log('Sending request to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Ensure CORS is properly handled
          'Accept': 'application/json',
        },
        credentials: 'include', // Include cookies if needed for authentication
        body: JSON.stringify(formData),
      });

      // Log response details for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Check content type to handle non-JSON responses
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
          throw new Error(data.error || data.message || 'Failed to upload job posting');
        }

        console.log('Job posting created:', data);
        setSuccess(true);

        // Reset form
        setFormData({
          title: '',
          company: '',
          description: '',
          requirements: '',
          location: '',
          domain: ''
        });
      } else {
        // Handle HTML or other non-JSON responses
        const text = await response.text();
        console.error('Received non-JSON response:', text.substring(0, 200));
        setDebugInfo(`Received non-JSON response. First 100 characters: ${text.substring(0, 100)}`);
        throw new Error('Server returned an invalid response format. Expected JSON.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error submitting form:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border border-gray-200 rounded-md mt-12 max-w-3xl mx-auto p-10">
      <h2 className="text-xl font-bold mb-6 text-center">Upload Your Job Posting</h2>

      {success && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 rounded-md">
          Job posting uploaded successfully!
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {debugInfo && process.env.NODE_ENV !== 'production' && (
        <div className="mb-6 p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm font-mono overflow-x-auto">
          <p className="font-bold">Debug Info:</p>
          <p>{debugInfo}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label htmlFor="title" className="mb-1 font-medium">
              Job Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
              className="border border-gray-200 rounded-md px-4 py-2"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="company" className="mb-1 font-medium">
              Company Name *
            </label>
            <input
              id="company"
              name="company"
              type="text"
              value={formData.company}
              onChange={handleChange}
              required
              className="border border-gray-200 rounded-md px-4 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label htmlFor="domain" className="mb-1 font-medium">
              Domain/Industry *
            </label>
            <select
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              required
              className="border border-gray-200 rounded-md px-4 py-2"
            >
              <option value="">Select a domain</option>
              <option value="technology">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="retail">Retail</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="location" className="mb-1 font-medium">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              className="border border-gray-200 rounded-md px-4 py-2"
              placeholder="City, State or Remote"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label htmlFor="description" className="mb-1 font-medium">
            Job Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={6}
            className="border border-gray-200 rounded-md px-4 py-2 resize-none"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="requirements" className="mb-1 font-medium">
            Requirements
          </label>
          <textarea
            id="requirements"
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            rows={4}
            className="border border-gray-200 rounded-md px-4 py-2 resize-none"
          />
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className={`bg-gray-600 text-white font-semibold rounded-md px-6 py-3 
              ${loading ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-700'}`}
          >
            {loading ? 'Uploading...' : 'Submit Job Posting'}
          </button>
        </div>
      </form>
    </section>
  );
}