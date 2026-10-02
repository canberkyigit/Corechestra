import React, { useState, useEffect, useRef } from "react";
import { FaStopwatch } from "react-icons/fa";

export default function RetroTimer() {
  const [seconds, setSeconds]   = useState(0);
  const [running, setRunning]   = useState(false);
  const [preset,  setPreset]    = useState(null); // countdown start value
  const intervalRef = useRef(null);

  const PRESETS = [5 * 60, 10 * 60, 15 * 60];

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (preset !== null && s <= 0) {
            setRunning(false);
            return 0;
          }
          return preset !== null ? s - 1 : s + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, preset]);

  const reset = () => {
    setRunning(false);
    setSeconds(preset ?? 0);
  };

  const startPreset = (p) => {
    setPreset(p);
    setSeconds(p);
    setRunning(true);
  };

  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isWarning = preset !== null && seconds <= 60 && seconds > 0 && running;
  const isDone    = preset !== null && seconds === 0 && !running;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <FaStopwatch className={`w-3.5 h-3.5 ${isWarning ? "text-red-500 animate-pulse" : isDone ? "text-green-500" : "text-slate-400 dark:text-slate-500"}`} />
      <span className={`font-mono text-sm font-bold tabular-nums ${
        isWarning ? "text-red-500" : isDone ? "text-green-500 dark:text-green-400" : "text-slate-600 dark:text-slate-300"
      }`}>
        {display}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setRunning((v) => !v)}
          className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={reset}
          className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 transition-colors"
        >
          Reset
        </button>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => startPreset(p)}
            className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            {p / 60}m
          </button>
        ))}
      </div>
    </div>
  );
}
