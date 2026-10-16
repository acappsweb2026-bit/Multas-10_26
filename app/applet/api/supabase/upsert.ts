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

  const { type, payload } = req.body || {};
  if (!type || !payload) {
    return res.status(400).json({ success: false, error: 'Tipo e payload são obrigatórios.' });
  }

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation,resolution=merge-duplicates',
  };

  try {
    let tableName = '';
    const conflictColumn = 'id';

    if (type !== 'user' && !payload.owner_id) {
      payload.owner_id = 'shared-fleet-all';
    }

    if (type === 'driver') {
      tableName = 'drivers';
      if (!payload.cnh_expiration) {
        payload.cnh_expiration = new Date(Date.now() + 365 * 5 * 86400000).toISOString().slice(0, 10);
      }
      if (!payload.cnh_category) payload.cnh_category = 'B';
      if (!payload.status) payload.status = 'REGULAR';
      if (payload.current_points === undefined) payload.current_points = 0;
    } else if (type === 'vehicle') {
      tableName = 'vehicles';
      if (!payload.year_fab_mod) payload.year_fab_mod = '2024/2024';
      if (!payload.brand_model) payload.brand_model = 'Veículo';
      if (!payload.chassis) payload.chassis = '9BW' + Date.now().toString().slice(-14).padStart(14, '0');
      if (!payload.licensing_status) payload.licensing_status = 'EM_DIA';
      if (!payload.owner_name) payload.owner_name = 'Frota Própria';
      if (!payload.city_uf) payload.city_uf = 'São Paulo/SP';
    } else if (type === 'fine') {
      tableName = 'traffic_fines';
      if (!payload.due_date) {
        payload.due_date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      }
      if (!payload.infraction_date) {
        payload.infraction_date = new Date().toISOString();
      }
      if (payload.original_amount === undefined || payload.original_amount === null) {
        payload.original_amount = payload.fine_amount || 0;
      }
      if (!payload.owner_cnpj_razao_social) {
        payload.owner_cnpj_razao_social = 'Proprietário / Frota';
      }
      if (!payload.city) payload.city = 'São Paulo';
      if (!payload.state) payload.state = 'SP';
      if (!payload.infraction_location) payload.infraction_location = 'Via Pública';
      if (!payload.infraction_code) payload.infraction_code = '745-50';
      if (!payload.infraction_description) payload.infraction_description = 'Infração de trânsito';
      if (payload.points === undefined) payload.points = 4;
      if (!payload.status) payload.status = 'PENDENTE';
      if (!payload.severity) payload.severity = 'MEDIA';
    } else if (type === 'term') {
      tableName = 'driver_receipt_terms';
      if (!payload.protocol_number) payload.protocol_number = 'PROTO-' + Date.now();
      if (payload.original_fine_amount === undefined) payload.original_fine_amount = 0;
      if (payload.final_deducted_amount === undefined) payload.final_deducted_amount = 0;
      if (payload.installment_value === undefined) payload.installment_value = payload.final_deducted_amount;
      if (!payload.payroll_month) payload.payroll_month = new Date().toISOString().slice(5, 7) + '/' + new Date().getFullYear();
      if (!payload.status) payload.status = 'PENDENTE_ASSINATURA';
      if (!payload.infraction_date) payload.infraction_date = new Date().toISOString().slice(0, 10);
      if (!payload.infraction_location) payload.infraction_location = 'Via Pública';
      if (!payload.city_state) payload.city_state = 'São Paulo/SP';
      if (!payload.infraction_code) payload.infraction_code = '745-50';
      if (!payload.infraction_description) payload.infraction_description = 'Termo de Notificação';
    } else if (type === 'user') {
      tableName = 'system_users';
      if (!payload.department) payload.department = 'Operações';
      if (payload.active === undefined) payload.active = true;
    } else {
      return res.status(400).json({ success: false, error: `Tipo desconhecido: ${type}` });
    }

    // Primary upsert
    const response = await fetch(`${url}/rest/v1/${tableName}?on_conflict=${conflictColumn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({ success: true, data });
    }

    const errJson: any = await response.json().catch(() => ({}));

    // Foreign key resolution: if driver_id fails, retry without it
    if (errJson?.code === '23503') {
      const cleanPayload = { ...payload };
      if (tableName === 'traffic_fines') cleanPayload.driver_id = null;
      if (tableName === 'driver_receipt_terms') {
        cleanPayload.driver_id = null;
        cleanPayload.fine_id = null;
      }
      if (tableName === 'vehicles') cleanPayload.assigned_driver_id = null;

      const retryRes = await fetch(`${url}/rest/v1/${tableName}?on_conflict=${conflictColumn}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cleanPayload),
      });

      if (retryRes.ok) {
        const retryData = await retryRes.json();
        return res.status(200).json({ success: true, data: retryData });
      }
    }

    // Unique constraint violation (23505): update existing row
    if (errJson?.code === '23505') {
      let filterQuery = '';
      if (tableName === 'drivers') filterQuery = `cpf=eq.${encodeURIComponent(payload.cpf)}`;
      else if (tableName === 'vehicles') filterQuery = `plate=eq.${encodeURIComponent(payload.plate)}`;
      else if (tableName === 'traffic_fines') filterQuery = `ait_number=eq.${encodeURIComponent(payload.ait_number)}`;
      else if (tableName === 'driver_receipt_terms') filterQuery = `protocol_number=eq.${encodeURIComponent(payload.protocol_number)}`;

      if (filterQuery) {
        const patchRes = await fetch(`${url}/rest/v1/${tableName}?${filterQuery}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });

        if (patchRes.ok) {
          const patchData = await patchRes.json().catch(() => [payload]);
          return res.status(200).json({ success: true, data: patchData });
        }
      }
    }

    return res.status(200).json({ success: false, error: errJson?.message || 'Falha na persistência Supabase' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erro interno no servidor Vercel' });
  }
}
