'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{name: string, status: 'success' | 'error', id?: string, message?: string}[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'image/*': [],
      'video/*': [],
      'application/*': [],
      'text/*': []
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    setUploading(true);
    setResults([]);
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const { data: uploadData } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResults(prev => [...prev, { name: file.name, status: 'success', id: uploadData.id }]);
      } catch (err: any) {
        const errorData = err.response?.data;
        setResults(prev => [...prev, { 
          name: file.name, 
          status: 'error', 
          message: errorData?.message || errorData?.error || 'Upload failed' 
        }]);
      }
    }
    
    setFiles([]);
    setUploading(false);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload Media</h1>
        <p className="text-slate-400 text-lg">Secure, ID-based storage for your assets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
              isDragActive ? "border-blue-500 bg-blue-500/5" : "border-slate-800 hover:border-slate-700 bg-slate-900/50"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragActive ? 'Drop files here' : 'Select files or drag and drop'}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs">
              All file types accepted up to 10MB per file.
            </p>
          </div>

          {files.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <span className="font-medium text-slate-200">{files.length} files selected</span>
                <button 
                  onClick={uploadFiles}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload All'}
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {files.map((file, i) => (
                  <div key={i} className="p-4 flex items-center justify-between border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-slate-500" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                        <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold px-2">Upload History</h2>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-800/50 rounded-3xl text-slate-500">
              <p>No recent uploads</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((res, i) => (
                <div key={i} className={cn(
                  "p-4 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-right-4 duration-300",
                  res.status === 'success' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                )}>
                  <div className="flex items-center gap-3">
                    {res.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{res.name}</span>
                      {res.id && <span className="text-[10px] font-mono text-slate-500">ID: {res.id}</span>}
                      {res.message && <span className="text-xs text-red-400">{res.message}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
