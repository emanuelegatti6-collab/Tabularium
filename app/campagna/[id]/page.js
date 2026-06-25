"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";

const ESEMPIO = `DM: Arrivate al Mercato dei Sussurri. È sera, le bancarelle stanno chiudendo.
Marco: aspetta, quanti PF mi erano rimasti?
DM: 14. Una donna incappucciata vi fa cenno da un vicolo. "Mi chiamo Kethra."
Giulia: passami le patatine
Marco: le chiedo chi è
DM: Kethra sorride. "A Saltmere certe cose si comprano, certe si rubano. La Gilda dei Ladri può trovare Joss... ma ci sarà un prezzo."
Giulia: Joss è il fratello di Mira, giusto?
DM: esatto, Mira vi aveva chiesto di ritrovarlo.
Marco: ok, le dico che accettiamo. Promettiamo di riportare Joss a Mira sano e salvo.
DM: Kethra annuisce. "Bene. Ma Lord Varric non sarà contento." Poi sparisce nel buio.
Luca: chi è Lord Varric?
DM: (fuori gioco: i personaggi non lo sanno) è un nobile di Casa Varric. In realtà controlla lui la Gilda, ma i giocatori non lo sanno ancora.
DM: bene, ottima pausa, ci fermiamo qui per stasera.`;

const CATEGORIE = [
  { chiave: "npc", titolo: "Personaggi non giocanti" },
  { chiave: "luoghi", titolo: "Luoghi" },
  { chiave: "fazioni", titolo: "Fazioni" },
  { chiave: "promesse", titolo: "Promesse del gruppo" },
  { chiave: "fili_aperti", titolo: "Fili aperti" },
];

export default function CampagnaWorkspace() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id;
  const supabase = createClient();

  const [user, setUser] = useState(undefined);
  const [ready, setReady] = useState(false);
  const [campaignName, setCampaignName] = useState("");

  const [transcript, setTranscript] = useState(ESEMPIO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [codex, setCodex] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState([]);

  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState(null);

  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      // Trova la campagna tra quelle dell'utente: se non c'è, torna alla home.
      try {
        const res = await fetch("/api/campaigns");
        const camps = res.ok ? await res.json() : [];
        const camp = camps.find((c) => c.id === campaignId);
        if (!camp) {
          router.push("/");
          return;
        }
        setCampaignName(camp.name);
        setReady(true);
        caricaSessioni();
      } catch (e) {
        router.push("/");
      }
    });
  }, []);

  async function caricaSessioni() {
    try {
      const res = await fetch(`/api/sessions?campaignId=${campaignId}`);
      if (res.ok) setSessions(await res.json());
    } catch (e) {}
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function trascriviAudio(e) {
    const file = e.target.files[0];
    if (!file) return;
    setTranscribing(true);
    setError(null);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("audio")
        .upload(path, file);
      if (upErr) throw upErr;

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) throw new Error("errore");
      const data = await res.json();
      setTranscript(data.text || "");
    } catch (err) {
      setError(
        "Trascrizione fallita. Controlla la dimensione del file (max 50 MB) e riprova."
      );
    } finally {
      setTranscribing(false);
      e.target.value = "";
    }
  }

  async function estrai() {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    setCodex(null);
    setSaved(false);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) throw new Error("errore");
      setCodex(await res.json());
    } catch (e) {
      setError("Estrazione fallita. Controlla la chiave API e riprova.");
    } finally {
      setLoading(false);
    }
  }

  async function salva() {
    if (!codex) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, codex, campaignId }),
      });
      if (!res.ok) throw new Error("errore");
      const nuova = await res.json();
      setSessions((s) => [nuova, ...s]);
      setSaved(true);
      setBriefing(null);
    } catch (e) {
      setError("Salvataggio fallito. Controlla le chiavi di Supabase.");
    } finally {
      setSaving(false);
    }
  }

  async function generaBriefing() {
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const res = await fetch(`/api/briefing?campaignId=${campaignId}`);
      if (!res.ok) throw new Error("errore");
      const data = await res.json();
      if (data.error) throw new Error("errore");
      setBriefing(data);
    } catch (e) {
      setBriefingError("Non sono riuscito a preparare il briefing. Riprova.");
    } finally {
      setBriefingLoading(false);
    }
  }

  function apriSessione(s) {
    setCodex(s.codex);
    setSaved(true);
    setError(null);
  }

  if (user === undefined || !ready) return null;

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/" className="back-link">
          ← Le tue campagne
        </Link>
        <span className="user-email">{user.email}</span>
        <button className="ghost" onClick={logout}>
          Esci
        </button>
      </div>

      <p className="eyebrow">Familiar · {campaignName}</p>
      <h1>L'estrattore di Codex</h1>
      <p className="sub">
        Prima di giocare, genera il briefing. Dopo, estrai e salva la nuova
        sessione: la campagna cresce e il briefing si fa più ricco.
      </p>

      {sessions.length > 0 && (
        <div className="brief-section">
          {!briefing && (
            <div className="brief-btn-row">
              <button onClick={generaBriefing} disabled={briefingLoading}>
                {briefingLoading
                  ? "Sto preparando il briefing..."
                  : "Genera il briefing della prossima sessione"}
              </button>
            </div>
          )}

          {briefingError && <div className="error">{briefingError}</div>}

          {briefing && !briefing.vuoto && (
            <div className="briefing">
              <h3>Briefing pre-sessione</h3>

              {briefing.riepilogo && (
                <>
                  <div className="brief-label">L'ultima volta</div>
                  <p className="brief-text">{briefing.riepilogo}</p>
                </>
              )}

              {briefing.fili_aperti && briefing.fili_aperti.length > 0 && (
                <>
                  <div className="brief-label">Fili in sospeso</div>
                  <ul className="brief-list">
                    {briefing.fili_aperti.map((f, i) => (
                      <li key={i}>{f.testo}</li>
                    ))}
                  </ul>
                </>
              )}

              {briefing.npc_di_ritorno &&
                briefing.npc_di_ritorno.length > 0 && (
                  <>
                    <div className="brief-label">Potrebbero tornare</div>
                    <ul className="brief-list">
                      {briefing.npc_di_ritorno.map((n, i) => (
                        <li key={i}>
                          <strong>{n.nome}</strong> — {n.motivo}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

              {briefing.gancio && (
                <div className="brief-hook">
                  <strong>Gancio pronto:</strong> {briefing.gancio}
                </div>
              )}

              <button
                className="ghost"
                style={{ marginTop: "14px" }}
                onClick={generaBriefing}
                disabled={briefingLoading}
              >
                {briefingLoading ? "..." : "Rigenera"}
              </button>
            </div>
          )}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="saved">
          <h3>Sessioni salvate</h3>
          <ul>
            {sessions.map((s) => (
              <li key={s.id}>
                <button className="saved-item" onClick={() => apriSessione(s)}>
                  <span className="saved-title">{s.title}</span>
                  <span className="saved-date">
                    {new Date(s.created_at).toLocaleDateString("it-IT")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="upload-row">
        <label className="upload-btn">
          {transcribing
            ? "Sto trascrivendo l'audio..."
            : "🎙 Carica l'audio della sessione"}
          <input
            type="file"
            accept="audio/*"
            onChange={trascriviAudio}
            disabled={transcribing}
            hidden
          />
        </label>
        <span className="upload-hint">
          L'audio diventa testo qui sotto, pronto per l'estrazione.
        </span>
      </div>

      <label className="label" htmlFor="t">
        Trascrizione della sessione
      </label>
      <textarea
        id="t"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={10}
        spellCheck={false}
      />

      <div className="row">
        <button onClick={estrai} disabled={loading}>
          {loading ? "Sto leggendo le cronache..." : "Estrai il Codex"}
        </button>
        <button
          className="ghost"
          onClick={() => {
            setTranscript(ESEMPIO);
            setCodex(null);
            setSaved(false);
            setError(null);
          }}
        >
          Ripristina esempio
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {codex && (
        <>
          <div className="savebar">
            {saved ? (
              <span className="saved-badge">✓ Salvato nella campagna</span>
            ) : (
              <button onClick={salva} disabled={saving}>
                {saving ? "Sto salvando..." : "Salva nella campagna"}
              </button>
            )}
          </div>

          <div className="results">
            {CATEGORIE.map(({ chiave, titolo }) => {
              const items = codex[chiave] || [];
              if (items.length === 0) return null;
              return (
                <section key={chiave}>
                  <div className="cat-head">
                    <h2>{titolo}</h2>
                    <span>{items.length}</span>
                  </div>
                  <ul>
                    {items.map((item, i) => {
                      const segreto = chiave === "npc" && item.segreto;
                      return (
                        <li key={i} className={segreto ? "secret" : ""}>
                          {item.testo ? (
                            <span>{item.testo}</span>
                          ) : (
                            <>
                              <div className="nome-row">
                                <strong>{item.nome}</strong>
                                {segreto && (
                                  <span className="badge">Solo DM</span>
                                )}
                              </div>
                              {item.nota && <p>{item.nota}</p>}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
