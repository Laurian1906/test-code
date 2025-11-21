import { createContext, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { adminEmails } from "@/config/admins.js";

const AuthContext = createContext(undefined);
const STORAGE_KEY = "feedback_auth_user";

function readStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read stored auth user:", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());

  const isEmailAllowed = (email) => {
    if (!email) return false;
    const normalizedEmail = email.toLowerCase();
    return adminEmails.some(
      (adminEmail) => adminEmail.toLowerCase() === normalizedEmail
    );
  };

  useEffect(() => {
    if (user && !isEmailAllowed(user.email)) {
      window.localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return;
    }
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        const storedUser = readStoredUser();
        if (storedUser && !isEmailAllowed(storedUser.email)) {
          window.localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        } else {
          setUser(storedUser);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      login: (data) => {
        if (!isEmailAllowed(data?.email)) {
          return;
        }
        const nextUser = {
          ...data,
          role: "admin",
        };
        setUser(nextUser);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        } catch (error) {
          console.error("Failed to persist auth user:", error);
        }
      },
      logout: () => {
        setUser(null);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.error("Failed to clear auth user:", error);
        }
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
