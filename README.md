# Familiar — Fase 2

L'app ora ha memoria. Estrai il Codex da una sessione, lo salvi, e resta
salvato in un database anche dopo che chiudi e riapri la pagina.

L'idea chiave: usiamo lo stesso schema della Fase 1. Il browser non parla mai
direttamente né con Anthropic né con il database. Parla solo con il TUO server,
e il tuo server custodisce le chiavi e fa il lavoro. Le chiavi restano al sicuro.

```
browser  ->  il tuo server  ->  Anthropic (estrazione)
                            ->  Supabase (salvataggio)
```

---

## Cosa ti serve (oltre alla Fase 1)

Hai già: Node.js 20+, un editor, e la chiave API di Anthropic.
Ora aggiungi un database gratuito con Supabase.

### 1. Crea il progetto Supabase

- Vai su https://supabase.com e crea un account (gratis).
- Crea un nuovo progetto ("New project"). Scegli una regione vicina (es. Europa)
  e imposta una password per il database (annotala, ma non ti servirà spesso).
- Aspetta un minuto che il progetto venga creato.

### 2. Crea la tabella

- Nel progetto, apri "SQL Editor" dal menu a sinistra.
- Incolla questo codice e premi "Run":

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text,
  transcript text,
  codex jsonb
);
```

Questo crea una "tabella" chiamata sessions: una specie di foglio di calcolo
dove ogni riga è una sessione salvata, con un titolo, la trascrizione e il
Codex (in formato JSON).

### 3. Prendi le chiavi di Supabase

- Vai su "Project Settings" (l'ingranaggio) -> "API".
- Copia due cose:
  - "Project URL" -> va in NEXT_PUBLIC_SUPABASE_URL
  - la chiave PUBBLICA "anon" (non la "service_role") -> va in NEXT_PUBLIC_SUPABASE_ANON_KEY

Apri il tuo file `.env.local` e aggiungi le due righe (la chiave di Anthropic
resta dov'è):

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

(Il prefisso NEXT_PUBLIC_ è necessario perché la pagina di login, che gira nel
browser, possa leggerle. La chiave anon è pubblica per design, quindi è sicuro.)

---

## Avvia

```
npm install      (installa anche la nuova libreria di Supabase)
npm run dev
```

Apri http://localhost:3000

Estrai un Codex, premi "Salva nel database". Comparirà nella lista
"Sessioni salvate" in alto. Ora **ricarica la pagina**: la sessione è ancora lì.
Quello è il momento in cui la tua app ha davvero una memoria.

---

## La lezione della Fase 2

Il principio resta quello della Fase 1: il browser non parla mai direttamente
con il database, ma sempre tramite il TUO server (le route in `app/api/`). Così
la chiave di Anthropic resta segreta sul server, e i dati passano da codice che
controlli tu.

Con il login (vedi più sotto) questo principio si completa: il server usa la
chiave pubblica "anon" ma esegue le query "come l'utente loggato", e le regole
di sicurezza del database (RLS) garantiscono che ciascuno veda solo le proprie
righe — anche se sbagliassi una query.

---

## Struttura dei file

```
familiar-fase1/
├── app/
│   ├── api/
│   │   ├── extract/route.js    ← estrazione (chiama Anthropic con Haiku)
│   │   └── sessions/route.js   ← salva e legge le sessioni (Supabase)
│   ├── page.js                 ← l'interfaccia: estrai, salva, rileggi
│   ├── layout.js
│   └── globals.css
├── .env.local.example
├── .gitignore
└── package.json
```

---

## Novità: il Briefing pre-sessione (la memoria di campagna)

Questa è la funzione che distingue Familiar da un semplice blocco note.

Se hai almeno una sessione salvata, in alto compare il pulsante
"Genera il briefing della prossima sessione". Premendolo, il server:

1. Legge dal database TUTTE le sessioni della campagna.
2. Le passa all'IA chiedendo: cosa è successo l'ultima volta? quali fili
   sono in sospeso? quali NPC torneranno? quale gancio è pronto all'uso?
3. Ti restituisce un briefing che leggi in trenta secondi prima di giocare.

Più sessioni salvi, più il briefing diventa ricco: è qui che le sessioni
isolate diventano una campagna con memoria.

Nota sul modello: l'estrazione usa Haiku (economico, gira spesso). Il briefing
usa Sonnet (più sveglio, gira di rado, una volta a sessione). È un esempio di
"il modello giusto per il compito giusto": il file è app/api/briefing/route.js.

---

## Login multi-utente (il passo più impegnativo)

Onestà prima di tutto: questa è la parte più fastidiosa dello sviluppo web,
per tutti. Tanti pezzi che devono andare d'accordo. Vai con calma e, se qualcosa
si rompe, è normale.

### 1. Installa la nuova libreria

```
npm install
```

(Aggiunge @supabase/ssr, che gestisce il login con i cookie.)

### 2. Cambia le variabili in .env.local

I nomi sono CAMBIATI rispetto a prima. Ora servono l'URL e la chiave
**pubblica (anon)** di Supabase, non quella segreta. Apri `.env.local` e fai
in modo che contenga:

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

La chiave anon la trovi in Project Settings -> API (è quella "pubblica", non
la "service_role"). Il prefisso NEXT_PUBLIC_ è obbligatorio.

### 3. Aggiorna il database (SQL Editor di Supabase)

Incolla ed esegui:

```sql
-- collega ogni sessione a un utente, riempito in automatico al salvataggio
alter table sessions add column user_id uuid default auth.uid();

-- attiva la sicurezza per riga
alter table sessions enable row level security;

-- ogni utente vede e gestisce SOLO le proprie sessioni
create policy "Le proprie sessioni"
  on sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Nota: le sessioni di test che avevi salvato prima avranno user_id vuoto e
quindi spariranno dalla vista (erano dati di prova, va bene così). Se vuoi
ripulire: `delete from sessions where user_id is null;`

### 4. Disattiva la conferma email (solo per sviluppo)

Per default Supabase chiede di confermare l'email via link prima di poter
accedere — comodo in produzione, scomodo mentre sviluppi. Per i test:
Authentication -> Sign In / Providers (o Settings) -> disattiva
"Confirm email". Così puoi registrarti e accedere subito.

### 5. Provalo

```
npm run dev
```

Vai su http://localhost:3000 — verrai mandato a /login. Crea un account,
accedi, e ritrovi la tua app. Adesso ogni email vede solo le proprie sessioni.
Prova con due account diversi: i Codex non si mescolano.

### La lezione

Le regole RLS sono la rete di sicurezza: anche se sbagliassi una query, il
database NON lascerebbe vedere a un utente le righe di un altro, perché la
politica filtra su `auth.uid() = user_id`. La sicurezza non dipende solo dal
tuo codice: è cucita nel database.

---

## Audio + riconoscimento di chi parla (Fase 3)

Ora puoi caricare un file audio della sessione: l'app lo trascrive, separa gli
interlocutori e mette il testo nella casella, pronto per l'estrazione. Il testo
arriva etichettato "Interlocutore 0:", "Interlocutore 1:", ecc. Lo fa Deepgram
(non Anthropic), perché Claude non trasforma l'audio in testo.

### Setup

1. Crea un account su https://console.deepgram.com (dà 200$ di credito gratuito,
   bastano per centinaia di ore di test). Crea una API key.
2. Aggiungila al tuo `.env.local`:
   ```
   DEEPGRAM_API_KEY=...
   ```
3. Riavvia `npm run dev`.

(Se prima avevi messo GROQ_API_KEY, puoi toglierla: ora usiamo Deepgram.)

### Come si usa

Premi "Carica l'audio della sessione", scegli un file (mp3, m4a, wav...).
Dopo qualche secondo il testo, già diviso per interlocutore, compare nella
casella. Da lì, "Estrai il Codex" come sempre.

### Limiti onesti da sapere

- **Parti corto.** Per la prima prova usa un file di pochi minuti (registra un
  finto pezzo di sessione col telefono), meglio se con due o tre voci diverse,
  così vedi la separazione funzionare.
- **Interlocutori senza nome.** Deepgram dice "Interlocutore 0, 1, 2..." ma non
  sa chi è il DM. L'estrazione lo deduce dal contesto (chi narra e dà voce agli
  NPC). Far scegliere all'utente "Interlocutore 0 = DM" è un bel tocco futuro.
- **File lunghi.** Una sessione di 3 ore può richiedere di spezzare o comprimere
  l'audio: ottimizzazione successiva.
- **Attenzione al deploy.** Quando metterai l'app online su Vercel, i file
  grandi caricati via API route sbattono contro un limite di dimensione (~4,5MB
  per richiesta). In locale non è un problema; al momento del deploy useremo un
  altro metodo (caricamento diretto verso uno storage). Lo affronteremo lì.

### Costo

Deepgram Nova-3 costa circa 0,22-0,26$ all'ora di audio (diarizzazione inclusa):
una sessione di 3 ore è meno di 0,80$. E i 200$ gratuiti coprono tutti i test.

---

## Caricamento audio via storage (versione robusta)

Adesso il file audio non passa più dal tuo server: il browser lo carica
direttamente nello storage di Supabase, e il server dà a Deepgram solo
l'indirizzo. Vantaggi: funziona con file di qualsiasi dimensione (anche 3 ore),
in locale E online, e il DM non deve comprimere niente — carica e basta.
Dopo la trascrizione l'audio viene cancellato, quindi lo storage resta ~gratis.

### Setup una tantum nel database (SQL Editor di Supabase)

Incolla ed esegui. Crea un "secchio" (bucket) privato per l'audio e le regole
che fanno gestire a ogni utente solo i propri file.

```sql
-- 1. Bucket privato per l'audio temporaneo (limite 500 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('audio', 'audio', false, 524288000)
on conflict (id) do nothing;

-- 2. Ogni utente può caricare/leggere/cancellare SOLO la sua cartella
create policy "audio_carica_propri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "audio_leggi_propri"
  on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "audio_cancella_propri"
  on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
```

Non servono chiavi nuove: usa quelle di Supabase e Deepgram che hai già.

### Nota onesta sul limite di dimensione

Il bucket è impostato a 500 MB per file, più che sufficiente. Ma il **piano
gratuito di Supabase** può avere un tetto globale più basso sulla dimensione di
upload: se carichi un file enorme (es. un WAV non compresso da oltre 1 GB) e
viene rifiutato, è quello. Soluzioni: registra in un formato già compresso
(m4a/mp3, quello che usano di default i telefoni), oppure alza il limite dal
piano Supabase. Con un file compresso normale non lo tocchi nemmeno.

---

## Multi-utente, pezzo 1: le campagne

Primo mattone verso gli account dei giocatori. Da ora le sessioni vivono dentro
una CAMPAGNA, non più sciolte sotto l'utente. È la base su cui poggeranno
invito, ruoli e schede dei personaggi nei prossimi pezzi.

### SQL da eseguire (SQL Editor di Supabase)

```sql
-- 1. Tabella delle campagne (ognuna ha un DM proprietario)
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  dm_id uuid default auth.uid()
);

alter table campaigns enable row level security;

create policy "Le proprie campagne (DM)"
  on campaigns for all to authenticated
  using (auth.uid() = dm_id)
  with check (auth.uid() = dm_id);

-- 2. Collega le sessioni a una campagna
alter table sessions add column campaign_id uuid references campaigns(id) on delete cascade;
```

### Cosa cambia nell'app

- Al primo accesso, se non hai campagne, l'app ti chiede di crearne una.
- In alto compare un selettore: scegli la campagna attiva, o creane altre con
  "+ Nuova".
- Sessioni, salvataggio e briefing sono ora legati alla campagna selezionata.

Nota: le sessioni di test salvate PRIMA di questo passo hanno campaign_id vuoto
e non compaiono sotto nessuna campagna. Erano dati di prova: ignorale, oppure
ripulisci con `delete from sessions where campaign_id is null;`

### Prossimi mattoni (non ancora costruiti)

2. Invito: un codice per far entrare i giocatori nella campagna.
3. Ruoli: DM vs giocatore, con accessi diversi.
4. Schede dei personaggi (i pg) compilate dai giocatori.
5. Briefing senza spoiler per i giocatori.

---

## Multi-utente, pezzo 2: invito + account giocatori

Da ora il DM ha un codice d'invito per ogni campagna, e i giocatori possono
entrare inserendolo. In questo pezzo il giocatore diventa solo un "membro
registrato": NON vede ancora nulla di sensibile (quello è il pezzo 3-4).

### SQL da eseguire (SQL Editor di Supabase)

```sql
-- 1. Codice d'invito su ogni campagna (con riempimento di quelle esistenti)
alter table campaigns add column if not exists invite_code text unique;
update campaigns
  set invite_code = upper(substr(md5(random()::text), 1, 8))
  where invite_code is null;

-- 2. Tabella dei membri: chi è entrato in quale campagna, con che ruolo
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  campaign_id uuid references campaigns(id) on delete cascade,
  user_id uuid default auth.uid(),
  player_email text,
  role text not null default 'giocatore',
  unique (campaign_id, user_id)
);

alter table members enable row level security;

-- Lettura: il DM vede i membri delle SUE campagne; ogni membro vede la propria riga.
-- (Nessuna policy di inserimento: si entra SOLO tramite la funzione sicura qui sotto.)
create policy "membri_leggi"
  on members for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from campaigns c
      where c.id = members.campaign_id and c.dm_id = auth.uid()
    )
  );

-- 3. Funzione SICURA per unirsi tramite codice.
--    Gira con privilegi elevati (security definer) ma fa SOLO una cosa:
--    trova la campagna dal codice e iscrive chi chiama come giocatore.
create or replace function join_campaign(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_email text;
begin
  select id into v_campaign_id from campaigns where invite_code = upper(p_code);
  if v_campaign_id is null then
    return null;
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into members (campaign_id, user_id, player_email, role)
  values (v_campaign_id, auth.uid(), v_email, 'giocatore')
  on conflict (campaign_id, user_id) do nothing;
  return v_campaign_id;
end;
$$;
```

### La logica di sicurezza, spiegata

Il punto delicato: un giocatore che si unisce NON è il DM, quindi le regole
non gli permettono di leggere la campagna direttamente. Allora come fa a
entrare dal codice? Tramite la funzione `join_campaign`: gira con privilegi
elevati, ma è "ingabbiata" — può fare solo quella precisa operazione sicura
(trova la campagna dal codice, iscrive chi chiama). Non può essere usata per
leggere o entrare in campagne di cui non si conosce il codice. È il modo
pulito di Supabase per fare un'operazione privilegiata senza dare poteri
all'app.

### Come collaudarlo

1. Da DM: apri una campagna, copia il codice d'invito (in alto).
2. Esci, e **registra una seconda email finta** (es. test+player@...).
3. Con quel secondo account, vai su "Unisciti a una campagna" e incolla il codice.
   Dovresti vedere il messaggio di successo.
4. Riaccedi col tuo account DM, riapri la campagna: il secondo account compare
   nell'elenco "Giocatori". Se lo vedi lì, l'invito funziona.

### Prossimi mattoni

3. Schede dei personaggi (i pg) create dai giocatori.
4. Briefing senza spoiler visibile ai giocatori.

---

## Multi-utente, pezzo 3: schede dei personaggi (con foto)

I giocatori, entrati nella campagna, la vedono nella loro home e ci cliccano
per compilare la scheda del personaggio (con foto). Il DM legge tutte le schede,
e l'estrazione del Codex riconosce i PG come membri del gruppo (non NPC).

### SQL da eseguire (SQL Editor di Supabase)

```sql
-- Schede dei personaggi (una per giocatore per campagna)
create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  campaign_id uuid references campaigns(id) on delete cascade,
  user_id uuid default auth.uid(),
  nome text,
  razza text,
  classe text,
  descrizione text,
  background text,
  note text,
  avatar_url text,
  unique (campaign_id, user_id)
);

alter table characters enable row level security;

-- Il giocatore gestisce la PROPRIA scheda, solo in campagne di cui è membro
create policy "scheda_propria"
  on characters for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from members m
      where m.campaign_id = characters.campaign_id and m.user_id = auth.uid()
    )
  );

-- Il DM legge le schede delle SUE campagne
create policy "scheda_dm_legge"
  on characters for select to authenticated
  using (
    exists (
      select 1 from campaigns c
      where c.id = characters.campaign_id and c.dm_id = auth.uid()
    )
  );

-- Le campagne in cui l'utente è entrato come giocatore (id + nome)
create or replace function my_player_campaigns()
returns table (id uuid, name text)
language sql security definer set search_path = public
as $$
  select c.id, c.name
  from campaigns c
  join members m on m.campaign_id = c.id
  where m.user_id = auth.uid();
$$;
```

### SQL per le FOTO dei personaggi (storage)

```sql
-- Secchio pubblico per le foto dei personaggi (restano, non si cancellano)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_carica_propri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_aggiorna_propri"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_cancella_propri"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_lettura_pubblica"
  on storage.objects for select
  using (bucket_id = 'avatars');
```

### Come collaudarlo

1. Col secondo account (giocatore) entra nella home: sotto "Campagne in cui
   giochi" vedi la campagna in cui sei stato invitato. Cliccala.
2. Compila la scheda, carica una foto, salva.
3. Riaccedi col tuo account DM, apri la campagna: in "Schede dei personaggi"
   vedi la scheda del giocatore con la foto.
4. Estrai una sessione in cui compare quel personaggio: il Codex non dovrebbe
   metterlo tra gli NPC, perché ora lo riconosce come PG del gruppo.

---

## Scheda del personaggio ridisegnata (+ campo Livello)

La scheda del giocatore ora ha la foto come grande immagine in cima (sfumata
nello sfondo), il nome come titolo, e i campi dentro una cornice dorata.
Aggiunto il campo "Livello".

### SQL da eseguire (SQL Editor di Supabase)

```sql
alter table characters add column if not exists livello text;
```

Una sola riga: aggiunge il livello alle schede. Tutto il resto è solo stile.
