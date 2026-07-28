import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  FileCheck2,
  Settings,
  FileSpreadsheet,
  Award,
  X,
  MessageSquare,
  Megaphone,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderNavGroup = (
    title: string,
    items: Array<{ id: string; label: string; icon: React.ElementType }>
  ) => (
    <div className="mb-6">
      <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Mobile Header */}
        {isMobileOpen && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 md:hidden">
            <span className="font-bold text-sm text-slate-900">Portal Navigation</span>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* School Admin Navigation */}
        {(role === 'school_admin' || role === 'super_admin') &&
          renderNavGroup('School Management', [
            { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
            { id: 'students', label: 'Students Directory', icon: GraduationCap },
            { id: 'teachers', label: 'Teachers Management', icon: Users },
            { id: 'classes', label: 'Classes & Streams', icon: Layers },
            { id: 'subjects', label: 'Subjects Management', icon: BookOpen },
            { id: 'results_review', label: 'Result Review & Approval', icon: FileCheck2 },
            { id: 'announcements', label: 'Announcements & Direct Notices', icon: Megaphone },
            { id: 'chat', label: 'Messages & Chat', icon: MessageSquare },
            { id: 'settings', label: 'School Settings', icon: Settings },
          ])}

        {/* Teacher Navigation */}
        {role === 'teacher' &&
          renderNavGroup('Teacher Portal', [
            { id: 'dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
            { id: 'assessment_entry', label: 'Assessment Score Entry', icon: FileSpreadsheet },
            { id: 'submitted_results', label: 'Submitted Scores', icon: FileCheck2 },
            { id: 'announcements', label: 'School Announcements', icon: Megaphone },
            { id: 'chat', label: 'Parent-Teacher Chat', icon: MessageSquare },
          ])}

        {/* Parent Navigation */}
        {(role === 'parent' || role === 'student') &&
          renderNavGroup('Parent Portal', [
            { id: 'dashboard', label: 'Child Performance', icon: LayoutDashboard },
            { id: 'published_reports', label: 'Report Cards', icon: Award },
            { id: 'chat', label: 'Teacher Chat Box', icon: MessageSquare },
            { id: 'announcements', label: 'School Notices & Fee Reminders', icon: Megaphone },
          ])}
      </div>

      {/* Mission Footer */}
      <div className="mt-8 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 text-[11px] leading-relaxed">
        <p className="font-semibold text-slate-700 mb-1">E3 Mission</p>
        Remove the stress of calculating results so teachers can focus on teaching.
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0 hidden md:block">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay & Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 bg-white h-full p-4 overflow-y-auto shadow-2xl z-10 flex flex-col justify-between">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
