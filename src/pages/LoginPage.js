import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import {
  FaEnvelope, FaLock, FaEye, FaEyeSlash,
  FaCheckCircle, FaExclamationCircle,
} from "react-icons/fa";

const ERROR_MESSAGES = {
  "auth/user-not-found":       "No account found with this email.",
  "auth/wrong-password":       "Incorrect password.",
  "auth/invalid-email":        "Invalid email address.",
  "auth/invalid-credential":   "Invalid email or password.",
  "auth/too-many-requests":    "Too many attempts. Try again later.",
  "auth/network-request-failed": "Network error. Check your connection.",
};

const FEATURES = [
  { label: "Sprint planning & kanban boards" },
  { label: "Roadmaps, epics & releases"       },
  { label: "Reports, tests & retrospectives"  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#080b14] overflow-hidden">

      {/* ── Left branding panel ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] relative flex-col justify-between p-12 overflow-hidden">

        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1760] via-[#1e1b7a] to-[#0d0b3d]" />

        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Glowing orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Logo top */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <Logo size={22} color="white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Corechestra</span>
        </div>

        {/* Main text */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
              Your team's<br />command center.
            </h1>
            <p className="text-indigo-200/70 mt-4 text-sm leading-relaxed max-w-xs">
              Plan, ship, and iterate — everything your engineering team needs, in one place.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-400/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                  <FaCheckCircle className="w-2.5 h-2.5 text-indigo-300" />
                </div>
                <span className="text-indigo-100/70 text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="relative z-10">
          <p className="text-indigo-300/30 text-xs">© {new Date().getFullYear()} Corechestra</p>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">

        {/* Subtle top-right glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px] relative z-10"
        >
          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-2.5 justify-center mb-10">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Logo size={20} color="white" />
            </div>
            <span className="text-white font-bold text-lg">Corechestra</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-slate-400 text-sm mt-1.5">Sign in to your workspace to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Email
              </label>
              <div className="relative group">
                <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50 focus:bg-white/[0.07] transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Password
              </label>
              <div className="relative group">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50 focus:bg-white/[0.07] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showPassword
                    ? <FaEyeSlash className="w-3.5 h-3.5" />
                    : <FaEye className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0,  scale: 1    }}
                  exit={{    opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <FaExclamationCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-xs leading-snug">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden mt-2 shadow-lg shadow-indigo-900/40"
            >
              {/* Shimmer on loading */}
              {loading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    Signing in...
                  </>
                ) : "Sign in"}
              </span>
            </button>

          </form>

          {/* Footer */}
          <p className="text-center text-slate-600 text-xs mt-8">
            Corechestra · Internal workspace
          </p>
        </motion.div>
      </div>
    </div>
  );
}
