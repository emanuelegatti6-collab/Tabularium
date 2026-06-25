"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../utils/supabase/client";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(undefined);
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        caricaCampagne();
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
    router.push("/login");
  }

  if (user === undefined || !loaded) return null;

  return (
    <main className="wrap">
      <div className="topbar">
        <span className="user-email">{user.email}</span>
        <button className="ghost" onClick={logout}>
          Esci
        </button>
      </div>

      <p className="eyebrow">Familiar</p>
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
        <button onClick={creaCampagna}>Crea</button>
      </div>

      <p className="join-hint">
        Sei un giocatore?{" "}
        <Link href="/unisciti">Unisciti a una campagna con un codice</Link>
      </p>

      {campaigns.length === 0 ? (
        <p className="sub" style={{ marginTop: "24px" }}>
          Non hai ancora campagne. Creane una qui sopra per cominciare.
        </p>
      ) : (
        <div className="campaign-list">
          {campaigns.map((c) => (
            <div key={c.id} className="campaign-card">
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
    </main>
  );
}
