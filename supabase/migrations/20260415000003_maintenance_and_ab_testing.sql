-- Migration: Maintenance & Reminder Module + A/B Testing Infrastructure
-- Date: 2026-04-15

-- 1. Maintenance Module Tables
CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- 'oil_change', 'routine_service', 'tire_check', etc.
    service_date DATE NOT NULL,
    mileage INTEGER,
    cost DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    document_url TEXT, -- Invoice/Receipt
    performed_by TEXT, -- Workshop name
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicle_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL, -- 'service', 'stnk', 'kir', 'insurance'
    due_date DATE NOT NULL,
    last_notified_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'overdue'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for performance (API < 200ms)
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.vehicle_maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.vehicle_reminders(due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reminders_vehicle_id ON public.vehicle_reminders(vehicle_id);

-- 2. A/B Testing Infrastructure
CREATE TABLE IF NOT EXISTS public.ab_test_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ab_test_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES public.ab_test_experiments(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'control', 'variant_a', etc.
    traffic_weight INTEGER NOT NULL, -- 40, 30, 20, 10
    config JSONB NOT NULL, -- Pricing params
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_experiment_assignments (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    experiment_id UUID REFERENCES public.ab_test_experiments(id) ON DELETE CASCADE,
    variation_id UUID REFERENCES public.ab_test_variations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, experiment_id)
);

-- Enable RLS
ALTER TABLE public.vehicle_maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_experiment_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can view their own maintenance logs" ON public.vehicle_maintenance_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_maintenance_logs.vehicle_id AND v.driver_id = auth.uid()));

CREATE POLICY "Drivers can view their own reminders" ON public.vehicle_reminders
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_reminders.vehicle_id AND v.driver_id = auth.uid()));

CREATE POLICY "Admins have full access to maintenance" ON public.vehicle_maintenance_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to reminders" ON public.vehicle_reminders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage AB tests" ON public.ab_test_experiments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
