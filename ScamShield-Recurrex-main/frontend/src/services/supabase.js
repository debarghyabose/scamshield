/*
  Compatibility bridge for firebase.js
*/

import { auth, firebaseConfigured, AVATAR_BUCKET } from './firebase'

export const supabaseConfigured = firebaseConfigured
export { AVATAR_BUCKET }

export function getSupabase() {
  return Promise.resolve(null)
}
