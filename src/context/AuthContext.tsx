import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { dbService, INITIAL_DEMO_DATA } from '../services/dbService';
import { UserProfile, School, UserRole } from '../types';
import { DEMO_MODE } from '../config';

interface AuthContextType {
  currentUser: UserProfile | null;
  currentSchool: School | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole, customUid?: string) => Promise<void>;
  refreshAuthData: () => Promise<void>;
  sessionNotice: string | null;
  clearSessionNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Real Firebase session listener — the single source of truth for who is
  // signed in. Unauthenticated visitors get the login screen; nothing here
  // auto-signs anyone in.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        await loadUserProfileByUid(fbUser.uid);
      } else {
        // Only restore a demo identity when demo mode is explicitly enabled.
        const savedUid = DEMO_MODE ? localStorage.getItem('e3_active_demo_uid') : null;
        if (savedUid) {
          await loadUserProfileByUid(savedUid);
        } else {
          setCurrentUser(null);
          setCurrentSchool(null);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Demo data seeding happens only in explicit demo mode — never against a
  // production database.
  useEffect(() => {
    if (DEMO_MODE) {
      dbService.initializeDatabase();
    }
  }, []);

  // Inactive Session Auto-Logout Timer (30 minutes)
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetIdleTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSessionNotice('Your session expired due to 30 minutes of inactivity. Please log in again.');
        logout();
      }, IDLE_TIMEOUT_MS);
    };

    // Initial set
    resetIdleTimer();

    // User activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [currentUser]);

  const clearSessionNotice = () => setSessionNotice(null);

  const loadUserProfileByUid = async (uid: string) => {
    const profile = await dbService.getUserProfile(uid);
    if (profile) {
      setCurrentUser(profile);
      if (profile.schoolId) {
        const sch = await dbService.getSchoolById(profile.schoolId);
        setCurrentSchool(sch);
      } else {
        setCurrentSchool(null);
      }
    } else {
      // Fallback from INITIAL_DEMO_DATA
      const demoUser = INITIAL_DEMO_DATA.users.find((u) => u.uid === uid) || INITIAL_DEMO_DATA.users[1];
      setCurrentUser(demoUser);
      if (demoUser.schoolId) {
        const sch = INITIAL_DEMO_DATA.schools.find((s) => s.id === demoUser.schoolId) || INITIAL_DEMO_DATA.schools[0];
        setCurrentSchool(sch);
      } else {
        setCurrentSchool(null);
      }
    }
  };

  const refreshAuthData = async () => {
    if (currentUser?.uid) {
      await loadUserProfileByUid(currentUser.uid);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      // Attempt Firebase auth — real credentials, checked by Firebase.
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await loadUserProfileByUid(cred.user.uid);
    } catch (err) {
      // Passwordless demo login exists ONLY when demo mode is explicitly
      // enabled via VITE_DEMO_MODE=true (local previews, never deployments).
      if (DEMO_MODE) {
        const allUsers = INITIAL_DEMO_DATA.users;
        const matched = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (matched) {
          localStorage.setItem('e3_active_demo_uid', matched.uid);
          await loadUserProfileByUid(matched.uid);
          setLoading(false);
          return;
        }
      }
      setLoading(false);
      throw new Error('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      /* ignore */
    }
    localStorage.removeItem('e3_active_demo_uid');
    setCurrentUser(null);
    setCurrentSchool(null);
    setLoading(false);
  };

  const switchDemoRole = async (role: UserRole, customUid?: string) => {
    if (!DEMO_MODE) {
      // Role switching without authentication is a security hole — it exists
      // only as an explicit local-preview tool.
      return;
    }
    setLoading(true);
    let targetUid = customUid;
    if (!targetUid) {
      switch (role) {
        case 'school_admin':
          targetUid = 'uid_principal_01';
          break;
        case 'teacher':
          targetUid = 'uid_teacher_math';
          break;
        case 'parent':
          targetUid = 'uid_parent_alex';
          break;
        default:
          targetUid = 'uid_principal_01';
          break;
      }
    }

    if (targetUid) {
      localStorage.setItem('e3_active_demo_uid', targetUid);
      await loadUserProfileByUid(targetUid);
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentSchool,
        loading,
        login,
        logout,
        switchDemoRole,
        refreshAuthData,
        sessionNotice,
        clearSessionNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
