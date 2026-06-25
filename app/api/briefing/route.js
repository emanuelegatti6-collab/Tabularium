// Il briefing pre-sessione — ora legge SOLO le sessioni dell'utente loggato.

import { createClient } from "../../../utils/supabase/server";

function costruisciPrompt(sessioniText) {
  return `Sei l'assistente di un Dungeon Master. Ricevi i Codex (in JSON) delle sessioni passate di una campagna, in ordine cronologico. Prepara un BRIEFING per la PROSSIMA sessione, così il DM riprende il filo in trenta secondi.

Produci:
- riepilogo: cosa è successo nell'ULTIMA sessione (la più recente), 2-3 frasi.
- fili_aperti: le questioni rimaste in sospeso nell'intera campagna che il DM dovrebbe ricordare.
- npc_di_ritorno: gli NPC che probabilmente ricompariranno, ciascuno con il motivo (un conto in sospeso, un favore, una minaccia).
- gancio: UN singolo aggancio narrativo pronto all'uso, coerente con la campagna.

Non inventare eventi che non sono nei Codex. Se un dato manca, ometti il campo.
Rispondi SOLO con JSON valido, senza testo prima o dopo, senza backtick. Schema:
{
  "riepilogo": "",
  "fili_aperti": [{"testo": ""}],
  "npc_di_ritorno": [{"nome": "", "motivo": ""}],
  "gancio": ""
}

Sessioni (dalla più vecchia alla più recente):
---
${sessioniText}
---`;
}

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
    return Response.json({ vuoto: true });
  }

  try {
    const { data: sessioni, error } = await supabase
      .from("sessions")
      .select("title, created_at, codex")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    if (!sessioni || sessioni.length === 0) {
      return Response.json({ vuoto: true });
    }

    const sessioniText = sessioni
      .map(
        (s) =>
          `Sessione: ${s.title} (${new Date(s.created_at).toLocaleDateString(
            "it-IT"
          )})\n${JSON.stringify(s.codex)}`
      )
      .join("\n\n");

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content: costruisciPrompt(sessioniText) }],
      }),
    });

    if (!apiRes.ok) {
      return Response.json(
        { error: "L'API ha risposto con un errore." },
        { status: 502 }
      );
    }

    const data = await apiRes.json();
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const briefing = JSON.parse(clean);
    return Response.json(briefing);
  } catch (e) {
    return Response.json(
      { error: "Generazione del briefing fallita." },
      { status: 500 }
    );
  }
}
