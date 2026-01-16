# HabitHero

HabitHero is een gamified leerplatform ontworpen om de betrokkenheid en voortgang van studenten te verhogen. Hoewel het platform breed inzetbaar is, ligt de focus van dit project op de ondersteuning van eerstejaarsstudenten bij het vak **Programming Essentials 1** aan de **Erasmushogeschool Brussel**.

De applicatie is volledig ontwikkeld en kan zowel lokaal als in de cloud gebruikt en getest worden.

---

## Live Applicatie

De applicatie is gedeployed via **Firebase Hosting** en kan getest worden op:

👉 https://habithero-73d98.web.app

---

## Testen van de applicatie (voor evaluatie)

1. Ga naar de live URL.
2. Registreer een nieuw account via **email/password**.
3. Na registratie:
   - Studenten worden automatisch doorgestuurd naar `/student`.
   - Docenten/admins worden doorgestuurd naar `/teacher`.
4. Test de volgende functionaliteiten:
   - Inschrijven voor een cursus via code
   - Bekijken en voltooien van taken
   - XP, beloningen en voortgang
   - Authenticatie (login / logout)

---

## App Gedrag (Key Flows)

- **Registratie:**  
  Als het Firestore gebruikersdocument nog niet bestaat, roept de app `/auth/me` aan om een standaard gebruikersprofiel aan te maken.  
  Daarna worden gebruikers automatisch doorgestuurd op basis van hun rol.

- **Cursussen:**  
  Het klikken op een ingeschreven cursus opent de bijbehorende taken op  
  `/student/courses-tasks/:courseId`.

- **Inschrijven via code:**  
  Het toevoegen van een cursus via een code:
  - schrijft de student in bij `courses/{courseId}/students/{uid}`
  - zet `students.{uid}` op `true` in het cursusdocument.

---

## Technologie Stack

- **Frontend:** React + Vite
- **Backend:** Firebase Cloud Functions (Node.js 20)
- **Database:** Firestore (NoSQL)
- **Authenticatie:** Firebase Authentication
- **Hosting:** Firebase Hosting
- **Emulatie:** Firebase Local Emulator Suite (Functions & Firestore)

---

## Lokale installatie

### 1. Voorbereiding
- Zorg dat **Node.js 20** geïnstalleerd is (`node -v`)
- Installeer de Firebase CLI:
  ```bash
  npm install -g firebase-tools
  ```

### 2. Install dependencies
Installeer dependencies voor zowel de root als de functies:

```bash
npm install
cd functions && npm install
```

### 3. Firebase configuratie
Koppel je lokale omgeving aan het juiste Firebase project:

```bash
firebase login
firebase use habithero-73d98
```

### 4. Omgevingsvariabelen
Maak een `.env.local` bestand aan in de root van het project:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=habithero-73d98
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Opmerking:**  
Firebase API keys zijn publiek zichtbaar in frontend-applicaties.  
Beveiliging gebeurt via Firebase Authentication en Firestore Security Rules.

---

## Development

HabitHero gebruikt een Vite proxy om te communiceren met de lokale Firebase Functions emulator via `/api`.

Gebruik twee terminals:

### Terminal 1 — Backend (Functions & Firestore emulator)

```bash
cd functions
npm run build
firebase emulators:start --only functions,firestore
```

of:

```bash
cd functions
npm run serve
```

### Terminal 2 — Frontend

```bash
npm run dev
```

- **Frontend:** `http://localhost:5173`
- **API proxy:** `/api/*` → `http://127.0.0.1:8020/habithero-73d98/us-central1`

---

## Deployment

### Alleen Cloud Functions deployen

```bash
cd functions
npm run deploy
```

### Volledige applicatie deployen (inclusief hosting, in de root)

```bash
npm run build
firebase deploy
```

Na succesvolle deployment is de applicatie beschikbaar op:
👉 https://habithero-73d98.web.app

---

## Beveiliging & Ethiek (TICT)

Dit project is ontwikkeld volgens de principes van de Technology Impact Cycle Tool:

- **Privacy:**  
  Dataminimalisatie en veilige authenticatie via Firebase Auth.

- **Ethiek:**  
  Positieve bekrachtiging (Hero-status) in plaats van stigmatisering.

- **Transparantie:**  
  XP-berekeningen en beloningen zijn inzichtelijk voor studenten.

---

## Beloningen & Voortgang

- XP en loot worden berekend op basis van de moeilijkheidsgraad van taken.
- Het systeem is non-profit en uitsluitend bedoeld voor educatieve doeleinden.

---

## Belangrijke opmerkingen

- De Vite proxy is geconfigureerd in `vite.config.ts`.
- Firebase emulators dwingen Node.js 20 af via `engines.node`.
- Gebruik `Ctrl + C` om lokale servers te stoppen.

---

Gemaakt als IT Project - Semester 1 - Erasmushogeschool Brussel.
