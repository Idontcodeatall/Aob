import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { title, author } = await request.json();

    if (!title || !author) {
      return NextResponse.json({ error: 'Title and author are required' }, { status: 400 });
    }

    const systemPrompt = `You are a book genre classifier. You will be given a book title and author. Classify the book into 1 to 3 genres from this exact list only — do not invent new genres or use genres outside this list:

Literary Fiction, Historical Fiction, Contemporary Fiction, Romance, Fantasy, Science Fiction, Mystery, Thriller, Horror, Young Adult, Classic Literature, Graphic Novel, History, Biography & Memoir, Philosophy, Science, Mathematics, Psychology, Self-Help, Politics & Society, Travel, True Crime, Poetry, Short Stories, Essay Collection, Metaphysics & Spirituality

Return ONLY a JSON array of the matching genres, nothing else. No explanation, no preamble. Example output: ["Fantasy", "Literary Fiction"]`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Title: ${title}, Author: ${author}`
        }
      ]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';
    
    let genres: string[] = [];
    try {
      // Find the first '[' and last ']' to safely parse in case model added extra text
      const start = responseText.indexOf('[');
      const end = responseText.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        genres = JSON.parse(responseText.substring(start, end + 1));
      } else {
        genres = JSON.parse(responseText);
      }
    } catch (e) {
      console.error('Failed to parse Anthropic response:', responseText);
    }

    // Filter to ensure only valid genres just to be safe
    const validGenres = [
      "Literary Fiction", "Historical Fiction", "Contemporary Fiction", "Romance", "Fantasy", 
      "Science Fiction", "Mystery", "Thriller", "Horror", "Young Adult", "Classic Literature", 
      "Graphic Novel", "History", "Biography & Memoir", "Philosophy", "Science", "Mathematics", 
      "Psychology", "Self-Help", "Politics & Society", "Travel", "True Crime", "Poetry", 
      "Short Stories", "Essay Collection", "Metaphysics & Spirituality"
    ];
    
    genres = genres.filter(g => validGenres.includes(g));

    return NextResponse.json({ genres });
  } catch (error: any) {
    console.error('Genre classification error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
