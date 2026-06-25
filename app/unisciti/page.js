"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";

export default function Unisciti() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(undefined);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
      }
    });
  }, []);

  async function unisciti() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Chiama la funzione sicura nel database: trova la campagna dal codice
      // e iscrive l'utente come giocatore. Restituisce l'id, o null se il
      // codice non esiste.
      const { data, error } = await supabase.rpc("join_campaign", {
        p_code: code.trim(),
      });
      if (error) throw error;
      if (!data) {
        setError("Codice non valido. Controlla con il tuo DM e riprova.");
      } else {
        setSuccess(true);
      }
    } catch (e) {
      setError("Qualcosa è andato storto. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (user === undefined) return null;

  return (
    <main className="wrap auth">
      <div className="topbar">
        <Link href="/campagne" className="back-link">
          ← Le tue campagne
        </Link>
        <button className="ghost" onClick={logout}>
          Esci
        </button>
      </div>

      <p className="eyebrow">Tabolarium</p>
      <h1>Unisciti a una campagna</h1>
      <p className="sub">
        Inserisci il codice d'invito che ti ha dato il tuo Dungeon Master.
      </p>

      {success ? (
        <div className="info">
          Sei entrato nella campagna! Presto, da qui, potrai vedere il tuo
          briefing senza spoiler e creare la scheda del tuo personaggio.
        </div>
      ) : (
        <>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Es. ABCD2345"
          />
          {error && <div className="error">{error}</div>}
          <div className="row" style={{ marginTop: "16px" }}>
            <button onClick={unisciti} disabled={loading}>
              {loading ? "..." : "Unisciti"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
