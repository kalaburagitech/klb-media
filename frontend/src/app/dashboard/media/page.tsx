'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
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
import VideoPlayer from '@/components/dashboard/VideoPlayer';

interface MediaItem {
  id: string;
  file_name: string;
  size: string;
  content_type: string;
  created_at: string;
}

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const fetchMedia = async () => {
    try {
      const { data } = await api.get('/media');
      setMedia(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const getFileUrl = (id: string, suffix: string = '', params: string = '') => `${apiUrl}/media/${id}${suffix}${params}`;
  const getStreamUrl = (id: string) => `${apiUrl}/media/${id}/stream/playlist.m3u8`;

  const copyUrl = (id: string, isVideo: boolean) => {
    const url = isVideo ? getStreamUrl(id) : getFileUrl(id);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.delete(`/media/${id}`);
      setMedia(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const getIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return FileVideo;
    if (type === 'application/pdf') return FileText;
    return FileText;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-slate-400 text-lg">Adaptive delivery and optimized assets.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by ID..." 
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all text-slate-200"
            />
          </div>
          <button className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors text-slate-400">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-300">No media found</h3>
          <p className="text-slate-500 mt-1 max-w-xs">Your library is currently empty. Upload some files to see optimization in action.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {media.map((item) => {
            const Icon = getIcon(item.content_type);
            const isImage = item.content_type.startsWith('image/');
            const isVideo = item.content_type.startsWith('video/');
            const thumbUrl = isImage ? getFileUrl(item.id, '', '?width=400&quality=70') : null;
            const fullUrl = getFileUrl(item.id);
            
            return (
              <div key={item.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 hover:shadow-xl transition-all flex flex-col">
                <div className="aspect-video relative bg-slate-950 flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    <img 
                      src={thumbUrl!} 
                      alt={item.file_name}
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
                      onClick={() => setPreviewItem(item)}
                      className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-lg text-white transition-all transform translate-y-2 group-hover:translate-y-0"
                      title="Preview"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => window.open(getFileUrl(item.id, '/download'), '_blank')}
                      className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-lg text-white transition-all transform translate-y-2 group-hover:translate-y-0 delay-75"
                      title="Download Original"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => copyUrl(item.id, isVideo)}
                      className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all transform translate-y-2 group-hover:translate-y-0 delay-100"
                      title={isVideo ? "Copy HLS Stream URL" : "Copy Direct URL"}
                    >
                      {copiedId === item.id ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => deleteFile(item.id)}
                      className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-all transform translate-y-2 group-hover:translate-y-0 delay-150"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-medium text-slate-200 truncate" title={item.file_name}>
                      {item.file_name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                      <Hash className="w-3 h-3" />
                      <span className="truncate">{item.id}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Size
                      </span>
                      <span className="text-xs font-semibold text-slate-300">{formatBytes(parseInt(item.size))}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                      <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" /> Date
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
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
                {previewItem.content_type.startsWith('image/') ? (
                  <img 
                    src={getFileUrl(previewItem.id)} 
                    alt={previewItem.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : previewItem.content_type.startsWith('video/') ? (
                  <VideoPlayer 
                    src={getStreamUrl(previewItem.id)} 
                    fallbackSrc={getFileUrl(previewItem.id)}
                    className="w-full h-full"
                  />
                ) : previewItem.content_type === 'application/pdf' ? (
                  <iframe 
                    src={getFileUrl(previewItem.id)} 
                    className="w-full h-full rounded-xl"
                    title={previewItem.file_name}
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
                <h2 className="text-xl font-bold text-white">{previewItem.file_name}</h2>
                <p className="text-sm text-slate-400 font-mono">{previewItem.id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium text-slate-300">
                  {previewItem.content_type}
                </span>
                <span className="text-sm font-semibold text-blue-400">
                  {formatBytes(parseInt(previewItem.size))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
