import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { ChatMessage, Teacher, Student } from '../../types';
import { MessageSquare, Send, User, Check, CheckCheck, Clock } from 'lucide-react';

export const TeacherParentChat: React.FC = () => {
  const { currentUser, currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const role = currentUser?.role;

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [selectedRecipient, setSelectedRecipient] = useState<{
    uid: string;
    name: string;
    subtitle: string;
    subject?: string;
    allIds?: string[];
  } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserIds = [
    currentUser?.uid,
    currentUser?.email,
    (currentUser as any)?.id,
  ].filter(Boolean) as string[];

  const currentUid = currentUser?.uid || currentUser?.email || 'user_demo';

  useEffect(() => {
    loadRecipients();
  }, [schoolId, role]);

  useEffect(() => {
    if (selectedRecipient) {
      loadMessages();
    }
  }, [selectedRecipient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getTeacherSubject = (teacher: Teacher, assignList = assignments, subMap = subjectsMap) => {
    const matches = assignList.filter(
      (a) =>
        a.teacherId === teacher.id ||
        a.teacherId === teacher.uid ||
        (teacher.email && a.teacherId === teacher.email)
    );
    const names = Array.from(
      new Set(matches.map((m) => subMap[m.subjectId]).filter(Boolean))
    );
    if (names.length > 0) {
      return names.join(', ');
    }
    if (teacher.email?.includes('math')) return 'Mathematics, Basic Science';
    if (teacher.email?.includes('eng')) return 'English Language';
    return 'Subject Teacher';
  };

  const loadRecipients = async () => {
    setLoading(true);
    const [tList, sList, aList, sbList] = await Promise.all([
      dbService.getTeachersBySchool(schoolId),
      dbService.getStudentsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
      dbService.getSubjectsBySchool(schoolId),
    ]);

    const sMap: Record<string, string> = {};
    sbList.forEach((s) => {
      sMap[s.id] = s.name;
    });

    setTeachers(tList);
    setStudents(sList);
    setAssignments(aList);
    setSubjectsMap(sMap);

    if (role === 'parent' || role === 'student') {
      if (tList.length > 0) {
        const firstSubj = getTeacherSubject(tList[0], aList, sMap);
        const t = tList[0];
        setSelectedRecipient({
          uid: t.uid || t.email,
          name: t.fullName,
          subtitle: `Teacher - ${t.email}`,
          subject: firstSubj,
          allIds: [t.uid, t.email, t.id].filter(Boolean) as string[],
        });
      }
    } else if (role === 'teacher') {
      if (sList.length > 0) {
        const s = sList[0];
        setSelectedRecipient({
          uid: s.parentEmail,
          name: `${s.parentName} (Parent of ${s.fullName})`,
          subtitle: s.parentEmail,
          allIds: [s.parentEmail, 'uid_parent_alex'].filter(Boolean) as string[],
        });
      }
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    if (!selectedRecipient) return;

    const recipientIds = selectedRecipient.allIds && selectedRecipient.allIds.length > 0
      ? selectedRecipient.allIds
      : [selectedRecipient.uid, selectedRecipient.subtitle].filter(Boolean) as string[];

    const allMsgs = await dbService.getChatMessagesForUser(schoolId, [
      ...currentUserIds,
      ...recipientIds,
    ]);

    const filtered = allMsgs.filter((m) => {
      const isSenderMe = currentUserIds.includes(m.senderUid);
      const isSenderRecipient = recipientIds.includes(m.senderUid);
      const isRecipientMe = currentUserIds.includes(m.recipientUid);
      const isRecipientRecipient = recipientIds.includes(m.recipientUid);

      return (isSenderMe && isRecipientRecipient) || (isSenderRecipient && isRecipientMe);
    });

    setMessages(filtered);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRecipient) return;

    const msgData = {
      schoolId,
      senderUid: currentUid,
      senderName: currentUser?.fullName || 'User',
      senderRole: (currentUser?.role || 'parent') as any,
      recipientUid: selectedRecipient.uid,
      recipientName: selectedRecipient.name,
      message: newMessage.trim(),
    };

    await dbService.sendChatMessage(msgData);
    setNewMessage('');
    await loadMessages();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col md:flex-row h-[550px]">
      {/* Sidebar Recipient List */}
      <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {role === 'parent' ? 'Select Teacher' : 'Select Parent / Contact'}
          </h2>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
          {role === 'parent' || role === 'student'
            ? teachers.map((t) => {
                const targetUid = t.uid || t.email;
                const isSelected = selectedRecipient?.uid === targetUid;
                const subj = getTeacherSubject(t);
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      setSelectedRecipient({
                        uid: targetUid,
                        name: t.fullName,
                        subtitle: `Teacher - ${t.email}`,
                        subject: subj,
                        allIds: [t.uid, t.email, t.id].filter(Boolean) as string[],
                      })
                    }
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <p className="font-bold truncate text-slate-900">{t.fullName}</p>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 max-w-[120px] truncate ${
                          isSelected
                            ? 'bg-indigo-500 text-white border border-indigo-400/50'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                        }`}
                      >
                        {subj}
                      </span>
                    </div>
                    <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {t.email}
                    </p>
                  </button>
                );
              })
            : students.map((s) => {
                const isSelected = selectedRecipient?.uid === s.parentEmail;
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setSelectedRecipient({
                        uid: s.parentEmail,
                        name: `${s.parentName} (${s.fullName})`,
                        subtitle: s.parentEmail,
                        allIds: [s.parentEmail, 'uid_parent_alex'].filter(Boolean) as string[],
                      })
                    }
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <p className="font-bold truncate">{s.parentName}</p>
                    <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                      Parent of {s.fullName}
                    </p>
                  </button>
                );
              })}
        </div>
      </div>

      {/* Main Chat Conversation */}
      <div className="flex-1 flex flex-col bg-slate-900/5">
        {selectedRecipient ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                {selectedRecipient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-slate-900">{selectedRecipient.name}</h3>
                  {selectedRecipient.subject && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full border border-indigo-200 shrink-0">
                      Subject: {selectedRecipient.subject}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">{selectedRecipient.subtitle}</p>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-12 italic">
                  No messages yet. Send a message to start the conversation!
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = currentUserIds.includes(m.senderUid);
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-xs sm:max-w-md p-3 rounded-2xl text-xs ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-2xs'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                        <div
                          className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                            isMine ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMine && <CheckCheck className="w-3 h-3 text-indigo-200" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Type a message to ${selectedRecipient.name}...`}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs italic">
            Select a contact to begin messaging.
          </div>
        )}
      </div>
    </div>
  );
};
