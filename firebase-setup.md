Use a new Firebase project for this app.

1. Create a Firebase project in the Firebase console.
2. Add a Web app to the project.
3. Copy the Firebase config values into `index.html` inside `FIREBASE_CONFIG`.
4. Enable Firestore Database in production or test mode.
5. For this prototype, use these Firestore rules:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lifestageFocusStates/{deviceId} {
      allow read, write: if true;
    }
  }
}
```

This is intentionally open for quick prototyping and is not production-safe.

The app stores one document per device at:

- Collection: `lifestageFocusStates`
- Document ID: browser-generated device ID in local storage

Stored fields:

- `deviceId`
- `payload`
- `updatedAt`
