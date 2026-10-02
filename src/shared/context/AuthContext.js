import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, db } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import {
  isE2EMode,
  readE2EAuthUsers,
  readE2ESession,
  subscribeE2EKey,
  upsertE2EAuthUser,
  writeE2ESession,
  E2E_SESSION_KEY,
  E2E_AUTH_USERS_KEY,
} from "../e2e/testMode";
import {
  ACCOUNT_BLOCK_MESSAGES,
  getAccountBlockReason,
  isValidRole,
} from "../constants/permissions";

function createBlockedError(reason) {
  const error = new Error(ACCOUNT_BLOCK_MESSAGES[reason] || ACCOUNT_BLOCK_MESSAGES.disabled);
  error.code = reason === "deleted" ? "auth/account-deleted" : "auth/user-disabled";
  return error;
}

// Pending invite written by Admin > People (`invites/{email}`), if any.
async function readInvite(email) {
  if (!email) return null;
  try {
    const snap = await getDoc(doc(db, "invites", email.trim().toLowerCase()));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

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
  // Message shown on the login page when access was refused (deactivated / deleted account)
  const [authError, setAuthError] = useState(null);
  const clearAuthError = useCallback(() => setAuthError(null), []);

  useEffect(() => {
    if (e2eMode) {
      const applySession = () => {
        const session = readE2ESession();
        const account = session
          ? readE2EAuthUsers().find((candidate) => candidate.uid === session.uid)
          : null;
        const blockReason = getAccountBlockReason(account);
        if (session && blockReason) {
          setAuthError(ACCOUNT_BLOCK_MESSAGES[blockReason]);
          writeE2ESession(null);
          return;
        }
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
      const unsubSession = subscribeE2EKey(E2E_SESSION_KEY, applySession);
      const unsubUsers = subscribeE2EKey(E2E_AUTH_USERS_KEY, applySession);
      return () => {
        unsubSession();
        unsubUsers();
      };
    }

    let unsubFirestore = null;

    // Refuse access: keep the reason for the login page and end the Firebase session.
    const blockSession = (reason) => {
      if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
      setAuthError(ACCOUNT_BLOCK_MESSAGES[reason] || ACCOUNT_BLOCK_MESSAGES.disabled);
      setRole(null);
      setProfile(null);
      setUser(null);
      signOut(auth).catch(() => {});
    };

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
            // First login: apply a pending invite (role) or refuse a revoked one.
            const invite = await readInvite(firebaseUser.email);
            const inviteBlock = getAccountBlockReason(invite);
            if (inviteBlock) {
              blockSession(inviteBlock);
              return;
            }
            const initialRole = isValidRole(invite?.role) ? invite.role : "member";
            const initial = {
              email: firebaseUser.email,
              role: initialRole,
              ...(invite?.name ? { name: invite.name } : {}),
            };
            await setDoc(userRef, initial);
            if (invite) {
              setDoc(doc(db, "invites", firebaseUser.email.trim().toLowerCase()), {
                status: "accepted",
                acceptedUid: firebaseUser.uid,
                acceptedAt: new Date().toISOString(),
              }, { merge: true }).catch(() => {});
            }
            setRole(initialRole);
            setProfile(initial);
          } else {
            const data = snap.data();
            const blockReason = getAccountBlockReason(data);
            if (blockReason) {
              blockSession(blockReason);
              return;
            }
            setRole(isValidRole(data.role) ? data.role : "member");
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
            const blockReason = getAccountBlockReason(data);
            if (blockReason) {
              blockSession(blockReason);
              return;
            }
            setRole(isValidRole(data.role) ? data.role : "member");
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
    // Never let a profile edit touch access-control fields.
    const { role: _role, disabled: _disabled, deleted: _deleted, status: _status, ...safeFields } = fields || {};
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
    // merge: works even if the profile doc was never created (e.g. Firestore was offline at first login)
    await setDoc(userRef, safeFields, { merge: true });
    setProfile((prev) => ({ ...prev, ...safeFields }));
  };

  const login = async (email, password, { remember = true } = {}) => {
    setAuthError(null);
    if (e2eMode) {
      const normalizedEmail = email.trim().toLowerCase();
      const matched = readE2EAuthUsers().find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
      if (!matched || !password) {
        const error = new Error("Invalid email or password.");
        error.code = "auth/invalid-credential";
        throw error;
      }
      const blockReason = getAccountBlockReason(matched);
      if (blockReason) throw createBlockedError(blockReason);
      writeE2ESession({
        uid: matched.uid,
        email: matched.email,
        role: matched.role || "member",
        name: matched.name,
        username: matched.username,
      });
      return;
    }
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    } catch (err) {
      console.warn("[AuthContext] Could not set auth persistence:", err.code || err.message);
    }
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Sends a password reset email. In E2E mode no email exists, so it resolves without side effects.
  const sendPasswordReset = async (email) => {
    const normalizedEmail = String(email || "").trim();
    if (!normalizedEmail) {
      const error = new Error("Enter your email address.");
      error.code = "auth/missing-email";
      throw error;
    }
    if (e2eMode || !auth) return;
    await sendPasswordResetEmail(auth, normalizedEmail);
  };

  const logout = () => {
    setAuthError(null);
    if (e2eMode) {
      writeE2ESession(null);
      return Promise.resolve();
    }
    return signOut(auth);
  };
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider value={{
      user,
      role,
      profile,
      isAdmin,
      login,
      logout,
      updateProfile,
      sendPasswordReset,
      authError,
      clearAuthError,
    }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
