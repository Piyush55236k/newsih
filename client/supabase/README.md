Setup steps for Supabase

1) Open your project at https://supabase.com, go to SQL Editor.
2) Paste and run schema.sql from this folder.
3) In Project Settings → API, copy the Project URL and anon key.
4) In your app .env, set:
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
5) If you change RLS later, ensure Realtime is enabled for tables you need (Database → Replication → supabase_realtime publication).
6) Restart the dev server.
