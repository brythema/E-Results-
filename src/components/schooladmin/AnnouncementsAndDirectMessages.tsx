import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { Announcement, AdminDirectMessage, Student } from '../../types';
import { Megaphone, Mail, Send, Trash2, BellRing, CheckCircle2, AlertCircle } from 'lucide-react';

export const AnnouncementsAndDirectMessages: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const role = currentUser?.role || 'parent';
  const userEmail = currentUser?.email || '';
  const isAdmin = role === 'school_admin' || role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'announcements' | 'direct_messages'>('announcements');
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [directMessages, setDirectMessages] = useState<AdminDirectMessage[]>([]);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('important');

  // Direct Message Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dmSubject, setDmSubject] = useState('School Fees Payment Reminder - First Term');
  const [dmCategory, setDmCategory] = useState<'fees_reminder' | 'academic' | 'notice'>('fees_reminder');
  const [dmContent, setDmContent] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [schoolId, userEmail, isAdmin]);

  const loadData = async () => {
    if (isAdmin) {
      const [stData, annData, dmData] = await Promise.all([
        dbService.getStudentsBySchool(schoolId),
        dbService.getAnnouncementsForSchool(schoolId),
        dbService.getAllAdminDirectMessagesForSchool(schoolId),
      ]);
      setStudents(stData);
      setAnnouncements(annData);
      setDirectMessages(dmData);

      if (stData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(stData[0].id);
        updateDefaultDmContent(stData[0]);
      }
    } else {
      const [annData, dmData] = await Promise.all([
        dbService.getAnnouncementsForSchool(schoolId),
        dbService.getAdminDirectMessagesForUser(schoolId, userEmail),
      ]);
      setAnnouncements(annData);
      setDirectMessages(dmData);
    }
  };

  const updateDefaultDmContent = (student: Student) => {
    setDmContent(
      `Dear ${student.parentName},\n\nThis is an official notice regarding ${student.fullName} (Admission No: ${student.admissionNumber}). Please ensure all outstanding First Term tuition fees are settled prior to end-of-term assessments.\n\nThank you for your cooperation.\nSchool Administration, Graceville International School`
    );
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    const st = students.find((s) => s.id === studentId);
    if (st) updateDefaultDmContent(st);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    await dbService.createAnnouncement({
      schoolId,
      title: annTitle.trim(),
      content: annContent.trim(),
      authorName: currentUser?.fullName || 'School Administrator',
      priority: annPriority,
    });

    setAnnTitle('');
    setAnnContent('');
    setStatusMsg({ type: 'success', text: 'General Announcement broadcasted to all users!' });
    await loadData();
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student || !dmSubject.trim() || !dmContent.trim()) return;

    await dbService.sendAdminDirectMessage({
      schoolId,
      recipientEmail: student.parentEmail,
      recipientName: `${student.parentName} (Parent of ${student.fullName})`,
      subject: dmSubject.trim(),
      content: dmContent.trim(),
      senderName: currentUser?.fullName || 'School Administration',
      category: dmCategory,
    });

    setStatusMsg({
      type: 'success',
      text: `Direct message sent to ${student.parentName} (${student.parentEmail})!`,
    });
    await loadData();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await dbService.deleteAnnouncement(id);
    await loadData();
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {/* Read-Only Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-600" />
              <h1 className="text-lg font-bold text-slate-900">
                School Notices & Fee Reminders
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official announcements and fee payment notifications issued directly by School Administration.
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              School Announcements ({announcements.length})
            </button>
            <button
              onClick={() => setActiveTab('direct_messages')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'direct_messages'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Direct Notices & Fees ({directMessages.length})
            </button>
          </div>
        </div>

        {/* Tab Content for Non-Admin */}
        {activeTab === 'announcements' ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-indigo-600" />
              General School Announcements
            </h2>

            <div className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-12">
                  No school announcements published at this time.
                </p>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : a.priority === 'important'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {a.priority || 'Normal'}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">{a.title}</h3>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {a.content}
                    </p>

                    <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/60 flex justify-between">
                      <span>Issued by {a.authorName}</span>
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Direct Official Admin Notices & Fee Reminders
            </h2>

            <div className="space-y-3">
              {directMessages.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-12">
                  No direct admin messages or fee reminders found for your account ({userEmail}).
                </p>
              ) : (
                directMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold uppercase">
                          {m.category ? m.category.replace('_', ' ') : 'Fee Notice'}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          {m.subject}
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-xl border border-amber-200/60 shadow-2xs">
                      {m.content}
                    </p>

                    <div className="text-[10px] text-slate-500 font-medium pt-1">
                      Recipient: <strong>{m.recipientName}</strong> ({m.recipientEmail})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">
              School Announcements & Admin Notices
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast general announcements to all users or send direct notices like School Fees Reminders to specific parents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'announcements'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Broadcast Announcement
          </button>
          <button
            onClick={() => setActiveTab('direct_messages')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'direct_messages'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Direct Parent Notice
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {statusMsg.text}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'announcements' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Announcement Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              Post General Announcement
            </h2>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Inter-House Sports Competition 2025"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Priority Level
                </label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="important">Important Notice</option>
                  <option value="urgent">Urgent Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Content / Details *
                </label>
                <textarea
                  required
                  rows={4}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Type the complete announcement message here..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
                Publish Announcement
              </button>
            </form>
          </div>

          {/* Announcements Feed */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-indigo-600" />
              Active School Announcements ({announcements.length})
            </h2>

            <div className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  No active announcements found.
                </p>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 relative"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            a.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : a.priority === 'important'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {a.priority || 'Normal'}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900">{a.title}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {a.content}
                    </p>

                    <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/60 flex justify-between">
                      <span>Posted by {a.authorName}</span>
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Direct Parent Notice Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Send Direct Notice / Fees Reminder
            </h2>

            <form onSubmit={handleSendDirectMessage} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Student / Parent *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.parentName} - {s.parentEmail})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={dmCategory}
                  onChange={(e) => setDmCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="fees_reminder">School Fees Payment Reminder</option>
                  <option value="academic">Academic / Performance Notice</option>
                  <option value="notice">General Administrative Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={dmSubject}
                  onChange={(e) => setDmSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Message Body *
                </label>
                <textarea
                  required
                  rows={5}
                  value={dmContent}
                  onChange={(e) => setDmContent(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
                Send Direct Message
              </button>
            </form>
          </div>

          {/* Sent Messages History */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Sent Admin Messages ({directMessages.length})
            </h2>

            <div className="space-y-3">
              {directMessages.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  No direct admin messages sent yet.
                </p>
              ) : (
                directMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold uppercase">
                          {m.category.replace('_', ' ')}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900">{m.subject}</h3>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200/60">
                      {m.content}
                    </p>

                    <div className="text-[10px] text-slate-500 font-medium">
                      Recipient: <strong>{m.recipientName}</strong> ({m.recipientEmail})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
