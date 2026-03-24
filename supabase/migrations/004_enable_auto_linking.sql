-- Enable automatic user linking: when a user signs in with Google
-- using an email that already has an email+password account,
-- the accounts are automatically linked instead of creating a new user.
-- This is set via the auth.config in the Supabase dashboard.
--
-- Note: This migration is a no-op SQL-wise. The actual setting is:
-- Dashboard → Authentication → Providers → "Automatic user linking" = enabled
--
-- If you need to do it programmatically, use the Management API:
-- PATCH /v1/projects/{ref}/config/auth
-- { "GOTRUE_SECURITY_AUTOMATIC_LINKING_ENABLED": "true" }

SELECT 1; -- placeholder
