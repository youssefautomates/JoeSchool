"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface NotificationPrefs {
  new_order: boolean;
  failed_payment: boolean;
  refund: boolean;
  new_student: boolean;
  new_review: boolean;
  revenue_spike: boolean;
  suspicious_login: boolean;
}

export interface AdminPreferences {
  activeTab: "overview" | "lms" | "store" | "diagnostics";
  theme: "dark" | "light";
  dateRange: string;
  currency: string;
  notificationPrefs: NotificationPrefs;
}

const DEFAULT_PREFS: AdminPreferences = {
  activeTab: "overview",
  theme: "dark",
  dateRange: "30",
  currency: "ALL",
  notificationPrefs: {
    new_order: true,
    failed_payment: true,
    refund: true,
    new_student: true,
    new_review: true,
    revenue_spike: true,
    suspicious_login: true
  }
};

interface AdminPreferencesContextType {
  preferences: AdminPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<AdminPreferences>>;
  updatePreference: <K extends keyof AdminPreferences>(key: K, value: AdminPreferences[K]) => void;
  updateNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
  syncPreferences: () => Promise<void>;
  isLoading: boolean;
}

const AdminPreferencesContext = createContext<AdminPreferencesContextType | undefined>(undefined);

export function AdminPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AdminPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("joe_admin_preferences");
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({
          ...DEFAULT_PREFS,
          ...parsed,
          notificationPrefs: {
            ...DEFAULT_PREFS.notificationPrefs,
            ...(parsed.notificationPrefs || {})
          }
        });
      }
    } catch (e) {
      console.error("Failed to load preferences from localStorage:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage when preferences change
  useEffect(() => {
    if (isLoading) return;
    try {
      localStorage.setItem("joe_admin_preferences", JSON.stringify(preferences));
      
      // Theme DOM integration
      if (preferences.theme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    } catch (e) {
      console.error("Failed to save preferences to localStorage:", e);
    }
  }, [preferences, isLoading]);

  const updatePreference = <K extends keyof AdminPreferences>(
    key: K,
    value: AdminPreferences[K]
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const updateNotificationPref = (key: keyof NotificationPrefs, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      notificationPrefs: {
        ...prev.notificationPrefs,
        [key]: value
      }
    }));
  };

  // Future-ready sync function for mobile / API sync
  const syncPreferences = async () => {
    try {
      // Future mobile sync integration endpoint:
      // await fetch('/api/admin/preferences/sync', { method: 'POST', body: JSON.stringify(preferences) });
      // Or Supabase user metadata sync:
      // await supabase.auth.updateUser({ data: { admin_preferences: preferences } });
      console.log("Syncing admin preferences to remote backend...", preferences);
    } catch (error) {
      console.error("Failed to sync preferences to remote:", error);
    }
  };

  return (
    <AdminPreferencesContext.Provider
      value={{
        preferences,
        setPreferences,
        updatePreference,
        updateNotificationPref,
        syncPreferences,
        isLoading
      }}
    >
      {children}
    </AdminPreferencesContext.Provider>
  );
}

export function useAdminPreferences() {
  const context = useContext(AdminPreferencesContext);
  if (context === undefined) {
    throw new Error("useAdminPreferences must be used within an AdminPreferencesProvider");
  }
  return context;
}
