import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined → resolving, null → logged out, object → logged in
  const [user,    setUser]    = useState(undefined);
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null); // persisted profile fields from Firestore

  useEffect(() => {
    let unsubFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cancel any previous Firestore listener before switching users
      if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        // Initial fetch — ensures role/profile are set before the app renders
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const initial = { email: firebaseUser.email, role: "member" };
          await setDoc(userRef, initial);
          setRole("member");
          setProfile(initial);
        } else {
          const data = snap.data();
          setRole(data.role || "member");
          setProfile(data);
        }
        setUser(firebaseUser);

        // Real-time listener — picks up role/profile changes made by an admin
        // without requiring a logout/login cycle
        unsubFirestore = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setRole(data.role || "member");
            setProfile(data);
          }
        });
      } else {
        setRole(null);
        setProfile(null);
        setUser(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  // Persist profile fields to Firestore and update local state
  const updateProfile = async (fields) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, fields);
    setProfile((prev) => ({ ...prev, ...fields }));
  };

  const login   = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout  = () => signOut(auth);
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider value={{ user, role, profile, isAdmin, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
