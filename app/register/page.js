"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function registrati() {
    setLoading(true);
    setError(null);
    setInfo(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError("Registrazione fallita: " + error.message);
    } else if (data.session) {
      // Conferma email disattivata: l'account è già attivo e sei loggato.
      router.push("/campagne");
      router.refresh();
    } else {
      // Conferma email attiva: bisogna confermare prima di accedere.
      setInfo(
        "Account creato! Controlla la tua email per confermare, poi accedi."
      );
    }
  }

  return (
    <main className="wrap auth">
      <p className="eyebrow">Tabolarium</p>
      <h1>Crea il tuo account</h1>
      <p className="sub">Bastano un'email e una password per iniziare.</p>

      <label className="label" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <label className="label" htmlFor="password" style={{ marginTop: "16px" }}>
        Password
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      {error && <div className="error">{error}</div>}
      {info && <div className="info">{info}</div>}

      <div className="row" style={{ marginTop: "20px" }}>
        <button onClick={registrati} disabled={loading}>
          {loading ? "..." : "Crea account"}
        </button>
      </div>

      <p className="auth-switch">
        Hai già un account? <Link href="/login">Accedi</Link>
      </p>
    </main>
  );
}
