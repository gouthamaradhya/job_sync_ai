'use client';
import { useState } from 'react';

export default function UploadJobPosting() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = () => {
    if (!file) return;
    // TODO: Add actual file upload API logic
    console.log('Uploading file:', file.name);
  };

  return (
    <section className="border border-gray-200 rounded-md mt-12 max-w-3xl mx-auto p-10 flex flex-col items-center">
      <h2 className="text-xl font-bold mb-6 text-center">Upload Your Job Posting</h2>
      <input
        type="file"
        accept=".txt,.pdf,.doc,.docx"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border border-gray-200 rounded-md px-4 py-2 w-80 cursor-pointer"
      />
      <button
        onClick={handleUpload}
        className={`mt-6 bg-gray-600 text-white font-semibold rounded-md px-6 py-3 ${file ? '' : 'cursor-not-allowed opacity-50'}`}
        disabled={!file}
      >
        Upload
      </button>
    </section>
  );
}
