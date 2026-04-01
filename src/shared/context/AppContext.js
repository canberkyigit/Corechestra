import React from "react";
import { useAppStoreSync } from "./hooks/useAppStoreSync";
export { useApp } from "./hooks/useAppApi";

export function AppProvider({ children }) {
  useAppStoreSync();
  return <>{children}</>;
}
