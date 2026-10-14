// app/api/health/supabase/route.ts — endpoint de salud para verificar la conexión con Supabase.
// Sin tablas aún: solo comprueba que el cliente server se instancia y responde.
import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, session: data.session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
