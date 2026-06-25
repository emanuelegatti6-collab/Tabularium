"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../utils/supabase/client";

const TIPI = [
  { tipo: "npc", titolo: "Personaggi non giocanti", entita: true },
  { tipo: "luogo", titolo: "Luoghi", entita: true },
  { tipo: "fazione", titolo: "Fazioni", entita: true },
  { tipo: "promessa", titolo: "Promesse del gruppo", entita: false },
  { tipo: "filo", titolo: "Fili aperti", entita: false },
];

export default function CodexCampagna() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id;
  const supabase = createClient();

  const [user, setUser] = useState(undefined);
  const [ready, setReady] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState("");
  const [savedId, setSavedId] = useState(null);
  const [mergingId, setMergingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      try {
        const resC = await fetch("/api/campaigns");
        const camps = resC.ok ? await resC.json() : [];
        const camp = camps.find((c) => c.id === campaignId);
        if (!camp) {
          router.push("/campagne");
          return;
        }
        setCampaignName(camp.name);
        await carica();
        setReady(true);
      } catch (e) {
        router.push("/campagne");
      }
    });
  }, []);

  async function carica() {
    const res = await fetch(`/api/codex?campaignId=${campaignId}`);
    if (res.ok) setEntries(await res.json());
  }

  function aggiorna(id, campo, val) {
    setEntries((es) =>
      es.map((e) => (e.id === id ? { ...e, [campo]: val } : e))
    );
    setSavedId(null);
  }

  async function salvaVoce(e) {
    setError(null);
    try {
      const res = await fetch("/api/codex", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: e.id,
          nome: e.nome,
          nota: e.nota,
          segreto: e.segreto,
        }),
      });
      if (!res.ok) throw new Error();
      setSavedId(e.id);
      setTimeout(() => setSavedId((s) => (s === e.id ? null : s)), 1800);
    } catch (err) {
      setError("Salvataggio della voce fallito.");
    }
  }

  async function eliminaVoce(id) {
    setError(null);
    try {
      const res = await fetch(`/api/codex?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEntries((es) => es.filter((e) => e.id !== id));
    } catch (err) {
      setError("Eliminazione fallita.");
    }
  }

  async function aggiungiVoce(tipo, entita) {
    setError(null);
    try {
      const res = await fetch("/api/codex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          tipo,
          nome: entita ? "Nuova voce" : null,
          nota: "",
          segreto: false,
        }),
      });
      if (!res.ok) throw new Error();
      const nuova = await res.json();
      setEntries((es) => [nuova, ...es]);
    } catch (err) {
      setError("Creazione fallita.");
    }
  }

  async function unisci(source, targetId) {
    if (!targetId) return;
    const target = entries.find((x) => x.id === targetId);
    if (!target) return;
    setError(null);
    const nota = [target.nota, source.nota].filter(Boolean).join("\n").trim();
    const segreto = !!target.segreto || !!source.segreto;
    try {
      await fetch("/api/codex", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, nota, segreto }),
      });
      await fetch(`/api/codex?id=${source.id}`, { method: "DELETE" });
      setEntries((es) =>
        es
          .filter((x) => x.id !== source.id)
          .map((x) => (x.id === target.id ? { ...x, nota, segreto } : x))
      );
      setMergingId(null);
    } catch (err) {
      setError("Unione fallita.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (user === undefined || !ready) return null;

  const q = query.trim().toLowerCase();
  const filtro = (e) =>
    !q ||
    (e.nome || "").toLowerCase().includes(q) ||
    (e.nota || "").toLowerCase().includes(q);

  const totaleFiltrato = entries.filter(filtro).length;

  return (
    <main className="codex-lib-page">
      <div className="sheet-topbar">
        <Link href={`/campagna/${campaignId}`} className="back-link">
          ← Torna all'estrattore
        </Link>
        <span className="sheet-topbar-title">Tabolarium · {campaignName}</span>
        <button className="ghost" onClick={logout}>
          Esci
        </button>
      </div>

      <div className="codex-lib-body">
        <div className="codex-lib-head">
          <h1>Il Codex della campagna</h1>
          <p>
            La memoria viva di {campaignName || "questa campagna"}: tutto ciò che
            è emerso, sessione dopo sessione. Correggi, unisci, completa.
          </p>
        </div>

        <input
          className="codex-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nel Codex… (es. un nome, un luogo)"
        />

        {error && <div className="error">{error}</div>}

        {entries.length === 0 ? (
          <div className="codex-empty">
            Il Codex è ancora vuoto. Estrai e salva una sessione
            nell'estrattore: le voci compariranno qui e si accumuleranno.
          </div>
        ) : q && totaleFiltrato === 0 ? (
          <div className="codex-empty">Nessuna voce trovata per “{query}”.</div>
        ) : (
          TIPI.map(({ tipo, titolo, entita }) => {
            const voci = entries.filter((e) => e.tipo === tipo).filter(filtro);
            if (q && voci.length === 0) return null;
            return (
              <section key={tipo} className="codex-section">
                <div className="codex-section-title">
                  <span>{titolo}</span>
                  <span className="count">{voci.length}</span>
                </div>

                {voci.map((e) => (
                  <div
                    key={e.id}
                    className={"codex-entry" + (e.segreto ? " secret" : "")}
                  >
                    {entita && (
                      <div className="codex-entry-top">
                        <input
                          value={e.nome || ""}
                          onChange={(ev) =>
                            aggiorna(e.id, "nome", ev.target.value)
                          }
                          placeholder="Nome"
                        />
                        <label className="codex-seg">
                          <input
                            type="checkbox"
                            checked={!!e.segreto}
                            onChange={(ev) =>
                              aggiorna(e.id, "segreto", ev.target.checked)
                            }
                          />
                          Solo DM
                        </label>
                      </div>
                    )}
                    <textarea
                      value={e.nota || ""}
                      onChange={(ev) => aggiorna(e.id, "nota", ev.target.value)}
                      placeholder={
                        entita
                          ? "Cosa sappiamo su questa voce…"
                          : "Il testo della promessa o del filo aperto…"
                      }
                    />
                    <div className="codex-entry-controls">
                      {entita &&
                        (mergingId === e.id ? (
                          <span className="merge-box">
                            unisci in:
                            <select
                              defaultValue=""
                              onChange={(ev) => unisci(e, ev.target.value)}
                            >
                              <option value="" disabled>
                                scegli…
                              </option>
                              {entries
                                .filter(
                                  (x) => x.tipo === e.tipo && x.id !== e.id
                                )
                                .map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.nome || "(senza nome)"}
                                  </option>
                                ))}
                            </select>
                            <button
                              className="ghost"
                              onClick={() => setMergingId(null)}
                            >
                              annulla
                            </button>
                          </span>
                        ) : (
                          <button
                            className="ghost"
                            onClick={() => setMergingId(e.id)}
                          >
                            Unisci
                          </button>
                        ))}
                      <span className="spacer" />
                      {savedId === e.id && (
                        <span className="codex-saved">✓ Salvato</span>
                      )}
                      <button
                        className="ghost danger-sm"
                        onClick={() => eliminaVoce(e.id)}
                      >
                        Elimina
                      </button>
                      <button className="codex-save" onClick={() => salvaVoce(e)}>
                        Salva
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  className="codex-add"
                  onClick={() => aggiungiVoce(tipo, entita)}
                >
                  + Aggiungi voce
                </button>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
