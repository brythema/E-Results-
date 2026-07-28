import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { dbService, INITIAL_DEMO_DATA } from '../services/dbService';
import { UserProfile, School, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  currentSchool: School | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole, customUid?: string) => Promise<void>;
  refreshAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize DB seed
  useEffect(() => {
    dbService.initializeDatabase().then(() => {
      // Default to demo school admin profile if not logged in
      loadInitialUser();
    });
  }, []);

  const loadInitialUser = async () => {
    setLoading(true);
    // Check if demo user role was previously saved or default to school admin for quick preview
    const savedUid = localStorage.getItem('e3_active_demo_uid');
    const defaultUid = savedUid || 'uid_principal_01';
    
    await loadUserProfileByUid(defaultUid);
    setLoading(false);
  };

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
      // Attempt Firebase auth
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await loadUserProfileByUid(cred.user.uid);
    } catch (err) {
      console.warn('Firebase Auth login failed, checking fallback users:', err);
      // Fallback matching for demo credentials
      const allUsers = INITIAL_DEMO_DATA.users;
      const matched = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        localStorage.setItem('e3_active_demo_uid', matched.uid);
        await loadUserProfileByUid(matched.uid);
      } else {
        setLoading(false);
        throw new Error('Invalid email or password. Please try demo login buttons or check credentials.');
      }
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
