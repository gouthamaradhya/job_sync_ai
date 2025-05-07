'use client';
import { useState } from 'react';
import SearchCandidates from '@/components/recruiter/SearchCandidates';
import UploadJobPosting from '@/components/recruiter/UploadJobPosting';

export default function RecruiterTabs() {
  const [activeTab, setActiveTab] = useState<'search' | 'upload'>('search');

  return (
    <div className="max-w-4xl mx-auto mt-20 px-4">
      <div className="flex border border-gray-200 rounded-md overflow-hidden max-w-3xl mx-auto">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 font-semibold border-r border-gray-200 ${
            activeTab === 'search' ? 'bg-white text-black' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Search Candidates
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 font-semibold ${
            activeTab === 'upload' ? 'bg-white text-black' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Upload Job Posting
        </button>
      </div>

      {activeTab === 'search' ? <SearchCandidates /> : <UploadJobPosting />}
    </div>
  );
}
