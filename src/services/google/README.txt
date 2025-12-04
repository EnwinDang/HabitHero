HabitHero - Google Services (OAuth + Calendar)
=============================================

Bestanden:
- googleAuth.ts
  * initGoogleAuth()  -> initialiseert gapi client (1x bij app start)
  * signInWithGoogle() -> opent Google login popup
  * getCurrentUser()   -> geeft huidige Google user terug
  * isSignedIn()       -> true/false
  * signOutGoogle()    -> gebruiker uitloggen

- googleCalendar.ts
  * addEventToCalendar(task) -> maakt een event in de primaire Google Calendar
    Vereist een task met: title, startTime, endTime.

Gebruik:
1. Installeer gapi-script:
   npm install gapi-script

2. In je App.tsx of main layout:
   useEffect(() => { initGoogleAuth(); }, []);

3. Bij knop "Sign in with Google":
   await signInWithGoogle();

4. Bij knop "Add to Calendar":
   await addEventToCalendar({
     title: task.title,
     startTime: task.startTime,
     endTime: task.endTime,
     description: "HabitHero task"
   });
