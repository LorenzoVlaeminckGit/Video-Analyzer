/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, Video, Loader2, AlertCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [prompt, setPrompt] = useState('Analyze this video and provide a summary of the key information, events, and subjects shown.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'upload' && !videoFile) {
      setError('Please select a video file.');
      return;
    }
    if (activeTab === 'url' && !videoUrl) {
      setError('Please enter a video URL.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      if (activeTab === 'upload' && videoFile) {
        formData.append('video', videoFile);
      } else if (activeTab === 'url') {
        formData.append('videoUrl', videoUrl);
      }
      formData.append('prompt', prompt);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze video');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-6 md:p-12 overflow-hidden relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="max-w-3xl mx-auto space-y-8 relative z-10">
        
        <header className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-600 rounded flex items-center justify-center mb-6 shadow-sm">
            <Video size={24} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            NEURO<span className="text-cyan-400">LENS</span> <span className="text-lg md:text-xl font-medium text-slate-400 block mt-2">Video Analyzer</span>
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="bg-slate-900/40 rounded-2xl p-6 md:p-8 shadow-2xl border border-white/5 space-y-8 backdrop-blur-sm">
          
          <div className="flex border-b border-white/10 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all text-sm uppercase tracking-wider ${
                activeTab === 'upload' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-white'
              }`}
            >
              <UploadCloud size={18} />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all text-sm uppercase tracking-wider ${
                activeTab === 'url' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-white'
              }`}
            >
              <LinkIcon size={18} />
              Remote URL
            </button>
          </div>

          <div className="space-y-6">
            {activeTab === 'upload' && (
              <div 
                className="border-2 border-dashed border-white/5 rounded-2xl p-8 text-center bg-slate-950/30 hover:bg-slate-900/50 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className="mx-auto w-12 h-12 text-slate-600 group-hover:text-cyan-500 transition-colors flex items-center justify-center mb-4">
                  <UploadCloud size={32} />
                </div>
                <p className="text-slate-400 text-sm mb-1">
                  {videoFile ? videoFile.name : 'Drop video file here or click to select'}
                </p>
                <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mt-2">
                  MP4, WebM, MOV
                </p>
              </div>
            )}

            {activeTab === 'url' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">
                  Video URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700 text-slate-200"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">
                Analysis Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700 text-slate-200 resize-none"
                placeholder="What would you like to know about this video?"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold tracking-widest uppercase py-4 px-6 rounded-lg transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                ANALYZING...
              </>
            ) : (
              'INITIATE ANALYSIS'
            )}
          </button>
        </form>

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/40 rounded-2xl p-6 md:p-10 shadow-2xl border border-white/5 backdrop-blur-sm"
            >
              <h2 className="text-sm font-bold text-cyan-400 tracking-widest uppercase mb-6">Analysis Output</h2>
              <div className="prose prose-invert prose-slate prose-a:text-cyan-400 max-w-none text-sm leading-relaxed">
                <div className="markdown-body">
                  <Markdown>{result}</Markdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
