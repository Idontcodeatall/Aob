import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { resolveBookCover } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;

    // 1. Fetch rows from library with missing or placeholder covers, or missing genres
    const { data: libraryRows, error } = await supabase
      .from('library')
      .select('id, book_id, isbn, title, author, cover_url, genres')
      .or('cover_url.is.null,cover_url.eq."",cover_url.ilike.%placeholder%,cover_url.ilike.undefined,genres.is.null');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!libraryRows || libraryRows.length === 0) {
      return NextResponse.json({ message: 'No covers to backfill.' });
    }

    let successCount = 0;
    const BATCH_SIZE = 10;
    const DELAY_MS = 500;
    const processLogs: any[] = [];

    for (let i = 0; i < libraryRows.length; i += BATCH_SIZE) {
      const batch = libraryRows.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (row) => {
        const logs: string[] = [];
        logs.push(`Processing "${row.title}" by ${row.author} (book_id: ${row.book_id})`);
        
        // We use isbn column for isbn lookup, otherwise it falls back to title/author search
        const { coverUrl: newCover, categories } = await resolveBookCover(row.isbn, row.title, row.author, logs);
        
        const updates: any = {};
        if (newCover && (!row.cover_url || row.cover_url === 'undefined' || row.cover_url === '' || row.cover_url.includes('placeholder'))) {
          updates.cover_url = newCover;
        }
        if (!row.genres || row.genres.length === 0) {
          let finalGenres = categories;
          try {
            logs.push(`[Anthropic Classification] Classifying "${row.title}"...`);
            const classRes = await fetch(`${origin}/api/classify-genre`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: row.title, author: row.author })
            });
            const classData = await classRes.json();
            if (classData.genres && classData.genres.length > 0) {
              finalGenres = classData.genres;
              logs.push(`[Anthropic Classification] Success: ${finalGenres.join(', ')}`);
            }
          } catch (err: any) {
            logs.push(`[Anthropic Classification] Failed: ${err.message}`);
          }
          updates.genres = finalGenres;
        }
        
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('library')
            .update(updates)
            .eq('id', row.id);
            
          if (!updateError) {
            successCount++;
            logs.push(`Saved ${Object.keys(updates).join(', ')} successfully.`);
          } else {
            logs.push(`Failed to save to DB: ${updateError.message}`);
          }
        } else {
          logs.push(`No new data to update.`);
        }
        
        processLogs.push({
          bookId: row.book_id,
          title: row.title,
          resolvedCover: newCover,
          resolvedCategories: categories,
          logs
        });
      }));

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < libraryRows.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    return NextResponse.json({ 
      message: 'Backfill complete', 
      totalProcessed: libraryRows.length,
      successCount,
      processLogs
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
