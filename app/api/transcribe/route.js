// =============================================================
//  TRASCRIZIONE VIA STORAGE (Fase 3, versione robusta)
//  Il file audio NON passa più dal server: il browser lo carica
//  nello storage di Supabase, e qui generiamo un URL temporaneo
//  che diamo a Deepgram. Così funziona con qualsiasi dimensione,
//  in locale e online. Dopo la trascrizione cancelliamo l'audio.
// =============================================================

import { createClient } from "../../../utils/supabase/server";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Spazzino opportunistico: a ogni caricamento, rimuovi eventuali file
  // orfani di QUESTO utente più vecchi di un'ora (rimasti da tentativi
  // interrotti). Se fallisce, non blocchiamo la trascrizione.
  try {
    const { data: files } = await supabase.storage.from("audio").list(user.id);
    const unOraFa = Date.now() - 60 * 60 * 1000;
    const orfani = (files || [])
      .filter((f) => f.created_at && new Date(f.created_at).getTime() < unOraFa)
      .map((f) => `${user.id}/${f.name}`);
    if (orfani.length) await supabase.storage.from("audio").remove(orfani);
  } catch (_) {}

  let path;
  try {
    const body = await request.json();
    path = body.path;
    if (!path) {
      return Response.json({ error: "Percorso file mancante" }, { status: 400 });
    }

    // URL firmato temporaneo (10 minuti): permette a Deepgram di scaricare il file.
    const { data: signed, error: signErr } = await supabase.storage
      .from("audio")
      .createSignedUrl(path, 600);
    if (signErr || !signed) {
      return Response.json(
        { error: "Impossibile generare l'URL del file." },
        { status: 500 }
      );
    }

    const params =
      "model=nova-3&language=it&diarize_model=latest&punctuate=true&smart_format=true";

    // A Deepgram passiamo l'URL (JSON), non i byte del file.
    const dg = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: signed.signedUrl }),
    });

    if (!dg.ok) {
      await supabase.storage.from("audio").remove([path]);
      return Response.json(
        { error: "Deepgram ha risposto con un errore. Controlla la chiave." },
        { status: 502 }
      );
    }

    const data = await dg.json();
    const alt = data?.results?.channels?.[0]?.alternatives?.[0];
    const words = alt?.words || [];

    // Raggruppa le parole per interlocutore.
    let transcript = "";
    let speaker = null;
    let riga = [];
    for (const w of words) {
      const sp = w.speaker ?? 0;
      const parola = w.punctuated_word || w.word;
      if (sp !== speaker) {
        if (riga.length) transcript += `Interlocutore ${speaker}: ${riga.join(" ")}\n`;
        speaker = sp;
        riga = [parola];
      } else {
        riga.push(parola);
      }
    }
    if (riga.length) transcript += `Interlocutore ${speaker}: ${riga.join(" ")}\n`;
    if (!transcript) transcript = alt?.transcript || "";

    // L'audio ha fatto il suo lavoro: cancellalo (storage ~ gratis).
    await supabase.storage.from("audio").remove([path]);

    return Response.json({ text: transcript });
  } catch (e) {
    // In caso di errore, prova comunque a non lasciare file orfani.
    if (path) {
      try {
        await supabase.storage.from("audio").remove([path]);
      } catch (_) {}
    }
    return Response.json({ error: "Trascrizione fallita." }, { status: 500 });
  }
}
