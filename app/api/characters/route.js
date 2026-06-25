// =============================================================
//  SCHEDE DEI PERSONAGGI (lato DM, sola lettura)
//  Il DM legge le schede dei giocatori della sua campagna.
//  Le regole RLS garantiscono che veda solo le campagne sue.
// =============================================================

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
    return Response.json([]);
  }

  try {
    const { data, error } = await supabase
      .from("characters")
      .select(
        "id, nome, razza, classe, descrizione, background, note, avatar_url"
      )
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Lettura schede fallita." }, { status: 500 });
  }
}
