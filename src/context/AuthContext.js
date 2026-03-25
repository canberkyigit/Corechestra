import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined → resolving, null → logged out, object → logged in
  const [user,    setUser]    = useState(undefined);
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null); // persisted profile fields from Firestore

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap    = await getDoc(userRef);
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
      } else {
        setRole(null);
        setProfile(null);
        setUser(null);
      }
    });
    return unsubscribe;
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
