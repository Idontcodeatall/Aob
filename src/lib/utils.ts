/**
 * Centralized utility for cleaning up and upscaling Google Books cover URLs.
 * - Forces HTTPS
 * - Removes the edge-curl effect
 * - Upgrades zoom level to get higher-resolution images
 */
export function getHighResCover(url?: string, zoom: number = 2): string {
  if (!url) return "";
  return url
    .replace(/^http:/, "https:")
    .replace(/zoom=\d/, `zoom=${zoom}`)
    .replace("&edge=curl", "");
}

export async function resolveBookCover(isbn?: string, title?: string, author?: string, logs?: string[]): Promise<{ coverUrl: string | null, categories: string[] }> {
  const GBOOKS_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || '';

  const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
    return fetch(url, options);
  };

  const cleanIsbn = isbn?.replace(/[^0-9]/g, '');

  // 1. Google Books ISBN search
  if (cleanIsbn) {
    try {
      logs?.push(`[GBooks ISBN] Trying ${cleanIsbn}...`);
      const gbRes = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}&maxResults=1${GBOOKS_KEY ? `&key=${GBOOKS_KEY}` : ''}`);
      const gbData = await gbRes.json();
      if (gbData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
        const url = gbData.items[0].volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
        const categories = gbData.items[0].volumeInfo.categories || [];
        logs?.push(`[GBooks ISBN] Success: ${url}`);
        return { coverUrl: url.replace(/^http:\/\//i, 'https://'), categories };
      }
      logs?.push(`[GBooks ISBN] Not found.`);
    } catch (e: any) {
      logs?.push(`[GBooks ISBN] Failed: ${e.message}`);
      console.error('GBooks ISBN fetch failed:', e);
    }
  }

  // 2. Open Library ISBN search
  if (cleanIsbn) {
    try {
      logs?.push(`[OpenLibrary ISBN] Trying ${cleanIsbn}...`);
      // OpenLibrary returns a 1x1 transparent gif if default is false and not found, resulting in a 404
      const olIsbnUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`;
      const olRes = await fetchWithTimeout(olIsbnUrl, { method: 'HEAD' });
      if (olRes.ok) {
        logs?.push(`[OpenLibrary ISBN] Success: ${olIsbnUrl}`);
        return { coverUrl: olIsbnUrl.replace(/^http:\/\//i, 'https://'), categories: [] };
      }
      logs?.push(`[OpenLibrary ISBN] Not found (Status ${olRes.status}).`);
    } catch (e: any) {
      logs?.push(`[OpenLibrary ISBN] Failed: ${e.message}`);
      console.error('OpenLibrary ISBN fetch failed:', e);
    }
  }

  // 3. Open Library Title/Author search
  if (title && author) {
    try {
      logs?.push(`[OpenLibrary Title/Author] Trying "${title}" by "${author}"...`);
      const searchRes = await fetchWithTimeout(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`);
      const searchData = await searchRes.json();
      if (searchData.docs?.[0]?.cover_i) {
        const url = `https://covers.openlibrary.org/b/id/${searchData.docs[0].cover_i}-L.jpg`;
        logs?.push(`[OpenLibrary Title/Author] Success: ${url}`);
        return { coverUrl: url.replace(/^http:\/\//i, 'https://'), categories: [] };
      }
      logs?.push(`[OpenLibrary Title/Author] Not found.`);
    } catch (e: any) {
      logs?.push(`[OpenLibrary Title/Author] Failed: ${e.message}`);
      console.error('OpenLibrary Search fetch failed:', e);
    }
  }

  // Fallback to placeholder/null
  logs?.push(`[Fallback] No cover found.`);
  return { coverUrl: null, categories: [] };
}
