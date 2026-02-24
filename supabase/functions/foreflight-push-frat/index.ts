 SELECT cron.schedule('foreflight-sync', '*/5 * * * *', $$
    SELECT net.http_post(
      url:='https://abfqoijsjyyiyvvaycsg.supabase.co/functions/v1/foreflight-sync',
      headers:=jsonb_build_object('Authorization','Bearer ***REDACTED***','Content-Type','application/json'),
      body:='{}'::jsonb
    );
  $$);
