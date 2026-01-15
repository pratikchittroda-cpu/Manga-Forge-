import React, { useState } from 'react';
import { Character } from '../types';
import { User, Zap, MessageSquare, Info, X, Shield, Lock, Ruler, Calendar } from 'lucide-react';

interface CharacterCardProps {
  character: Character;
  loading?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, loading }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => !loading && setIsOpen(true)}
        className={`bg-zinc-900/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl overflow-hidden transition-all duration-300 group relative ${loading ? 'cursor-wait' : 'cursor-pointer hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:-translate-y-1'}`}
      >
        <div className="aspect-[3/4] w-full bg-zinc-800 relative overflow-hidden">
          {character.imageUrl ? (
            <img 
              src={character.imageUrl} 
              alt={character.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">
               {loading ? (
                  <div className="flex flex-col items-center gap-2">
                     <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                     <span className="text-xs font-mono animate-pulse text-indigo-400">Summoning...</span>
                  </div>
               ) : (
                  <User size={48} className="opacity-20" />
               )}
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 transform transition-transform duration-300 group-hover:translate-y-[-8px]">
             <h3 className="text-xl font-bold font-title text-white tracking-wide drop-shadow-lg">{character.name}</h3>
             <p className="text-indigo-400 text-sm font-medium tracking-wider uppercase">{character.role}</p>
          </div>
          
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-indigo-500/90 p-1.5 rounded-full text-white backdrop-blur-md">
              <Info size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-red-500/80 p-2 rounded-full text-white transition-colors border border-white/10"
            >
              <X size={20} />
            </button>

            {/* Left: Image */}
            <div className="w-full md:w-1/3 bg-zinc-950 relative h-96 md:h-auto">
              <img 
                src={character.imageUrl} 
                alt={character.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent md:bg-gradient-to-r"></div>
            </div>

            {/* Right: Stats */}
            <div className="w-full md:w-2/3 p-8 space-y-6">
              <div>
                <h2 className="text-4xl font-title text-white mb-2">{character.name}</h2>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase">{character.role}</span>
                  <div className="flex items-center gap-1 text-zinc-400 text-sm px-2">
                    <Ruler size={14} /> {character.height}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400 text-sm px-2">
                    <Calendar size={14} /> {character.age}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 text-xs uppercase font-bold tracking-wider mb-1">
                      <Zap size={14} /> Abilities
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{character.abilities}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 text-xs uppercase font-bold tracking-wider mb-1">
                      <MessageSquare size={14} /> Personality
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{character.personality}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase font-bold tracking-wider mb-2">
                      <Shield size={14} /> Backstory
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed italic">"{character.backstory}"</p>
                  </div>
                  
                  <div className="bg-red-900/10 p-4 rounded-xl border border-red-500/20 relative overflow-hidden group/secret">
                    <div className="flex items-center gap-2 text-red-400 text-xs uppercase font-bold tracking-wider mb-2">
                      <Lock size={14} /> Secret
                    </div>
                    <p className="text-sm text-red-200/80 leading-relaxed filter blur-sm group-hover/secret:blur-0 transition-all duration-500 cursor-help">
                      {character.secret}
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center text-red-500/30 text-xs font-mono group-hover/secret:hidden pointer-events-none">
                      HOVER TO REVEAL
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};