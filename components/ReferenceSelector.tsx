import React from 'react';
import { ReferenceOptions, POPULAR_REFERENCES } from '../types';
import { Book, Palette, User, Search } from 'lucide-react';

interface ReferenceSelectorProps {
  references: ReferenceOptions;
  onChange: (refs: ReferenceOptions) => void;
  disabled?: boolean;
}

export const ReferenceSelector: React.FC<ReferenceSelectorProps> = ({ references, onChange, disabled }) => {
  
  const updateRef = (key: keyof ReferenceOptions, value: string) => {
    onChange({ ...references, [key]: value });
  };

  return (
    <div className="space-y-4 bg-zinc-950 p-5 rounded-xl border border-amber-500/10 shadow-lg">
      <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-2 mb-2">
        <Search size={14} /> Reference Mixer
      </h3>
      
      {/* Story Reference */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
          <Book size={14} className="text-indigo-400"/> Narrative Structure
        </label>
        <div className="relative">
          <select
            value={references.storyRef}
            onChange={(e) => updateRef('storyRef', e.target.value)}
            disabled={disabled}
            className="w-full bg-black/50 border border-zinc-800 text-zinc-300 text-sm rounded-lg p-2.5 focus:border-indigo-500 outline-none transition-colors"
          >
            <option value="">Original (AI Created)</option>
            {POPULAR_REFERENCES.map(ref => <option key={ref} value={ref}>{ref}</option>)}
          </select>
        </div>
      </div>

      {/* Art Reference */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
          <Palette size={14} className="text-pink-400"/> Art Style
        </label>
        <div className="relative">
          <select
            value={references.artRef}
            onChange={(e) => updateRef('artRef', e.target.value)}
            disabled={disabled}
            className="w-full bg-black/50 border border-zinc-800 text-zinc-300 text-sm rounded-lg p-2.5 focus:border-pink-500 outline-none transition-colors"
          >
            <option value="">Original (AI Created)</option>
            {POPULAR_REFERENCES.map(ref => <option key={ref} value={ref}>{ref}</option>)}
          </select>
        </div>
      </div>

      {/* Design Reference */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
          <User size={14} className="text-emerald-400"/> Character Aesthetics
        </label>
        <div className="relative">
          <select
            value={references.designRef}
            onChange={(e) => updateRef('designRef', e.target.value)}
            disabled={disabled}
            className="w-full bg-black/50 border border-zinc-800 text-zinc-300 text-sm rounded-lg p-2.5 focus:border-emerald-500 outline-none transition-colors"
          >
            <option value="">Original (AI Created)</option>
            {POPULAR_REFERENCES.map(ref => <option key={ref} value={ref}>{ref}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};