-- =============================================================================
-- MIGRATION 001: INITIAL SCHEMA - CONTROLE INTERNO DE INFRAÇÕES DE TRÂNSITO
-- Compatível com Supabase / PostgreSQL 15+ e Vercel
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tipos Enumerados (ENUMs)
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM (
    'ADMIN', 'GESTOR_FROTA', 'GESTOR_RH', 'GESTOR_LOGISTICA', 'OPERADOR', 'AUDITOR', 'MOTORISTA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cnh_category_enum AS ENUM ('A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_status_enum AS ENUM ('REGULAR', 'ALERTA', 'SUSPENSA', 'CASSADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_licensing_enum AS ENUM ('EM_DIA', 'PENDENTE', 'VENCIDO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fine_status_enum AS ENUM ('PENDENTE', 'VENCIDA', 'PAGA', 'EM_RECURSO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fine_severity_enum AS ENUM ('LEVE', 'MEDIA', 'GRAVE', 'GRAVISSIMA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE term_status_enum AS ENUM ('PENDENTE_ASSINATURA', 'ASSINADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela de Usuários e Permissões (system_users)
CREATE TABLE IF NOT EXISTS public.system_users (
  id TEXT PRIMARY KEY DEFAULT ('usr-' || gen_random_uuid()::text),
  auth_uid UUID,
  name VARCHAR(160) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  cpf VARCHAR(20),
  password_hash TEXT NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'OPERADOR',
  custom_role_name VARCHAR(80),
  department VARCHAR(120) NOT NULL DEFAULT 'Operações',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  permissions JSONB NOT NULL DEFAULT '{
    "viewDashboard": true,
    "manageDrivers": true,
    "manageVehicles": true,
    "manageFines": true,
    "searchFines": true,
    "generateReports": true,
    "manageTerms": true,
    "applyDoubledFine": false,
    "manageUsers": false,
    "resetDatabase": false
  }'::jsonb,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Motoristas e Condutores (drivers)
CREATE TABLE IF NOT EXISTS public.drivers (
  id TEXT PRIMARY KEY DEFAULT ('drv-' || gen_random_uuid()::text),
  owner_id TEXT NOT NULL DEFAULT 'admin',
  name VARCHAR(160) NOT NULL,
  cpf VARCHAR(20) NOT NULL,
  cnh_number VARCHAR(30) NOT NULL,
  cnh_category cnh_category_enum NOT NULL DEFAULT 'B',
  cnh_expiration DATE NOT NULL DEFAULT '2028-12-31',
  birth_date DATE,
  current_points INTEGER NOT NULL DEFAULT 0 CHECK (current_points >= 0),
  status driver_status_enum NOT NULL DEFAULT 'REGULAR',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL DEFAULT '',
  assigned_vehicle_plate VARCHAR(15),
  company_name VARCHAR(160),
  company_cnpj VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_drivers_cpf_owner UNIQUE (owner_id, cpf),
  CONSTRAINT uq_drivers_cnh_owner UNIQUE (owner_id, cnh_number)
);

-- 4. Tabela de Veículos da Frota (vehicles)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY DEFAULT ('veh-' || gen_random_uuid()::text),
  owner_id TEXT NOT NULL DEFAULT 'admin',
  plate VARCHAR(15) NOT NULL,
  renavam VARCHAR(20) NOT NULL,
  chassis VARCHAR(30) NOT NULL,
  brand_model VARCHAR(120) NOT NULL,
  year_fab_mod VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(40) NOT NULL DEFAULT 'Caminhão',
  fuel VARCHAR(40) NOT NULL DEFAULT 'Diesel S10',
  color VARCHAR(40) NOT NULL DEFAULT 'Branco',
  owner_name VARCHAR(160) NOT NULL,
  owner_cnpj_cpf VARCHAR(30) NOT NULL DEFAULT '',
  city_uf VARCHAR(80) NOT NULL,
  assigned_driver_id TEXT,
  licensing_status vehicle_licensing_enum NOT NULL DEFAULT 'EM_DIA',
  active_fines_count INTEGER NOT NULL DEFAULT 0 CHECK (active_fines_count >= 0),
  total_fines_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_fines_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vehicles_plate_owner UNIQUE (owner_id, plate),
  CONSTRAINT uq_vehicles_renavam_owner UNIQUE (owner_id, renavam)
);

-- 5. Tabela de Multas e Autos de Infração de Trânsito (traffic_fines)
CREATE TABLE IF NOT EXISTS public.traffic_fines (
  id TEXT PRIMARY KEY DEFAULT ('fine-' || gen_random_uuid()::text),
  owner_id TEXT NOT NULL DEFAULT 'admin',
  ait_number VARCHAR(60) NOT NULL,
  plate VARCHAR(15) NOT NULL,
  infraction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  infraction_location VARCHAR(250) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(10) NOT NULL DEFAULT 'SP',
  infraction_code VARCHAR(20) NOT NULL,
  infraction_description VARCHAR(500) NOT NULL,
  fine_amount NUMERIC(12, 2) NOT NULL CHECK (fine_amount >= 0),
  discount_amount NUMERIC(12, 2) CHECK (discount_amount >= 0),
  original_amount NUMERIC(12, 2) NOT NULL CHECK (original_amount >= 0),
  is_doubled_fine BOOLEAN NOT NULL DEFAULT FALSE,
  multiplier_factor INTEGER NOT NULL DEFAULT 1 CHECK (multiplier_factor >= 1 AND multiplier_factor <= 20),
  is_nic_fine BOOLEAN NOT NULL DEFAULT FALSE,
  owner_cnpj_razao_social VARCHAR(200) NOT NULL,
  driver_id TEXT,
  driver_name VARCHAR(160),
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status fine_status_enum NOT NULL DEFAULT 'PENDENTE',
  severity fine_severity_enum NOT NULL DEFAULT 'MEDIA',
  points INTEGER NOT NULL DEFAULT 4 CHECK (points >= 0 AND points <= 100),
  issuing_authority VARCHAR(40) NOT NULL DEFAULT 'DETRAN',
  pdf_file_name VARCHAR(200),
  pdf_data_url TEXT,
  pdf_mime_type VARCHAR(80),
  imported_at TIMESTAMPTZ,
  is_detran_synced BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  term_signed BOOLEAN NOT NULL DEFAULT FALSE,
  term_signed_at TIMESTAMPTZ,
  payroll_installments INTEGER,
  payroll_deducted_amount NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_traffic_fines_ait_owner UNIQUE (owner_id, ait_number)
);

-- 6. Tabela de Termos de Ciência e Desconto em Folha (driver_receipt_terms)
CREATE TABLE IF NOT EXISTS public.driver_receipt_terms (
  id TEXT PRIMARY KEY DEFAULT ('term-' || gen_random_uuid()::text),
  owner_id TEXT NOT NULL DEFAULT 'admin',
  protocol_number VARCHAR(60) NOT NULL,
  fine_id TEXT,
  ait_number VARCHAR(60) NOT NULL,
  plate VARCHAR(15) NOT NULL,
  vehicle_model VARCHAR(120) NOT NULL DEFAULT '',
  driver_id TEXT,
  driver_name VARCHAR(160) NOT NULL,
  driver_cpf VARCHAR(25) NOT NULL,
  driver_cnh VARCHAR(30) NOT NULL,
  infraction_date VARCHAR(35) NOT NULL,
  infraction_location VARCHAR(250) NOT NULL,
  city_state VARCHAR(120) NOT NULL,
  infraction_code VARCHAR(20) NOT NULL,
  infraction_description VARCHAR(500) NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  original_points INTEGER,
  issuing_authority VARCHAR(40) NOT NULL DEFAULT 'DETRAN',
  original_fine_amount NUMERIC(12, 2) NOT NULL CHECK (original_fine_amount >= 0),
  final_deducted_amount NUMERIC(12, 2) NOT NULL CHECK (final_deducted_amount >= 0),
  is_doubled_fine BOOLEAN NOT NULL DEFAULT FALSE,
  use_sne_discount BOOLEAN NOT NULL DEFAULT FALSE,
  installments INTEGER NOT NULL DEFAULT 1 CHECK (installments >= 1 AND installments <= 60),
  installment_value NUMERIC(12, 2) NOT NULL CHECK (installment_value >= 0),
  payroll_month VARCHAR(20) NOT NULL,
  company_name VARCHAR(160) NOT NULL DEFAULT '',
  company_cnpj VARCHAR(30) NOT NULL DEFAULT '',
  status term_status_enum NOT NULL DEFAULT 'PENDENTE_ASSINATURA',
  signed_at TIMESTAMPTZ,
  signature_hash VARCHAR(128),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_terms_protocol_owner UNIQUE (owner_id, protocol_number),
  CONSTRAINT uq_terms_ait_owner UNIQUE (owner_id, ait_number)
);

-- 7. Tabela de Notificações e Alertas em Tempo Real (app_notifications)
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif-' || gen_random_uuid()::text),
  owner_id TEXT NOT NULL DEFAULT 'admin',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'INFO',
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  related_plate VARCHAR(15),
  related_ait VARCHAR(60),
  related_driver_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_drivers_owner_cpf ON public.drivers (owner_id, cpf);
CREATE INDEX IF NOT EXISTS idx_drivers_owner_cnh ON public.drivers (owner_id, cnh_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_plate ON public.vehicles (owner_id, plate);
CREATE INDEX IF NOT EXISTS idx_fines_owner_plate ON public.traffic_fines (owner_id, plate);
CREATE INDEX IF NOT EXISTS idx_fines_owner_status ON public.traffic_fines (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_fines_owner_due_date ON public.traffic_fines (owner_id, due_date);
CREATE INDEX IF NOT EXISTS idx_terms_owner_ait ON public.driver_receipt_terms (owner_id, ait_number);
CREATE INDEX IF NOT EXISTS idx_notifications_owner_read ON public.app_notifications (owner_id, read);
