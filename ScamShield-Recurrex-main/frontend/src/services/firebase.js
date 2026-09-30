/*
  Firebase browser client configuration for ScamShield.
*/

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDy9rkYP4YxWglcXgRAHhZKMYv1DtbCCNs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "angmi-8d81b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "angmi-8d81b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "angmi-8d81b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "77543799625",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:77543799625:web:af5987f89fc2e85800f898",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2S4MQSGP8K"
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const storage = getStorage(app)
export const AVATAR_BUCKET = 'avatars'
export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)
