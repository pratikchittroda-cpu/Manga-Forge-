import React, { useState } from 'react';
import { Chapter } from '../types';
import { ArrowRight, ChevronRight, Layers, Maximize2, Minimize2, ImageOff } from 'lucide-react';

interface MangaReaderProps {
  chapter: Chapter;
  style: 'colored' | 'bw';
  title: string;
  onNextChapter: () => void;
  isGeneratingNext: boolean;
}

export const MangaReader: React.FC<MangaReaderProps> = ({ 
  chapter, 
  style, 
  title, 
  onNextChapter,
  isGeneratingNext
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const containerClass = isMaximized 
    ? "fixed inset-0 z-50 bg-zinc-950 overflow-y-auto" 
    : "w-full max-w-4xl mx-auto bg-zinc-950 shadow-2xl relative min-h-screen pb-32";

  return (
    <div className={containerClass}>
      
      {/* Reader Controls */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={() => setIsMaximized(!isMaximized)}
          className="bg-black/50 backdrop-blur-md p-3 rounded-full text-white hover:bg-amber-500 hover:text-black transition-colors shadow-lg border border-white/10"
          title={isMaximized ? "Exit Fullscreen" : "Fullscreen Reader"}
        >
          {isMaximized ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>
      </div>

      {/* Chapter Header */}
      <div className={`py-16 px-8 text-center border-b border-white/10 ${style === 'bw' ? 'bg-zinc-100' : 'bg-gradient-to-b from-indigo-950 to-zinc-950'}`}>
        <h2 className={`text-4xl md:text-6xl font-title uppercase mb-4 ${style === 'bw' ? 'text-black' : 'text-white'}`}>
          {title}
        </h2>
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-bold tracking-widest uppercase opacity-70 ${style === 'bw' ? 'text-zinc-600' : 'text-indigo-300'}`}>
            Chapter {chapter.id}
          </span>
          <span className={`w-1 h-1 rounded-full ${style === 'bw' ? 'bg-black' : 'bg-white'}`}></span>
          <span className={`text-lg font-comic ${style === 'bw' ? 'text-zinc-800' : 'text-white'}`}>
            {chapter.title}
          </span>
        </div>
      </div>

      {/* Panels */}
      <div className="flex flex-col items-center">
        {chapter.panels.map((panel, index) => (
          <div key={`${chapter.id}-${panel.id}`} className="relative w-full group">
            
            {/* Panel Image Area */}
            <div className={`w-full relative ${style === 'bw' ? 'p-0 md:p-8 bg-zinc-50' : 'p-0'}`}>
               <div className={`w-full relative mx-auto max-w-4xl min-h-[400px] bg-zinc-900 ${style === 'bw' ? 'border-4 border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]' : ''}`}>
                  {panel.imageUrl && panel.imageUrl.startsWith('data:') ? (
                    <img 
                      src={panel.imageUrl} 
                      alt={`Chapter ${chapter.id} Panel ${panel.id}`} 
                      className="w-full h-auto object-cover block shadow-2xl"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-4 p-8 text-center">
                       {panel.imageUrl === 'loading' ? (
                         <>
                           <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-zinc-500 font-comic animate-pulse text-lg">Inking Panel {index + 1}...</span>
                           <span className="text-xs text-zinc-600">Waiting for artist...</span>
                         </>
                       ) : (
                         <div className="text-zinc-600 flex flex-col items-center gap-2">
                           <ImageOff size={48} className="opacity-20" />
                           <span>Image Pending</span>
                         </div>
                       )}
                    </div>
                  )}
               </div>
            </div>

            {/* Caption/Dialogue Box */}
            <div className={`
              relative z-10 mx-auto max-w-3xl transform transition-all duration-500
              ${style === 'bw' 
                ? 'bg-white border-2 border-black p-6 -mt-6 mb-20 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' 
                : 'bg-black/80 backdrop-blur-xl border border-white/10 p-8 -mt-24 mb-32 rounded-2xl text-center hover:bg-black/90 hover:border-amber-500/30'}
            `}>
               <p className={`font-comic text-xl md:text-2xl leading-relaxed whitespace-pre-wrap text-left ${style === 'bw' ? 'text-black' : 'text-zinc-100'}`}>
                 {panel.dialogue}
               </p>
               
               <div className="absolute -top-3 -right-3 bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-white/20">
                 PANEL {index + 1}
               </div>
            </div>

            {/* Spacer for colored flow */}
            {style === 'colored' && <div className="h-12"></div>}
          </div>
        ))}
      </div>

      {/* Chapter Footer / Next Actions */}
      <div className="max-w-xl mx-auto px-6 mt-12 pb-20 space-y-6">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>
        
        <button 
          onClick={onNextChapter}
          disabled={isGeneratingNext}
          className={`
            w-full group relative overflow-hidden rounded-xl p-1
            transition-all duration-300 hover:scale-[1.02]
            ${isGeneratingNext ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 animate-gradient-xy"></div>
          <div className="relative bg-zinc-950 rounded-lg p-6 flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 rounded-full text-amber-400">
                {isGeneratingNext ? <Layers className="animate-spin" /> : <Layers />}
              </div>
              <div className="text-left">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Continue Story</p>
                <h3 className="text-xl font-title text-white">Generate Chapter {chapter.id + 1}</h3>
              </div>
            </div>
            <ArrowRight className={`text-white transition-transform ${isGeneratingNext ? 'opacity-0' : 'group-hover:translate-x-1'}`} />
          </div>
        </button>
      </div>

    </div>
  );
};