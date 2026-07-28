/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginForm } from './components/auth/LoginForm';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { LandingPage } from './components/landing/LandingPage';

// Super Admin
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';

// School Admin
import { SchoolAdminDashboard } from './components/schooladmin/SchoolAdminDashboard';
import { StudentManagement } from './components/schooladmin/StudentManagement';
import { TeacherManagement } from './components/schooladmin/TeacherManagement';
import { ClassManagement } from './components/schooladmin/ClassManagement';
import { SubjectManagement } from './components/schooladmin/SubjectManagement';
import { ResultReview } from './components/schooladmin/ResultReview';
import { SchoolSettings } from './components/schooladmin/SchoolSettings';

// Teacher
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AssessmentEntry } from './components/teacher/AssessmentEntry';

// Parent & Student
import { ParentDashboard } from './components/parent/ParentDashboard';

// Communications
import { TeacherParentChat } from './components/common/TeacherParentChat';
import { AnnouncementsAndDirectMessages } from './components/schooladmin/AnnouncementsAndDirectMessages';

const MainAppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Selected assignment params for teacher score entry shortcut
  const [selectedEntryClassId, setSelectedEntryClassId] = useState<string | undefined>();
  const [selectedEntrySubjectId, setSelectedEntrySubjectId] = useState<string | undefined>();

  // Reset tab to dashboard whenever user or role changes
  useEffect(() => {
    setCurrentTab('dashboard');
  }, [currentUser?.role, currentUser?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 font-black text-2xl flex items-center justify-center mx-auto animate-pulse">
            E3
          </div>
          <p className="text-xs font-bold text-slate-300">Loading E3 School Portal...</p>
        </div>
      </div>
    );
  }

  // If user requested landing page
  if (showLandingPage) {
    return <LandingPage onGetStarted={() => setShowLandingPage(false)} />;
  }

  if (!currentUser) {
    return (
      <>
        <LoginForm
          onForgotPasswordClick={() => setIsForgotPasswordOpen(true)}
          onBackToLanding={() => setShowLandingPage(true)}
        />
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />
      </>
    );
  }

  const role = currentUser.role;

  const handleSelectAssignmentForEntry = (classId: string, subjectId: string) => {
    setSelectedEntryClassId(classId);
    setSelectedEntrySubjectId(subjectId);
  };

  const handleNavigateToEditResult = (classId?: string, subjectId?: string) => {
    if (classId) setSelectedEntryClassId(classId);
    if (subjectId) setSelectedEntrySubjectId(subjectId);
    setCurrentTab('assessment_entry');
  };

  const renderActiveTabContent = () => {
    // Common Tabs for Chat and Announcements
    if (currentTab === 'chat') {
      return <TeacherParentChat />;
    }
    if (currentTab === 'announcements') {
      return <AnnouncementsAndDirectMessages />;
    }

    // School Admin Views
    if (role === 'school_admin' || role === 'super_admin') {
      switch (currentTab) {
        case 'dashboard':
          return <SchoolAdminDashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
        case 'students':
          return <StudentManagement />;
        case 'teachers':
          return <TeacherManagement />;
        case 'classes':
          return <ClassManagement />;
        case 'subjects':
          return <SubjectManagement />;
        case 'results_review':
          return <ResultReview />;
        case 'settings':
          return <SchoolSettings />;
        default:
          return <SchoolAdminDashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
      }
    }

    // Teacher Views
    if (role === 'teacher') {
      switch (currentTab) {
        case 'dashboard':
          return (
            <TeacherDashboard
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectAssignmentForEntry={handleSelectAssignmentForEntry}
            />
          );
        case 'assessment_entry':
        case 'submitted_results':
          return (
            <AssessmentEntry
              initialClassId={selectedEntryClassId}
              initialSubjectId={selectedEntrySubjectId}
            />
          );
        default:
          return (
            <TeacherDashboard
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectAssignmentForEntry={handleSelectAssignmentForEntry}
            />
          );
      }
    }

    // Parent Views (Read-only student report card viewing)
    if (role === 'parent' || role === 'student') {
      return <ParentDashboard />;
    }

    return <SchoolAdminDashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Navbar
        onToggleSidebar={() => setMobileMenuOpen(!mobileMenuOpen)}
        onNavigateHome={() => setCurrentTab('dashboard')}
        onShowLanding={() => setShowLandingPage(true)}
        onNavigateToEditResult={handleNavigateToEditResult}
        onNavigateToTab={(tab, classId, subjectId) => {
          if (classId) setSelectedEntryClassId(classId);
          if (subjectId) setSelectedEntrySubjectId(subjectId);
          setCurrentTab(tab);
        }}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderActiveTabContent()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
