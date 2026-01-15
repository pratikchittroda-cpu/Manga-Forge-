import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Palette, 
  Globe, 
  ChevronRight, 
  Layout,
  Users,
  Settings,
  Library,
  Save,
  Trash2,
  Clock,
  Play,
  AlertTriangle,
  PauseCircle
} from 'lucide-react';
import { GENRES, LANGUAGES, GeneratorOptions, StoryData, GenerationStep, Character, Panel } from './types';
import { generateStoryAndCharacters, generateImage, generateNextChapter } from './services/geminiService';
import { CharacterCard } from './components/CharacterCard';
import { MangaReader } from './components/MangaReader';
import { ReferenceSelector } from './components/ReferenceSelector';

// --- Types for the Queue System ---
type ImageTask = 
  | { type: 'character', charId: string, prompt: string }
  | { type: 'panel', chapterIndex: number, panelId: number, prompt: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'cast' | 'read' | 'library'>('create');
  
  const [options, setOptions] = useState<GeneratorOptions>({
    genre: GENRES[0],
    style: 'colored',
    language: 'English',
    tone: 'Epic & Emotional',
    references: { storyRef: '', artRef: '', designRef: '' }
  });

  const [step, setStep] = useState<GenerationStep>(GenerationStep.IDLE);
  const [story, setStory] = useState<StoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedStories, setSavedStories] = useState<StoryData[]>([]);

  // Queue State
  const [imageQueue, setImageQueue] = useState<ImageTask[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [cooldown, setCooldown] = useState(0); // in seconds

  // References to avoid stale closures during async ops
  const storyRef = useRef<StoryData | null>(null);
  const queueRef = useRef<ImageTask[]>([]);

  // Load library from localstorage
  useEffect(() => {
    const saved = localStorage.getItem('mangaforge_library');
    if (saved) {
      try {
        setSavedStories(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load library");
      }
    }
  }, []);

  // Cooldown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // --- QUEUE PROCESSOR ---
  useEffect(() => {
    const processQueue = async () => {
      if (isQueueProcessing || cooldown > 0 || queueRef.current.length === 0 || !storyRef.current) return;

      setIsQueueProcessing(true);
      const task = queueRef.current[0];
      
      // Determine if NSFW based on genre
      const isAdult = storyRef.current.genre.includes('Adult') || storyRef.current.genre.includes('Hentai') || storyRef.current.genre.includes('Ecchi');

      try {
        const imgUrl = await generateImage(
          task.prompt, 
          options.style, 
          options.references.artRef,
          isAdult
        );

        // Update State based on Task Type
        const currentStory = { ...storyRef.current };
        
        if (task.type === 'character') {
          const charIndex = currentStory.characters.findIndex(c => c.id === task.charId);
          if (charIndex !== -1) {
            const updatedChars = [...currentStory.characters];
            updatedChars[charIndex] = { ...updatedChars[charIndex], imageUrl: imgUrl };
            currentStory.characters = updatedChars;
          }
        } else if (task.type === 'panel') {
          const chap = currentStory.chapters[task.chapterIndex];
          if (chap) {
             const panelIndex = chap.panels.findIndex(p => p.id === task.panelId);
             if (panelIndex !== -1) {
                const updatedPanels = [...chap.panels];
                updatedPanels[panelIndex] = { ...updatedPanels[panelIndex], imageUrl: imgUrl };
                const updatedChapters = [...currentStory.chapters];
                updatedChapters[task.chapterIndex] = { ...chap, panels: updatedPanels };
                currentStory.chapters = updatedChapters;
             }
          }
        }

        setStory(currentStory);
        storyRef.current = currentStory;
        saveToLibrary(currentStory);

        // Remove task from queue
        const newQueue = queueRef.current.slice(1);
        setImageQueue(newQueue);
        queueRef.current = newQueue;

        // WAIT 4 SECONDS before next image (Throttling)
        await new Promise(r => setTimeout(r, 4000));

      } catch (err: any) {
        console.error("Queue Error:", err);
        // If 429 or similar, trigger LONG cooldown
        if (err.message?.includes('429') || err.message?.includes('quota') || err.status === 429) {
          setCooldown(30); // 30 seconds wait as requested
        } else {
           // Skip task on other errors to avoid block
           const newQueue = queueRef.current.slice(1);
           setImageQueue(newQueue);
           queueRef.current = newQueue;
        }
      } finally {
        setIsQueueProcessing(false);
      }
    };

    // Trigger processing whenever dependencies change favorable
    if (imageQueue.length > 0 && !isQueueProcessing && cooldown === 0) {
      processQueue();
    }
  }, [imageQueue, cooldown, isQueueProcessing, options.style, options.references.artRef]);


  const addToQueue = (tasks: ImageTask[]) => {
    const newQueue = [...queueRef.current, ...tasks];
    setImageQueue(newQueue);
    queueRef.current = newQueue;
  };

  const saveToLibrary = (data: StoryData) => {
    const updated = [data, ...savedStories.filter(s => s.id !== data.id)];
    setSavedStories(updated);
    localStorage.setItem('mangaforge_library', JSON.stringify(updated));
  };

  const deleteFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedStories.filter(s => s.id !== id);
    setSavedStories(updated);
    localStorage.setItem('mangaforge_library', JSON.stringify(updated));
  };

  const loadStory = (data: StoryData) => {
    setStory(data);
    storyRef.current = data;
    setActiveTab('read');
    // Clear queue when loading new story to prevent mixed up images
    setImageQueue([]);
    queueRef.current = [];
  };

  const getContextCharacters = (panelDescription: string, characters: Character[]): string => {
     const mentionedChars = characters.filter(c => 
       panelDescription.toLowerCase().includes(c.name.toLowerCase()) || 
       panelDescription.toLowerCase().includes(c.name.split(' ')[0].toLowerCase())
     );
     if (mentionedChars.length > 0) {
       return mentionedChars.map(c => `[${c.name}: ${c.appearance}]`).join(' ');
     } else {
       return characters.slice(0, 2).map(c => `[${c.name}: ${c.appearance}]`).join(' ');
     }
  };

  const handleGenerate = async () => {
    try {
      setStep(GenerationStep.GENERATING_STORY);
      setError(null);
      setStory(null);
      setImageQueue([]);
      queueRef.current = [];
      setActiveTab('read'); 

      // 1. Generate Text Content (10 Chapters, 20 Characters)
      const generatedStory = await generateStoryAndCharacters(options);
      setStory(generatedStory);
      storyRef.current = generatedStory;

      // 2. Queue Initial Images
      const tasks: ImageTask[] = [];

      // Queue ALL Characters (Lazy load in background)
      generatedStory.characters.forEach(char => {
        tasks.push({
          type: 'character',
          charId: char.id,
          prompt: `Character Design Sheet, Full Body, ${char.name}, ${char.role}. Appearance: ${char.appearance}. Reference Design: ${options.references.designRef}`
        });
      });

      // Queue Chapter 1 Panels
      const chap1 = generatedStory.chapters[0];
      chap1.panels.forEach(panel => {
        const charContext = getContextCharacters(panel.description, generatedStory.characters);
        tasks.push({
          type: 'panel',
          chapterIndex: 0,
          panelId: panel.id,
          prompt: `Manga Panel. Scene: ${panel.description}. Dialogue context: "${panel.dialogue}". Characters present: ${charContext}. Mood: ${options.tone}.`
        });
        // Set placeholder immediately
        panel.imageUrl = 'loading'; 
      });

      // Update story with placeholders
      setStory({ ...generatedStory });
      storyRef.current = { ...generatedStory };
      
      addToQueue(tasks);
      saveToLibrary(generatedStory);
      setStep(GenerationStep.COMPLETE);

    } catch (err) {
      console.error(err);
      setError("Failed to forge your story. Please try again.");
      setStep(GenerationStep.ERROR);
    }
  };

  const handleVisualizeChapter = async (chapterIndex: number) => {
    if (!storyRef.current) return;
    const targetChap = storyRef.current.chapters[chapterIndex];
    
    // Only queue if not already generated
    if (targetChap.panels[0].imageUrl && targetChap.panels[0].imageUrl !== 'loading') return;

    const tasks: ImageTask[] = [];
    const updatedChapters = [...storyRef.current.chapters];
    
    // Mark as loading
    updatedChapters[chapterIndex].panels.forEach(p => p.imageUrl = 'loading');
    
    const updatedStory = { ...storyRef.current, chapters: updatedChapters, currentChapterIndex: chapterIndex };
    setStory(updatedStory);
    storyRef.current = updatedStory;

    targetChap.panels.forEach(panel => {
         const charContext = getContextCharacters(panel.description, updatedStory.characters);
         tasks.push({
           type: 'panel',
           chapterIndex: chapterIndex,
           panelId: panel.id,
           prompt: `Manga Panel. Scene: ${panel.description}. Dialogue context: "${panel.dialogue}". Characters present: ${charContext}. Mood: ${options.tone}.`
         });
    });

    addToQueue(tasks);
  };

  const handleGenerateNextChapter = async () => {
     if (!storyRef.current) return;
     try {
       setStep(GenerationStep.GENERATING_NEXT_CHAPTER);
       const newChapter = await generateNextChapter(storyRef.current, options);
       
       const currentStory = { ...storyRef.current };
       currentStory.chapters.push(newChapter);
       currentStory.currentChapterIndex = currentStory.chapters.length - 1;
       setStory(currentStory);
       storyRef.current = currentStory;

       await handleVisualizeChapter(currentStory.chapters.length - 1);
       setStep(GenerationStep.COMPLETE);
     } catch (err) {
       console.error(err);
       setStep(GenerationStep.COMPLETE);
     }
  };

  const isProcessing = step === GenerationStep.GENERATING_STORY;

  return (
    <div className="h-screen bg-[#050507] text-zinc-200 flex flex-col font-sans overflow-hidden selection:bg-amber-500 selection:text-black">
      
      {/* Top Bar */}
      <header className="h-16 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
           <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 rounded-lg text-white shadow-lg shadow-orange-500/20">
             <BookOpen size={20} />
           </div>
           <h1 className="text-xl font-title tracking-wider text-white">MangaForge <span className="text-amber-500">Studio</span></h1>
        </div>

        <div className="flex bg-zinc-900/80 rounded-lg p-1 border border-white/5 backdrop-blur">
          {[
            { id: 'create', icon: Sparkles, label: 'Create' },
            { id: 'read', icon: BookOpen, label: 'Reader' },
            { id: 'cast', icon: Users, label: `Cast ${story ? `(${story.characters.length})` : ''}` },
            { id: 'library', icon: Library, label: 'Library' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
           {/* Queue Status */}
           {imageQueue.length > 0 && (
             <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700 text-xs font-mono">
               {cooldown > 0 ? (
                 <>
                   <PauseCircle size={12} className="text-yellow-500 animate-pulse"/>
                   <span className="text-yellow-500">Cooling down ({cooldown}s)</span>
                 </>
               ) : (
                 <>
                   <Clock size={12} className="text-amber-500 animate-spin"/>
                   <span className="text-zinc-400">{imageQueue.length} images queued</span>
                 </>
               )}
             </div>
           )}

           {story && (
              <button onClick={() => saveToLibrary(story)} className="p-2 text-zinc-400 hover:text-amber-500 transition-colors" title="Save Progress">
                <Save size={20} />
              </button>
           )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <aside className={`w-80 md:w-96 bg-[#0a0a0c] border-r border-white/5 flex flex-col overflow-hidden z-10 transition-all ${activeTab === 'library' ? '-ml-[100%] md:-ml-96' : ''}`}>
          <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar h-full">
            
            {/* Status Panel */}
            {isProcessing && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <div className="flex items-center justify-between text-xs font-bold text-amber-500 uppercase tracking-wider">
                   <span>Forging Saga</span>
                   <Clock size={12} className="animate-spin" />
                </div>
                <div className="text-sm text-zinc-300 font-mono">
                   Constructing world, 20 characters, and 10 chapters...
                </div>
              </div>
            )}

            {/* Config */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white font-title text-lg border-b border-white/5 pb-2">
                 <Settings size={18} className="text-amber-500"/> Creation Suite
              </div>

              {/* Core Options */}
              <div className="grid grid-cols-1 gap-5">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Genre</label>
                    <div className="relative group">
                      <select 
                        value={options.genre}
                        onChange={(e) => setOptions({...options, genre: e.target.value})}
                        disabled={isProcessing}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-3 text-sm appearance-none outline-none focus:border-amber-500 transition-colors group-hover:border-zinc-700"
                      >
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-3.5 text-zinc-600 rotate-90 pointer-events-none"/>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Language</label>
                    <div className="relative group">
                      <select 
                        value={options.language}
                        onChange={(e) => setOptions({...options, language: e.target.value})}
                        disabled={isProcessing}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-3 text-sm appearance-none outline-none focus:border-amber-500 transition-colors group-hover:border-zinc-700"
                      >
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <Globe size={14} className="absolute right-3 top-3.5 text-zinc-600 pointer-events-none"/>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tone</label>
                    <input 
                      value={options.tone}
                      onChange={(e) => setOptions({...options, tone: e.target.value})}
                      disabled={isProcessing}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-3 text-sm outline-none focus:border-amber-500 transition-colors placeholder-zinc-700"
                      placeholder="e.g. Gritty, Hopeful..."
                    />
                 </div>
              </div>

              {/* Style Toggle */}
              <div className="bg-zinc-900 p-1.5 rounded-xl flex border border-zinc-800">
                 <button 
                   onClick={() => setOptions({...options, style: 'colored'})}
                   className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${options.style === 'colored' ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                   Manhwa (Color)
                 </button>
                 <button 
                   onClick={() => setOptions({...options, style: 'bw'})}
                   className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${options.style === 'bw' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                   Manga (B&W)
                 </button>
              </div>

              {/* Reference Selector */}
              <ReferenceSelector 
                references={options.references} 
                onChange={(refs) => setOptions({...options, references: refs})}
                disabled={isProcessing}
              />
              
              <button 
                onClick={handleGenerate}
                disabled={isProcessing}
                className={`w-full py-5 mt-4 rounded-xl font-bold font-title text-xl uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 relative overflow-hidden group ${
                  isProcessing 
                    ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800' 
                    : 'bg-white text-black hover:bg-zinc-200 hover:scale-[1.01]'
                }`}
              >
                <Sparkles size={20} className={isProcessing ? "hidden" : "text-amber-600"} />
                {story ? 'Re-Generate' : 'Create Series'}
              </button>
            </div>
          </div>
        </aside>

        {/* Library View */}
        {activeTab === 'library' && (
           <div className="flex-1 bg-[#050507] p-8 md:p-12 overflow-y-auto animate-in slide-in-from-right-10 duration-300">
              <div className="max-w-6xl mx-auto space-y-8">
                 <h2 className="text-4xl font-title text-white mb-8 border-b border-white/10 pb-4">Saved Library</h2>
                 {savedStories.length === 0 ? (
                    <div className="text-center py-20 text-zinc-600">
                       <Library size={48} className="mx-auto mb-4 opacity-50"/>
                       <p>Your library is empty. Forge a story to save it.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {savedStories.map(s => (
                          <div key={s.id} onClick={() => loadStory(s)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-amber-500/50 transition-all cursor-pointer group relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => deleteFromLibrary(s.id, e)} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white">
                                   <Trash2 size={16} />
                                </button>
                             </div>
                             <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{s.title}</h3>
                             <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{s.synopsis}</p>
                             <div className="flex items-center gap-2 text-xs text-amber-500 font-medium uppercase tracking-wider">
                                <span>{s.genre}</span>
                                <span>•</span>
                                <span>{s.chapters.length} Chapters</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        )}

        {/* Main Content */}
        {activeTab !== 'library' && (
        <main className="flex-1 bg-[#050507] relative overflow-y-auto custom-scrollbar">
          
          {!story && !isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
               <div className="w-32 h-32 bg-amber-500/5 rounded-full flex items-center justify-center mb-8 border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                 <Layout size={64} className="text-amber-500 opacity-50" />
               </div>
               <h2 className="text-5xl font-title text-white mb-6 tracking-wide">MangaForge <span className="text-amber-500">Studio</span></h2>
               <p className="max-w-md text-zinc-500 leading-relaxed text-lg">
                 The world's most advanced AI manga generator. <br/>
                 Create entire series with deep lore, massive casts, and consistent visuals.
               </p>
            </div>
          )}

          {/* Reader View */}
          {story && activeTab === 'read' && (
            <div className="animate-in fade-in duration-500">
              
              {/* Story Header */}
              <div className="relative h-64 w-full bg-gradient-to-b from-zinc-900 to-[#050507] border-b border-white/5 flex items-end p-8 md:p-12">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                 <div className="relative z-10 w-full max-w-5xl mx-auto">
                    <div className="flex flex-wrap gap-2 mb-4">
                       <span className="px-3 py-1 bg-amber-500 text-black text-xs font-bold uppercase tracking-wider rounded-sm">{story.genre}</span>
                       <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider rounded-sm">{options.style}</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-title text-white mb-4 drop-shadow-xl">{story.title}</h1>
                    <p className="text-zinc-400 max-w-3xl leading-relaxed text-lg line-clamp-2 hover:line-clamp-none transition-all cursor-help">{story.synopsis}</p>
                 </div>
              </div>

              {/* Chapter Navigator */}
              <div className="sticky top-0 z-30 bg-[#050507]/90 backdrop-blur-md border-b border-white/5 py-4 px-8 overflow-x-auto">
                 <div className="flex items-center gap-4 max-w-5xl mx-auto min-w-max">
                    {story.chapters.map((chap, idx) => (
                       <button
                         key={chap.id}
                         onClick={() => {
                            if (idx !== story.currentChapterIndex) {
                               handleVisualizeChapter(idx);
                            }
                         }}
                         className={`
                           flex flex-col items-start p-3 rounded-lg min-w-[140px] border transition-all
                           ${story.currentChapterIndex === idx 
                             ? 'bg-zinc-800 border-amber-500/50 ring-1 ring-amber-500/20' 
                             : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 opacity-60 hover:opacity-100'}
                         `}
                       >
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Chapter {chap.id}</span>
                          <span className={`text-sm font-bold truncate w-full ${story.currentChapterIndex === idx ? 'text-amber-500' : 'text-zinc-300'}`}>
                             {chap.title}
                          </span>
                          {(!chap.panels[0].imageUrl || chap.panels[0].imageUrl === 'loading') && (
                             <span className="text-[10px] text-indigo-400 mt-1 flex items-center gap-1">
                               {chap.panels[0].imageUrl === 'loading' ? <Clock size={8} className="animate-spin"/> : <Play size={8}/>}
                               {chap.panels[0].imageUrl === 'loading' ? 'Rendering...' : 'Visualize'}
                             </span>
                          )}
                       </button>
                    ))}
                    <button 
                      onClick={handleGenerateNextChapter}
                      disabled={isProcessing}
                      className="h-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-white hover:border-zinc-600 transition-all flex flex-col items-center justify-center gap-1 min-w-[100px]"
                    >
                       <span className="text-xs font-bold uppercase">+ Next</span>
                    </button>
                 </div>
              </div>

              <div className="max-w-4xl mx-auto pt-10 px-6 pb-6">
                <MangaReader 
                  chapter={story.chapters[story.currentChapterIndex || 0]}
                  style={options.style}
                  title={story.title}
                  onNextChapter={() => {
                     // Check if next chapter exists in array
                     const nextIdx = (story.currentChapterIndex || 0) + 1;
                     if (nextIdx < story.chapters.length) {
                        handleVisualizeChapter(nextIdx);
                     } else {
                        handleGenerateNextChapter();
                     }
                  }}
                  isGeneratingNext={step === GenerationStep.GENERATING_NEXT_CHAPTER}
                />
              </div>
            </div>
          )}

          {/* Cast View */}
          {story && activeTab === 'cast' && (
            <div className="p-8 md:p-12 animate-in slide-in-from-bottom-4 duration-500">
               <div className="max-w-[1600px] mx-auto space-y-8">
                  <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div>
                       <h2 className="text-4xl font-title text-white mb-2">Character Roster</h2>
                       <p className="text-zinc-400">Total Cast: {story.characters.length} Unique Designs</p>
                    </div>
                    {imageQueue.some(t => t.type === 'character') && (
                      <div className="text-xs text-amber-500 animate-pulse font-bold uppercase tracking-wider">
                         Rendering Cast Images in Background...
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {story.characters.map((char, idx) => (
                      <div key={idx} onClick={() => {
                         if (!char.imageUrl) {
                            addToQueue([{
                              type: 'character', 
                              charId: char.id, 
                              prompt: `Character Design Sheet, Full Body, ${char.name}, ${char.role}. Appearance: ${char.appearance}. Reference Design: ${options.references.designRef}`
                            }]);
                         }
                      }}>
                         <CharacterCard 
                           character={char} 
                           loading={!char.imageUrl && imageQueue.some(t => t.type === 'character' && t.charId === char.id)} 
                         />
                         {!char.imageUrl && !imageQueue.some(t => t.type === 'character' && t.charId === char.id) && (
                            <div className="mt-2 text-center">
                               <button 
                                 className="text-xs text-amber-500 font-bold uppercase tracking-wider hover:text-white transition-colors"
                               >
                                  Click to Render
                               </button>
                            </div>
                         )}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

        </main>
        )}

      </div>
    </div>
  );
}