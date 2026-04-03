-- Fix security definer view warning
ALTER VIEW public.leaderboard SET (security_invoker = on);