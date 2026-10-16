-- =============================================================================
-- MIGRATION 003: SUPABASE STORAGE BUCKET (PDFs DE MULTAS) & REALTIME
-- Configura o bucket 'fine-pdfs' para anexos de AIT/CNH/CRLV e Realtime
-- =============================================================================

-- 1. Criação do Bucket 'fine-pdfs' no Supabase Storage para visualização de PDFs importados
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fine-pdfs',
  'fine-pdfs',
  false,
  52428800, -- 50 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas de Segurança (RLS) para objetos no Bucket 'fine-pdfs'
DROP POLICY IF EXISTS "fine_pdfs_authenticated_select" ON storage.objects;
CREATE POLICY "fine_pdfs_authenticated_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'fine-pdfs');

DROP POLICY IF EXISTS "fine_pdfs_authenticated_insert" ON storage.objects;
CREATE POLICY "fine_pdfs_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fine-pdfs');

DROP POLICY IF EXISTS "fine_pdfs_authenticated_update" ON storage.objects;
CREATE POLICY "fine_pdfs_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fine-pdfs');

DROP POLICY IF EXISTS "fine_pdfs_authenticated_delete" ON storage.objects;
CREATE POLICY "fine_pdfs_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fine-pdfs');

-- 3. Habilitação do Supabase Realtime para atualização instantânea entre abas/clientes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.traffic_fines;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_receipt_terms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
