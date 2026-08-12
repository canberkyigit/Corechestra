import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import {
  isE2EMode,
  readE2EAuthUsers,
  readE2ESession,
  subscribeE2EKey,
  upsertE2EAuthUser,
  writeE2ESession,
  E2E_SESSION_KEY,
} from "../e2e/testMode";

const AuthContext = createContext(null);
const PROFILE_FIELDS = new Set(["name", "fullName", "title", "timezone", "bio", "color", "notifPrefs"]);

export function sanitizeProfileFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).filter(([key]) => PROFILE_FIELDS.has(key))
  );
}

export function AuthProvider({ children }) {
  const e2eMode = isE2EMode();
  const initialSession = e2eMode ? readE2ESession() : null;

  // undefined → resolving, null → logged out, object → logged in
  const [user, setUser] = useState(() => (
    e2eMode
      ? (initialSession ? { uid: initialSession.uid, email: initialSession.email } : null)
      : undefined
  ));
  const [role, setRole] = useState(() => initialSession?.role || null);
  const [profile, setProfile] = useState(() => (
    initialSession
      ? { email: initialSession.email, role: initialSession.role || "member", ...initialSession }
      : null
  )); // persisted profile fields from Firestore

  useEffect(() => {
    if (e2eMode) {
      const applySession = () => {
        const session = readE2ESession();
        if (session) {
          setUser({ uid: session.uid, email: session.email });
          setRole(session.role || "member");
          setProfile({ email: session.email, role: session.role || "member", ...session });
        } else {
          setUser(null);
          setRole(null);
          setProfile(null);
        }
      };

      applySession();
      return subscribeE2EKey(E2E_SESSION_KEY, applySession);
    }

    let unsubFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cancel any previous Firestore listener before switching users
      if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        // Initial fetch — ensures role/profile are set before the app renders.
        // If Firestore rules are not deployed yet, keep auth alive and let the
        // rest of the app surface sync errors without crashing the dev overlay.
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const initial = { email: firebaseUser.email, role: "member" };
            await setDoc(userRef, initial);
            setRole("member");
            setProfile(initial);
          } else {
            const data = snap.data();
            if (data.deleted === true || data.status === "inactive") {
              await signOut(auth);
              return;
            }
            setRole(data.role || "member");
            setProfile(data);
          }
        } catch (err) {
          console.warn("[AuthContext] Failed to load user profile:", err.code || err.message);
          const fallback = { email: firebaseUser.email, role: "member" };
          setRole("member");
          setProfile(fallback);
        }
        setUser(firebaseUser);

        // Real-time listener — picks up role/profile changes made by an admin
        // without requiring a logout/login cycle
        unsubFirestore = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.deleted === true || data.status === "inactive") {
              signOut(auth);
              return;
            }
            setRole(data.role || "member");
            setProfile(data);
          }
        }, (err) => {
          console.warn("[AuthContext] User profile listener failed:", err.code || err.message);
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
  }, [e2eMode]);

  // Persist profile fields to Firestore and update local state
  const updateProfile = async (fields) => {
    const safeFields = sanitizeProfileFields(fields);
    if (Object.keys(safeFields).length === 0) return;

    if (e2eMode) {
      const session = readE2ESession();
      if (!session) return;
      const nextSession = { ...session, ...safeFields };
      writeE2ESession(nextSession);
      upsertE2EAuthUser(session.uid, nextSession);
      setProfile((prev) => ({ ...prev, ...safeFields }));
      return;
    }
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, safeFields);
    setProfile((prev) => ({ ...prev, ...safeFields }));
  };

  const login = async (email, password) => {
    if (e2eMode) {
      const normalizedEmail = email.trim().toLowerCase();
      const matched = readE2EAuthUsers().find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
      if (!matched || !password) {
        const error = new Error("Invalid email or password.");
        error.code = "auth/invalid-credential";
        throw error;
      }
      writeE2ESession({
        uid: matched.uid,
        email: matched.email,
        role: matched.role || "member",
        name: matched.name,
        username: matched.username,
      });
      return;
    }
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    if (e2eMode) {
      writeE2ESession(null);
      return Promise.resolve();
    }
    return signOut(auth);
  };
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider value={{ user, role, profile, isAdmin, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
