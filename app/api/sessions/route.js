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
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Salvataggio fallito." }, { status: 500 });
  }
}
