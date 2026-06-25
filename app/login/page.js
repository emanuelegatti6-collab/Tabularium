"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function accedi() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError("Accesso fallito: " + error.message);
    } else {
      router.push("/campagne");
      router.refresh();
    }
  }

  return (
    <main className="wrap auth">
      <p className="eyebrow">Tabolarium</p>
      <h1>Bentornato</h1>
      <p className="sub">Accedi per ritrovare le tue campagne.</p>

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
        autoComplete="current-password"
      />

      {error && <div className="error">{error}</div>}

      <div className="row" style={{ marginTop: "20px" }}>
        <button onClick={accedi} disabled={loading}>
          {loading ? "..." : "Accedi"}
        </button>
      </div>

      <p className="auth-switch">
        Non hai un account? <Link href="/register">Crea un account</Link>
      </p>
    </main>
  );
}
