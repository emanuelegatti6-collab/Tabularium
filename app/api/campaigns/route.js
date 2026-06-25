// =============================================================
//  CAMPAGNE
//  Ogni campagna ha un DM proprietario e un CODICE D'INVITO
//  con cui i giocatori possono entrare.
// =============================================================

import { createClient } from "../../../utils/supabase/server";

// Codice breve e leggibile (niente caratteri ambigui come O/0, I/1).
function generaCodice() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

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
      .from("campaigns")
      .select("id, name, created_at, invite_code")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Lettura campagne fallita." }, { status: 500 });
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
    const { name } = await request.json();
    if (!name || !name.trim()) {
      return Response.json({ error: "Nome mancante" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ name: name.trim(), invite_code: generaCodice() })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json(
      { error: "Creazione campagna fallita." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Id mancante" }, { status: 400 });
  }

  try {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "Eliminazione campagna fallita." },
      { status: 500 }
    );
  }
}
