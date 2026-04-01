import { useMemo } from "react";

export function useHrUsers({ rawUsers, authUser, profile }) {
  const users = useMemo(() => {
    const seen = new Set();
    return (rawUsers || []).filter((user) => {
      if (!user.id || seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    });
  }, [rawUsers]);

  const currentUser = useMemo(
    () => users.find((user) => user.id === authUser?.uid || user.email === authUser?.email),
    [authUser?.email, authUser?.uid, users]
  );

  const userName = profile?.fullName || currentUser?.name || authUser?.email?.split("@")[0] || "User";
  const userEmail = authUser?.email || "";

  return {
    users,
    currentUser,
    userName,
    userEmail,
  };
}
