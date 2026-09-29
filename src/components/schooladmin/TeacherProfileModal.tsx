import React, { useState, useEffect } from 'react';
import { Teacher, ClassItem, SubjectItem, ClassSubjectAssignment, SubjectResult, ChatMessage, Student } from '../../types';
import { dbService } from '../../services/dbService';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  Users,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  MessageSquare,
  FileCheck2,
  Calendar,
  Clock,
  Search,
  ArrowLeft,
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  UserCheck,
  Building,
} from 'lucide-react';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  classes: ClassItem[];
  subjects: SubjectItem[];
  assignments: ClassSubjectAssignment[];
  onOpenAllocator?: (teacherId: string) => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  teacher,
  classes,
  subjects,
  assignments,
  onOpenAllocator,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'results' | 'messages'>('overview');
  const [results, setResults] = useState<SubjectResult[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Message Thread Selection for Admin Inspection
  const [selectedRecipientUid, setSelectedRecipientUid] = useState<string | null>(null);
  const [messageSearch, setMessageSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !teacher) return;
    loadTeacherData();
  }, [isOpen, teacher]);

  const loadTeacherData = async () => {
    if (!teacher) return;
    setLoadingData(true);
    const teacherUid = teacher.uid || teacher.id;

    try {
      const [allResults, allChatMessages, allStudents] = await Promise.all([
        dbService.getAllResultsForSchool(teacher.schoolId),
        dbService.getAllChatMessagesForSchool(teacher.schoolId),
        dbService.getStudentsBySchool(teacher.schoolId),
      ]);

      // Filter results submitted by this teacher
      const teacherResults = allResults.filter(
        (r) => r.teacherId === teacherUid || r.teacherId === teacher.id
      );
      setResults(teacherResults);

      // Filter chat messages where sender or recipient is this teacher
      const teacherMessages = allChatMessages.filter(
        (m) =>
          m.senderUid === teacherUid ||
          m.recipientUid === teacherUid ||
          m.senderUid === teacher.email ||
          m.recipientUid === teacher.email
      );
      setMessages(teacherMessages);
      setStudents(allStudents);

      // Default to first conversation thread if available
      const threads = getConversationThreads(teacherMessages, teacherUid);
      if (threads.length > 0) {
        setSelectedRecipientUid(threads[0].otherPartyUid);
      } else {
        setSelectedRecipientUid(null);
      }
    } catch (err) {
      console.error('Error loading teacher profile data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  if (!teacher) return null;

  const teacherUid = teacher.uid || teacher.id;
  const teacherAssignments = assignments.filter((a) => a.teacherId === teacherUid);

  // Group messages into distinct conversation threads by recipient/sender
  interface ConversationThread {
    otherPartyUid: string;
    otherPartyName: string;
    otherPartyRole: string;
    lastMessage: ChatMessage;
    totalMessages: number;
    relatedStudent?: Student;
  }

  function getConversationThreads(msgs: ChatMessage[], myUid: string): ConversationThread[] {
    const threadMap = new Map<string, ChatMessage[]>();

    msgs.forEach((m) => {
      const otherUid = m.senderUid === myUid || m.senderUid === teacher?.email ? m.recipientUid : m.senderUid;
      if (!threadMap.has(otherUid)) {
        threadMap.set(otherUid, []);
      }
      threadMap.get(otherUid)!.push(m);
    });

    const threads: ConversationThread[] = [];
    threadMap.forEach((msgList, otherUid) => {
      const sorted = [...msgList].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastMsg = sorted[0];
      const otherName =
        lastMsg.senderUid === myUid || lastMsg.senderUid === teacher?.email
          ? lastMsg.recipientName
          : lastMsg.senderName;
      const otherRole =
        lastMsg.senderUid === myUid || lastMsg.senderUid === teacher?.email
          ? 'Parent / Student'
          : lastMsg.senderRole;

      // Find if otherUid relates to a student parent
      const relStudent = students.find(
        (s) => s.parentEmail.toLowerCase() === otherUid.toLowerCase() || s.id === otherUid
      );

      threads.push({
        otherPartyUid: otherUid,
        otherPartyName: otherName || otherUid,
        otherPartyRole: otherRole,
        lastMessage: lastMsg,
        totalMessages: msgList.length,
        relatedStudent: relStudent,
      });
    });

    return threads.sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }

  const conversationThreads = getConversationThreads(messages, teacherUid);

  // Active dialogue messages for selected thread
  const activeThreadMessages = selectedRecipientUid
    ? messages
        .filter(
          (m) =>
            (m.senderUid === selectedRecipientUid &&
              (m.recipientUid === teacherUid || m.recipientUid === teacher.email)) ||
            (m.recipientUid === selectedRecipientUid &&
              (m.senderUid === teacherUid || m.senderUid === teacher.email))
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const activeThread = conversationThreads.find((t) => t.otherPartyUid === selectedRecipientUid);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Teacher Profile & History Record"
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Profile Header Summary */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-inner">
                {teacher.fullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{teacher.fullName}</h2>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Active Faculty
                  </span>
                </div>
                <p className="text-xs text-indigo-300 font-medium">{teacher.qualification || 'Educator'}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {teacher.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {teacher.phone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {onOpenAllocator && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAllocator(teacherUid);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Manage Allocations
                </button>
              )}
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
            Overview & Stats
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Allocated Subjects & Classes
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {teacherAssignments.length}
            </span>
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
            Submitted Score Sheets
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
            Communication & Message Tracing
            <span className="bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.2 rounded-full text-[10px]">
              {messages.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Assigned Classes</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {new Set(teacherAssignments.map((a) => a.classId)).size}
                </p>
                <p className="text-[10px] text-slate-500">Unique class streams</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Courses</p>
                <p className="text-xl font-bold text-indigo-600 mt-1">{teacherAssignments.length}</p>
                <p className="text-[10px] text-slate-500">Class • Subject pairs</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Score Submissions</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{results.length}</p>
                <p className="text-[10px] text-slate-500">Student grades submitted</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Parent Messages</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{messages.length}</p>
                <p className="text-[10px] text-slate-500">{conversationThreads.length} conversation threads</p>
              </div>
            </div>

            {/* Profile Information Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Staff Identification & Profile
                </h4>
                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-bold text-slate-900">{teacher.fullName}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Staff Account UID</span>
                    <span className="font-mono text-slate-700">{teacher.uid || teacher.id}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Email Address</span>
                    <span className="font-medium text-slate-800">{teacher.email}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Phone Number</span>
                    <span className="font-medium text-slate-800">{teacher.phone || 'Not recorded'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Academic Qualification</span>
                    <span className="font-semibold text-slate-800">{teacher.qualification || 'Educator'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Account Status</span>
                    <Badge variant="success">Active Faculty</Badge>
                  </div>
                </div>
              </div>

              {/* Active Allocated Courses Quick Summary */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Active Teaching Curriculum Summary
                </h4>
                {teacherAssignments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No subject allocations configured yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {teacherAssignments.map((asg) => {
                      const cl = classes.find((c) => c.id === asg.classId);
                      const sub = subjects.find((s) => s.id === asg.subjectId);
                      return (
                        <div
                          key={asg.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                        >
                          <span className="font-bold text-slate-800">{sub?.name || 'Subject'}</span>
                          <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                            {cl?.name || 'Class'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Allocated Subjects & Classes */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Configured Teaching Allocations ({teacherAssignments.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Every class and subject assigned to {teacher.fullName} for assessment grading
                </p>
              </div>

              {onOpenAllocator && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAllocator(teacherUid);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Edit Allocations
                </button>
              )}
            </div>

            {teacherAssignments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No subject allocations found</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Use the allocator tool to assign classes and subjects.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {teacherAssignments.map((asg) => {
                  const cl = classes.find((c) => c.id === asg.classId);
                  const sub = subjects.find((s) => s.id === asg.subjectId);
                  const studentsInClass = students.filter((s) => s.currentClassId === asg.classId);

                  return (
                    <div
                      key={asg.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-blue-300 transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                          {sub?.category || 'Curriculum'}
                        </span>
                        <span className="font-mono text-[10.5px] text-slate-400">{sub?.code}</span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{sub?.name}</h4>
                        <p className="text-xs font-semibold text-indigo-700 mt-0.5 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" /> {cl?.name}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{studentsInClass.length} Enrolled Students</span>
                        <span className="text-emerald-600 font-semibold">Active Term</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Submitted Score Sheets & Results */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Assessment Scores Submitted by {teacher.fullName} ({results.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Continuous Assessment (CA) and Exam records entered for approval
                </p>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No score records submitted yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When this teacher enters student marks in Assessment Entry, they will appear here.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Student</th>
                        <th className="p-3">Class</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3 text-center">CA / Exam Breakdown</th>
                        <th className="p-3 text-center">Total (100)</th>
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {results.map((r) => {
                        const st = students.find((s) => s.id === r.studentId);
                        const cl = classes.find((c) => c.id === r.classId);
                        const sub = subjects.find((s) => s.id === r.subjectId);

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-slate-900">{st?.fullName || r.studentId}</td>
                            <td className="p-3 text-slate-700">{cl?.name}</td>
                            <td className="p-3 font-semibold text-slate-800">{sub?.name}</td>
                            <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                              CA: {(r.scores.assignment || 0) + (r.scores.quiz || 0) + (r.scores.ca || 0) + (r.scores.midTerm || 0)} | Exam: {r.scores.exam || 0}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-900">{r.total}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                                {r.grade}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {r.status === 'approved' && <Badge variant="success">Approved</Badge>}
                              {r.status === 'submitted' && <Badge variant="warning">Submitted</Badge>}
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

        {/* Tab 4: Message & Communication Tracing */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Communication Audit & Message Tracing
              </h3>
              <p className="text-[11px] text-slate-500">
                Inspect all conversation transcripts between {teacher.fullName} and parents or students.
              </p>
            </div>

            {conversationThreads.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No message history recorded</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When parents or students chat with this teacher, messages will be tracked here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {/* Left Side: Threads List */}
                <div className="border-r border-slate-200 p-3 bg-slate-50/50 space-y-2 max-h-96 overflow-y-auto">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Conversation Threads ({conversationThreads.length})
                  </div>
                  {conversationThreads.map((thread) => {
                    const isSelected = selectedRecipientUid === thread.otherPartyUid;
                    return (
                      <div
                        key={thread.otherPartyUid}
                        onClick={() => setSelectedRecipientUid(thread.otherPartyUid)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white border-slate-200/80 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold truncate max-w-[130px]">{thread.otherPartyName}</p>
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

                        {thread.relatedStudent && (
                          <p
                            className={`text-[10px] font-medium truncate mb-1 ${
                              isSelected ? 'text-blue-100' : 'text-indigo-600'
                            }`}
                          >
                            Parent of: {thread.relatedStudent.fullName}
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
                            {thread.totalMessages} messages
                          </span>
                          <span className={`font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-600'}`}>
                            View Thread →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Side: Dialogue Transcript Viewer */}
                <div className="md:col-span-2 p-4 flex flex-col justify-between h-96">
                  {activeThread ? (
                    <>
                      {/* Thread Header */}
                      <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">
                            Transcript: {teacher.fullName} ↔ {activeThread.otherPartyName}
                          </h4>
                          <p className="text-[10.5px] text-slate-500">
                            {activeThread.relatedStudent
                              ? `Student: ${activeThread.relatedStudent.fullName} (${activeThread.relatedStudent.studentId})`
                              : activeThread.otherPartyRole}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {activeThreadMessages.length} Messages Exchanged
                        </span>
                      </div>

                      {/* Chat Dialogue Stream */}
                      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                        {activeThreadMessages.map((msg) => {
                          const isFromTeacher =
                            msg.senderUid === teacherUid || msg.senderUid === teacher.email;

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isFromTeacher ? 'items-end' : 'items-start'}`}
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
                                  isFromTeacher
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

                      {/* Admin Read-Only Notice */}
                      <div className="pt-2 border-t border-slate-100 text-center text-[10.5px] text-slate-400 italic">
                        Viewing recorded communication thread as School Administrator (Read-Only Audit Trail)
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Select a conversation thread on the left to inspect the dialogue transcript.
                    </div>
                  )}
                </div>
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
