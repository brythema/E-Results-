import React, { useState, useEffect } from 'react';
import { Teacher, ClassItem, SubjectItem, ClassSubjectAssignment } from '../../types';
import { dbService } from '../../services/dbService';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  BookOpen,
  Layers,
  Users,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Search,
} from 'lucide-react';

interface TeacherAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  assignments: ClassSubjectAssignment[];
  initialTeacherId?: string;
  onAllocationsUpdated: () => Promise<void>;
}

export const TeacherAllocationModal: React.FC<TeacherAllocationModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  teachers,
  classes,
  subjects,
  assignments,
  initialTeacherId,
  onAllocationsUpdated,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId || '');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'teacher_view' | 'matrix_view'>('teacher_view');
  const [matrixSearch, setMatrixSearch] = useState('');

  useEffect(() => {
    if (initialTeacherId) {
      setSelectedTeacherId(initialTeacherId);
    } else if (teachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0].uid || teachers[0].id);
    }
  }, [initialTeacherId, teachers]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes]);

  // When class changes, prefill selectedSubjectIds with subjects already assigned to this teacher in this class
  useEffect(() => {
    if (!selectedTeacherId || !selectedClassId) return;
    const currentAssignedSubjectIds = assignments
      .filter((a) => a.teacherId === selectedTeacherId && a.classId === selectedClassId)
      .map((a) => a.subjectId);
    setSelectedSubjectIds(currentAssignedSubjectIds);
  }, [selectedTeacherId, selectedClassId, assignments]);

  const activeTeacher = teachers.find(
    (t) => (t.uid || t.id) === selectedTeacherId || t.id === selectedTeacherId
  );
  const activeTeacherUid = activeTeacher?.uid || activeTeacher?.id || selectedTeacherId;

  const teacherAssignments = assignments.filter((a) => a.teacherId === activeTeacherUid);

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjectIds(subjects.map((s) => s.id));
  };

  const handleClearSubjectSelection = () => {
    setSelectedSubjectIds([]);
  };

  const handleSaveAllocationForClass = async () => {
    if (!activeTeacherUid || !selectedClassId) return;
    setSaving(true);
    setFeedback(null);

    try {
      // 1. Remove existing assignments for this teacher in this class
      const currentInClass = assignments.filter(
        (a) => a.teacherId === activeTeacherUid && a.classId === selectedClassId
      );

      // Subjects to remove
      for (const asgn of currentInClass) {
        if (!selectedSubjectIds.includes(asgn.subjectId)) {
          await dbService.removeTeacherAssignment(asgn.id);
        }
      }

      // Subjects to add / update
      for (const subId of selectedSubjectIds) {
        await dbService.assignTeacherToClassSubject(schoolId, selectedClassId, subId, activeTeacherUid);
      }

      await onAllocationsUpdated();
      const targetClass = classes.find((c) => c.id === selectedClassId);
      setFeedback({
        type: 'success',
        message: `Successfully updated subject allocations for ${activeTeacher?.fullName} in ${targetClass?.name}!`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update allocations. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSingleAssignment = async (assignmentId: string, label: string) => {
    if (!window.confirm(`Unassign teacher from ${label}?`)) return;
    setSaving(true);
    try {
      await dbService.removeTeacherAssignment(assignmentId);
      await onAllocationsUpdated();
      setFeedback({ type: 'success', message: `Unassigned ${label}.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignAll = async () => {
    if (!activeTeacher) return;
    if (!window.confirm(`Are you sure you want to remove ALL subject and class allocations for ${activeTeacher.fullName}?`)) return;
    setSaving(true);
    try {
      await dbService.unassignAllClassSubjectsForTeacher(schoolId, activeTeacherUid);
      await onAllocationsUpdated();
      setSelectedSubjectIds([]);
      setFeedback({ type: 'success', message: `All allocations removed for ${activeTeacher.fullName}.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickInlineAssign = async (classId: string, subjectId: string, newTeacherId: string) => {
    try {
      if (!newTeacherId) {
        await dbService.unassignTeacherFromClassSubject(schoolId, classId, subjectId);
      } else {
        await dbService.assignTeacherToClassSubject(schoolId, classId, subjectId, newTeacherId);
      }
      await onAllocationsUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Teacher Subject & Class Allocation"
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Navigation Tabs between Teacher View & School Matrix View */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('teacher_view')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'teacher_view'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Allocate by Teacher
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matrix_view')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matrix_view'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Curriculum Allocation Matrix
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
            Assign exact subjects and classes to teachers
          </span>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <span className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              {feedback.message}
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {activeTab === 'teacher_view' ? (
          <div className="space-y-5">
            {/* Step 1: Select Teacher */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Select Teacher to Allocate
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-2">
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  >
                    {teachers.map((t) => {
                      const count = assignments.filter(
                        (a) => a.teacherId === (t.uid || t.id)
                      ).length;
                      return (
                        <option key={t.id} value={t.uid || t.id}>
                          {t.fullName} ({t.qualification || 'Educator'}) — {count} assigned courses
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="text-right">
                  {teacherAssignments.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleUnassignAll}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Unassign All Courses
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No courses currently</span>
                  )}
                </div>
              </div>

              {/* Active Teacher Stats Bar */}
              {activeTeacher && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-slate-900">{activeTeacher.fullName}</span>
                    <span className="text-slate-400">•</span>
                    <span>{activeTeacher.email}</span>
                  </div>
                  <div className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg text-[11px]">
                    Total Allocated Courses: {teacherAssignments.length}
                  </div>
                </div>
              )}
            </div>

            {/* Current Active Allocations for this Teacher */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Current Teaching Allocations ({teacherAssignments.length})</span>
                <span className="text-[11px] text-slate-400 font-normal normal-case">
                  Click 'x' to remove any allocation
                </span>
              </h4>

              {teacherAssignments.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  This teacher currently has no assigned subjects or classes. Use the section below to assign subjects.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {teacherAssignments.map((asg) => {
                    const cl = classes.find((c) => c.id === asg.classId);
                    const sub = subjects.find((s) => s.id === asg.subjectId);
                    const label = `${cl?.name || 'Class'} • ${sub?.name || 'Subject'}`;
                    return (
                      <div
                        key={asg.id}
                        className="bg-white border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between shadow-2xs text-xs"
                      >
                        <div className="truncate mr-2">
                          <p className="font-bold text-slate-900 truncate">{sub?.name || 'Subject'}</p>
                          <p className="text-[10.5px] text-blue-700 font-semibold truncate">{cl?.name || 'Class'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleAssignment(asg.id, label)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title={`Unassign ${label}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Allocate Subjects in a Class */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. Select Class & Subjects to Allocate
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Choose a class and check which subjects {activeTeacher?.fullName || 'this teacher'} will take.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllSubjects}
                    className="text-[11px] font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                  >
                    Select All Subjects
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSubjectSelection}
                    className="text-[11px] font-bold text-slate-500 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Class Picker */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Target Class *
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selection Grid */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Subjects for this Class:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjectIds.includes(sub.id);
                    // Check if another teacher is assigned to this class and subject
                    const existingAsgn = assignments.find(
                      (a) => a.classId === selectedClassId && a.subjectId === sub.id
                    );
                    const isAssignedToOther =
                      existingAsgn && existingAsgn.teacherId !== activeTeacherUid;
                    const otherTeacher = isAssignedToOther
                      ? teachers.find((t) => (t.uid || t.id) === existingAsgn.teacherId)
                      : null;

                    return (
                      <div
                        key={sub.id}
                        onClick={() => toggleSubjectSelection(sub.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-400 text-blue-950 ring-1 ring-blue-300'
                            : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/80 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 text-white transition-colors ${
                            isSelected ? 'bg-blue-600' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs truncate">{sub.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{sub.code}</p>
                          {isAssignedToOther && !isSelected && (
                            <p className="text-[9.5px] text-amber-700 font-medium mt-1 truncate">
                              Currently: {otherTeacher?.fullName || 'Another teacher'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  <strong className="text-slate-800">{selectedSubjectIds.length}</strong> subjects selected for this class
                </span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAllocationForClass}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? 'Saving Allocations...' : 'Apply Class Allocations'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Matrix View: All Classes x Subjects with Inline Teacher Assigners */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  placeholder="Filter matrix by class, subject, or teacher name..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-3">Class</th>
                      <th className="p-3">Subject Name</th>
                      <th className="p-3">Subject Code</th>
                      <th className="p-3">Assigned Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {classes.flatMap((cl) =>
                      subjects.map((sub) => {
                        const existingAsgn = assignments.find(
                          (a) => a.classId === cl.id && a.subjectId === sub.id
                        );
                        const assignedTeacher = teachers.find(
                          (t) => (t.uid || t.id) === existingAsgn?.teacherId
                        );

                        // Search filter
                        if (matrixSearch) {
                          const query = matrixSearch.toLowerCase();
                          const matchClass = cl.name.toLowerCase().includes(query);
                          const matchSub = sub.name.toLowerCase().includes(query) || sub.code.toLowerCase().includes(query);
                          const matchTeacher = assignedTeacher?.fullName.toLowerCase().includes(query);
                          if (!matchClass && !matchSub && !matchTeacher) return null;
                        }

                        return (
                          <tr key={`${cl.id}_${sub.id}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{cl.name}</td>
                            <td className="p-3 font-semibold text-slate-700">{sub.name}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">{sub.code}</td>
                            <td className="p-3">
                              <select
                                value={existingAsgn?.teacherId || ''}
                                onChange={(e) =>
                                  handleQuickInlineAssign(cl.id, sub.id, e.target.value)
                                }
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                                  existingAsgn?.teacherId
                                    ? 'bg-blue-50/60 border-blue-200 text-blue-900 font-semibold'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 italic'
                                } focus:outline-none focus:border-blue-600`}
                              >
                                <option value="">-- Unassigned --</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.uid || t.id}>
                                    {t.fullName} ({t.qualification || 'Teacher'})
                                  </option>
                                ))}
                              </select>
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
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
