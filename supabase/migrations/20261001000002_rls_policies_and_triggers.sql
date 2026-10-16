-- =============================================================================
-- MIGRATION 002: ROW LEVEL SECURITY (RLS), TRIGGERS & BUSINESS RULES
-- Compatível com Supabase + Vercel + Regras do CTB (Art. 257 § 8º)
-- =============================================================================

-- 0. Remover chaves estrangeiras estritas que possam impedir importação fora de ordem
ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS vehicles_assigned_driver_id_fkey;
ALTER TABLE IF EXISTS public.traffic_fines DROP CONSTRAINT IF EXISTS traffic_fines_driver_id_fkey;
ALTER TABLE IF EXISTS public.driver_receipt_terms DROP CONSTRAINT IF EXISTS driver_receipt_terms_fine_id_fkey;
ALTER TABLE IF EXISTS public.driver_receipt_terms DROP CONSTRAINT IF EXISTS driver_receipt_terms_driver_id_fkey;
ALTER TABLE IF EXISTS public.system_users DROP CONSTRAINT IF EXISTS system_users_auth_uid_fkey;

-- 1. Trigger Automática de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_users_updated_at ON public.system_users;
CREATE TRIGGER trg_system_users_updated_at
  BEFORE UPDATE ON public.system_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_drivers_updated_at ON public.drivers;
CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_traffic_fines_updated_at ON public.traffic_fines;
CREATE TRIGGER trg_traffic_fines_updated_at
  BEFORE UPDATE ON public.traffic_fines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_terms_updated_at ON public.driver_receipt_terms;
CREATE TRIGGER trg_terms_updated_at
  BEFORE UPDATE ON public.driver_receipt_terms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Trigger de Regra de Negócio CTB: Multa Dobrada (2x NIC PJ) -> Zera Pontos na CNH
CREATE OR REPLACE FUNCTION public.enforce_ctb_doubled_fine_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_doubled_fine = TRUE THEN
    NEW.points := 0;
    NEW.is_nic_fine := TRUE;
    IF NEW.multiplier_factor < 2 THEN
      NEW.multiplier_factor := 2;
    END IF;
    NEW.fine_amount := ROUND((NEW.original_amount * NEW.multiplier_factor)::numeric, 2);
    NEW.discount_amount := ROUND((NEW.fine_amount * 0.80)::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ctb_doubled_fine ON public.traffic_fines;
CREATE TRIGGER trg_enforce_ctb_doubled_fine
  BEFORE INSERT OR UPDATE ON public.traffic_fines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ctb_doubled_fine_rules();

-- 3. Trigger de Atualização Automática de Pontos do Motorista e Status da CNH
CREATE OR REPLACE FUNCTION public.recalculate_driver_cnh_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_id TEXT;
  v_total_points INTEGER;
  v_new_status driver_status_enum;
BEGIN
  v_driver_id := COALESCE(NEW.driver_id, OLD.driver_id);
  IF v_driver_id IS NOT NULL THEN
    SELECT COALESCE(SUM(points), 0)
      INTO v_total_points
      FROM public.traffic_fines
     WHERE driver_id = v_driver_id;

    IF v_total_points >= 40 THEN
      v_new_status := 'SUSPENSA';
    ELSIF v_total_points >= 20 THEN
      v_new_status := 'ALERTA';
    ELSE
      v_new_status := 'REGULAR';
    END IF;

    UPDATE public.drivers
       SET current_points = v_total_points,
           status = CASE WHEN status = 'CASSADA' THEN 'CASSADA'::driver_status_enum ELSE v_new_status END,
           updated_at = NOW()
     WHERE id = v_driver_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_driver_points ON public.traffic_fines;
CREATE TRIGGER trg_recalculate_driver_points
  AFTER INSERT OR UPDATE OR DELETE ON public.traffic_fines
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_driver_cnh_points();

-- 4. Habilitação de Row Level Security (RLS) e Permissões para o App (Vercel / Supabase Client)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_receipt_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Políticas RLS que permitem leitura e sincronização de toda a frota entre App, Supabase e Vercel
DROP POLICY IF EXISTS "system_users_fleet_all" ON public.system_users;
CREATE POLICY "system_users_fleet_all" ON public.system_users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "drivers_owner_all" ON public.drivers;
DROP POLICY IF EXISTS "drivers_fleet_all" ON public.drivers;
CREATE POLICY "drivers_fleet_all" ON public.drivers
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_owner_all" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_fleet_all" ON public.vehicles;
CREATE POLICY "vehicles_fleet_all" ON public.vehicles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "traffic_fines_owner_all" ON public.traffic_fines;
DROP POLICY IF EXISTS "traffic_fines_fleet_all" ON public.traffic_fines;
CREATE POLICY "traffic_fines_fleet_all" ON public.traffic_fines
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "driver_receipt_terms_owner_all" ON public.driver_receipt_terms;
DROP POLICY IF EXISTS "driver_receipt_terms_fleet_all" ON public.driver_receipt_terms;
CREATE POLICY "driver_receipt_terms_fleet_all" ON public.driver_receipt_terms
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "app_notifications_owner_all" ON public.app_notifications;
DROP POLICY IF EXISTS "app_notifications_fleet_all" ON public.app_notifications;
CREATE POLICY "app_notifications_fleet_all" ON public.app_notifications
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
