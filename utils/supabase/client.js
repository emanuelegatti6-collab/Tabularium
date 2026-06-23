// Client di Supabase per il BROWSER (usato nella pagina di login).
// Usa la chiave pubblica "anon": è progettata per stare nel browser.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
