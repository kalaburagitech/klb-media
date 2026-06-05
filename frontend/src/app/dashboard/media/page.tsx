'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatBytes } from '@/lib/utils';
import { 
  Search, 
  Filter, 
  Copy, 
  Trash2, 
  Download,
  CheckCircle2,
  Image as ImageIcon,
  FileVideo,
  FileText,
  Loader2,
  Calendar,
  Hash,
  Activity,
  Play,
  X,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Id } from "../../../../convex/_generated/dataModel";

interface MediaItem {
  _id: Id<"media">;
  userId: string;
  fileName: string;
  storageId: Id<"_storage">;
  size: number;
  contentType: string;
  createdAt: number;
}

function MediaCard({ 
  item, 
  onPreview, 
  onDelete 
}: { 
  item: MediaItem; 
  onPreview: (item: MediaItem, url: string | null) => void;
  onDelete: (id: Id<"media">) => void;
}) {
  const [copied, setCopied] = useState(false);
  const fileUrl = useQuery(api.media.getUrl, { storageId: item.storageId });

  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return FileVideo;
    if (type === 'application/pdf') return FileText;
    return FileText;
  };

  const Icon = getIcon(item.contentType);
  const isImage = item.contentType.startsWith('image/');
  const isVideo = item.contentType.startsWith('video/');

  const handleCopy = () => {
    if (fileUrl) {
      navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 hover:shadow-xl transition-all flex flex-col">
      <div className="aspect-video relative bg-slate-950 flex items-center justify-center overflow-hidden">
        {isImage && fileUrl ? (
          <img 
            src={fileUrl} 
            alt={item.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
            <Play className="w-12 h-12 text-slate-700 group-hover:text-blue-500 transition-colors" />
          </div>
        ) : (
          <Icon className="w-12 h-12 text-slate-800" />
        )}
        
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button 
            onClick={() => onPreview(item, fileUrl ?? null)}
            className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-lg text-white transition-all transform translate-y-2 group-hover:translate-y-0"
            title="Preview"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          {fileUrl && (
            <button 
              onClick={() => window.open(fileUrl, '_blank')}
              className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-lg text-white transition-all transform translate-y-2 group-hover:translate-y-0 delay-75"
              title="Download Original"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={handleCopy}
            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all transform translate-y-2 group-hover:translate-y-0 delay-100"
            title="Copy URL"
          >
            {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => onDelete(item._id)}
            className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-all transform translate-y-2 group-hover:translate-y-0 delay-150"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-medium text-slate-200 truncate" title={item.fileName}>
            {item.fileName}
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <Hash className="w-3 h-3" />
            <span className="truncate">{item._id}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3" /> Size
            </span>
            <span className="text-xs font-semibold text-slate-300">{formatBytes(item.size)}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1 justify-end">
              <Calendar className="w-3 h-3" /> Date
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MediaLibrary() {
  const [search, setSearch] = useState('');
  const [previewItem, setPreviewItem] = useState<{item: MediaItem, url: string | null} | null>(null);
  
  const media = useQuery(api.media.list, { search: search || undefined });
  const deleteMedia = useMutation(api.media.deleteMedia);

  const handleDelete = async (id: Id<"media">) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await deleteMedia({ id });
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-slate-400 text-lg">Serverless asset delivery.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all text-slate-200"
            />
          </div>
          <button className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors text-slate-400">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {media === undefined ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-300">No media found</h3>
          <p className="text-slate-500 mt-1 max-w-xs">Your library is currently empty. Upload some files to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {media.map((item) => (
            <MediaCard 
              key={item._id} 
              item={item as MediaItem} 
              onPreview={(item, url) => setPreviewItem({ item, url })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && previewItem.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            <button 
              onClick={() => setPreviewItem(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-950/50 hover:bg-slate-950 rounded-full text-slate-400 hover:text-white transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-2">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                {previewItem.item.contentType.startsWith('image/') ? (
                  <img 
                    src={previewItem.url} 
                    alt={previewItem.item.fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : previewItem.item.contentType.startsWith('video/') ? (
                  <video 
                    src={previewItem.url} 
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : previewItem.item.contentType === 'application/pdf' ? (
                  <iframe 
                    src={previewItem.url} 
                    className="w-full h-full rounded-xl"
                    title={previewItem.item.fileName}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <FileText className="w-20 h-20 text-slate-700" />
                    <p className="text-slate-400">Preview not available for this file type.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-white">{previewItem.item.fileName}</h2>
                <p className="text-sm text-slate-400 font-mono">{previewItem.item._id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium text-slate-300">
                  {previewItem.item.contentType}
                </span>
                <span className="text-sm font-semibold text-blue-400">
                  {formatBytes(previewItem.item.size)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
