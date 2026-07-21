import { Post, LibraryItem } from "@/lib/ReviewContext";

export type GenreFrequency = { genre: string; count: number; percentage: number };
export type AggregateRadar = { pacing: number; metricTwo: number; metricThree: number; prose: number; vibe: number };

export function getGenreFrequency(finishedBooks: LibraryItem[]): GenreFrequency[] {
  const genreMap: Record<string, number> = {};
  let totalTags = 0;
  finishedBooks.forEach((book) => {
    const tags = book.genres && book.genres.length > 0 ? book.genres : ["Uncategorized"];
    tags.forEach((genre) => {
      genreMap[genre] = (genreMap[genre] || 0) + 1;
      totalTags++;
    });
  });
  return Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count, percentage: totalTags > 0 ? Math.round((count / totalTags) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function getAggregateRadar(books: LibraryItem[]): AggregateRadar {
  const rated = books.filter((b) => b.status === "Finished" && (b.rPacing !== undefined || b.rCharPersona !== undefined || b.rPlotInsight !== undefined || b.rProse !== undefined || b.rVibe !== undefined));
  if (rated.length === 0) return { pacing: 0, metricTwo: 0, metricThree: 0, prose: 0, vibe: 0 };

  const sum = rated.reduce(
    (acc, b) => ({
      pacing: acc.pacing + (b.rPacing || 0),
      metricTwo: acc.metricTwo + (b.rCharPersona || 0),
      metricThree: acc.metricThree + (b.rPlotInsight || 0),
      prose: acc.prose + (b.rProse || 0),
      vibe: acc.vibe + (b.rVibe || 0),
    }),
    { pacing: 0, metricTwo: 0, metricThree: 0, prose: 0, vibe: 0 }
  );

  const n = rated.length;
  return {
    pacing: parseFloat((sum.pacing / n).toFixed(1)),
    metricTwo: parseFloat((sum.metricTwo / n).toFixed(1)),
    metricThree: parseFloat((sum.metricThree / n).toFixed(1)),
    prose: parseFloat((sum.prose / n).toFixed(1)),
    vibe: parseFloat((sum.vibe / n).toFixed(1)),
  };
}

export function getChallengeStatus(finishedCount: number, target: number): string {
  if (target <= 0) return "Set a target to start!";
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const expectedByNow = (target / 365) * dayOfYear;
  const diff = finishedCount - expectedByNow;

  if (diff >= 1) return `${Math.floor(diff)} book${Math.floor(diff) !== 1 ? "s" : ""} ahead of schedule 🔥`;
  if (diff <= -1) return `${Math.abs(Math.floor(diff))} book${Math.abs(Math.floor(diff)) !== 1 ? "s" : ""} behind schedule`;
  return "Right on track!";
}

export const FICTION_TOOLTIP: Record<string, string> = {
  Pacing: "Flow & Speed — How well does the narrative momentum carry you?",
  Characters: "Depth & Relatability — Are the characters complex and believable?",
  Plot: "Narrative Arc Strength — How tight and satisfying is the story structure?",
  Prose: "Style & Beauty of Writing — Is the language itself a pleasure to read?",
  Vibe: "Emotional Resonance — Does the book leave an emotional imprint?",
};

export const NONFICTION_TOOLTIP: Record<string, string> = {
  Pacing: "Delivery of Concepts — Are ideas introduced at a digestible pace?",
  Persona: "Author's Authority/Personality — Does the author feel credible and engaging?",
  Insight: "Value of New Ideas/Aha! Moments — Did it change how you think?",
  Prose: "Ease of Understanding — Is complex material made accessible?",
  Vibe: "Delivery on Marketed Promise — Does the book live up to expectations?",
};

export const GENRE_COLORS: Record<string, string> = {
  "Literary Fiction": "#ec4899",
  "Historical Fiction": "#d97706",
  "Contemporary Fiction": "#f472b6",
  "Romance": "#f43f5e",
  "Fantasy": "#8b5cf6",
  "Science Fiction": "#6366f1",
  "Mystery": "#7c3aed",
  "Thriller": "#dc2626",
  "Horror": "#7c3aed",
  "Young Adult": "#a855f7",
  "Classic Literature": "#d97706",
  "Graphic Novel": "#06b6d4",
  "History": "#f59e0b",
  "Biography & Memoir": "#0ea5e9",
  "Philosophy": "#14b8a6",
  "Science": "#10b981",
  "Mathematics": "#3b82f6",
  "Psychology": "#3b82f6",
  "Self-Help": "#10b981",
  "Politics & Society": "#ef4444",
  "Travel": "#22c55e",
  "True Crime": "#dc2626",
  "Poetry": "#e879f9",
  "Short Stories": "#f59e0b",
  "Essay Collection": "#94a3b8",
  "Metaphysics & Spirituality": "#818cf8",
  "Uncategorized": "#6b7280"
};
