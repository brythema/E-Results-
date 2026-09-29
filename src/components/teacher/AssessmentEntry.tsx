import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import {
  ClassItem,
  SubjectItem,
  Teacher,
  Student,
  SubjectResult,
  ScoreBreakdown,
  calculateGrade,
  ClassSubjectAssignment,
} from '../../types';
import {
  getTeacherAssignments,
  getTeacherAssignedClasses,
  getTeacherAssignedSubjectsForClass,
  isCourseAssignedToTeacher,
} from '../../utils/teacherUtils';
import {
  FileSpreadsheet,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Calculator,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  XCircle,
  Check,
  ShieldAlert,
  BookOpen,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface AssessmentEntryProps {
  initialClassId?: string;
  initialSubjectId?: string;
}

export const AssessmentEntry: React.FC<AssessmentEntryProps> = ({
  initialClassId = '',
  initialSubjectId = '',
}) => {
  const { currentSchool, currentUser } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const teacherUid = currentUser?.uid || 'tch_graceville_01';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);
  const [students, setStudents] = useState<Student[]>([]);
  const [scoreRows, setScoreRows] = useState<
    Record<
      string,
      {
        id?: string;
        scores: ScoreBreakdown;
        teacherRemark: string;
        status?: 'draft' | 'submitted' | 'approved' | 'rejected';
        adminRemark?: string;
      }
    >
  >({});
  const [saving, setSaving] = useState(false);
  const [singleSubmittingId, setSingleSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const weights = currentSchool?.assessmentWeights || {
    assignmentMax: 10,
    quizMax: 10,
    caMax: 20,
    midTermMax: 20,
    examMax: 40,
  };

  useEffect(() => {
    loadInitialData();
  }, [schoolId, currentUser?.uid, currentUser?.email]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      loadStudentsAndScores();
    } else {
      setStudents([]);
      setScoreRows({});
    }
  }, [selectedClassId, selectedSubjectId]);

  const loadInitialData = async () => {
    const [clData, sbData, tcData, asgnData] = await Promise.all([
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getTeachersBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
    ]);

    setTeachers(tcData);
    setAllSubjects(sbData);

    // Filter assignments strictly to this teacher
    const myAssignments = getTeacherAssignments(asgnData, currentUser, tcData);
    setAssignments(myAssignments);

    // Filter classes to only those with assigned subjects for this teacher
    const teacherClasses = getTeacherAssignedClasses(clData, asgnData, currentUser, tcData);
    setClasses(teacherClasses);

    if (teacherClasses.length === 0) {
      setSelectedClassId('');
      setSelectedSubjectId('');
      setStudents([]);
      setScoreRows({});
      return;
    }

    // Determine initial class and subject selection
    let chosenClassId = teacherClasses[0].id;
    let chosenSubjectId = '';

    if (
      initialClassId &&
      initialSubjectId &&
      isCourseAssignedToTeacher(initialClassId, initialSubjectId, asgnData, currentUser, tcData)
    ) {
      chosenClassId = initialClassId;
      chosenSubjectId = initialSubjectId;
    } else if (initialClassId && teacherClasses.some((c) => c.id === initialClassId)) {
      chosenClassId = initialClassId;
      const classSubjects = getTeacherAssignedSubjectsForClass(
        chosenClassId,
        sbData,
        asgnData,
        currentUser,
        tcData
      );
      chosenSubjectId = classSubjects[0]?.id || '';
    } else {
      const classSubjects = getTeacherAssignedSubjectsForClass(
        chosenClassId,
        sbData,
        asgnData,
        currentUser,
        tcData
      );
      chosenSubjectId = classSubjects[0]?.id || '';
    }

    setSelectedClassId(chosenClassId);
    setSelectedSubjectId(chosenSubjectId);
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const availableSubjects = getTeacherAssignedSubjectsForClass(
      newClassId,
      allSubjects,
      assignments,
      currentUser,
      teachers
    );
    if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(availableSubjects[0]?.id || '');
    }
  };

  const loadStudentsAndScores = async () => {
    // Security check: teacher must be assigned to this class & subject
    if (
      !selectedClassId ||
      !selectedSubjectId ||
      !isCourseAssignedToTeacher(selectedClassId, selectedSubjectId, assignments, currentUser, teachers)
    ) {
      setStudents([]);
      setScoreRows({});
      return;
    }

    const [allStudents, existingResults] = await Promise.all([
      dbService.getStudentsBySchool(schoolId),
      dbService.getResultsByClassAndSubject(schoolId, selectedClassId, selectedSubjectId),
    ]);

    const classEnrolled = allStudents.filter(
      (s) => s.currentClassId === selectedClassId && s.status === 'active'
    );
    setStudents(classEnrolled);

    const rowsMap: Record<
      string,
      {
        id?: string;
        scores: ScoreBreakdown;
        teacherRemark: string;
        status?: 'draft' | 'submitted' | 'approved' | 'rejected';
        adminRemark?: string;
      }
    > = {};

    classEnrolled.forEach((st) => {
      const existing = existingResults.find((r) => r.studentId === st.id);
      if (existing) {
        rowsMap[st.id] = {
          id: existing.id,
          scores: { ...existing.scores },
          teacherRemark: existing.teacherRemark || '',
          status: existing.status,
          adminRemark: existing.adminRemark || '',
        };
      } else {
        rowsMap[st.id] = {
          scores: { assignment: 0, quiz: 0, ca: 0, midTerm: 0, exam: 0 },
          teacherRemark: '',
          status: 'draft',
        };
      }
    });

    setScoreRows(rowsMap);
  };

  const syncSingleStudentScore = async (
    studentId: string,
    updatedScores: ScoreBreakdown,
    updatedRemark: string,
    status?: 'draft' | 'submitted' | 'approved' | 'rejected'
  ) => {
    const existingRow = scoreRows[studentId];
    try {
      await dbService.saveSingleResult({
        id: existingRow?.id,
        schoolId,
        studentId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        teacherId: teacherUid,
        session: currentSchool?.currentSession || '2025/2026',
        term: currentSchool?.currentTerm || 'First Term',
        scores: updatedScores,
        teacherRemark: updatedRemark,
        status: status || existingRow?.status || 'draft',
      });
    } catch (e) {
      /* ignore sync error */
    }
  };

  const handleScoreChange = (
    studentId: string,
    field: keyof ScoreBreakdown,
    val: number,
    maxLimit: number
  ) => {
    const sanitized = Math.max(0, Math.min(maxLimit, isNaN(val) ? 0 : val));
    const currentStudentRow = scoreRows[studentId];
    const newScores = {
      ...currentStudentRow?.scores,
      [field]: sanitized,
    };

    // If an already approved score is modified, mark it as 'draft' so it requires re-submission for this student only
    const newStatus = currentStudentRow?.status === 'approved' ? 'draft' : currentStudentRow?.status || 'draft';

    setScoreRows((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        scores: newScores,
        status: newStatus,
      },
    }));

    syncSingleStudentScore(
      studentId,
      newScores,
      currentStudentRow?.teacherRemark || '',
      newStatus
    );
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    const currentStudentRow = scoreRows[studentId];
    setScoreRows((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        teacherRemark: remark,
      },
    }));

    syncSingleStudentScore(
      studentId,
      currentStudentRow?.scores || { assignment: 0, quiz: 0, ca: 0, midTerm: 0, exam: 0 },
      remark,
      currentStudentRow?.status
    );
  };

  // SUBMIT ONLY A SINGLE STUDENT'S SCORE INDEPENDENTLY
  const handleSubmitSingleStudent = async (studentId: string) => {
    setSingleSubmittingId(studentId);
    const row = scoreRows[studentId] || {
      scores: { assignment: 0, quiz: 0, ca: 0, midTerm: 0, exam: 0 },
      teacherRemark: '',
      status: 'draft',
    };

    const student = students.find((s) => s.id === studentId);
    const studentName = student?.fullName || 'Student';
    const activeCl = classes.find((c) => c.id === selectedClassId);
    const activeSub = allSubjects.find((s) => s.id === selectedSubjectId);

    try {
      await dbService.saveSingleResult({
        id: row.id,
        schoolId,
        studentId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        teacherId: teacherUid,
        session: currentSchool?.currentSession || '2025/2026',
        term: currentSchool?.currentTerm || 'First Term',
        scores: row.scores,
        teacherRemark: row.teacherRemark,
        status: 'submitted',
      });

      await dbService.createNotification({
        schoolId,
        recipientRole: 'school_admin',
        title: `Score Sheet Submitted: ${studentName} (${activeSub?.name || 'Subject'})`,
        message: `${currentUser?.fullName || 'Teacher'} submitted assessment score specifically for ${studentName} in ${activeCl?.name} (${activeSub?.name}) for review.`,
        type: 'result_submitted',
        targetClassId: selectedClassId,
        targetSubjectId: selectedSubjectId,
        targetStudentId: studentId,
      });

      await dbService.logAuditEvent({
        schoolId,
        actorUid: currentUser?.uid || teacherUid,
        actorName: currentUser?.fullName || 'Teacher',
        actorRole: currentUser?.role || 'teacher',
        action: 'SUBMIT_RESULTS_TO_ADMIN',
        resource: 'assessment_results',
        details: `Submitted score record for ${studentName} in ${activeCl?.name} (${activeSub?.name}) to admin for approval.`,
      });

      setScoreRows((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          status: 'submitted',
        },
      }));

      setMessage({
        type: 'success',
        text: `Submitted assessment score for ${studentName} to Admin for review.`,
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to submit score for ${studentName}.` });
    } finally {
      setSingleSubmittingId(null);
    }
  };

  // SAVE DRAFT OR SUBMIT PENDING/ALTERED TO ADMIN
  const handleSave = async (submitToAdmin: boolean) => {
    setSaving(true);
    setMessage(null);

    const activeCl = classes.find((c) => c.id === selectedClassId);
    const activeSub = allSubjects.find((s) => s.id === selectedSubjectId);
    const className = activeCl?.name || 'Class';
    const subjectName = activeSub?.name || 'Subject';

    const payload: Partial<SubjectResult>[] = students.map((st) => {
      const row = scoreRows[st.id] || {
        scores: { assignment: 0, quiz: 0, ca: 0, midTerm: 0, exam: 0 },
        teacherRemark: '',
        status: 'draft',
      };

      // If submitting to admin, keep approved rows approved unless they were altered to draft/rejected
      let finalStatus = row.status || 'draft';
      if (submitToAdmin) {
        if (finalStatus !== 'approved') {
          finalStatus = 'submitted';
        }
      }

      return {
        id: row.id,
        schoolId,
        studentId: st.id,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        teacherId: teacherUid,
        session: currentSchool?.currentSession || '2025/2026',
        term: currentSchool?.currentTerm || 'First Term',
        scores: row.scores,
        teacherRemark: row.teacherRemark,
        status: finalStatus,
      };
    });

    try {
      await dbService.saveResultsBatch(payload);

      if (submitToAdmin) {
        const submittedCount = payload.filter((p) => p.status === 'submitted').length;

        await dbService.createNotification({
          schoolId,
          recipientRole: 'school_admin',
          title: `Score Sheet Submitted: ${className} • ${subjectName}`,
          message: `${currentUser?.fullName || 'Teacher'} submitted ${submittedCount} assessment score records for ${className} (${subjectName}) awaiting your review and approval.`,
          type: 'result_submitted',
          targetClassId: selectedClassId,
          targetSubjectId: selectedSubjectId,
        });

        await dbService.logAuditEvent({
          schoolId,
          actorUid: currentUser?.uid || teacherUid,
          actorName: currentUser?.fullName || 'Teacher',
          actorRole: currentUser?.role || 'teacher',
          action: 'SUBMIT_RESULTS_TO_ADMIN',
          resource: 'assessment_results',
          details: `Submitted score sheet for ${submittedCount} student(s) in ${className} (${subjectName}) to administration for approval.`,
        });
      }

      setMessage({
        type: 'success',
        text: submitToAdmin
          ? 'Assessment scores submitted to School Admin for review & approval!'
          : 'Assessment score draft saved successfully.',
      });
      await loadStudentsAndScores();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save scores. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const activeClass = classes.find((c) => c.id === selectedClassId);
  const activeSubject = allSubjects.find((s) => s.id === selectedSubjectId);

  const availableSubjects = getTeacherAssignedSubjectsForClass(
    selectedClassId,
    allSubjects,
    assignments,
    currentUser,
    teachers
  );

  const pendingCount = Object.values(scoreRows).filter((r) => r.status === 'draft' || r.status === 'rejected').length;
  const approvedCount = Object.values(scoreRows).filter((r) => r.status === 'approved').length;
  const submittedCount = Object.values(scoreRows).filter((r) => r.status === 'submitted').length;

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900">Assessment Score Entry Sheet</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Teacher Score Entry & Independent Result Submission
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">No Courses Assigned To Your Account</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mt-1">
              Teachers can only view, enter, and edit scores for classes and subjects specifically assigned to them. You currently have no teaching allocations configured.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 max-w-md mx-auto text-left">
            <p className="font-semibold text-slate-800 mb-1">To start entering student scores:</p>
            <p className="text-[11px] text-slate-500">
              Please contact your School Administrator (<span className="font-medium text-slate-700">Dr. Elizabeth Warren</span>) to assign your classes and subjects under <span className="font-medium text-slate-700">Teacher Management</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">Assessment Score Entry Sheet</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5 text-blue-500" />
            Scores, totals, and grades calculate automatically. You can submit the full sheet or submit each student independently.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || students.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-300"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving || students.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" />
            Submit Sheet to Admin
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {message.text}
        </div>
      )}

      {/* Class & Subject Selector (Strictly filtered to assigned courses) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Your Assigned Class *
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.section || 'Class'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Your Assigned Subject in this Class *
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Max Assessment Weights Key & Status Overview */}
      <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <span className="font-bold block">Course: {activeClass?.name} • {activeSubject?.name}</span>
          <span className="text-[11px] text-blue-700">
            Max Marks: Asgn ({weights.assignmentMax}) + Quiz ({weights.quizMax}) + C.A ({weights.caMax}) + MidTerm ({weights.midTermMax}) + Exam ({weights.examMax}) = 100
          </span>
        </div>

        <div className="flex items-center gap-2">
          {approvedCount > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              {approvedCount} Approved
            </span>
          )}
          {submittedCount > 0 && (
            <span className="bg-amber-100 text-amber-900 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              {submittedCount} Pending Review
            </span>
          )}
          {pendingCount > 0 && (
            <span className="bg-slate-200 text-slate-700 text-[10.5px] font-medium px-2.5 py-0.5 rounded-full">
              {pendingCount} Draft / Unsubmitted
            </span>
          )}
        </div>
      </div>

      {/* Score Sheet Entry Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <th className="p-3 border-b border-slate-800">#</th>
                <th className="p-3 border-b border-slate-800 min-w-[160px]">Student Name</th>
                <th className="p-3 border-b border-slate-800 text-center w-20">Asgn ({weights.assignmentMax})</th>
                <th className="p-3 border-b border-slate-800 text-center w-20">Quiz ({weights.quizMax})</th>
                <th className="p-3 border-b border-slate-800 text-center w-20">C.A ({weights.caMax})</th>
                <th className="p-3 border-b border-slate-800 text-center w-24">MidTerm ({weights.midTermMax})</th>
                <th className="p-3 border-b border-slate-800 text-center w-20">Exam ({weights.examMax})</th>
                <th className="p-3 border-b border-slate-800 text-center bg-slate-800 w-20">Total</th>
                <th className="p-3 border-b border-slate-800 text-center w-16">Grade</th>
                <th className="p-3 border-b border-slate-800">Teacher Remarks</th>
                <th className="p-3 border-b border-slate-800">Status</th>
                <th className="p-3 border-b border-slate-800 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400 italic">
                    No active students enrolled in {activeClass?.name || 'this class'} yet.
                  </td>
                </tr>
              ) : (
                students.map((st, idx) => {
                  const row = scoreRows[st.id] || {
                    scores: { assignment: 0, quiz: 0, ca: 0, midTerm: 0, exam: 0 },
                    teacherRemark: '',
                    status: 'draft',
                  };

                  const currentTotal =
                    (row.scores.assignment || 0) +
                    (row.scores.quiz || 0) +
                    (row.scores.ca || 0) +
                    (row.scores.midTerm || 0) +
                    (row.scores.exam || 0);

                  const { grade } = calculateGrade(currentTotal);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                      <td className="p-3 font-bold text-slate-900">
                        {st.fullName}
                        <span className="block text-[10px] font-normal text-slate-500">{st.admissionNumber}</span>
                        {row.adminRemark && row.status === 'rejected' && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            Returned: {row.adminRemark}
                          </span>
                        )}
                      </td>

                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.assignmentMax}
                          value={row.scores.assignment}
                          onChange={(e) =>
                            handleScoreChange(st.id, 'assignment', parseInt(e.target.value), weights.assignmentMax)
                          }
                          className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.quizMax}
                          value={row.scores.quiz}
                          onChange={(e) =>
                            handleScoreChange(st.id, 'quiz', parseInt(e.target.value), weights.quizMax)
                          }
                          className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.caMax}
                          value={row.scores.ca}
                          onChange={(e) =>
                            handleScoreChange(st.id, 'ca', parseInt(e.target.value), weights.caMax)
                          }
                          className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.midTermMax}
                          value={row.scores.midTerm}
                          onChange={(e) =>
                            handleScoreChange(st.id, 'midTerm', parseInt(e.target.value), weights.midTermMax)
                          }
                          className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.examMax}
                          value={row.scores.exam}
                          onChange={(e) =>
                            handleScoreChange(st.id, 'exam', parseInt(e.target.value), weights.examMax)
                          }
                          className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                        />
                      </td>

                      {/* Auto Calculated Total */}
                      <td className="p-2 text-center font-black text-slate-900 bg-slate-100 text-sm">
                        {currentTotal}
                      </td>

                      {/* Auto Calculated Grade */}
                      <td className="p-2 text-center font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            grade === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : grade === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : grade === 'C'
                              ? 'bg-sky-100 text-sky-800'
                              : grade === 'D' || grade === 'E'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {grade}
                        </span>
                      </td>

                      <td className="p-2">
                        <input
                          type="text"
                          value={row.teacherRemark}
                          onChange={(e) => handleRemarkChange(st.id, e.target.value)}
                          placeholder="e.g. Excellent participation"
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                        />
                      </td>

                      <td className="p-2 whitespace-nowrap">
                        {row.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {row.status === 'submitted' && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                            Submitted
                          </span>
                        )}
                        {row.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <XCircle className="w-2.5 h-2.5 text-rose-600" />
                            Returned
                          </span>
                        )}
                        {(!row.status || row.status === 'draft') && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="p-2 text-right whitespace-nowrap">
                        {row.status !== 'approved' && row.status !== 'submitted' ? (
                          <button
                            onClick={() => handleSubmitSingleStudent(st.id)}
                            disabled={singleSubmittingId === st.id}
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-[11px] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                            title="Submit ONLY this student's result to admin"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>{singleSubmittingId === st.id ? 'Submitting...' : 'Submit'}</span>
                          </button>
                        ) : row.status === 'submitted' ? (
                          <span className="text-[10px] text-slate-400 italic">In Review</span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold">Published</span>
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
    </div>
  );
};
