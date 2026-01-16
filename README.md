# HabitHero
HabitHero is een gamified leerplatform ontworpen om de betrokkenheid en voortgang van studenten te verhogen. Hoewel het platform breed inzetbaar is, ligt de eerste focus van dit project op de ondersteuning van eerstejaarsstudenten bij het vak Programming Essentials 1 aan de Erasmushogeschool Brussel. De applicatie is volledig ontwikkeld en klaar voor gebruik in een lokale of cloud-omgeving.

# App Gedrag (Key Flows)
* **Registratie:** Als het Firestore gebruikersdocument nog niet bestaat, roept de app /auth/me aan om een standaard gebruikersprofiel aan te maken. Daarna worden studenten doorverwezen naar /student en docenten/admins naar /teacher.
* **Cursussen:** Het klikken op een ingeschreven cursus opent de bijbehorende taken op /student/courses-tasks/:courseId.
* **Inschrijven via code:** Het toevoegen van een cursus via een code schrijft de student in bij courses/{courseId}/students/{uid} en zet de veldwaarde students.{uid} op true in het cursusdocument.

## Technologie Stack

* **Frontend:** React + Vite
* **Backend:** Firebase Cloud Functions (Node 20)
* **Database:** Firestore (NoSQL)
* **Emulatie:** Firebase Local Emulator Suite (Functions & Firestore)

## lokale Installatie Setup
### 1. Voorbereiding
*   Zorg dat Node 20 is geïnstalleerd (controleer met `node -v`).
*   Installeer de Firebase CLI: `npm i -g firebase-tools`.


** 2. Install dependencies**
Installeer de pakketten voor zowel de root als de functies:
```bash
npm install
cd functions && npm install
```

### 3. Firebase Configuratie
Zorg dat je computer gekoppeld is aan het juiste project:
```bash
firebase login
firebase use habithero-73d98
```

### 4. Omgevingsvariabelen
Maak een `.env.local` bestand aan in de root van het project met de volgende inhoud:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=habithero-73d98
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
## Development

HabitHero gebruikt een Vite proxy om te communiceren met de lokale Functions emulator via `/api`. 
Gebruik twee terminals:

### Terminal 1 — Backend (Functions & Firestore emulator):
```bash
cd functions
npm run build
firebase emulators:start --only functions,firestore
```
of
```bash
cd functions
npm run dev
```

### Terminal 2 — Frontend (Vite):
```bash
npm run dev
```

*   **Frontend:** `http://localhost:5173`
*   **API Proxy:** `/api/*` -> `http://127.0.0.1:5001/habithero-73d98/us-central1`

## Deployment
Wanneer de applicatie klaar is voor productie:

### Alleen Functions deployen:
```bash
cd functions
npm run deploy
```

### Alles deployen (inclusief hosting):
```bash
firebase deploy
```

## Beveiliging & Ethiek (TICT)

Het project is ontwikkeld met de volgende principes op basis van de Technology Impact Cycle Tool:
*   **Privacy:** Data-minimalisatie en veilige authenticatie via Firebase Auth.
*   **Ethiek:** De focus ligt op positieve bekrachtiging (Hero-status) in plaats van stigmatisering.
*   **Transparantie:** XP-berekeningen en beloningen zijn inzichtelijk voor de student.

## Beloningen & Voortgang

*   De berekening van XP en loot is gebaseerd op de moeilijkheidsgraad van de taken binnen de modules.
*   Het systeem is non-profit en gericht op educatieve doeleinden om vertrouwen bij de gebruikers te waarborgen.

## Belangrijke Opmerkingen

*   De Vite proxy is geconfigureerd in `vite.config.ts` en logt uitgaande `/api` verzoeken.
*   De emulator dwingt Node 20 af via `engines.node` in de `package.json` van de functies.
*   Gebruik `Ctrl + C` om de terminals te stoppen.

Gemaakt als IT Project - Semester 1 - Erasmushogeschool Brussel.
