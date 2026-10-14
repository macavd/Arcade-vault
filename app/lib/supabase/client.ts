// app/lib/supabase/client.ts — cliente de Supabase para componentes de navegador ("use client").
// Usa la publishable key (NEXT_PUBLIC_*), segura de exponer en cliente.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
