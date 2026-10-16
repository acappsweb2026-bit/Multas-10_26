export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const url = (
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.PUBLIC_SUPABASE_URL ||
    ''
  ).trim();

  const anonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  if (!url || !anonKey) {
    return res.status(400).json({ success: false, error: 'Supabase não configurado nas variáveis de ambiente da Vercel.' });
  }

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  try {
    // Clean tables in foreign-key dependency order
    const tablesToClean = [
      'driver_receipt_terms',
      'traffic_fines',
      'vehicles',
      'drivers',
      'app_notifications',
    ];

    for (const table of tablesToClean) {
      if (table === 'vehicles') {
        await fetch(`${url}/rest/v1/${table}?assigned_driver_id=not.is.null`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ assigned_driver_id: null }),
        });
      }
      await fetch(`${url}/rest/v1/${table}?id=not.is.null`, {
        method: 'DELETE',
        headers,
      });
    }

    return res.json({ success: true, message: 'Banco de dados Supabase resetado com sucesso via Vercel.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erro ao limpar Supabase via Vercel' });
  }
}
