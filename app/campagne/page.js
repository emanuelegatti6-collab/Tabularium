"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";

function IconBook() {
  return (
    <svg className="feat-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 13C19 9 9 9 5 11v26c4-2 14-2 19 2 5-4 15-4 19-2V11c-4-2-14-2-19 2Z" />
      <path d="M24 13v26" />
    </svg>
  );
}

function IconD20() {
  return (
    <svg className="feat-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
      <polygon points="24,4 41,14 41,34 24,44 7,34 7,14" />
      <polygon points="24,13 34,31 14,31" />
      <path d="M24 4v9M41 14l-7 17M7 14l7 17M14 31l10 13M34 31 24 44" />
    </svg>
  );
}

function IconDragon() {
  return (
    <svg className="feat-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 39c2-10 9-13 15-12-4-3-4-9 0-12 1 3 4 5 7 4-2 4 0 7 4 7 6 0 10 4 11 9" />
      <path d="M28 19c3-5 9-6 14-4-3 1-5 3-5 6" />
      <path d="M21 27c-4 2-6 6-6 11" />
      <circle cx="24" cy="19" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

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

export default function Campagne() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(undefined);
  const [campaigns, setCampaigns] = useState([]);
  const [playerCampaigns, setPlayerCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
      } else {
        setUser(data.user);
        caricaCampagne();
        caricaCampagneGiocate();
      }
    });
  }, []);

  async function caricaCampagne() {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) setCampaigns(await res.json());
    } catch (e) {
    } finally {
      setLoaded(true);
    }
  }

  async function caricaCampagneGiocate() {
    try {
      const { data } = await supabase.rpc("my_player_campaigns");
      if (data) setPlayerCampaigns(data);
    } catch (e) {}
  }

  async function creaCampagna() {
    if (!newName.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error("errore");
      const nuova = await res.json();
      setCampaigns((c) => [...c, nuova]);
      setNewName("");
    } catch (e) {
      setError("Creazione campagna fallita.");
    }
  }

  async function eliminaCampagna(id) {
    setError(null);
    try {
      const res = await fetch(`/api/campaigns?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("errore");
      setCampaigns((c) => c.filter((x) => x.id !== id));
      setConfirmingId(null);
    } catch (e) {
      setError("Eliminazione fallita.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (user === undefined || !loaded) return null;

  return (
    <main className="campagne-page">
      <div className="campagne-topbar">
        <span className="user-email">{user.email}</span>
        <button className="ghost" onClick={logout}>
          Esci
        </button>
      </div>

      <img src="/hero-campagne.png" alt="Tabolarium" className="campagne-hero" />

      <div className="campagne-body">
        <p className="eyebrow flourish">La memoria del tuo tavolo</p>
        <h1>Le tue campagne</h1>
        <p className="sub">Apri una campagna per entrarci, o creane una nuova.</p>

        {error && <div className="error">{error}</div>}

        <div className="campaign-create">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome della nuova campagna"
          />
          <button className="plaque" onClick={creaCampagna}>
            Crea
          </button>
        </div>

        <p className="join-hint">
          Sei un giocatore?{" "}
          <Link href="/unisciti">Unisciti a una campagna con un codice</Link>
        </p>

        {playerCampaigns.length > 0 && (
          <div className="player-campaigns">
            <h3>Campagne in cui giochi</h3>
            <div className="campaign-list">
              {playerCampaigns.map((c) => (
                <div key={c.id} className="campaign-card framed">
                  <span className="corner tl" />
                  <span className="corner tr" />
                  <span className="corner bl" />
                  <span className="corner br" />
                  <img src="/campaign-thumb.png" alt="" className="campaign-thumb" />
                  <div className="campaign-card-main">
                    <Link href={`/gioca/${c.id}`} className="campaign-open">
                      {c.name}
                    </Link>
                    <span className="campaign-date">la tua scheda</span>
                  </div>
                  <Link href={`/gioca/${c.id}`} className="ghost link-btn">
                    Apri →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {campaigns.length === 0 ? (
          <p className="sub" style={{ marginTop: "24px" }}>
            Non hai ancora campagne. Creane una qui sopra per cominciare.
          </p>
        ) : (
          <div className="campaign-list">
            {campaigns.map((c) => (
              <div key={c.id} className="campaign-card framed">
                <span className="corner tl" />
                <span className="corner tr" />
                <span className="corner bl" />
                <span className="corner br" />
                <img src="/campaign-thumb.png" alt="" className="campaign-thumb" />
                <div className="campaign-card-main">
                  <Link href={`/campagna/${c.id}`} className="campaign-open">
                    {c.name}
                  </Link>
                  <span className="campaign-date">
                    creata il{" "}
                    {new Date(c.created_at).toLocaleDateString("it-IT")}
                  </span>
                </div>

                {confirmingId === c.id ? (
                  <div className="confirm-inline">
                    <span>Elimina anche tutte le sue sessioni. Sicuro?</span>
                    <button
                      className="danger-btn"
                      onClick={() => eliminaCampagna(c.id)}
                    >
                      Sì, elimina
                    </button>
                    <button
                      className="ghost"
                      onClick={() => setConfirmingId(null)}
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    className="ghost danger"
                    onClick={() => setConfirmingId(c.id)}
                  >
                    Elimina
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="features">
          <div className="feat">
            <IconBook />
            <h4>La memoria della tua storia</h4>
            <p>Conserva ogni evento, personaggio e luogo della tua campagna.</p>
          </div>
          <div className="feat">
            <IconD20 />
            <h4>Strumenti per il Dungeon Master</h4>
            <p>Trascrivi sessioni, genera briefing e organizza le tue avventure.</p>
          </div>
          <div className="feat">
            <IconDragon />
            <h4>Il tuo mondo, sempre vivo</h4>
            <p>Tutto ciò che accade al tavolo, sempre a portata di mano.</p>
          </div>
        </div>

        <D20Divider />
      </div>
    </main>
  );
}
