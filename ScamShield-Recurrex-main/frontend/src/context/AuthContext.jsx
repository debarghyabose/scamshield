import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { auth, storage, firebaseConfigured, AVATAR_BUCKET } from '../services/firebase'
import { api, SESSION_EXPIRED_EVENT } from '../services/api'

/*
  Real authentication through Firebase Auth (email + password, Google OAuth).
  - The session is persisted and refreshed by Firebase Auth SDK.
  - The profile (name, avatar, settings) comes from FastAPI GET /api/profile.
*/

const AuthContext = createContext(null)

export const POST_AUTH_REDIRECT_KEY = 'scamshield.postAuthRedirect'

/** Maps Firebase Auth errors to messages people can act on. */
export function authErrorMessage(error) {
  if (!error) return ''
  const code = error.code || ''
  const msg = String(error.message || '')

  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Incorrect email or password.'
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Use a longer password.'
  }
  if (code === 'auth/invalid-email') {
    return 'Invalid email address.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a minute and try again.'
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was cancelled.'
  }
  if (code === 'auth/network-request-failed') {
    return navigator.onLine === false ? 'Network connection unavailable.' : 'Can’t reach the sign-in service. Please try again.'
  }
  return msg || 'Authentication failed. Please try again.'
}

function fallbackProfile(user) {
  if (!user) return null
  return {
    id: null,
    user_id: user.uid,
    full_name: user.displayName || null,
    email: user.email,
    avatar_url: user.photoURL || null,
    theme: 'system',
    notifications_enabled: true,
    language: 'en',
    provider: user.providerData?.[0]?.providerId || 'firebase',
    created_at: user.metadata?.creationTime,
    isFallback: true,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileStatus, setProfileStatus] = useState('idle') // idle | loading | ready | error
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const userId = user?.uid
  const profileReq = useRef(0)
  const manualSignOut = useRef(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        setSession({ user: currentUser })
        setSessionExpired(false)
      } else {
        setSession(null)
        if (!manualSignOut.current) setSessionExpired(true)
        manualSignOut.current = false
        setProfile(null)
        setProfileStatus('idle')
        setRecoveryMode(false)
      }
      setInitializing(false)
    })
    return () => unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!userId) return
    const id = ++profileReq.current
    setProfileStatus('loading')
    try {
      const p = await api.getProfile()
      if (id !== profileReq.current) return
      setProfile(p)
      setProfileStatus('ready')
    } catch {
      if (id !== profileReq.current) return
      // Backend unreachable or profile missing: fall back to Firebase Auth user info.
      setProfile((prev) => prev ?? fallbackProfile(user))
      setProfileStatus('error')
    }
  }, [userId, user])

  useEffect(() => {
    if (userId) loadProfile()
  }, [userId, loadProfile])

  // The API layer fires this when the backend rejects the token.
  useEffect(() => {
    const onExpired = async () => {
      if (auth.currentUser) {
        await fbSignOut(auth)
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const signInWithEmail = useCallback(async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      return { error: null }
    } catch (err) {
      return { error: authErrorMessage(err) }
    }
  }, [])

  const signUpWithEmail = useCallback(async ({ fullName, email, password }) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (fullName && res.user) {
        await fbUpdateProfile(res.user, { displayName: fullName.trim() })
      }
      return { error: null, needsConfirmation: false }
    } catch (err) {
      return { error: authErrorMessage(err) }
    }
  }, [])

  const signInWithGoogle = useCallback(async (redirectPath = '/dashboard') => {
    try {
      try {
        sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, redirectPath)
      } catch {
        /* storage unavailable */
      }
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      return { error: null }
    } catch (err) {
      return { error: authErrorMessage(err) }
    }
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim())
      return { error: null }
    } catch (err) {
      return { error: authErrorMessage(err) }
    }
  }, [])

  const updatePassword = useCallback(async (password) => {
    try {
      if (auth.currentUser) {
        await fbUpdatePassword(auth.currentUser, password)
        setRecoveryMode(false)
        return { error: null }
      }
      return { error: 'No authenticated user found.' }
    } catch (err) {
      return { error: authErrorMessage(err) }
    }
  }, [])

  const signOut = useCallback(async () => {
    setSessionExpired(false)
    manualSignOut.current = true
    try {
      await fbSignOut(auth)
      return { error: null }
    } catch (err) {
      manualSignOut.current = false
      return { error: authErrorMessage(err) }
    }
  }, [])

  const updateProfile = useCallback(async (fields) => {
    const p = await api.updateProfile(fields)
    setProfile(p)
    setProfileStatus('ready')
    return p
  }, [])

  const uploadAvatar = useCallback(
    async (file) => {
      if (!userId) throw new Error('Not signed in.')
      const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type]
      if (!ext) throw new Error('Use a PNG, JPG or WebP image.')
      if (file.size > 2 * 1024 * 1024) throw new Error('Image is too large — the limit is 2 MB.')

      const fileName = `${userId}/avatar-${Date.now()}.${ext}`
      const avatarRef = ref(storage, `${AVATAR_BUCKET}/${fileName}`)

      await uploadBytes(avatarRef, file, { contentType: file.type })
      const downloadURL = await getDownloadURL(avatarRef)

      const updated = await updateProfile({ avatar_url: downloadURL })
      return updated
    },
    [userId, updateProfile],
  )

  const value = useMemo(
    () => ({
      configured: firebaseConfigured,
      initializing,
      session,
      user,
      isAuthenticated: Boolean(user),
      profile: profile ?? fallbackProfile(user),
      profileStatus,
      reloadProfile: loadProfile,
      recoveryMode,
      sessionExpired,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      signOut,
      updateProfile,
      uploadAvatar,
    }),
    [
      initializing, session, user, profile, profileStatus, loadProfile, recoveryMode, sessionExpired,
      signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset, updatePassword, signOut, updateProfile, uploadAvatar,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function displayName(profile, user) {
  return profile?.full_name || user?.displayName || user?.email?.split('@')[0] || 'there'
}
