import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { ClassItem, SubjectItem, Student, SubjectResult, Teacher, calculateGrade, ScoreBreakdown } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Filter,
  Eye,
  Award,
  AlertCircle,
  Search,
  BookOpen,
  Layers,
  Sparkles,
  RefreshCw,
  Send,
  UserCheck,
  Edit3,
  CheckSquare,
  Square,
  MessageSquare,
  Calculator,
  User,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface ResultReviewProps {
  initialClassId?: string;
  initialSubjectId?: string;
}

export const ResultReview: React.FC<ResultReviewProps> = ({
  initialClassId = '',
  initialSubjectId = '',
}) => {
  const { currentSchool, currentUser } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allResults, setAllResults] = useState<SubjectResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters - default to "all" so submitted results across ANY subject/class are never hidden
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);
  const [statusFilter, setStatusFilter] = useState<string>('submitted'); // 'all', 'submitted', 'approved', 'rejected', 'draft'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected student result IDs for targeted bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit / Alter Single Student Score Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<SubjectResult | null>(null);
  const [editScores, setEditScores] = useState<ScoreBreakdown>({
    assignment: 0,
    quiz: 0,
    ca: 0,
    midTerm: 0,
    exam: 0,
  });
  const [editTeacherRemark, setEditTeacherRemark] = useState('');
  const [editAdminRemark, setEditAdminRemark] = useState('');

  // Reject / Return Modal state (for single student or targeted selected students)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null); // null means reject selectedIds
  const [adminRemark, setAdminRemark] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const weights = currentSchool?.assessmentWeights || {
    assignmentMax: 10,
    quizMax: 10,
    caMax: 20,
    midTermMax: 20,
    examMax: 40,
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    const [clData, sbData, stData, tcData, rsData] = await Promise.all([
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getStudentsBySchool(schoolId),
      dbService.getTeachersBySchool(schoolId),
      dbService.getAllResultsForSchool(schoolId),
    ]);
    setClasses(clData);
    setSubjects(sbData);
    setStudents(stData);
    setTeachers(tcData);
    setAllResults(rsData);
    setSelectedIds(new Set());
    setLoading(false);
  };

  // 1. APPROVE SINGLE STUDENT RESULT INDEPENDENTLY
  const handleApproveSingle = async (res: SubjectResult) => {
    const student = students.find((s) => s.id === res.studentId);
    const subject = subjects.find((s) => s.id === res.subjectId);
    const studentName = student?.fullName || 'Student';
    const subjectName = subject?.name || 'Subject';

    await dbService.updateResultStatus([res.id], 'approved');
    await dbService.logAuditEvent({
      schoolId,
      actorUid: currentUser?.uid || 'admin',
      actorName: currentUser?.fullName || 'School Administrator',
      actorRole: currentUser?.role || 'school_admin',
      action: 'APPROVE_STUDENT_RESULT',
      resource: 'assessment_results',
      details: `Approved assessment result specifically for ${studentName} in ${subjectName}. Other class records remain unchanged.`,
    });

    setNotificationMsg({
      type: 'success',
      text: `Approved result for ${studentName} (${subjectName}). Only this student's result is now published.`,
    });
    await loadData();
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // 2. OPEN ALTER / EDIT SCORE MODAL FOR SINGLE STUDENT
  const openEditModal = (res: SubjectResult) => {
    setEditingResult(res);
    setEditScores({
      assignment: res.scores?.assignment || 0,
      quiz: res.scores?.quiz || 0,
      ca: res.scores?.ca || 0,
      midTerm: res.scores?.midTerm || 0,
      exam: res.scores?.exam || 0,
    });
    setEditTeacherRemark(res.teacherRemark || '');
    setEditAdminRemark(res.adminRemark || '');
    setIsEditModalOpen(true);
  };

  const handleEditScoreChange = (field: keyof ScoreBreakdown, val: number, maxLimit: number) => {
    const sanitized = Math.max(0, Math.min(maxLimit, isNaN(val) ? 0 : val));
    setEditScores((prev) => ({
      ...prev,
      [field]: sanitized,
    }));
  };

  const computedEditTotal =
    (editScores.assignment || 0) +
    (editScores.quiz || 0) +
    (editScores.ca || 0) +
    (editScores.midTerm || 0) +
    (editScores.exam || 0);
  const computedEditGrade = calculateGrade(computedEditTotal);

  // 3. SAVE ALTERED RESULT FOR SINGLE STUDENT (INDEPENDENT)
  const handleSaveAlteredScore = async (newStatus: 'approved' | 'submitted' | 'rejected') => {
    if (!editingResult) return;
    setIsProcessing(true);

    const student = students.find((s) => s.id === editingResult.studentId);
    const subject = subjects.find((s) => s.id === editingResult.subjectId);
    const studentName = student?.fullName || 'Student';
    const subjectName = subject?.name || 'Subject';

    const updatedRecord: Partial<SubjectResult> & { schoolId: string; studentId: string; subjectId: string } = {
      id: editingResult.id,
      schoolId: editingResult.schoolId || schoolId,
      studentId: editingResult.studentId,
      classId: editingResult.classId,
      subjectId: editingResult.subjectId,
      teacherId: editingResult.teacherId,
      session: editingResult.session || currentSchool?.currentSession || '2025/2026',
      term: editingResult.term || currentSchool?.currentTerm || 'First Term',
      scores: editScores,
      teacherRemark: editTeacherRemark,
      status: newStatus,
      adminRemark: editAdminRemark || (newStatus === 'rejected' ? 'Returned for correction.' : ''),
    };

    await dbService.saveSingleResult(updatedRecord);

    await dbService.logAuditEvent({
      schoolId,
      actorUid: currentUser?.uid || 'admin',
      actorName: currentUser?.fullName || 'School Administrator',
      actorRole: currentUser?.role || 'school_admin',
      action: 'ALTER_STUDENT_SCORE',
      resource: 'assessment_results',
      details: `Administrator altered assessment score for ${studentName} in ${subjectName} (New Total: ${computedEditTotal}, Status: ${newStatus}). Only this student was modified.`,
    });

    setIsProcessing(false);
    setIsEditModalOpen(false);
    setEditingResult(null);

    setNotificationMsg({
      type: 'success',
      text: `Saved score alteration for ${studentName}. Status set to "${newStatus}". Other students in class are untouched.`,
    });
    await loadData();
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // 4. RETURN / REJECT FOR CORRECTION (SINGLE OR SELECTED)
  const openSingleRejectModal = (resId: string) => {
    setRejectTargetId(resId);
    setAdminRemark('');
    setIsRejectModalOpen(true);
  };

  const openSelectedRejectModal = () => {
    if (selectedIds.size === 0) return;
    setRejectTargetId(null);
    setAdminRemark('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    const idsToReject = rejectTargetId ? [rejectTargetId] : Array.from(selectedIds);
    if (idsToReject.length === 0) return;

    setIsProcessing(true);
    await dbService.updateResultStatus(idsToReject, 'rejected', adminRemark || 'Returned for correction.');

    const targetNames = idsToReject
      .map((id) => {
        const r = allResults.find((res) => res.id === id);
        const s = students.find((st) => st.id === r?.studentId);
        return s?.fullName || 'Student';
      })
      .join(', ');

    await dbService.logAuditEvent({
      schoolId,
      actorUid: currentUser?.uid || 'admin',
      actorName: currentUser?.fullName || 'School Administrator',
      actorRole: currentUser?.role || 'school_admin',
      action: 'RETURN_RESULT_FOR_CORRECTION',
      resource: 'assessment_results',
      details: `Returned result(s) for ${targetNames} with remark: "${adminRemark}"`,
    });

    setIsProcessing(false);
    setIsRejectModalOpen(false);
    setRejectTargetId(null);
    setSelectedIds(new Set());

    setNotificationMsg({
      type: 'success',
      text: `Returned ${idsToReject.length} result(s) to teacher with your feedback notes.`,
    });
    await loadData();
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // 5. APPROVE ONLY SELECTED STUDENTS
  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    const idsToApprove = Array.from(selectedIds);

    await dbService.updateResultStatus(idsToApprove, 'approved');
    await dbService.logAuditEvent({
      schoolId,
      actorUid: currentUser?.uid || 'admin',
      actorName: currentUser?.fullName || 'School Administrator',
      actorRole: currentUser?.role || 'school_admin',
      action: 'APPROVE_SELECTED_RESULTS',
      resource: 'assessment_results',
      details: `Approved ${idsToApprove.length} specifically selected student result(s).`,
    });

    setIsProcessing(false);
    setSelectedIds(new Set());
    setNotificationMsg({
      type: 'success',
      text: `Successfully approved and published ${idsToApprove.length} selected student result(s).`,
    });
    await loadData();
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Selection toggle handlers
  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (selectedIds.size === filteredResults.length && filteredResults.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((r) => r.id)));
    }
  };

  // Grouping for the subject/class course overview
  const courseBatches = React.useMemo(() => {
    const map = new Map<string, { classId: string; subjectId: string; results: SubjectResult[] }>();
    allResults.forEach((r) => {
      const key = `${r.classId}___${r.subjectId}`;
      if (!map.has(key)) {
        map.set(key, { classId: r.classId, subjectId: r.subjectId, results: [] });
      }
      map.get(key)!.results.push(r);
    });
    return Array.from(map.values()).map((batch) => {
      const cl = classes.find((c) => c.id === batch.classId);
      const sub = subjects.find((s) => s.id === batch.subjectId);
      const submittedCount = batch.results.filter((r) => r.status === 'submitted').length;
      const approvedCount = batch.results.filter((r) => r.status === 'approved').length;
      const rejectedCount = batch.results.filter((r) => r.status === 'rejected').length;
      const draftCount = batch.results.filter((r) => r.status === 'draft').length;
      const teacher = teachers.find((t) => t.uid === batch.results[0]?.teacherId || t.id === batch.results[0]?.teacherId);

      return {
        key: `${batch.classId}___${batch.subjectId}`,
        classId: batch.classId,
        subjectId: batch.subjectId,
        className: cl?.name || 'Class',
        subjectName: sub?.name || 'Subject',
        subjectCode: sub?.code || '',
        total: batch.results.length,
        submittedCount,
        approvedCount,
        rejectedCount,
        draftCount,
        teacherName: teacher?.fullName,
        results: batch.results,
      };
    });
  }, [allResults, classes, subjects, teachers]);

  const filteredResults = allResults.filter((r) => {
    const matchesClass = !selectedClassId || r.classId === selectedClassId;
    const matchesSubject = !selectedSubjectId || r.subjectId === selectedSubjectId;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    let matchesSearch = true;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const st = students.find((s) => s.id === r.studentId);
      const cl = classes.find((c) => c.id === r.classId);
      const sub = subjects.find((s) => s.id === r.subjectId);
      matchesSearch =
        (st?.fullName.toLowerCase().includes(query) || false) ||
        (st?.admissionNumber.toLowerCase().includes(query) || false) ||
        (cl?.name.toLowerCase().includes(query) || false) ||
        (sub?.name.toLowerCase().includes(query) || false);
    }

    return matchesClass && matchesSubject && matchesStatus && matchesSearch;
  });

  const totalSubmittedCount = allResults.filter((r) => r.status === 'submitted').length;
  const totalApprovedCount = allResults.filter((r) => r.status === 'approved').length;
  const totalRejectedCount = allResults.filter((r) => r.status === 'rejected').length;
  const totalDraftCount = allResults.filter((r) => r.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Independent Result Review & Alteration</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, alter, and approve student assessment scores independently. Changing or approving one student's result will never alter other students in the class.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200"
            title="Refresh results queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {notificationMsg.text}
        </div>
      )}

      {/* Course & Subject Overview Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Course Score Breakdown by Class & Subject
            </h2>
            <p className="text-xs text-slate-500">
              Click any subject to filter and inspect individual student records below.
            </p>
          </div>

          {(selectedClassId || selectedSubjectId) && (
            <button
              onClick={() => {
                setSelectedClassId('');
                setSelectedSubjectId('');
                setStatusFilter('all');
              }}
              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Clear Class/Subject Filter (Show All)
            </button>
          )}
        </div>

        {courseBatches.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-700">No Assessment Records Created Yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">When teachers enter scores in the portal, individual student rows will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {courseBatches.map((batch) => {
              const isSelected = selectedClassId === batch.classId && selectedSubjectId === batch.subjectId;
              const hasPending = batch.submittedCount > 0;

              return (
                <div
                  key={batch.key}
                  onClick={() => {
                    setSelectedClassId(batch.classId);
                    setSelectedSubjectId(batch.subjectId);
                    setStatusFilter('all');
                  }}
                  className={`p-4 rounded-2xl border transition-all text-xs space-y-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20'
                      : hasPending
                      ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                        {batch.className}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{batch.subjectName}</h4>
                      {batch.teacherName && (
                        <p className="text-[10.5px] text-slate-500">Teacher: {batch.teacherName}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {batch.approvedCount > 0 && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          {batch.approvedCount} Approved
                        </span>
                      )}
                      {batch.submittedCount > 0 && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                          {batch.submittedCount} Pending
                        </span>
                      )}
                      {batch.rejectedCount > 0 && (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {batch.rejectedCount} Returned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>{batch.total} Total Student Records</span>
                    <span className="font-bold text-indigo-600 hover:underline">
                      {isSelected ? 'Viewing Records ↓' : 'Inspect Records →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'submitted'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review (Submitted)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {totalSubmittedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved & Published</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {totalApprovedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Returned / Rejected</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {totalRejectedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>All Results</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {allResults.length}
            </span>
          </button>
        </div>

        {/* Dropdown Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search Student</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name or ID..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Targeted Selected Action Bar (Appears when 1+ rows are checked) */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-900 text-white p-3.5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-300" />
            <span className="text-xs font-bold">
              {selectedIds.size} student record{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <span className="text-[11px] text-indigo-200">
              (Actions will apply strictly to these chosen students)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApproveSelected}
              disabled={isProcessing}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              Approve Selected ({selectedIds.size})
            </button>

            <button
              onClick={openSelectedRejectModal}
              disabled={isProcessing}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              Return Selected ({selectedIds.size})
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 text-xs font-medium rounded-xl cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Results Table with Independent Per-Student Row Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAllFiltered}
              className="text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 font-bold text-[11px]"
            >
              {selectedIds.size === filteredResults.length && filteredResults.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All in View</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-700">
              Showing {filteredResults.length} Student Record{filteredResults.length !== 1 ? 's' : ''}
            </span>
          </div>

          <span className="text-[11px] text-slate-500">
            Each row operates independently
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <th className="p-3 border-b border-slate-800 w-8 text-center"></th>
                <th className="p-3 border-b border-slate-800">Student Name</th>
                <th className="p-3 border-b border-slate-800">Subject / Class</th>
                <th className="p-3 border-b border-slate-800 text-center">Asgn ({weights.assignmentMax})</th>
                <th className="p-3 border-b border-slate-800 text-center">Quiz ({weights.quizMax})</th>
                <th className="p-3 border-b border-slate-800 text-center">C.A ({weights.caMax})</th>
                <th className="p-3 border-b border-slate-800 text-center">MidTerm ({weights.midTermMax})</th>
                <th className="p-3 border-b border-slate-800 text-center">Exam ({weights.examMax})</th>
                <th className="p-3 border-b border-slate-800 text-center bg-slate-800">Total</th>
                <th className="p-3 border-b border-slate-800 text-center">Grade</th>
                <th className="p-3 border-b border-slate-800">Remarks & Feedback</th>
                <th className="p-3 border-b border-slate-800">Status</th>
                <th className="p-3 border-b border-slate-800 text-right">Independent Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400 italic">
                    No results found matching your selected filters. Try switching the status filter above to "All Results".
                  </td>
                </tr>
              ) : (
                filteredResults.map((res) => {
                  const student = students.find((s) => s.id === res.studentId);
                  const cl = classes.find((c) => c.id === res.classId);
                  const sub = subjects.find((s) => s.id === res.subjectId);
                  const isSelected = selectedIds.has(res.id);

                  return (
                    <tr
                      key={res.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectId(res.id)}
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="p-3 font-bold text-slate-900">
                        {student?.fullName || 'Student'}
                        <span className="block text-[10px] font-normal text-slate-500">
                          {student?.admissionNumber || student?.studentId}
                        </span>
                      </td>

                      <td className="p-3 font-medium text-slate-700">
                        <p className="font-bold text-slate-800">{sub?.name || 'Subject'}</p>
                        <span className="text-[10px] text-slate-500">{cl?.name}</span>
                      </td>

                      <td className="p-3 text-center font-medium text-slate-700">{res.scores?.assignment || 0}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{res.scores?.quiz || 0}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{res.scores?.ca || 0}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{res.scores?.midTerm || 0}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{res.scores?.exam || 0}</td>

                      <td className="p-3 text-center font-black text-slate-900 bg-slate-100 text-sm">
                        {res.total}
                      </td>

                      <td className="p-3 text-center font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            res.grade === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.grade === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : res.grade === 'C'
                              ? 'bg-sky-100 text-sky-800'
                              : res.grade === 'D' || res.grade === 'E'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {res.grade}
                        </span>
                      </td>

                      <td className="p-3 text-[11px] text-slate-600 max-w-[150px]">
                        {res.teacherRemark && (
                          <span className="block truncate text-slate-700" title={res.teacherRemark}>
                            Teacher: "{res.teacherRemark}"
                          </span>
                        )}
                        {res.adminRemark && (
                          <span className="block text-[10px] text-rose-600 font-semibold truncate" title={res.adminRemark}>
                            Returned: {res.adminRemark}
                          </span>
                        )}
                        {!res.teacherRemark && !res.adminRemark && (
                          <span className="text-slate-400 italic">No remarks</span>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {res.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {res.status === 'submitted' && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200 text-[10.5px] font-bold px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                            Pending Review
                          </span>
                        )}
                        {res.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-200 text-[10.5px] font-bold px-2.5 py-1 rounded-full">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Returned
                          </span>
                        )}
                        {res.status === 'draft' && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10.5px] font-medium px-2.5 py-1 rounded-full">
                            Draft / In-progress
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {/* Alter / Edit Single Student Score Button */}
                        <button
                          onClick={() => openEditModal(res)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Alter or adjust this student's score independently"
                        >
                          <Edit3 className="w-3 h-3 text-slate-600" />
                          <span>Alter</span>
                        </button>

                        {/* Approve Single Student Button */}
                        {res.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveSingle(res)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            title="Approve ONLY this student"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Return / Reject Single Student Button */}
                        {res.status !== 'rejected' && (
                          <button
                            onClick={() => openSingleRejectModal(res.id)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Return ONLY this student for teacher correction"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Return</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDIT / ALTER INDEPENDENT STUDENT SCORE */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isProcessing && setIsEditModalOpen(false)}
        title="Alter Student Assessment Score"
        maxWidth="lg"
      >
        {editingResult && (
          <div className="space-y-4">
            {/* Student & Course Badge Info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Student</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {students.find((s) => s.id === editingResult.studentId)?.fullName || 'Student'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {classes.find((c) => c.id === editingResult.classId)?.name} •{' '}
                  {subjects.find((s) => s.id === editingResult.subjectId)?.name}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Status</span>
                <Badge
                  variant={
                    editingResult.status === 'approved'
                      ? 'success'
                      : editingResult.status === 'submitted'
                      ? 'warning'
                      : editingResult.status === 'rejected'
                      ? 'danger'
                      : 'neutral'
                  }
                >
                  {editingResult.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Modify assessment score components below. All calculations update in real-time. Changes apply <strong>exclusively to this student</strong> and will not affect any other classmates.
            </p>

            {/* Score Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Asgn (Max {weights.assignmentMax})
                </label>
                <input
                  type="number"
                  min="0"
                  max={weights.assignmentMax}
                  value={editScores.assignment}
                  onChange={(e) => handleEditScoreChange('assignment', parseFloat(e.target.value), weights.assignmentMax)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Quiz (Max {weights.quizMax})
                </label>
                <input
                  type="number"
                  min="0"
                  max={weights.quizMax}
                  value={editScores.quiz}
                  onChange={(e) => handleEditScoreChange('quiz', parseFloat(e.target.value), weights.quizMax)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  C.A (Max {weights.caMax})
                </label>
                <input
                  type="number"
                  min="0"
                  max={weights.caMax}
                  value={editScores.ca}
                  onChange={(e) => handleEditScoreChange('ca', parseFloat(e.target.value), weights.caMax)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  MidTerm (Max {weights.midTermMax})
                </label>
                <input
                  type="number"
                  min="0"
                  max={weights.midTermMax}
                  value={editScores.midTerm}
                  onChange={(e) => handleEditScoreChange('midTerm', parseFloat(e.target.value), weights.midTermMax)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Exam (Max {weights.examMax})
                </label>
                <input
                  type="number"
                  min="0"
                  max={weights.examMax}
                  value={editScores.exam}
                  onChange={(e) => handleEditScoreChange('exam', parseFloat(e.target.value), weights.examMax)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Real-time Computed Total & Grade */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Recalculated Total</span>
                <p className="text-xl font-black text-emerald-950">{computedEditTotal} / 100</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Grade</span>
                <p className="text-lg font-bold text-emerald-900">
                  Grade {computedEditGrade.grade} ({computedEditGrade.remark})
                </p>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teacher's Remark</label>
                <input
                  type="text"
                  value={editTeacherRemark}
                  onChange={(e) => setEditTeacherRemark(e.target.value)}
                  placeholder="Teacher's academic comment..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Feedback / Correction Remark</label>
                <textarea
                  rows={2}
                  value={editAdminRemark}
                  onChange={(e) => setEditAdminRemark(e.target.value)}
                  placeholder="Optional admin note or explanation of score alteration..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Action Buttons for this student */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSaveAlteredScore('rejected')}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                Save & Return to Teacher
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSaveAlteredScore('submitted')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                Save as Pending
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSaveAlteredScore('approved')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save & Approve This Student</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: RETURN / REJECT WITH FEEDBACK */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => !isProcessing && setIsRejectModalOpen(false)}
        title="Return Result for Teacher Revision"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <p className="text-xs text-slate-600">
            {rejectTargetId
              ? `You are returning the score record for ${
                  students.find(
                    (s) => s.id === allResults.find((r) => r.id === rejectTargetId)?.studentId
                  )?.fullName || 'this student'
                }. Other students remain unchanged.`
              : `You are returning ${selectedIds.size} selected student result(s).`}
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Admin Feedback / Correction Remark</label>
            <textarea
              required
              rows={3}
              value={adminRemark}
              onChange={(e) => setAdminRemark(e.target.value)}
              placeholder="e.g. Please verify exam score breakdown or re-verify continuous assessment."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isProcessing ? 'Returning...' : 'Return to Teacher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
