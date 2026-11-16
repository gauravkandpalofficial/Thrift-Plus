import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "./authContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const sessionCheckController = useRef(null);

  // Cancel a pending startup check before applying a newer login or logout result.
  const updateUser = useCallback((nextUser) => {
    sessionCheckController.current?.abort();
    setUser(nextUser);
    setIsCheckingSession(false);
    setSessionError("");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    sessionCheckController.current = controller;

    async function restoreSession() {
      try {
        const response = await fetch("http://localhost:5000/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });

        if (response.status === 401) {
          // A 401 means the visitor has no valid logged-in session.
          setUser(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to check your login session.");
        }

        const data = await response.json();
        setUser(data.user || null);
      } catch (error) {
        if (error.name !== "AbortError") {
          setUser(null);
          setSessionError("Could not check your login session. Some account details may be unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingSession(false);
        }
      }
    }

    restoreSession();

    return () => controller.abort();
  }, []);

  const logout = useCallback(async () => {
    const response = await fetch("http://localhost:5000/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to log out right now.");
    }

    updateUser(null);
  }, [updateUser]);

  const value = useMemo(() => ({
    user,
    setUser: updateUser,
    isCheckingSession,
    sessionError,
    logout,
  }), [user, updateUser, isCheckingSession, sessionError, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
