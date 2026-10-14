// app/lib/supabase/client.ts — cliente de Supabase para componentes de navegador ("use client").
// Usa la publishable key (NEXT_PUBLIC_*), segura de exponer en cliente.
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
