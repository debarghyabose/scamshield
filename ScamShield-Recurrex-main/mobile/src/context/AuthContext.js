import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const p = await api.getProfile();
          setProfile(p);
        } catch {
          setProfile({
            user_id: currentUser.uid,
            full_name: currentUser.displayName,
            email: currentUser.email,
          });
        }
      } else {
        setProfile(null);
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const signUp = async (fullName, email, password) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (fullName && res.user) {
        await fbUpdateProfile(res.user, { displayName: fullName.trim() });
      }
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setProfile(null);
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const reloadProfile = async () => {
    if (!user) return;
    try {
      const p = await api.getProfile();
      setProfile(p);
    } catch {
      /* ignore fallback */
    }
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      isAuthenticated: Boolean(user),
      initializing,
      signIn,
      signUp,
      resetPassword,
      signOut,
      reloadProfile,
    }),
    [user, profile, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
