"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../utils/supabase/client";

export default function Landing() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Già dentro: vai dritto alle campagne, salta la soglia.
        router.replace("/campagne");
      } else {
        setChecking(false);
      }
    });
  }, []);

  // Finché non so se sei loggato, non mostro nulla (niente sfarfallio).
  if (checking) return null;

  return (
    <main className="landing">
      <img src="/hero.png" alt="Tabolarium" className="landing-hero" />
      <p className="sub landing-sub">
        La memoria della tua campagna. Trascrivi le sessioni, estrai il Codex,
        e arriva a ogni partita sapendo esattamente dove eravate rimasti.
      </p>
      <div className="landing-actions">
        <Link href="/login" className="landing-btn primary">
          Accedi
        </Link>
        <Link href="/register" className="landing-btn">
          Registrati
        </Link>
      </div>
    </main>
  );
}
