// =============================================================
//  IL CUORE DELL'ESTRAZIONE
//  Gira sul SERVER. La chiave API di Anthropic vive qui e non
//  lascia mai il server. Ora richiede anche l'utente loggato.
// =============================================================

import { createClient } from "../../../utils/supabase/server";

function costruisciPrompt(transcript, roster) {
  const bloccoPg = roster
    ? `\nI personaggi giocanti del gruppo (questi NON sono NPC, sono i protagonisti guidati dai giocatori):\n${roster}\nQuando compaiono nella trascrizione, riconoscili come membri del gruppo e NON inserirli tra gli NPC.\n`
    : "";

  return `Sei il motore di memoria di un'app per Dungeon Master. Ricevi la trascrizione grezza di una sessione di gioco di ruolo, piena di chiacchiere fuori gioco (tiri di dado, regole, snack). Il tuo compito: ignorare il rumore ed estrarre SOLO gli elementi narrativi utili alla continuità della campagna.
${bloccoPg}
Regole:
- Le battute degli NPC sono pronunciate dal DM; promesse e decisioni sono dei giocatori.
- Le battute scherzose o sarcastiche NON sono promesse vere: ignorale.
- Se un'informazione viene ritrattata o corretta, tieni solo la versione corretta.
- Se il DM rivela qualcosa che i personaggi NON conoscono, imposta "segreto": true su quell'NPC.
- Non inventare nulla che non sia nella trascrizione. Se non sai, lascia il campo vuoto o crea un filo aperto.
- Ogni "nota" deve essere brevissima (max ~12 parole).

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo prima o dopo, senza backtick. Schema:
{
  "npc": [{"nome": "", "nota": "", "segreto": false}],
  "luoghi": [{"nome": "", "nota": ""}],
  "fazioni": [{"nome": "", "nota": ""}],
  "promesse": [{"testo": ""}],
  "fili_aperti": [{"testo": ""}]
}

Trascrizione:
---
${transcript}
---`;
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
    const { transcript, campaignId } = await request.json();
    if (!transcript || !transcript.trim()) {
      return Response.json({ error: "Trascrizione vuota" }, { status: 400 });
    }

    // Recupera i personaggi del gruppo, così l'estrazione li riconosce.
    let roster = "";
    if (campaignId) {
      const { data: pgs } = await supabase
        .from("characters")
        .select("nome, razza, classe")
        .eq("campaign_id", campaignId);
      if (pgs && pgs.length > 0) {
        roster = pgs
          .filter((p) => p.nome)
          .map(
            (p) =>
              `- ${p.nome}${
                p.razza || p.classe
                  ? ` (${[p.razza, p.classe].filter(Boolean).join(", ")})`
                  : ""
              }`
          )
          .join("\n");
      }
    }

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Haiku 4.5: economico, ottimo per l'estrazione.
        // Per confrontare la qualità, rimetti "claude-sonnet-4-6".
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [
          { role: "user", content: costruisciPrompt(transcript, roster) },
        ],
      }),
    });

    if (!apiRes.ok) {
      return Response.json(
        { error: "L'API ha risposto con un errore. Controlla la chiave." },
        { status: 502 }
      );
    }

    const data = await apiRes.json();
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const codex = JSON.parse(clean);
    return Response.json(codex);
  } catch (e) {
    return Response.json(
      { error: "Estrazione fallita. Riprova o accorcia il testo." },
      { status: 500 }
    );
  }
}
