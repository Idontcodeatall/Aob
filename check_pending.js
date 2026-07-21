require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkPending() {
  const { count, error } = await supabase
    .from('library')
    .select('id', { count: 'exact' })
    .or('cover_url.is.null,cover_url.eq."",cover_url.ilike.%placeholder%,cover_url.ilike.undefined,genres.is.null');

  if (error) {
    console.error(error);
  } else {
    console.log('Pending books:', count);
  }
}
checkPending();
