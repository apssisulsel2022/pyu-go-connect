-- Add auth_settings to app_settings table
-- Date: 2026-04-15

INSERT INTO public.app_settings (key, value)
VALUES ('auth_settings', '{"email_verification_required": true}')
ON CONFLICT (key) DO NOTHING;
