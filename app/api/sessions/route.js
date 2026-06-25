// Salva e legge le sessioni — ora dentro una CAMPAGNA.
// L'utente vede solo le proprie (RLS su user_id), filtrate per campagna.

import { createClient } from "../../../utils/supabase/server";

export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) {
    return Response.json([]); // nessuna campagna selezionata
  }

  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, title, created_at, codex")
      .eq("campaign_id", campaignId)
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
    const { title, transcript, codex, campaignId } = await request.json();
    if (!campaignId) {
      return Response.json({ error: "Campagna mancante" }, { status: 400 });
    }

    // Verifica che la campagna sia dell'utente (RLS la restituisce solo se sua).
    const { data: camp } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .single();
    if (!camp) {
      return Response.json({ error: "Campagna non valida" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        title: title || "Sessione del " + new Date().toLocaleString("it-IT"),
        transcript,
        codex,
        campaign_id: campaignId,
      })
      .select()
      .single();
    if (error) throw error;

    // Confluisci il Codex della sessione in quello cumulativo della campagna.
    if (codex) {
      try {
        await mergeCodex(supabase, campaignId, codex);
      } catch (mergeErr) {
        // Extra: se la fusione fallisce, la sessione resta comunque salvata.
      }
    }

    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Salvataggio fallito." }, { status: 500 });
  }
}

// Fonde le voci estratte nel Codex persistente della campagna.
async function mergeCodex(supabase, campaignId, codex) {
  const { data: existing } = await supabase
    .from("codex_entries")
    .select("id, tipo, nome, nota, segreto")
    .eq("campaign_id", campaignId);

  const norm = (s) => (s || "").trim().toLowerCase();
  const key = (tipo, k) => tipo + "::" + norm(k);
  const idx = new Map();
  (existing || []).forEach((e) => idx.set(key(e.tipo, e.nome ?? e.nota), e));

  const toInsert = [];
  const toUpdate = [];

  const entita = (tipo, nome, nota, segreto) => {
    if (!nome || !nome.trim()) return;
    const k = key(tipo, nome);
    const ex = idx.get(k);
    if (ex) {
      let nuovaNota = ex.nota || "";
      const n = (nota || "").trim();
      if (n && !norm(nuovaNota).includes(norm(n))) {
        nuovaNota = nuovaNota ? nuovaNota + "\n" + n : n;
      }
      const nuovoSegreto = !!ex.segreto || !!segreto;
      if (nuovaNota !== (ex.nota || "") || nuovoSegreto !== !!ex.segreto) {
        toUpdate.push({ id: ex.id, nota: nuovaNota, segreto: nuovoSegreto });
        ex.nota = nuovaNota;
        ex.segreto = nuovoSegreto;
      }
    } else {
      const row = {
        campaign_id: campaignId,
        tipo,
        nome: nome.trim(),
        nota: (nota || "").trim(),
        segreto: !!segreto,
      };
      toInsert.push(row);
      idx.set(k, row);
    }
  };

  const enunciato = (tipo, testo) => {
    if (!testo || !testo.trim()) return;
    const k = key(tipo, testo);
    if (idx.get(k)) return;
    const row = {
      campaign_id: campaignId,
      tipo,
      nome: null,
      nota: testo.trim(),
      segreto: false,
    };
    toInsert.push(row);
    idx.set(k, row);
  };

  (codex.npc || []).forEach((i) => entita("npc", i.nome, i.nota, i.segreto));
  (codex.luoghi || []).forEach((i) => entita("luogo", i.nome, i.nota));
  (codex.fazioni || []).forEach((i) => entita("fazione", i.nome, i.nota));
  (codex.promesse || []).forEach((i) => enunciato("promessa", i.testo));
  (codex.fili_aperti || []).forEach((i) => enunciato("filo", i.testo));

  if (toInsert.length) {
    await supabase.from("codex_entries").insert(toInsert);
  }
  for (const u of toUpdate) {
    await supabase
      .from("codex_entries")
      .update({
        nota: u.nota,
        segreto: u.segreto,
        updated_at: new Date().toISOString(),
      })
      .eq("id", u.id);
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

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID mancante" }, { status: 400 });

    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Eliminazione fallita." }, { status: 500 });
  }
}
