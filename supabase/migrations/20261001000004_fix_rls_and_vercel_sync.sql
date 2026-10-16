-- =============================================================================
-- MIGRATION 004: CORREÇÃO DE SINCRONIZAÇÃO SUPABASE + VERCEL (RLS & CONSTRAINTS)
-- Execute este script no SQL Editor do Supabase caso já tenha rodado as migrations
-- anteriores e as multas/lançamentos não estejam migrando entre o App e a Vercel.
-- =============================================================================

-- 1. Desbloquear chaves estrangeiras estritas para permitir importação de multas
--    mesmo antes do cadastro do condutor ou em qualquer ordem de sincronização
ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS vehicles_assigned_driver_id_fkey;
ALTER TABLE IF EXISTS public.traffic_fines DROP CONSTRAINT IF EXISTS traffic_fines_driver_id_fkey;
ALTER TABLE IF EXISTS public.driver_receipt_terms DROP CONSTRAINT IF EXISTS driver_receipt_terms_fine_id_fkey;
ALTER TABLE IF EXISTS public.driver_receipt_terms DROP CONSTRAINT IF EXISTS driver_receipt_terms_driver_id_fkey;
ALTER TABLE IF EXISTS public.system_users DROP CONSTRAINT IF EXISTS system_users_auth_uid_fkey;

-- 2. Garantir valores padrão de owner_id e colunas complementares de traffic_fines
ALTER TABLE IF EXISTS public.drivers ALTER COLUMN owner_id SET DEFAULT 'admin';
ALTER TABLE IF EXISTS public.vehicles ALTER COLUMN owner_id SET DEFAULT 'admin';
ALTER TABLE IF EXISTS public.traffic_fines ALTER COLUMN owner_id SET DEFAULT 'admin';
ALTER TABLE IF EXISTS public.driver_receipt_terms ALTER COLUMN owner_id SET DEFAULT 'admin';
ALTER TABLE IF EXISTS public.app_notifications ALTER COLUMN owner_id SET DEFAULT 'admin';

-- 3. Conceder permissões para as roles anon e authenticated usadas pelo SDK na Vercel
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Atualizar Políticas RLS para que registros criados via SQL Editor (owner_id = 'admin'),
--    no App ou na Vercel sejam lidos e sincronizados sem bloqueio
DROP POLICY IF EXISTS "system_users_fleet_all" ON public.system_users;
CREATE POLICY "system_users_fleet_all" ON public.system_users
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "drivers_owner_all" ON public.drivers;
DROP POLICY IF EXISTS "drivers_fleet_all" ON public.drivers;
CREATE POLICY "drivers_fleet_all" ON public.drivers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_owner_all" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_fleet_all" ON public.vehicles;
CREATE POLICY "vehicles_fleet_all" ON public.vehicles
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "traffic_fines_owner_all" ON public.traffic_fines;
DROP POLICY IF EXISTS "traffic_fines_fleet_all" ON public.traffic_fines;
CREATE POLICY "traffic_fines_fleet_all" ON public.traffic_fines
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "driver_receipt_terms_owner_all" ON public.driver_receipt_terms;
DROP POLICY IF EXISTS "driver_receipt_terms_fleet_all" ON public.driver_receipt_terms;
CREATE POLICY "driver_receipt_terms_fleet_all" ON public.driver_receipt_terms
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "app_notifications_owner_all" ON public.app_notifications;
DROP POLICY IF EXISTS "app_notifications_fleet_all" ON public.app_notifications;
CREATE POLICY "app_notifications_fleet_all" ON public.app_notifications
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
