// Salva e legge le sessioni — ora SCOPED sull'utente loggato.
// Usiamo il client server di Supabase: legge il cookie di login,
// e le regole RLS del database fanno vedere a ciascuno solo le sue righe.

import { createClient } from "../../../utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, title, created_at, codex")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Lettura fallita." }, { status: 500 });
  }
}

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const { title, transcript, codex } = await request.json();
    // user_id viene impostato automaticamente dal default della colonna
    // (default auth.uid()) — vedi il README.
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        title: title || "Sessione del " + new Date().toLocaleString("it-IT"),
        transcript,
        codex,
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Salvataggio fallito." }, { status: 500 });
  }
}
