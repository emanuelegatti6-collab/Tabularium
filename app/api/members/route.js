// =============================================================
//  MEMBRI DI UNA CAMPAGNA
//  Il DM legge chi è entrato nella sua campagna.
//  Le regole RLS fanno vedere i membri solo al DM proprietario
//  (o a un membro la propria riga).
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
      .from("members")
      .select("id, player_email, role, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Lettura membri fallita." }, { status: 500 });
  }
}
