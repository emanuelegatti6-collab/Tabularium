// Codex persistente e cumulativo della campagna.
// Solo il DM (proprietario, RLS su user_id) legge e modifica.

import { createClient } from "../../../utils/supabase/server";

export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) return Response.json([]);

  try {
    const { data, error } = await supabase
      .from("codex_entries")
      .select("id, tipo, nome, nota, segreto, updated_at")
      .eq("campaign_id", campaignId)
      .order("nome", { ascending: true });
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
  if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

  try {
    const { campaignId, tipo, nome, nota, segreto } = await request.json();
    if (!campaignId || !tipo)
      return Response.json({ error: "Dati mancanti" }, { status: 400 });

    const { data, error } = await supabase
      .from("codex_entries")
      .insert({
        campaign_id: campaignId,
        tipo,
        nome: nome || null,
        nota: nota || "",
        segreto: !!segreto,
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Creazione fallita." }, { status: 500 });
  }
}

export async function PATCH(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

  try {
    const { id, nome, nota, segreto } = await request.json();
    if (!id) return Response.json({ error: "ID mancante" }, { status: 400 });

    const patch = { updated_at: new Date().toISOString() };
    if (nome !== undefined) patch.nome = nome;
    if (nota !== undefined) patch.nota = nota;
    if (segreto !== undefined) patch.segreto = !!segreto;

    const { data, error } = await supabase
      .from("codex_entries")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Modifica fallita." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID mancante" }, { status: 400 });

    const { error } = await supabase.from("codex_entries").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Eliminazione fallita." }, { status: 500 });
  }
}
