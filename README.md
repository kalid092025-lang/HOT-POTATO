# Hot Potato: Chaos Mode

Multiplayer party game with phone players at `/play` and a big-screen host at `/screen`. Powered by React, Vite, Firebase Firestore, and Framer Motion.

**Local Setup**
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in Firebase values.
3. Set `VITE_HOST_TOKEN` to a shared secret for write access.
4. Start dev server: `npm run dev`
5. Open `http://localhost:5173/screen` on the big screen.
6. Players join at `http://localhost:5173/play`.

**Firebase Setup**
1. Create a Firebase project.
2. Enable Firestore.
3. Enable Anonymous Auth (Firebase Authentication).
3. Create a web app and copy config values into `.env`.
4. (Optional) Update Firestore rules below for production.

**Firestore Rules (Host Token + Auth)**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read: if true;
      allow create: if gameId == "default"
        && request.resource.data.hostToken != null;
      allow update, delete: if gameId == "default"
        && (
          request.resource.data.hostToken == resource.data.hostToken
          || request.resource.data.previousHostToken == resource.data.hostToken
        );
    }
    match /games/{gameId}/players/{playerId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.auth.uid == playerId;
      allow update: if request.auth != null
        && (
          request.auth.uid == playerId
          || request.auth.uid == get(/databases/$(database)/documents/games/$(gameId)).data.hostUid
        );
      allow delete: if request.auth != null
        && request.auth.uid == get(/databases/$(database)/documents/games/$(gameId)).data.hostUid;
    }
  }
}
```

Rules are scoped to `gameId == "default"` and a shared `hostToken`. If you need player-only writes without revealing the host token, move write logic to Cloud Functions or add Firebase Auth rules for player actions.

**Project Structure**
`src/components` reusable UI (PlayerAvatar, Bomb, Timer, Lobby, TaskCard, GameFeed)  
`src/pages` player and screen pages  
`src/hooks` realtime hooks  
`src/firebase` Firebase setup  
`src/game` game logic and tasks  
`src/animations` Framer Motion variants

**Host Controller Lock**
The big screen claims a short-lived controller lock (`controllerToken`) and refreshes it every 5 seconds. Only the active controller can tick the bomb or trigger explosions, preventing multiple screens from fighting each other.

**Auth + Player Writes**
Players sign in anonymously and only write to their own player doc. The host can update any player via `hostUid`, which is set by the active controller screen.
