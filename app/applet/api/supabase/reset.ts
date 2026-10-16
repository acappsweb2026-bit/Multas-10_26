function getSupabaseCredentials() {
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

  return { url, anonKey };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) {
    return res.status(400).json({ success: false, error: 'Supabase não configurado no ambiente Vercel.' });
  }

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  try {
    // 1. Unlink FKs
    await fetch(`${url}/rest/v1/driver_receipt_terms?id=neq.___ZERO_MATCH___`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ driver_id: null, fine_id: null }),
    });
    await fetch(`${url}/rest/v1/traffic_fines?id=neq.___ZERO_MATCH___`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ driver_id: null }),
    });
    await fetch(`${url}/rest/v1/vehicles?id=neq.___ZERO_MATCH___`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ assigned_driver_id: null }),
    });

    // 2. Delete rows in dependency order
    await fetch(`${url}/rest/v1/driver_receipt_terms?id=neq.___ZERO_MATCH___`, {
      method: 'DELETE',
      headers,
    });
    await fetch(`${url}/rest/v1/traffic_fines?id=neq.___ZERO_MATCH___`, {
      method: 'DELETE',
      headers,
    });
    await fetch(`${url}/rest/v1/vehicles?id=neq.___ZERO_MATCH___`, {
      method: 'DELETE',
      headers,
    });
    await fetch(`${url}/rest/v1/drivers?id=neq.___ZERO_MATCH___`, {
      method: 'DELETE',
      headers,
    });
    await fetch(`${url}/rest/v1/app_notifications?id=neq.___ZERO_MATCH___`, {
      method: 'DELETE',
      headers,
    });

    // 3. Fallback verification
    const checkHeaders = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
    const tables = ['driver_receipt_terms', 'traffic_fines', 'vehicles', 'drivers', 'app_notifications'];
    for (const t of tables) {
      try {
        const getRes = await fetch(`${url}/rest/v1/${t}?select=id`, { headers: checkHeaders });
        if (getRes.ok) {
          const rows = await getRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            for (const r of rows) {
              if (r.id) {
                await fetch(`${url}/rest/v1/${t}?id=eq.${encodeURIComponent(r.id)}`, {
                  method: 'DELETE',
                  headers,
                });
              }
            }
          }
        }
      } catch {}
    }

    res.status(200).json({ success: true, message: 'Tabelas do Supabase limpas com sucesso via Vercel.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao limpar Supabase via Vercel' });
  }
}
