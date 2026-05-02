-- Lock down SECURITY DEFINER functions: revoke broad EXECUTE, grant only where appropriate.
-- These functions should not be callable by anonymous or authenticated users via the API.
-- They are invoked by triggers (handle_new_user, add_holder_season_points, update_updated_at_column)
-- or are intentionally public auth helpers (handle_wallet_auth, cleanup_old_chat_messages).

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_holder_season_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_chat_messages() FROM PUBLIC, anon, authenticated;

-- handle_wallet_auth is the wallet sign-in helper. Keep callable by anon (login) but lock down public.
REVOKE EXECUTE ON FUNCTION public.handle_wallet_auth(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_wallet_auth(text, text, text) TO anon, authenticated;
