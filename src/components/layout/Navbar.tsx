import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { UserRole, AppNotification } from '../../types';
import {
  LogOut,
  ChevronDown,
  UserCheck,
  Building2,
  BookOpen,
  Users,
  Menu,
  Home,
  Bell,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Megaphone,
  X,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onNavigateHome?: () => void;
  onShowLanding?: () => void;
  onNavigateToEditResult?: (classId?: string, subjectId?: string) => void;
  onNavigateToTab?: (tab: string, classId?: string, subjectId?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNavigateHome,
  onShowLanding,
  onNavigateToEditResult,
  onNavigateToTab,
}) => {
  const { currentUser, currentSchool, logout, switchDemoRole } = useAuth();
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const role = currentUser?.role || 'parent';
  const userUid = currentUser?.uid;
  const userEmail = currentUser?.email;

  useEffect(() => {
    loadNotifications();
  }, [schoolId, role, userUid, userEmail, showNotifDropdown]);

  const loadNotifications = async () => {
    const list = await dbService.getNotificationsForUser(
      schoolId,
      role,
      userUid,
      userEmail
    );
    setNotifications(list);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notif: AppNotification) => {
    await dbService.markNotificationAsRead(notif.id);
    setShowNotifDropdown(false);
    await loadNotifications();

    if (onNavigateToTab) {
      if (notif.type === 'result_rejected') {
        onNavigateToTab('assessment_entry', notif.targetClassId, notif.targetSubjectId);
      } else if (notif.type === 'result_submitted') {
        onNavigateToTab('results_review');
      } else if (notif.type === 'result_approved') {
        if (role === 'parent' || role === 'student') {
          onNavigateToTab('published_reports');
        } else {
          onNavigateToTab('submitted_results');
        }
      } else if (notif.type === 'announcement' || notif.type === 'admin_message') {
        onNavigateToTab('announcements');
      } else if (notif.type === 'chat') {
        onNavigateToTab('chat');
      } else {
        onNavigateToTab('dashboard');
      }
    } else if (notif.type === 'result_rejected' && onNavigateToEditResult) {
      onNavigateToEditResult(notif.targetClassId, notif.targetSubjectId);
    }
  };

  const handleMarkAllRead = async () => {
    await dbService.markAllNotificationsAsRead(schoolId, role, userUid, userEmail);
    await loadNotifications();
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'school_admin':
        return { label: 'School Admin', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'teacher':
        return { label: 'Teacher', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'parent':
        return { label: 'Parent', color: 'bg-sky-100 text-sky-800 border-sky-200' };
      case 'student':
        return { label: 'Student', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      default:
        return { label: 'Guest', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);

  const demoAccounts = [
    { role: 'school_admin' as UserRole, name: 'Dr. Elizabeth Warren (School Admin)', email: 'principal@graceville.edu', icon: Building2 },
    { role: 'teacher' as UserRole, name: 'Mr. David Okafor (Teacher)', email: 'david.o@graceville.edu', icon: BookOpen },
    { role: 'parent' as UserRole, name: 'Mrs. Clara Morgan (Parent)', email: 'parent@graceville.edu', icon: Users },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                title="Toggle Sidebar Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div
              onClick={onNavigateHome}
              className="flex items-center gap-3 cursor-pointer group"
              title="Go to Dashboard Home"
            >
              <div className="w-9 h-9 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm group-hover:bg-indigo-500 transition-colors">
                E3
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-lg text-white tracking-tight">E3 School Portal</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full hidden xs:inline-block">
                    V1 MVP
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Academic Result Management & Calculation
                </p>
              </div>
            </div>
          </div>

          {/* Center Info: Current School & Term context */}
          {currentSchool && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-semibold text-slate-100 max-w-[180px] truncate">{currentSchool.name}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-medium">{currentSchool.currentSession}</span>
              <span className="bg-slate-700 px-2 py-0.5 rounded text-[11px] font-medium text-slate-200">
                {currentSchool.currentTerm}
              </span>
            </div>
          )}

          {/* Right Actions: Notifications, Demo Role Quick Switcher & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onShowLanding && (
              <button
                onClick={onShowLanding}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5 font-medium border border-slate-800 cursor-pointer"
                title="View Public Overview / Landing Page"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Overview</span>
              </button>
            )}

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  setShowDemoDropdown(false);
                }}
                className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-slate-800"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 text-slate-800 z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs text-slate-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                        title="Close notifications"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs italic">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs space-y-1 ${
                            !n.read ? 'bg-indigo-50/40 font-medium' : 'text-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              {n.type === 'result_rejected' && (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              {n.type === 'result_approved' && (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                              {n.type === 'announcement' && (
                                <Megaphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              )}
                              {n.title}
                            </span>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1"></span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 leading-snug">{n.message}</p>

                          {n.type === 'result_rejected' && (
                            <div className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] mt-1">
                              ⚡ Click to Edit Rejected Result Sheet Now
                            </div>
                          )}

                          <p className="text-[9px] text-slate-400 pt-0.5">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Switch Demo Role Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoDropdown(!showDemoDropdown)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Switch role instantly to test user permissions"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Demo Roles</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {showDemoDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 text-slate-800 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Switch Role Context (Demo)
                    </p>
                  </div>
                  <div className="py-1">
                    {demoAccounts.map((account) => {
                      const IconComp = account.icon;
                      const isActive = currentUser?.role === account.role;
                      return (
                        <button
                          key={account.role}
                          onClick={() => {
                            switchDemoRole(account.role);
                            setShowDemoDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            isActive ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <IconComp className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <div>
                              <p className="font-medium text-slate-900">{account.name}</p>
                              <p className="text-[10px] text-slate-500">{account.email}</p>
                            </div>
                          </div>
                          {isActive && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Current User Info */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-2 sm:pl-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-100">{currentUser?.fullName || 'User'}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
