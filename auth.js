import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

const provider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOut() {
  return fbSignOut(auth);
}

export function onUser(cb) {
  return onAuthStateChanged(auth, cb);
}

// Block until auth state is known. Resolves with user or null.
export function authReady() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
  });
}

// Call from protected pages. Redirects to /landing.html if signed out.
export async function requireAuth() {
  const user = await authReady();
  if (!user) {
    window.location.replace("./landing.html");
    return null;
  }
  return user;
}

// Call from landing page. Redirects to /index.html if already signed in.
export async function redirectIfSignedIn() {
  const user = await authReady();
  if (user) window.location.replace("./index.html");
}
