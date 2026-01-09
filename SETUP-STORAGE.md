# Firebase Storage Setup

## Stap 1: Activeer Firebase Storage

1. Ga naar: https://console.firebase.google.com/project/habithero-73d98/storage
2. Klik op "Get Started"
3. Selecteer de default locatie (bijvoorbeeld `us-central1`)
4. Klik "Done"

## Stap 2: Deploy Storage Rules

```bash
firebase deploy --only storage
```

## Stap 3: Configureer CORS (via Google Cloud Console)

### Optie A: Via gcloud CLI (als geïnstalleerd)

```bash
gcloud storage buckets update gs://habithero-73d98.firebasestorage.app --cors-file=cors.json
```

### Optie B: Via Firebase Console UI

1. Ga naar: https://console.cloud.google.com/storage/browser/habithero-73d98.firebasestorage.app
2. Klik op de bucket naam
3. Ga naar het "Configuration" tab
4. Scroll naar "CORS configuration"
5. Klik "Edit"
6. Plak de volgende JSON:

```json
[
  {
    "origin": ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600
  }
]
```

7. Klik "Save"

## Verificatie

Test de image upload in de Daily Tasks pagina. CORS errors zouden moeten verdwijnen na deze stappen.
