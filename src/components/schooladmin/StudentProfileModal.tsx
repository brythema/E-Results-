import React, { useState, useEffect } from 'react';
import { Student, ClassItem, SubjectItem, SubjectResult, ChatMessage, AdminDirectMessage, Teacher } from '../../types';
import { dbService } from '../../services/dbService';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  Home,
  Briefcase,
  FileCheck2,
  MessageSquare,
  Award,
  Send,
  Building,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: ClassItem[];
  subjects: SubjectItem[];
  teachers: Teacher[];
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  classes,
  subjects,
  teachers,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'messages' | 'admin_notices'>('overview');
  const [results, setResults] = useState<SubjectResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [adminDirectMessages, setAdminDirectMessages] = useState<AdminDirectMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected conversation thread for chat reader
  const [selectedTeacherUid, setSelectedTeacherUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !student) return;
    loadStudentDetails();
  }, [isOpen, student]);

  const loadStudentDetails = async () => {
    if (!student) return;
    setLoading(true);

    try {
      const [allResults, allChatMessages, allAdminMsgs] = await Promise.all([
        dbService.getAllResultsForSchool(student.schoolId),
        dbService.getAllChatMessagesForSchool(student.schoolId),
        dbService.getAllAdminDirectMessagesForSchool(student.schoolId),
      ]);

      // Filter academic results for this student
      const stResults = allResults.filter(
        (r) => r.studentId === student.id || r.studentId === student.studentId
      );
      setResults(stResults);

      // Filter chat messages related to this student's parent email or student ID
      const parentEmailLower = student.parentEmail.toLowerCase();
      const parentPhone = student.parentPhone;
      const stMessages = allChatMessages.filter(
        (m) =>
          m.senderUid.toLowerCase() === parentEmailLower ||
          m.recipientUid.toLowerCase() === parentEmailLower ||
          m.senderUid === student.id ||
          m.recipientUid === student.id
      );
      setChatMessages(stMessages);

      // Filter direct admin messages sent to parent
      const stAdminMsgs = allAdminMsgs.filter(
        (m) => m.recipientEmail.toLowerCase() === parentEmailLower
      );
      setAdminDirectMessages(stAdminMsgs);

      // Initialize selected thread
      const threads = getConversationThreads(stMessages, parentEmailLower);
      if (threads.length > 0) {
        setSelectedTeacherUid(threads[0].teacherUid);
      } else {
        setSelectedTeacherUid(null);
      }
    } catch (err) {
      console.error('Error loading student profile details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  const currentClass = classes.find((c) => c.id === student.currentClassId);

  // Calculate Academic Overview
  const totalScoreSum = results.reduce((sum, r) => sum + (r.total || 0), 0);
  const averageScore = results.length > 0 ? (totalScoreSum / results.length).toFixed(1) : 'N/A';
  const approvedResults = results.filter((r) => r.status === 'approved');

  // Group chat messages into threads by teacher
  interface TeacherChatThread {
    teacherUid: string;
    teacherName: string;
    teacherObj?: Teacher;
    lastMessage: ChatMessage;
    totalCount: number;
  }

  function getConversationThreads(msgs: ChatMessage[], parentEmail: string): TeacherChatThread[] {
    const map = new Map<string, ChatMessage[]>();

    msgs.forEach((m) => {
      const otherUid = m.senderUid.toLowerCase() === parentEmail ? m.recipientUid : m.senderUid;
      if (!map.has(otherUid)) {
        map.set(otherUid, []);
      }
      map.get(otherUid)!.push(m);
    });

    const list: TeacherChatThread[] = [];
    map.forEach((msgList, tUid) => {
      const sorted = [...msgList].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastMsg = sorted[0];
      const tTeacher = teachers.find(
        (t) => (t.uid || t.id) === tUid || t.email.toLowerCase() === tUid.toLowerCase()
      );
      const tName =
        tTeacher?.fullName ||
        (lastMsg.senderUid.toLowerCase() === parentEmail ? lastMsg.recipientName : lastMsg.senderName);

      list.push({
        teacherUid: tUid,
        teacherName: tName,
        teacherObj: tTeacher,
        lastMessage: lastMsg,
        totalCount: msgList.length,
      });
    });

    return list.sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }

  const parentEmailLower = student.parentEmail.toLowerCase();
  const conversationThreads = getConversationThreads(chatMessages, parentEmailLower);

  // Active dialogue for selected teacher thread
  const activeThreadMessages = selectedTeacherUid
    ? chatMessages
        .filter(
          (m) =>
            (m.senderUid === selectedTeacherUid && m.recipientUid.toLowerCase() === parentEmailLower) ||
            (m.recipientUid === selectedTeacherUid && m.senderUid.toLowerCase() === parentEmailLower)
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const activeThread = conversationThreads.find((t) => t.teacherUid === selectedTeacherUid);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Profile & Comprehensive History"
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Profile Header Summary */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-inner">
                  {student.fullName.charAt(0)}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{student.fullName}</h2>
                  <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                    {student.gender}
                  </span>
                  {student.status === 'active' ? (
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                      Enrolled
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-300">
                  <span>
                    Class: <strong className="text-white">{currentClass?.name || 'Unassigned'}</strong>
                  </span>
                  <span>
                    Adm No: <strong className="text-indigo-300 font-mono">{student.admissionNumber}</strong>
                  </span>
                  <span>
                    Student ID: <strong className="text-slate-200 font-mono">{student.studentId}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end text-xs text-slate-300 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400">Parent / Guardian</span>
              <span className="font-bold text-white text-sm">{student.parentName}</span>
              <span className="text-[11px] text-slate-300">{student.parentPhone}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Bio & Parent Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'results'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Academic Results History
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {results.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'messages'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Parent-Teacher Messages
            <span className="bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.2 rounded-full text-[10px]">
              {chatMessages.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin_notices')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'admin_notices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Admin Direct Notices
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {adminDirectMessages.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Bio & Parent Information */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Enrolled Class</p>
                <p className="text-base font-bold text-slate-900 mt-1 truncate">{currentClass?.name || 'N/A'}</p>
                <p className="text-[10px] text-slate-500">{currentClass?.section || 'Primary/Secondary'}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Subjects Scored</p>
                <p className="text-xl font-bold text-indigo-600 mt-1">{results.length}</p>
                <p className="text-[10px] text-slate-500">{approvedResults.length} approved</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Term Average</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{averageScore}%</p>
                <p className="text-[10px] text-slate-500">Cumulative performance</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Chat Messages</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{chatMessages.length}</p>
                <p className="text-[10px] text-slate-500">{conversationThreads.length} teacher threads</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Demographics Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  Student Demographic Data
                </h4>
                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-bold text-slate-900">{student.fullName}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Admission Number</span>
                    <span className="font-mono font-bold text-indigo-600">{student.admissionNumber}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">System Student ID</span>
                    <span className="font-mono text-slate-700">{student.studentId}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-medium text-slate-800">{student.gender}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Date of Birth</span>
                    <span className="font-medium text-slate-800">{student.dob || 'Not recorded'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Enrolment Status</span>
                    <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                      {student.status === 'active' ? 'Active Enrolment' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Complete Parent Contact & Address Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-indigo-600" />
                  Parent & Guardian Detailed Profile
                </h4>
                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Parent / Guardian Name</span>
                    <span className="font-bold text-slate-900">{student.parentName}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Primary Email</span>
                    <span className="font-medium text-blue-600">{student.parentEmail}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Primary Phone</span>
                    <span className="font-medium text-slate-800">{student.parentPhone}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Secondary / Emergency Phone</span>
                    <span className="font-medium text-slate-800">
                      {student.parentPhoneSecondary || 'Not specified'}
                    </span>
                  </div>
                  <div className="py-1.5">
                    <span className="text-slate-500 block mb-0.5">Residential House Address</span>
                    <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {student.parentHouseAddress || 'No residential address recorded.'}
                    </p>
                  </div>
                  <div className="py-1.5">
                    <span className="text-slate-500 block mb-0.5">Workplace Address</span>
                    <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {student.parentWorkAddress || 'No workplace address recorded.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Academic Results History */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Academic Performance & Assessment Records ({results.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Continuous Assessment (CA), Mid-Term, and Examination marks across subjects
                </p>
              </div>

              {results.length > 0 && (
                <div className="text-right">
                  <span className="text-xs text-slate-500">Cumulative Average: </span>
                  <span className="font-bold text-sm text-indigo-600">{averageScore}%</span>
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No academic results recorded yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When teachers submit assessment scores for {student.fullName}, they will appear here.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Subject</th>
                        <th className="p-3 text-center">Assignment (10)</th>
                        <th className="p-3 text-center">Quiz (10)</th>
                        <th className="p-3 text-center">CA (20)</th>
                        <th className="p-3 text-center">Mid-Term (20)</th>
                        <th className="p-3 text-center">Exam (40)</th>
                        <th className="p-3 text-center">Total (100)</th>
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {results.map((r) => {
                        const sub = subjects.find((s) => s.id === r.subjectId);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{sub?.name || r.subjectId}</p>
                              <p className="text-[10.5px] font-mono text-slate-400">{sub?.code}</p>
                            </td>
                            <td className="p-3 text-center font-mono">{r.scores.assignment || 0}</td>
                            <td className="p-3 text-center font-mono">{r.scores.quiz || 0}</td>
                            <td className="p-3 text-center font-mono">{r.scores.ca || 0}</td>
                            <td className="p-3 text-center font-mono">{r.scores.midTerm || 0}</td>
                            <td className="p-3 text-center font-mono font-semibold">{r.scores.exam || 0}</td>
                            <td className="p-3 text-center font-bold text-slate-900 text-sm">{r.total}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-800">
                                {r.grade}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {r.status === 'approved' && <Badge variant="success">Approved</Badge>}
                              {r.status === 'submitted' && <Badge variant="warning">Pending</Badge>}
                              {r.status === 'rejected' && <Badge variant="danger">Returned</Badge>}
                              {r.status === 'draft' && <Badge variant="neutral">Draft</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Parent-Teacher Communication & Message Tracing */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Teacher-Parent Message History & Audit Tracing
              </h3>
              <p className="text-[11px] text-slate-500">
                Inspect every conversation between {student.parentName} and subject/class teachers.
              </p>
            </div>

            {conversationThreads.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No chat messages on record for this student's parent</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When teachers chat with {student.parentName}, messages will be traced and auditable here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {/* Left: Teacher Thread List */}
                <div className="border-r border-slate-200 p-3 bg-slate-50/50 space-y-2 max-h-96 overflow-y-auto">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Teacher Conversations ({conversationThreads.length})
                  </div>
                  {conversationThreads.map((thread) => {
                    const isSelected = selectedTeacherUid === thread.teacherUid;
                    return (
                      <div
                        key={thread.teacherUid}
                        onClick={() => setSelectedTeacherUid(thread.teacherUid)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white border-slate-200/80 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold truncate max-w-[130px]">{thread.teacherName}</p>
                          <span
                            className={`text-[9.5px] ${
                              isSelected ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {new Date(thread.lastMessage.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {thread.teacherObj && (
                          <p
                            className={`text-[10px] font-medium truncate mb-1 ${
                              isSelected ? 'text-blue-100' : 'text-indigo-600'
                            }`}
                          >
                            {thread.teacherObj.qualification || 'Teacher'}
                          </p>
                        )}

                        <p
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          {thread.lastMessage.message}
                        </p>

                        <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-200/40 text-[10px]">
                          <span className={isSelected ? 'text-blue-200' : 'text-slate-400'}>
                            {thread.totalCount} messages
                          </span>
                          <span className={`font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-600'}`}>
                            View Thread →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Dialogue Transcript Viewer */}
                <div className="md:col-span-2 p-4 flex flex-col justify-between h-96">
                  {activeThread ? (
                    <>
                      {/* Header */}
                      <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">
                            Transcript: {student.parentName} ↔ {activeThread.teacherName}
                          </h4>
                          <p className="text-[10.5px] text-slate-500">
                            Concerned Student: {student.fullName} ({currentClass?.name})
                          </p>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {activeThreadMessages.length} Messages
                        </span>
                      </div>

                      {/* Chat Stream */}
                      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                        {activeThreadMessages.map((msg) => {
                          const isFromParent =
                            msg.senderUid.toLowerCase() === parentEmailLower || msg.senderRole === 'parent';

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isFromParent ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-bold text-slate-600">
                                  {msg.senderName} ({msg.senderRole})
                                </span>
                                <span className="text-[9.5px] text-slate-400">
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div
                                className={`p-3 rounded-2xl text-xs max-w-sm leading-relaxed ${
                                  isFromParent
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
                                }`}
                              >
                                {msg.message}
                              </div>

                              <span className="text-[9px] text-slate-400 mt-0.5">
                                {new Date(msg.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer notice */}
                      <div className="pt-2 border-t border-slate-100 text-center text-[10.5px] text-slate-400 italic">
                        Viewing recorded communication thread as School Administrator (Read-Only Audit Trail)
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Select a teacher conversation thread on the left to read the full dialogue.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Admin Direct Notices */}
        {activeTab === 'admin_notices' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Administrative Direct Messages to Parent ({adminDirectMessages.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Official notices, fee payment reminders, and custom letters dispatched to {student.parentEmail}
              </p>
            </div>

            {adminDirectMessages.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No direct admin messages issued to this parent</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Direct notices sent via Communications will be logged here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {adminDirectMessages.map((adm) => (
                  <div
                    key={adm.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded mr-2">
                          {adm.category.replace('_', ' ')}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs inline-block">{adm.subject}</h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(adm.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {adm.content}
                    </p>

                    <div className="flex justify-between items-center text-[10.5px] text-slate-400 pt-1">
                      <span>Sender: {adm.senderName}</span>
                      <span>Recipient: {adm.recipientEmail}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </Modal>
  );
};
