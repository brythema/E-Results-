import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import {
  ClassItem,
  SubjectItem,
  ClassSubjectAssignment,
  Student,
  SubjectResult,
  ScoreBreakdown,
  calculateGrade,
} from '../../types';
import { Badge } from '../common/Badge';
import {
  FileSpreadsheet,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Calculator,
  RefreshCw,
} from 'lucide-react';

interface AssessmentEntryProps {
  initialClassId?: string;
  initialSubjectId?: string;
}

export const AssessmentEntry: React.FC<AssessmentEntryProps> = ({
  initialClassId,
  initialSubjectId,
}) => {
  const { currentUser, currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const teacherUid = currentUser?.uid || 'uid_teacher_math';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Selections
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');

  // Form scores map by studentId
  const [scoreRows, setScoreRows] = useState<
    Record<
      string,
      {
        id?: string;
        scores: ScoreBreakdown;
        teacherRemark: string;
        status: 'draft' | 'submitted' | 'approved' | 'rejected';
        adminRemark?: string;
      }
    >
  >({});

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const weights = currentSchool?.assessmentWeights || {
    assignmentMax: 10,
    quizMax: 10,
    caMax: 20,
    midTermMax: 20,
    examMax: 40,
  };

  useEffect(() => {
    if (initialClassId) setSelectedClassId(initialClassId);
    if (initialSubjectId) setSelectedSubjectId(initialSubjectId);
  }, [initialClassId, initialSubjectId]);

  useEffect(() => {
    loadAssignments();
  }, [schoolId, teacherUid]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      loadStudentsAndScores();
    }
  }, [selectedClassId, selectedSubjectId]);

  const loadAssignments = async () => {
    setLoading(true);
    const [clData, sbData, asgnData] = await Promise.all([
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
    ]);
    setClasses(clData);
    setSubjects(sbData);

    const mine = asgnData.filter((a) => a.teacherId === teacherUid);
    setAssignments(mine);

    if (mine.length > 0) {
      const firstClass = initialClassId || mine[0].classId;
      const firstSub = initialSubjectId || mine[0].subjectId;
      setSelectedClassId(firstClass);
      setSelectedSubjectId(firstSub);
    } else if (clData.length > 0 && sbData.length > 0) {
      setSelectedClassId(clData[0].id);
      setSelectedSubjectId(sbData[0].id);
    }
    setLoading(false);
  };

  const loadStudentsAndScores = async () => {
    const [stData, existingResults] = await Promise.all([
      dbService.getStudentsBySchool(schoolId),
      dbService.getResultsByClassAndSubject(schoolId, selectedClassId, selectedSubjectId),
    ]);

    // Enrolled students in this class
    const classEnrolled = stData.filter((s) => s.currentClassId === selectedClassId);
    setStudents(classEnrolled);

    // Build initial score rows state
    const rowsMap: Record<
      string,
      {
        id?: string;
        scores: ScoreBreakdown;
        teacherRemark: string;
        status: 'draft' | 'submitted' | 'approved' | 'rejected';
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
    const payload: Partial<SubjectResult>[] = [
      {
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
      },
    ];
    try {
      await dbService.saveResultsBatch(payload);
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
    setScoreRows((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        scores: newScores,
      },
    }));

    syncSingleStudentScore(
      studentId,
      newScores,
      currentStudentRow?.teacherRemark || '',
      currentStudentRow?.status
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

  const handleSave = async (submitToAdmin: boolean) => {
    setSaving(true);
    setMessage(null);

    const targetStatus = submitToAdmin ? 'submitted' : 'draft';

    const payload: Partial<SubjectResult>[] = students.map((st) => {
      const row = scoreRows[st.id] || {
        scores: { assignment: 0, quiz: 0, ca: 0, midTerm: 0, exam: 0 },
        teacherRemark: '',
        status: 'draft',
      };

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
        status: targetStatus,
      };
    });

    try {
      await dbService.saveResultsBatch(payload);
      setMessage({
        type: 'success',
        text: submitToAdmin
          ? 'Assessment scores submitted to School Admin for review!'
          : 'Assessment score draft saved successfully.',
      });
      await loadStudentsAndScores();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save scores. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const activeClass = classes.find((c) => c.id === selectedClassId);
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);

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
            Scores, subject totals, and grades calculate automatically as numbers are typed.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || students.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-300"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving || students.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" />
            Submit to Admin
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

      {/* Admin Rejection Feedback Banner */}
      {(Object.values(scoreRows) as Array<{ status?: string; adminRemark?: string }>).some(
        (r) => r.status === 'rejected'
      ) && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Action Required: Returned for Teacher Correction</span>
          </div>
          <p className="text-xs text-amber-800 font-medium">
            <strong>Admin Feedback / Reason:</strong>{' '}
            {(
              Object.values(scoreRows) as Array<{ status?: string; adminRemark?: string }>
            ).find((r) => r.status === 'rejected')?.adminRemark ||
              'Please review and update score entries below before resubmitting.'}
          </p>
          <p className="text-[11px] text-amber-700 italic pt-1">
            Edit the student scores below and click <strong>"Submit to Admin"</strong> to resubmit for approval.
          </p>
        </div>
      )}

      {/* Course Selector Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Class *</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Subject *</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Max Assessment Weights Key */}
      <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <span className="font-bold">Course: {activeClass?.name} • {activeSubject?.name}</span>
        <span className="font-semibold text-[11px]">
          Maximum Marks: Asgn ({weights.assignmentMax}) + Quiz ({weights.quizMax}) + C.A ({weights.caMax}) + MidTerm ({weights.midTermMax}) + Exam ({weights.examMax}) = 100
        </span>
      </div>

      {/* Score Sheet Entry Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 italic">
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
