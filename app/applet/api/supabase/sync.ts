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
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) {
    return res.status(400).json({ success: false, error: 'Supabase não configurado no ambiente Vercel.' });
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };

  try {
    const [usrRes, drvRes, vehRes, finRes, trmRes] = await Promise.all([
      fetch(`${url}/rest/v1/system_users?select=*`, { headers }),
      fetch(`${url}/rest/v1/drivers?select=*`, { headers }),
      fetch(`${url}/rest/v1/vehicles?select=*`, { headers }),
      fetch(`${url}/rest/v1/traffic_fines?select=*`, { headers }),
      fetch(`${url}/rest/v1/driver_receipt_terms?select=*`, { headers }),
    ]);

    const users = usrRes.ok ? await usrRes.json() : [];
    const drivers = drvRes.ok ? await drvRes.json() : [];
    const vehicles = vehRes.ok ? await vehRes.json() : [];
    const fines = finRes.ok ? await finRes.json() : [];
    const terms = trmRes.ok ? await trmRes.json() : [];

    res.status(200).json({
      success: true,
      users,
      drivers,
      vehicles,
      fines,
      terms,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao sincronizar com Supabase via Vercel' });
  }
}
