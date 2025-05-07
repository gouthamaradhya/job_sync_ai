'use client';
import { useState } from 'react';

export default function SearchCandidates() {
  const [jobDesc, setJobDesc] = useState('');

  const handleSearch = async () => {
    // TODO: Add API call
    console.log('Searching for candidates with:', jobDesc);
  };

  return (
    <section className="border border-gray-200 rounded-md mt-6 max-w-3xl mx-auto p-10 flex flex-col items-center">
      <h2 className="text-xl font-bold mb-6 text-center">Search for Best Candidates Based on Your Job Description</h2>
      <textarea
        className="border border-gray-300 rounded-md px-4 py-3 w-80 resize-y"
        placeholder="Paste or type your job description here..."
        rows={6}
        value={jobDesc}
        onChange={(e) => setJobDesc(e.target.value)}
      />
      <button
        onClick={handleSearch}
        className="mt-6 bg-black text-white font-semibold rounded-md px-6 py-3"
      >
        Search Candidates
      </button>
    </section>
  );
}
