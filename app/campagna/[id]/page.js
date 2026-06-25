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

function Svg({ children, cls }) {
  return (
    <svg className={cls || "panel-ico"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IconScroll = () => <Svg><><path d="M6 4h11v13a3 3 0 0 1-3 3H6" /><path d="M6 4a2 2 0 0 0-2 2v1h3" /><path d="M17 20a3 3 0 0 0 3-3v-1h-3" /><path d="M9 9h5M9 13h5" /></></Svg>;
const IconParty = () => <Svg><><circle cx="8" cy="9" r="2.4" /><circle cx="16" cy="9" r="2.4" /><path d="M3 19c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" /><path d="M13 19c0-2.5 2.2-4.5 5-4.5 1 0 2 .3 2.8.8" /></></Svg>;
const IconMic = () => <Svg><><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></></Svg>;
const IconBriefing = () => <Svg cls="action-ico"><><path d="M12 6C9 4 5 4 3 5v14c2-1 6-1 9 1 3-2 7-2 9-1V5c-2-1-6-1-9 1Z" /><path d="M12 6v14" /></></Svg>;
const IconD20 = () => <Svg cls="action-ico"><><polygon points="12,2 20,7 20,17 12,22 4,17 4,7" /><polygon points="12,7 17,15.5 7,15.5" /></></Svg>;
const IconSave = () => <Svg cls="action-ico"><><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7" /><rect x="8" y="13" width="8" height="6" /></></Svg>;

function D20Divider() {
  return (
    <div className="d20-divider">
      <span className="d20-line" />
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <polygon points="24,4 41,14 41,34 24,44 7,34 7,14" />
        <polygon points="24,13 34,31 14,31" />
        <path d="M24 4v9M41 14l-7 17M7 14l7 17M14 31l10 13M34 31 24 44" />
      </svg>
      <span className="d20-line" />
    </div>
  );
}

export default function CampagnaWorkspace() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id;
  const supabase = createClient();

  const [user, setUser] = useState(undefined);
  const [ready, setReady] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [members, setMembers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedChar, setSelectedChar] = useState(null);

  const [transcript, setTranscript] = useState(ESEMPIO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [codex, setCodex] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

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
      try {
        const res = await fetch("/api/campaigns");
        const camps = res.ok ? await res.json() : [];
        const camp = camps.find((c) => c.id === campaignId);
        if (!camp) {
          router.push("/campagne");
          return;
        }
        setCampaignName(camp.name);
        setInviteCode(camp.invite_code);
        setReady(true);
        caricaSessioni();
        caricaMembri();
        caricaSchede();
      } catch (e) {
        router.push("/campagne");
      }
    });
  }, []);

  async function caricaSessioni() {
    try {
      const res = await fetch(`/api/sessions?campaignId=${campaignId}`);
      if (res.ok) setSessions(await res.json());
    } catch (e) {}
  }

  async function caricaMembri() {
    try {
      const res = await fetch(`/api/members?campaignId=${campaignId}`);
      if (res.ok) setMembers(await res.json());
    } catch (e) {}
  }

  async function caricaSchede() {
    try {
      const res = await fetch(`/api/characters?campaignId=${campaignId}`);
      if (res.ok) setCharacters(await res.json());
    } catch (e) {}
  }

  function copiaCodice() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
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
    setSelectedSessionId(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, campaignId }),
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
    setSelectedSessionId(s.id);
    setError(null);
  }

  if (user === undefined || !ready) return null;

  return (
    <main className="codex-page">
      <div className="sheet-topbar">
        <Link href="/campagne" className="back-link">
          ← Le tue campagne
        </Link>
        <span className="sheet-topbar-title">Tabolarium · {campaignName}</span>
        <div className="topbar-right">
          <span className="user-email">{user.email}</span>
          <button className="ghost" onClick={logout}>
            Esci
          </button>
        </div>
      </div>

      <img
        src="/hero-codex.png"
        alt="L'estrattore di Codex"
        className="codex-hero"
      />

      <div className="codex-body">
        <div className="codex-open-row">
          <Link href={`/campagna/${campaignId}/codex`} className="codex-open-link">
            📖 Sfoglia il Codex della campagna →
          </Link>
        </div>
        <div className="codex-grid">
          {/* ARCHIVIO SESSIONI */}
          <aside className="framed-panel sessions-panel">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
            <div className="panel-title">
              <IconScroll /> Archivio delle sessioni
            </div>
            <div className="panel-sub">
              {sessions.length}{" "}
              {sessions.length === 1 ? "sessione salvata" : "sessioni salvate"}
            </div>
            {sessions.length === 0 ? (
              <p className="panel-empty">
                Nessuna sessione ancora. Estrai e salva la prima.
              </p>
            ) : (
              <div className="session-list">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    className={
                      "session-item" +
                      (selectedSessionId === s.id ? " active" : "")
                    }
                    onClick={() => apriSessione(s)}
                  >
                    <span className="session-title">{s.title}</span>
                    <span className="session-date">
                      {new Date(s.created_at).toLocaleDateString("it-IT")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* EROI + TRASCRIZIONE */}
          <div className="codex-main">
            <div className="framed-panel heroes-panel">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <div className="panel-title">
                <IconParty /> Eroi della campagna
              </div>
              <div className="heroes-row">
                {characters.map((c) => (
                  <button
                    key={c.id}
                    className="hero-card"
                    onClick={() => setSelectedChar(c)}
                  >
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt={c.nome}
                        className="hero-avatar"
                      />
                    ) : (
                      <div className="hero-avatar placeholder">?</div>
                    )}
                    <div className="hero-name">{c.nome || "—"}</div>
                    <div className="hero-class">{c.classe || ""}</div>
                    {c.livello && <div className="hero-lvl">Liv. {c.livello}</div>}
                  </button>
                ))}
                <button
                  className="hero-card hero-add"
                  onClick={() => setShowInvite((v) => !v)}
                >
                  <span className="hero-plus">+</span>
                  <span className="hero-add-label">Aggiungi personaggio</span>
                </button>
              </div>

              {showInvite && (
                <div className="invite-inline">
                  <div className="invite-head">
                    <div>
                      <div className="invite-label">Codice d'invito</div>
                      <div className="invite-code">{inviteCode}</div>
                    </div>
                    <button className="ghost" onClick={copiaCodice}>
                      {copied ? "Copiato ✓" : "Copia"}
                    </button>
                  </div>
                  <p className="invite-hint">
                    Dallo ai giocatori: lo inseriranno in "Unisciti a una
                    campagna" per entrare e creare la loro scheda.
                  </p>
                  {members.length > 0 && (
                    <div className="members">
                      <div className="invite-label">
                        Iscritti ({members.length})
                      </div>
                      <ul>
                        {members.map((m) => (
                          <li key={m.id}>{m.player_email}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="framed-panel transcript-panel">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <div className="panel-title">
                <IconMic /> Trascrizione della sessione
              </div>
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
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={12}
                spellCheck={false}
              />
              <button
                className="ghost ripristina"
                onClick={() => {
                  setTranscript(ESEMPIO);
                  setCodex(null);
                  setSaved(false);
                  setError(null);
                  setSelectedSessionId(null);
                }}
              >
                Ripristina esempio
              </button>
            </div>
          </div>
        </div>

        {/* BARRA AZIONI */}
        <div className="codex-actions">
          <button
            className="action-btn"
            onClick={generaBriefing}
            disabled={briefingLoading}
          >
            <IconBriefing />
            <span className="action-text">
              <strong>
                {briefingLoading ? "Preparo il briefing..." : "Genera il briefing"}
              </strong>
              <small>della prossima sessione</small>
            </span>
          </button>
          <button
            className="action-btn primary"
            onClick={estrai}
            disabled={loading}
          >
            <IconD20 />
            <span className="action-text">
              <strong>{loading ? "Leggo le cronache..." : "Estrai il Codex"}</strong>
              <small>dal testo qui sopra</small>
            </span>
          </button>
          <button
            className="action-btn"
            onClick={salva}
            disabled={saving || !codex}
          >
            <IconSave />
            <span className="action-text">
              <strong>{saving ? "Salvo..." : "Salva sessione"}</strong>
              <small>{codex ? "nella campagna" : "prima estrai il Codex"}</small>
            </span>
          </button>
        </div>

        {saved && (
          <div className="saved-banner">✓ Sessione salvata nella campagna</div>
        )}
        {error && <div className="error">{error}</div>}
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
            {briefing.npc_di_ritorno && briefing.npc_di_ritorno.length > 0 && (
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
          </div>
        )}

        {codex && (
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
                                {segreto && <span className="badge">Solo DM</span>}
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
        )}

        <D20Divider />
      </div>

      {selectedChar && (
        <div
          className="char-modal-overlay"
          onClick={() => setSelectedChar(null)}
        >
          <div className="char-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="char-modal-close"
              onClick={() => setSelectedChar(null)}
            >
              ✕
            </button>
            <div className="char-modal-head">
              {selectedChar.avatar_url ? (
                <img
                  src={selectedChar.avatar_url}
                  alt={selectedChar.nome}
                  className="char-modal-avatar"
                />
              ) : (
                <div className="char-modal-avatar placeholder">?</div>
              )}
              <div>
                <h3 className="char-modal-name">
                  {selectedChar.nome || "Senza nome"}
                </h3>
                <div className="char-modal-sub">
                  {[
                    selectedChar.razza,
                    selectedChar.classe,
                    selectedChar.livello ? `Livello ${selectedChar.livello}` : "",
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </div>
              </div>
            </div>
            <div className="char-modal-body">
              {selectedChar.descrizione && (
                <div className="char-modal-section">
                  <div className="char-modal-label">Aspetto e descrizione</div>
                  <p>{selectedChar.descrizione}</p>
                </div>
              )}
              {selectedChar.background && (
                <div className="char-modal-section">
                  <div className="char-modal-label">Background</div>
                  <p>{selectedChar.background}</p>
                </div>
              )}
              {selectedChar.note && (
                <div className="char-modal-section">
                  <div className="char-modal-label">Note</div>
                  <p>{selectedChar.note}</p>
                </div>
              )}
              {!selectedChar.descrizione &&
                !selectedChar.background &&
                !selectedChar.note && (
                  <p className="char-modal-empty">
                    Questo giocatore non ha ancora compilato la scheda.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
