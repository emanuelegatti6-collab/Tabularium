"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";

const VUOTA = {
  nome: "",
  razza: "",
  classe: "",
  descrizione: "",
  background: "",
  note: "",
  avatar_url: "",
};

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

      // Verifica che l'utente sia membro di questa campagna e prendi il nome.
      const { data: camps } = await supabase.rpc("my_player_campaigns");
      const camp = (camps || []).find((c) => c.id === campaignId);
      if (!camp) {
        router.push("/");
        return;
      }
      setCampaignName(camp.name);

      // Carica la propria scheda, se esiste.
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
    router.push("/login");
  }

  if (user === undefined || !ready) return null;

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/" className="back-link">
          ← Le tue campagne
        </Link>
        <button className="ghost" onClick={logout}>
          Esci
        </button>
      </div>

      <p className="eyebrow">Familiar · {campaignName}</p>
      <h1>La tua scheda</h1>
      <p className="sub">
        Compila il tuo personaggio. Il Dungeon Master potrà leggerlo, e il
        sistema lo riconoscerà nelle sessioni.
      </p>

      <div className="char-photo">
        {form.avatar_url ? (
          <img src={form.avatar_url} alt="Personaggio" className="char-avatar" />
        ) : (
          <div className="char-avatar placeholder">?</div>
        )}
        <label className="upload-btn">
          {uploadingPhoto ? "Carico la foto..." : "📷 Foto del personaggio"}
          <input
            type="file"
            accept="image/*"
            onChange={caricaFoto}
            disabled={uploadingPhoto}
            hidden
          />
        </label>
      </div>

      <label className="label">Nome del personaggio</label>
      <input
        type="text"
        value={form.nome}
        onChange={(e) => aggiorna("nome", e.target.value)}
        placeholder="Es. Garnox"
      />

      <div className="char-row">
        <div>
          <label className="label">Razza</label>
          <input
            type="text"
            value={form.razza}
            onChange={(e) => aggiorna("razza", e.target.value)}
            placeholder="Es. Minotauro"
          />
        </div>
        <div>
          <label className="label">Classe</label>
          <input
            type="text"
            value={form.classe}
            onChange={(e) => aggiorna("classe", e.target.value)}
            placeholder="Es. Barbaro"
          />
        </div>
      </div>

      <label className="label">Descrizione / aspetto</label>
      <textarea
        value={form.descrizione}
        onChange={(e) => aggiorna("descrizione", e.target.value)}
        rows={3}
      />

      <label className="label">Background (la sua storia)</label>
      <textarea
        value={form.background}
        onChange={(e) => aggiorna("background", e.target.value)}
        rows={4}
      />

      <label className="label">Note (legami, obiettivi personali)</label>
      <textarea
        value={form.note}
        onChange={(e) => aggiorna("note", e.target.value)}
        rows={3}
      />

      {error && <div className="error">{error}</div>}

      <div className="row" style={{ marginTop: "18px" }}>
        <button onClick={salva} disabled={saving}>
          {saving ? "Sto salvando..." : "Salva la scheda"}
        </button>
        {savedMsg && <span className="saved-badge">✓ Scheda salvata</span>}
      </div>

      {confirmingDelete ? (
        <div className="confirm-delete" style={{ marginTop: "16px" }}>
          <p>
            Eliminare la tua scheda del personaggio? L'azione è irreversibile.
          </p>
          <div className="row">
            <button className="danger-btn" onClick={eliminaScheda}>
              Sì, elimina la scheda
            </button>
            <button className="ghost" onClick={() => setConfirmingDelete(false)}>
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <div className="row" style={{ marginTop: "10px" }}>
          <button
            className="ghost danger"
            onClick={() => setConfirmingDelete(true)}
          >
            Elimina scheda
          </button>
        </div>
      )}
    </main>
  );
}
