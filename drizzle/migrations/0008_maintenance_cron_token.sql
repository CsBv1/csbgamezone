CREATE TABLE public.internal_job_tokens (name text PRIMARY KEY, token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex'));
GRANT ALL ON public.internal_job_tokens TO service_role;
REVOKE ALL ON public.internal_job_tokens FROM anon, authenticated;
ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_job_tokens(name) VALUES ('weekly-holder-maintenance');
SELECT cron.unschedule('weekly-holder-maintenance-job');
SELECT cron.schedule('weekly-holder-maintenance-job','0 0 * * 1',$$
  SELECT net.http_post(
    url := 'https://uhamcugnjzcmwfquyeom.supabase.co/functions/v1/weekly-holder-maintenance',
    headers := jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT token FROM public.internal_job_tokens WHERE name='weekly-holder-maintenance')),
    body := '{}'::jsonb);
$$);