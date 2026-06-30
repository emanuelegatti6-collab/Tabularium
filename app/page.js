"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../utils/supabase/client";

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

function IconLogin() {
  return (
    <svg className="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function IconPersonPlus() {
  return (
    <svg className="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export default function Landing() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/campagne");
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) return null;

  return (
    <main className="landing">
      <img src="/hero-landing.png" alt="Tabolarium" className="landing-hero" />

      <div className="landing-body">
        <p className="landing-intro">
          Tabolarium è il grimorio digitale del Dungeon Master. Trascrivi le
          sessioni, conserva ogni dettaglio, e preparati a vivere avventure
          indimenticabili.
        </p>

        <div className="landing-actions">
          <Link href="/login" className="cut-btn primary">
            <IconLogin />
            Accedi
          </Link>
          <Link href="/register" className="cut-btn outline">
            <span className="cut-inner">
              <IconPersonPlus />
              Registrati
            </span>
          </Link>
        </div>

        <D20Divider />

        <div className="features">
          <div className="feat">
            <IconBook />
            <h4>La memoria della tua storia</h4>
            <p>
              Conserva ogni evento, personaggio e luogo della tua campagna in un
              unico grimorio.
            </p>
          </div>
          <div className="feat">
            <IconD20 />
            <h4>Strumenti per il Dungeon Master</h4>
            <p>
              Trascrivi le sessioni, genera briefing e organizza le tue
              avventure con strumenti potenti.
            </p>
          </div>
          <div className="feat">
            <IconDragon />
            <h4>Il tuo mondo, sempre vivo</h4>
            <p>
              Tutto ciò che accade al tavolo, sempre a portata di mano, ovunque
              tu sia.
            </p>
          </div>
        </div>

        <D20Divider />
      </div>
    </main>
  );
}
