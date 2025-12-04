import { gapi } from "gapi-script";

const CLIENT_ID = "196689956940-lndenq1u9qmea4ms8kg9ot4eg4fv8ec4.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let gapiInitialized = false;

/**
 * Initialiseert de Google API client voor OAuth + Calendar.
 * Roep dit één keer op bij app-start (bijv. in App.tsx useEffect).
 */
export function initGoogleAuth() {
  if (gapiInitialized) return;

  gapi.load("client:auth2", () => {
    gapi.client
      .init({
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: [
          "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"
        ]
      })
      .then(() => {
        gapiInitialized = true;
        console.log("Google API client initialized");
      })
      .catch((err) => {
        console.error("Error initializing Google API client", err);
      });
  });
}

/**
 * Start een Google Sign-In flow. Geeft een GoogleUser object terug.
 */
export async function signInWithGoogle() {
  const authInstance = gapi.auth2.getAuthInstance();
  const user = await authInstance.signIn();
  return user;
}

/**
 * Haalt de huidige ingelogde Google gebruiker op (of null).
 */
export function getCurrentUser() {
  const authInstance = gapi.auth2.getAuthInstance();
  if (!authInstance) return null;
  return authInstance.currentUser.get();
}

/**
 * Checkt of al een gebruiker ingelogd is.
 */
export function isSignedIn(): boolean {
  const authInstance = gapi.auth2.getAuthInstance();
  return authInstance ? authInstance.isSignedIn.get() : false;
}

/**
 * Logt de gebruiker uit.
 */
export async function signOutGoogle() {
  const authInstance = gapi.auth2.getAuthInstance();
  if (authInstance) {
    await authInstance.signOut();
  }
}
