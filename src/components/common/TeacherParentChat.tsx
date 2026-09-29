import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { ChatMessage, Teacher, Student, ClassItem, SubjectItem } from '../../types';
import { sanitizeText, globalRateLimiter } from '../../utils/security';
import { getTeacherAssignments } from '../../utils/teacherUtils';
import {
  MessageSquare,
  Send,
  User,
  CheckCheck,
  ArrowLeft,
  AlertCircle,
  Search,
  Sparkles,
  GraduationCap,
  BookOpen,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';

export interface ChatContact {
  id: string;
  uid: string;
  name: string;
  role: 'teacher' | 'parent' | 'school_admin';
  subtitle: string;
  studentContext?: string;
  subjectBadge?: string;
  allIds: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface TeacherParentChatProps {
  initialRecipientUid?: string;
  onBackToDashboard?: () => void;
}

export const TeacherParentChat: React.FC<TeacherParentChatProps> = ({
  initialRecipientUid,
  onBackToDashboard,
}) => {
  const { currentUser, currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const role = currentUser?.role || 'parent';

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminFilter, setAdminFilter] = useState<'all' | 'teachers' | 'parents'>('all');
  const [selectedRecipient, setSelectedRecipient] = useState<ChatContact | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const currentUserIds = [
    currentUser?.uid,
    currentUser?.email,
    (currentUser as any)?.id,
  ].filter(Boolean) as string[];

  const currentUid = currentUser?.uid || currentUser?.email || 'user_demo';

  useEffect(() => {
    loadChatData();
  }, [schoolId, role, currentUser?.uid, currentUser?.email]);

  useEffect(() => {
    if (selectedRecipient) {
      loadConversation();
      const interval = setInterval(() => {
        loadConversation(true);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [selectedRecipient?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatData = async () => {
    setLoading(true);
    try {
      const [tList, sList, aList, sbList, clList, allMsgs] = await Promise.all([
        dbService.getTeachersBySchool(schoolId),
        dbService.getStudentsBySchool(schoolId),
        dbService.getClassSubjectAssignments(schoolId),
        dbService.getSubjectsBySchool(schoolId),
        dbService.getClassesBySchool(schoolId),
        dbService.getAllChatMessagesForSchool(schoolId),
      ]);

      const subMap = new Map<string, string>();
      sbList.forEach((s) => subMap.set(s.id, s.name));

      const classMap = new Map<string, ClassItem>();
      clList.forEach((c) => classMap.set(c.id, c));

      const contactsList: ChatContact[] = [];

      if (role === 'parent' || role === 'student') {
        // Parent view: find teachers who teach this parent's ward(s)
        const myEmail = currentUser?.email?.toLowerCase();
        const myStudentId = currentUser?.studentId;

        const myStudents = sList.filter(
          (s) =>
            (myEmail && s.parentEmail?.toLowerCase() === myEmail) ||
            (myStudentId && (s.id === myStudentId || s.studentId === myStudentId))
        );

        // Map assigned teachers for the student's classes
        const assignedClassIds = new Set(myStudents.map((s) => s.currentClassId));

        tList.forEach((t) => {
          // Find which classes & subjects this teacher is assigned to
          const teacherAssignments = aList.filter(
            (a) =>
              (t.uid && a.teacherId === t.uid) ||
              (t.id && a.teacherId === t.id) ||
              (t.email && a.teacherId.toLowerCase() === t.email.toLowerCase())
          );

          const relevantAssignments = teacherAssignments.filter((a) =>
            assignedClassIds.has(a.classId)
          );

          const subjectNames = Array.from(
            new Set(
              (relevantAssignments.length > 0 ? relevantAssignments : teacherAssignments)
                .map((a) => subMap.get(a.subjectId))
                .filter(Boolean)
            )
          );

          const taughtChild = myStudents.find((s) =>
            teacherAssignments.some((a) => a.classId === s.currentClassId)
          );
          const childClass = taughtChild ? classMap.get(taughtChild.currentClassId) : null;

          const targetUid = t.uid || t.email;
          const allIds = [t.uid, t.email, t.id, t.fullName].filter(Boolean) as string[];

          // Get conversation messages
          const convMsgs = getConversationBetween(currentUserIds, allIds, allMsgs);
          const lastMsg = convMsgs[convMsgs.length - 1];
          const unreads = convMsgs.filter(
            (m) =>
              !m.read &&
              allIds.some((id) => id.toLowerCase() === m.senderUid?.toLowerCase())
          ).length;

          contactsList.push({
            id: t.id,
            uid: targetUid,
            name: t.fullName,
            role: 'teacher',
            subtitle: t.email,
            subjectBadge:
              subjectNames.length > 0 ? subjectNames.slice(0, 2).join(', ') : 'Subject Teacher',
            studentContext: taughtChild
              ? `Teacher for ${taughtChild.fullName} (${childClass?.name || 'Class'})`
              : 'School Teacher',
            allIds,
            lastMessage: lastMsg?.message,
            lastMessageTime: lastMsg?.createdAt,
            unreadCount: unreads,
          });
        });
      } else if (role === 'teacher') {
        // Teacher view: find parents of students in classes taught by this teacher
        const teacherAssignments = getTeacherAssignments(aList, currentUser, tList);
        const myClassIds = new Set(teacherAssignments.map((a) => a.classId));

        const eligibleStudents = sList.filter((s) => myClassIds.has(s.currentClassId));

        // Group by unique parent email
        const parentMap = new Map<string, { student: Student; className: string }[]>();
        eligibleStudents.forEach((st) => {
          const email = st.parentEmail?.trim().toLowerCase();
          if (!email) return;
          const cl = classMap.get(st.currentClassId);
          const existing = parentMap.get(email) || [];
          existing.push({ student: st, className: cl?.name || 'Class' });
          parentMap.set(email, existing);
        });

        parentMap.forEach((children, pEmail) => {
          const firstChild = children[0];
          const allChildrenDesc = children
            .map((c) => `${c.student.fullName} (${c.className})`)
            .join(', ');

          const targetUid = pEmail;
          // Look up if there's a registered user account for this parent
          const allIds = [
            pEmail,
            firstChild.student.parentPhone,
            'uid_parent_alex', // backward compatibility for demo seed
          ].filter(Boolean) as string[];

          const convMsgs = getConversationBetween(currentUserIds, allIds, allMsgs);
          const lastMsg = convMsgs[convMsgs.length - 1];
          const unreads = convMsgs.filter(
            (m) =>
              !m.read &&
              allIds.some((id) => id.toLowerCase() === m.senderUid?.toLowerCase())
          ).length;

          contactsList.push({
            id: `parent_${pEmail}`,
            uid: targetUid,
            name: firstChild.student.parentName,
            role: 'parent',
            subtitle: pEmail,
            studentContext: `Parent of ${allChildrenDesc}`,
            subjectBadge: firstChild.className,
            allIds,
            lastMessage: lastMsg?.message,
            lastMessageTime: lastMsg?.createdAt,
            unreadCount: unreads,
          });
        });
      } else {
        // School Admin view: combine both teachers and parents
        tList.forEach((t) => {
          const targetUid = t.uid || t.email;
          const allIds = [t.uid, t.email, t.id].filter(Boolean) as string[];
          const convMsgs = getConversationBetween(currentUserIds, allIds, allMsgs);
          const lastMsg = convMsgs[convMsgs.length - 1];
          const unreads = convMsgs.filter(
            (m) =>
              !m.read &&
              allIds.some((id) => id.toLowerCase() === m.senderUid?.toLowerCase())
          ).length;

          contactsList.push({
            id: t.id,
            uid: targetUid,
            name: t.fullName,
            role: 'teacher',
            subtitle: `Teacher • ${t.email}`,
            subjectBadge: t.qualification || 'Teacher',
            allIds,
            lastMessage: lastMsg?.message,
            lastMessageTime: lastMsg?.createdAt,
            unreadCount: unreads,
          });
        });

        sList.forEach((s) => {
          if (!s.parentEmail) return;
          const cl = classMap.get(s.currentClassId);
          const allIds = [s.parentEmail, 'uid_parent_alex'].filter(Boolean) as string[];
          const convMsgs = getConversationBetween(currentUserIds, allIds, allMsgs);
          const lastMsg = convMsgs[convMsgs.length - 1];
          const unreads = convMsgs.filter(
            (m) =>
              !m.read &&
              allIds.some((id) => id.toLowerCase() === m.senderUid?.toLowerCase())
          ).length;

          contactsList.push({
            id: `parent_${s.id}`,
            uid: s.parentEmail,
            name: s.parentName,
            role: 'parent',
            subtitle: `Parent of ${s.fullName} (${cl?.name || 'Class'})`,
            studentContext: `Student: ${s.fullName}`,
            subjectBadge: cl?.name || 'Class',
            allIds,
            lastMessage: lastMsg?.message,
            lastMessageTime: lastMsg?.createdAt,
            unreadCount: unreads,
          });
        });
      }

      setContacts(contactsList);

      // Select initial recipient if requested or default to the first contact
      if (initialRecipientUid) {
        const found = contactsList.find((c) =>
          c.allIds.some((id) => id.toLowerCase() === initialRecipientUid.toLowerCase())
        );
        if (found) {
          setSelectedRecipient(found);
        } else if (contactsList.length > 0) {
          setSelectedRecipient(contactsList[0]);
        }
      } else if (!selectedRecipient && contactsList.length > 0) {
        setSelectedRecipient(contactsList[0]);
      }
    } catch (err) {
      console.error('Error loading chat contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConversationBetween = (
    myIds: string[],
    otherIds: string[],
    msgs: ChatMessage[]
  ): ChatMessage[] => {
    const isMe = (id?: string) =>
      id ? myIds.some((m) => m.toLowerCase() === id.toLowerCase()) : false;
    const isOther = (id?: string) =>
      id ? otherIds.some((o) => o.toLowerCase() === id.toLowerCase()) : false;

    return msgs
      .filter((m) => {
        const senderMe = isMe(m.senderUid);
        const senderOther = isOther(m.senderUid);
        const recipientMe = isMe(m.recipientUid);
        const recipientOther = isOther(m.recipientUid);
        return (senderMe && recipientOther) || (senderOther && recipientMe);
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const loadConversation = async (silent = false) => {
    if (!selectedRecipient) return;
    if (!silent) setIsRefreshing(true);

    try {
      const allMsgs = await dbService.getAllChatMessagesForSchool(schoolId);
      const recipientIds = selectedRecipient.allIds;
      const filtered = getConversationBetween(currentUserIds, recipientIds, allMsgs);
      setMessages(filtered);

      // Mark unread messages sent to current user as read
      const unreadIds = filtered
        .filter(
          (m) =>
            !m.read &&
            currentUserIds.some((id) => id.toLowerCase() === m.recipientUid?.toLowerCase())
        )
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await dbService.markChatMessagesAsRead(unreadIds);
        setContacts((prev) =>
          prev.map((c) =>
            c.id === selectedRecipient.id ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (e) {
      console.warn('Error loading conversation messages:', e);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = sanitizeText(textToSend || newMessage);
    if (!text || !selectedRecipient || sending) return;

    // Rate Limiting check (2-second interval)
    const rateCheck = globalRateLimiter.check(`chat_${currentUid}`, 2);
    if (!rateCheck.allowed) {
      setCooldownSeconds(rateCheck.remainingSeconds);
      setSendError(`Rate limited: Please wait ${rateCheck.remainingSeconds}s before sending.`);
      setTimeout(() => {
        setCooldownSeconds(0);
        setSendError(null);
      }, rateCheck.remainingSeconds * 1000);
      return;
    }

    setSending(true);
    setSendError(null);

    const senderName = sanitizeText(currentUser?.fullName || 'User');
    const msgData = {
      schoolId,
      senderUid: currentUid,
      senderName,
      senderRole: role as any,
      recipientUid: selectedRecipient.uid,
      recipientName: selectedRecipient.name,
      message: text,
    };

    // Optimistic UI update
    const optimisticMsg: ChatMessage = {
      id: 'opt_' + Date.now(),
      ...msgData,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      await dbService.sendChatMessage(msgData);
      await loadConversation(true);
      // Update snippet in contacts list
      setContacts((prev) =>
        prev.map((c) =>
          c.id === selectedRecipient.id
            ? {
                ...c,
                lastMessage: text,
                lastMessageTime: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setSendError('Failed to send message. Please verify network connectivity.');
    } finally {
      setSending(false);
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (adminFilter === 'teachers' && c.role !== 'teacher') return false;
    if (adminFilter === 'parents' && c.role !== 'parent') return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.subtitle.toLowerCase().includes(query) ||
      (c.studentContext && c.studentContext.toLowerCase().includes(query)) ||
      (c.subjectBadge && c.subjectBadge.toLowerCase().includes(query))
    );
  });

  // Quick reply options tailored for academic dialogue
  const quickReplies =
    role === 'parent' || role === 'student'
      ? [
          'Inquiring about homework & assignment tasks.',
          'Please share an update on continuous assessment scores.',
          'Could we schedule a brief discussion this week?',
          'Thank you, well received with thanks!',
        ]
      : [
          'Your ward showed excellent participation in class today!',
          'Friendly reminder: Please check homework for completion.',
          'Assessment scores have been calculated and published.',
          'Thank you for following up. We will look into this.',
        ];

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                Parent-Teacher Academic Chat
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Secure Direct Channel
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct two-way messaging between subject teachers and verified parents for academic progress and inquiries.
            </p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
        )}
      </div>

      {/* Main Messaging Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col md:flex-row h-[620px] sm:h-[660px]">
        {/* Left Sidebar: Contact Directory */}
        <div
          className={`w-full md:w-84 lg:w-92 bg-slate-50 border-r border-slate-200 p-3 sm:p-4 flex flex-col shrink-0 ${
            selectedRecipient ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={role === 'parent' ? 'Search teachers, subjects...' : 'Search parents, students...'}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Tabs (For School Admins) */}
          {(role === 'school_admin' || role === 'super_admin') && (
            <div className="flex gap-1 p-1 bg-slate-200/70 rounded-xl mb-3 text-[11px] font-bold text-slate-600">
              <button
                onClick={() => setAdminFilter('all')}
                className={`flex-1 py-1 rounded-lg text-center cursor-pointer transition-all ${
                  adminFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                All ({contacts.length})
              </button>
              <button
                onClick={() => setAdminFilter('teachers')}
                className={`flex-1 py-1 rounded-lg text-center cursor-pointer transition-all ${
                  adminFilter === 'teachers' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Teachers
              </button>
              <button
                onClick={() => setAdminFilter('parents')}
                className={`flex-1 py-1 rounded-lg text-center cursor-pointer transition-all ${
                  adminFilter === 'parents' ? 'bg-white text-sky-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Parents
              </button>
            </div>
          )}

          {/* Directory Count Header */}
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {role === 'parent' ? 'Your Ward’s Teachers' : 'Your Enrolled Class Parents'}
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              {filteredContacts.length} Contact{filteredContacts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Contact Cards List */}
          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                <p>Loading directory...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200/60 text-xs text-slate-400">
                <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No contacts found</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  {searchQuery ? 'Try clearing your search query' : 'No contacts matching your enrolled courses.'}
                </p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedRecipient?.id === contact.id;
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedRecipient(contact)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100/90 border-slate-200/70'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-indigo-500 text-white border border-indigo-400/40'
                            : contact.role === 'teacher'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {contact.name.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3
                            className={`font-bold text-xs truncate ${
                              isSelected ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {contact.name}
                          </h3>
                          {contact.unreadCount && contact.unreadCount > 0 ? (
                            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                              {contact.unreadCount} new
                            </span>
                          ) : null}
                        </div>

                        {/* Subject Badge or Context */}
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {contact.subjectBadge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[170px] ${
                                isSelected
                                  ? 'bg-indigo-500/80 text-white'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                              }`}
                            >
                              {contact.subjectBadge}
                            </span>
                          )}
                        </div>

                        {/* Student Reference Context */}
                        {contact.studentContext && (
                          <p
                            className={`text-[10px] truncate mt-1 ${
                              isSelected ? 'text-indigo-100' : 'text-slate-500'
                            }`}
                          >
                            {contact.studentContext}
                          </p>
                        )}

                        {/* Last Message Snippet */}
                        {contact.lastMessage && (
                          <p
                            className={`text-[10px] truncate mt-1 italic ${
                              isSelected ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            "{contact.lastMessage}"
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Conversation */}
        <div
          className={`flex-1 flex-col bg-slate-50/60 ${
            selectedRecipient ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedRecipient ? (
            <>
              {/* Recipient Header */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedRecipient(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Back to Contact Directory"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200/80">
                      {selectedRecipient.name.charAt(0)}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5"></span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {selectedRecipient.name}
                      </h2>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          selectedRecipient.role === 'teacher'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {selectedRecipient.role === 'teacher' ? 'Educator' : 'Parent'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate">
                      {selectedRecipient.studentContext || selectedRecipient.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => loadConversation(false)}
                    disabled={isRefreshing}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Refresh Messages"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5">
                {/* Secure Communication Badge */}
                <div className="flex items-center justify-center my-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] text-slate-500 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Official School Record: Messages are logged and private to school stakeholders.</span>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <div className="text-center py-12 px-4 max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800">Start Your Academic Conversation</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      You are messaging <span className="font-semibold text-slate-700">{selectedRecipient.name}</span>. Feel free to discuss student progress, assignment clarification, or assessment performance.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = currentUserIds.some(
                      (id) => id.toLowerCase() === m.senderUid?.toLowerCase()
                    );
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                          {isMine ? 'You' : m.senderName}
                        </div>
                        <div
                          className={`max-w-xs sm:max-w-md lg:max-w-lg p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                            isMine
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                          <div
                            className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 ${
                              isMine ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatMessageTime(m.createdAt)}</span>
                            {isMine && <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Academic Reply Chips */}
              <div className="bg-white px-3 sm:px-4 py-2 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Quick:
                </span>
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(reply)}
                    disabled={sending}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-600 text-[10px] font-semibold rounded-lg border border-slate-200/80 shrink-0 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <div className="bg-white border-t border-slate-200 p-3 sm:p-4 space-y-2">
                {sendError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>{sendError}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Type a message to ${selectedRecipient.name}...`}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || cooldownSeconds > 0}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{cooldownSeconds > 0 ? `${cooldownSeconds}s` : 'Send'}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center bg-slate-50/40">
              <div className="max-w-xs space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Select a Conversation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose a teacher or parent from the directory on the left to review message history and start messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
