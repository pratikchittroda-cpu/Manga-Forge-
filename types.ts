export enum GenerationStep {
  IDLE = 'IDLE',
  GENERATING_STORY = 'GENERATING_STORY',
  GENERATING_CHARACTERS = 'GENERATING_CHARACTERS',
  GENERATING_PANELS = 'GENERATING_PANELS',
  GENERATING_NEXT_CHAPTER = 'GENERATING_NEXT_CHAPTER',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface ReferenceOptions {
  storyRef: string;
  artRef: string;
  designRef: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  appearance: string;
  abilities: string;
  personality: string;
  age: string;
  height: string;
  backstory: string;
  secret: string;
  imageUrl?: string;
}

export interface Panel {
  id: number;
  description: string;
  dialogue: string;
  imageUrl?: string;
}

export interface Chapter {
  id: number;
  title: string;
  summary: string;
  panels: Panel[];
}

export interface StoryData {
  id: string; // Unique ID for saving
  createdAt: number;
  title: string;
  synopsis: string;
  genre: string;
  endingTwist: string;
  researchNotes: string;
  characters: Character[];
  chapters: Chapter[];
  currentChapterIndex: number;
}

export interface GeneratorOptions {
  genre: string;
  style: 'colored' | 'bw';
  language: string;
  tone: string;
  references: ReferenceOptions;
}

export const GENRES = [
  "Shonen (Action/Adventure)",
  "Isekai (Reincarnation)",
  "Otome Isekai (Villainess/Romance)",
  "Ecchi (Fan Service)",
  "Hentai / Adult (Uncensored)",
  "Smut / Erotica",
  "Yuri (GL) - Explicit",
  "Yaoi (BL) - Explicit",
  "Seinen (Mature/Gritty)",
  "System / Levelling",
  "Murim (Martial Arts)",
  "Cyberpunk / Sci-Fi",
  "Dark Fantasy / Eldritch",
  "School Life / Delinquent",
  "Horror / Thriller",
  "Psychological / Drama",
  "Regression / Time Travel",
  "Romance (Mature)"
];

export const LANGUAGES = [
  "English",
  "Japanese",
  "Korean",
  "Spanish",
  "French",
  "Indonesian",
  "Portuguese",
  "Chinese"
];

export const POPULAR_REFERENCES = [
  // Classics & Shonen
  "One Piece",
  "Naruto",
  "Bleach",
  "Dragon Ball Z",
  "Attack on Titan",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "Berserk",
  "Hunter x Hunter",
  "Fullmetal Alchemist",
  "Chainsaw Man",
  
  // Trending Manhwa / Webtoons
  "Solo Leveling",
  "The Fragment of Flower Blooms with Dignity",
  "Omniscient Reader's Viewpoint",
  "The Remarried Empress",
  "Lore Olympus",
  "Tower of God",
  "God of High School",
  "Noblesse",
  "Sweet Home",
  "Bastard",
  "True Beauty",
  "Lookism",
  "Viral Hit",
  "The Boxer",
  "Weak Hero",
  "UnOrdinary",
  "Mage & Demon Queen",
  "The Beginning After The End",
  "SSS-Class Suicide Hunter",
  "The World After the Fall",
  "Leveling With The Gods",
  "Return of the Mount Hua Sect",
  "Nano Machine",
  "Legend of the Northern Blade",
  "Eleceed",
  "Wind Breaker",
  "Villains Are Destined to Die",
  "Who Made Me A Princess",
  "Beware the Villainess",
  "Roxana",
  "Your Throne",
  "Purple Hyacinth",
  "Teenage Mercenary",
  "Bj Alex",
  "Killing Stalking"
];