"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";

const VUOTA = {
  nome: "",
  razza: "",
  classe: "",
  livello: "",
  descrizione: "",
  background: "",
  note: "",
  avatar_url: "",
};

const RAZZE = [
  "Umano", "Elfo", "Mezzelfo", "Nano", "Halfling", "Gnomo", "Mezzorco",
  "Tiefling", "Dragonide", "Tabaxi", "Minotauro", "Naiade", "Aasimar",
  "Goliath", "Tritone", "Genasi", "Goblin", "Bugbear", "Coboldo", "Altro",
];
const CLASSI = [
  "Barbaro", "Bardo", "Chierico", "Druido", "Guerriero", "Ladro", "Mago",
  "Monaco", "Paladino", "Ranger", "Stregone", "Warlock", "Artificiere", "Altro",
];

function I({ d, fill }) {
  return (
    <svg className="lbl-ico" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}
const IconHorns = () => <I d={<path d="M5 14c-1-5 1-8 4-9 0 3 1 5 3 5s3-2 3-5c3 1 5 4 4 9" />} />;
const IconSwords = () => <I d={<><path d="M4 4l8 8M20 4l-8 8" /><path d="M12 12l3 3M12 12l-3 3" /></>} />;
const IconFace = () => <I d={<><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>} />;
const IconBook = () => <I d={<><path d="M12 6C9 4 5 4 3 5v14c2-1 6-1 9 1 3-2 7-2 9-1V5c-2-1-6-1-9 1Z" /><path d="M12 6v14" /></>} />;
const IconQuill = () => <I d={<><path d="M4 20s2-8 9-13c3-2 7-3 7-3s-1 4-3 7c-5 7-13 9-13 9z" /><path d="M4 20l5-5" /></>} />;
const IconSave = () => <I d={<><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7" /><rect x="8" y="13" width="8" height="6" /></>} />;
const IconTrash = () => <I d={<><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></>} />;
const IconCamera = () => <I d={<><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>} />;

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

function Select({ value, onChange, options, placeholder }) {
  // Mantieni il valore salvato anche se non è nella lista standard.
  const opts = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select className="field-select" value={value} onChange={onChange}>
      <option value="">{placeholder}</option>
      {opts.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export default function GiocaCampagna() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id;
  const supabase = createClient();

  const [user, setUser] = useState(undefined);
  const [ready, setReady] = useState(false);
  const [campaignName, setCampaignName] = useState("");

  const [form, setForm] = useState(VUOTA);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      const { data: camps } = await supabase.rpc("my_player_campaigns");
      const camp = (camps || []).find((c) => c.id === campaignId);
      if (!camp) {
        router.push("/campagne");
        return;
      }
      setCampaignName(camp.name);
      const { data: scheda } = await supabase
        .from("characters")
        .select("*")
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (scheda) {
        setForm({
          nome: scheda.nome || "",
          razza: scheda.razza || "",
          classe: scheda.classe || "",
          livello: scheda.livello || "",
          descrizione: scheda.descrizione || "",
          background: scheda.background || "",
          note: scheda.note || "",
          avatar_url: scheda.avatar_url || "",
        });
      }
      setReady(true);
    });
  }, []);

  function aggiorna(campo, valore) {
    setForm((f) => ({ ...f, [campo]: valore }));
    setSavedMsg(false);
  }

  async function caricaFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${campaignId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((f) => ({ ...f, avatar_url: data.publicUrl }));
      setSavedMsg(false);
    } catch (err) {
      setError("Caricamento della foto fallito. Riprova.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function salva() {
    setSaving(true);
    setError(null);
    setSavedMsg(false);
    try {
      const { error: err } = await supabase.from("characters").upsert(
        {
          campaign_id: campaignId,
          user_id: user.id,
          nome: form.nome,
          razza: form.razza,
          classe: form.classe,
          livello: form.livello,
          descrizione: form.descrizione,
          background: form.background,
          note: form.note,
          avatar_url: form.avatar_url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "campaign_id,user_id" }
      );
      if (err) throw err;
      setSavedMsg(true);
    } catch (e) {
      setError("Salvataggio fallito. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  async function eliminaScheda() {
    setError(null);
    try {
      const { error: err } = await supabase
        .from("characters")
        .delete()
        .eq("campaign_id", campaignId);
      if (err) throw err;
      setForm(VUOTA);
      setConfirmingDelete(false);
      setSavedMsg(false);
    } catch (e) {
      setError("Eliminazione della scheda fallita.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (user === undefined || !ready) return null;

  const sottotitolo = [form.razza, form.classe, form.livello ? `Livello ${form.livello}` : ""]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <main className="sheet-page">
      <div className="sheet-topbar">
        <Link href="/campagne" className="back-link">
          ← Le tue campagne
        </Link>
        <span className="sheet-topbar-title">Tabolarium · {campaignName}</span>
        <button className="ghost" onClick={logout}>
          Esci
        </button>
      </div>

      <div className="char-hero">
        <div className="char-hero-media">
          {form.avatar_url ? (
            <>
              <div
                className="char-hero-bg"
                style={{ backgroundImage: `url(${form.avatar_url})` }}
              />
              <img
                src={form.avatar_url}
                alt={form.nome}
                className="char-hero-img"
              />
            </>
          ) : (
            <div className="char-hero-empty">
              <IconCamera />
              <span>La foto del tuo personaggio</span>
            </div>
          )}
        </div>
        <label className="char-photo-btn">
          <IconCamera />
          {uploadingPhoto
            ? "Carico..."
            : form.avatar_url
            ? "Cambia foto"
            : "Carica foto"}
          <input
            type="file"
            accept="image/*"
            onChange={caricaFoto}
            disabled={uploadingPhoto}
            hidden
          />
        </label>
      </div>

      <div className="sheet-frame">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <input
          className="char-title-input"
          value={form.nome}
          onChange={(e) => aggiorna("nome", e.target.value)}
          placeholder="Il nome del tuo eroe"
        />
        <div className="char-subtitle">
          {sottotitolo || "Scegli razza, classe e livello"}
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field-label">
              <IconHorns /> Razza
            </label>
            <Select
              value={form.razza}
              onChange={(e) => aggiorna("razza", e.target.value)}
              options={RAZZE}
              placeholder="Scegli la razza"
            />
          </div>
          <div className="field">
            <label className="field-label">
              <IconSwords /> Classe
            </label>
            <Select
              value={form.classe}
              onChange={(e) => aggiorna("classe", e.target.value)}
              options={CLASSI}
              placeholder="Scegli la classe"
            />
          </div>
          <div className="field field-narrow">
            <label className="field-label">Livello</label>
            <select
              className="field-select"
              value={form.livello}
              onChange={(e) => aggiorna("livello", e.target.value)}
            >
              <option value="">—</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label">
            <IconFace /> Aspetto e descrizione
          </label>
          <textarea
            value={form.descrizione}
            onChange={(e) => aggiorna("descrizione", e.target.value)}
            rows={3}
            placeholder="Descrivi l'aspetto fisico, l'abbigliamento, tratti distintivi, tatuaggi, cicatrici, ecc..."
          />
        </div>

        <div className="field">
          <label className="field-label">
            <IconBook /> Background (la sua storia)
          </label>
          <textarea
            value={form.background}
            onChange={(e) => aggiorna("background", e.target.value)}
            rows={4}
            placeholder="Racconta la storia del personaggio, le sue origini, gli eventi che lo hanno segnato, le persone importanti, ecc..."
          />
        </div>

        <div className="field">
          <label className="field-label">
            <IconQuill /> Note (legami, obiettivi personali, segreti)
          </label>
          <textarea
            value={form.note}
            onChange={(e) => aggiorna("note", e.target.value)}
            rows={3}
            placeholder="Legami con altri personaggi, obiettivi personali, desideri, paure, segreti o promesse fatte..."
          />
        </div>

        {error && <div className="error">{error}</div>}

        <div className="sheet-actions">
          <div className="sheet-actions-left">
            {confirmingDelete ? (
              <div className="confirm-inline">
                <span>Eliminare la scheda?</span>
                <button className="danger-btn" onClick={eliminaScheda}>
                  Sì
                </button>
                <button className="ghost" onClick={() => setConfirmingDelete(false)}>
                  No
                </button>
              </div>
            ) : (
              <button
                className="ghost danger sheet-del"
                onClick={() => setConfirmingDelete(true)}
              >
                <IconTrash /> Elimina scheda
              </button>
            )}
          </div>
          <div className="sheet-actions-right">
            {savedMsg && <span className="saved-badge">✓ Salvata</span>}
            <button className="sheet-save" onClick={salva} disabled={saving}>
              <IconSave />
              {saving ? "Salvataggio..." : "Salva la scheda"}
            </button>
          </div>
        </div>
      </div>

      <D20Divider />
    </main>
  );
}
