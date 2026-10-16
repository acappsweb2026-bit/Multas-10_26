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

  const { type, id, secondaryKey, secondaryVal } = req.body || {};
  if (!type || (!id && !secondaryVal)) {
    return res.status(400).json({ success: false, error: 'Parâmetros de exclusão insuficientes.' });
  }

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  try {
    if (type === 'driver') {
      // 1. Unlink driver from vehicles
      if (id) {
        await fetch(`${url}/rest/v1/vehicles?assigned_driver_id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ assigned_driver_id: null }),
        });
        // 2. Unlink driver from traffic_fines
        await fetch(`${url}/rest/v1/traffic_fines?driver_id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ driver_id: null }),
        });
        // 3. Unlink driver from driver_receipt_terms
        await fetch(`${url}/rest/v1/driver_receipt_terms?driver_id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ driver_id: null }),
        });
        // 4. Delete driver by id
        await fetch(`${url}/rest/v1/drivers?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers,
        });
      }
      if (secondaryKey && secondaryVal) {
        await fetch(`${url}/rest/v1/drivers?${encodeURIComponent(secondaryKey)}=eq.${encodeURIComponent(secondaryVal)}`, {
          method: 'DELETE',
          headers,
        });
      }
    } else if (type === 'vehicle') {
      if (id) {
        await fetch(`${url}/rest/v1/vehicles?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers,
        });
      }
      if (secondaryKey && secondaryVal) {
        await fetch(`${url}/rest/v1/vehicles?${encodeURIComponent(secondaryKey)}=eq.${encodeURIComponent(secondaryVal)}`, {
          method: 'DELETE',
          headers,
        });
      }
    } else if (type === 'fine' || type === 'operacao_ca') {
      // 1. Delete associated terms
      if (id) {
        await fetch(`${url}/rest/v1/driver_receipt_terms?fine_id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers,
        });
        await fetch(`${url}/rest/v1/traffic_fines?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers,
        });
      }
      if (secondaryKey && secondaryVal) {
        await fetch(`${url}/rest/v1/driver_receipt_terms?ait_number=eq.${encodeURIComponent(secondaryVal)}`, {
          method: 'DELETE',
          headers,
        });
        await fetch(`${url}/rest/v1/traffic_fines?${encodeURIComponent(secondaryKey)}=eq.${encodeURIComponent(secondaryVal)}`, {
          method: 'DELETE',
          headers,
        });
      }
    } else if (type === 'term' || type === 'operacao_ca_term') {
      if (id) {
        await fetch(`${url}/rest/v1/driver_receipt_terms?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers,
        });
      }
      if (secondaryKey && secondaryVal) {
        await fetch(`${url}/rest/v1/driver_receipt_terms?${encodeURIComponent(secondaryKey)}=eq.${encodeURIComponent(secondaryVal)}`, {
          method: 'DELETE',
          headers,
        });
      }
    } else if (type === 'user') {
      if (id) {
        await fetch(`${url}/rest/v1/system_users?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers,
        });
      }
      if (secondaryKey && secondaryVal) {
        await fetch(`${url}/rest/v1/system_users?${encodeURIComponent(secondaryKey)}=eq.${encodeURIComponent(secondaryVal)}`, {
          method: 'DELETE',
          headers,
        });
      }
    }

    return res.json({ success: true, message: `Registro do tipo ${type} excluído com sucesso do Supabase via Vercel.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erro ao excluir do Supabase via Vercel' });
  }
}
