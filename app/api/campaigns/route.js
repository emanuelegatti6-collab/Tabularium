// =============================================================
//  CAMPAGNE (la fondazione del multi-utente)
//  Ogni campagna ha un DM proprietario (dm_id = auth.uid()).
//  Le regole RLS fanno vedere a ogni DM solo le proprie campagne.
// =============================================================

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
      .from("campaigns")
      .select("id, name, created_at")
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
    // dm_id viene impostato dal default della colonna (auth.uid()).
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ name: name.trim() })
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
