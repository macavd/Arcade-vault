// app/lib/supabase/server.ts — cliente de Supabase para contexto de servidor (Route Handlers,
// Server Components, Server Actions). Integra cookies() de next/headers para que, cuando llegue
// la auth, la sesión viaje por cookies. En Next 16 cookies() es asíncrono.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component sin capacidad de escribir cookies.
            // Se ignora: el refresco de sesión lo hará el middleware (spec de auth).
          }
        },
      },
    },
  );
}
