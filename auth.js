import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
await setPersistence(auth, browserLocalPersistence);

// ---------- User profile / preferences in Firestore ----------
// Doc shape: users/{uid} = { email, displayName, photoURL, prefs: {...}, updatedAt }

export async function loadUserPrefs(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data().prefs || {}) : {};
}

export async function saveUserPrefs(uid, prefs) {
  await setDoc(
    doc(db, "users", uid),
    { prefs, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function ensureUserProfile(user) {
  await setDoc(
    doc(db, "users", user.uid),
    {
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

const provider = new GoogleAuthProvider();

// Detect mobile / iOS Safari — signInWithPopup is blocked by iOS, use redirect instead.
function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function signInWithGoogle() {
  if (isMobile()) {
    // On mobile, redirect flow is the only reliable option.
    return signInWithRedirect(auth, provider);
  }
  return signInWithPopup(auth, provider);
}

// Call on landing page load to pick up the result of a redirect sign-in.
export function getGoogleRedirectResult() {
  return getRedirectResult(auth);
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
