import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { Teacher, ClassItem, SubjectItem, ClassSubjectAssignment } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  Users,
  PlusCircle,
  Search,
  BookOpen,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  X,
  UserMinus,
  Unlink,
} from 'lucide-react';

export const TeacherManagement: React.FC = () => {
  const { currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Teacher Modal State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');

  // Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    const [tcData, clData, sbData, asgnData] = await Promise.all([
      dbService.getTeachersBySchool(schoolId),
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
    ]);
    setTeachers(tcData);
    setClasses(clData);
    setSubjects(sbData);
    setAssignments(asgnData);
    if (clData.length > 0 && !selectedClassId) setSelectedClassId(clData[0].id);
    if (sbData.length > 0 && !selectedSubjectId) setSelectedSubjectId(sbData[0].id);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setQualification('');
    setIsTeacherModalOpen(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setFullName(t.fullName);
    setEmail(t.email);
    setPhone(t.phone);
    setQualification(t.qualification || '');
    setIsTeacherModalOpen(true);
  };

  const openAssignModal = (t: Teacher) => {
    setAssigningTeacher(t);
    setIsAssignModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    if (editingTeacher) {
      await dbService.updateTeacher(editingTeacher.id, {
        fullName,
        email,
        phone,
        qualification,
      });
    } else {
      await dbService.addTeacher({
        schoolId,
        fullName,
        email,
        phone,
        qualification,
        status: 'active',
      });
    }

    setIsTeacherModalOpen(false);
    await loadData();
  };

  const handleDeleteTeacher = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this teacher?')) {
      await dbService.deleteTeacher(id);
      await loadData();
    }
  };

  // Remove a single subject-class assignment for a teacher
  const handleRemoveAssignment = async (assignmentId: string, label?: string) => {
    if (label && !window.confirm(`Unassign teacher from ${label}?`)) return;
    await dbService.removeTeacherAssignment(assignmentId);
    await loadData();
  };

  // Remove ALL class/subject assignments for a teacher
  const handleUnassignAllForTeacher = async (teacherUid: string, teacherName: string) => {
    if (window.confirm(`Unassign ALL subjects and classes from ${teacherName}?`)) {
      await dbService.unassignAllClassSubjectsForTeacher(schoolId, teacherUid);
      await loadData();
    }
  };

  // Shortcut: Unassign teacher from ALL subjects in a selected class
  const handleUnassignAllSubjectsInClass = async () => {
    if (!assigningTeacher || !selectedClassId) return;
    const targetClass = classes.find((c) => c.id === selectedClassId);
    if (
      window.confirm(
        `Remove ${assigningTeacher.fullName} from ALL subjects in ${targetClass?.name || 'this class'}?`
      )
    ) {
      await dbService.unassignAllClassSubjectsForTeacher(
        schoolId,
        assigningTeacher.uid || assigningTeacher.id,
        selectedClassId
      );
      await loadData();
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeacher || !selectedClassId || !selectedSubjectId) return;

    await dbService.assignTeacherToClassSubject(
      schoolId,
      selectedClassId,
      selectedSubjectId,
      assigningTeacher.uid || assigningTeacher.id
    );

    await loadData();
  };

  // Method 1 Shortcut: Assign teacher to ALL subjects in a class!
  const handleAssignAllSubjectsInClass = async () => {
    if (!assigningTeacher || !selectedClassId) return;
    for (const sub of subjects) {
      await dbService.assignTeacherToClassSubject(
        schoolId,
        selectedClassId,
        sub.id,
        assigningTeacher.uid || assigningTeacher.id
      );
    }
    setIsAssignModalOpen(false);
    await loadData();
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.fullName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">Teachers Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Add teachers, manage qualifications, and configure class/subject assignments.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Add Teacher
        </button>
      </div>

      {/* Assignment Method Information Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <span className="font-bold uppercase text-[10px] bg-indigo-200/60 text-indigo-950 px-2 py-0.5 rounded mr-2">
            Flexible Assignment System
          </span>
          <span className="font-semibold">Supports Method 1 (Class Teacher), Method 2 (Subject Specialist), or Method 3 (Mixed).</span>
        </div>
        <p className="text-[11px] text-indigo-700">Assign teachers easily per class & subject.</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teacher by name or email..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Teachers Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((t) => {
          // Find assigned subjects for this teacher
          const teacherUid = t.uid || t.id;
          const myAssignments = assignments.filter((a) => a.teacherId === teacherUid);

          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-sm">
                      {t.fullName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{t.fullName}</h3>
                      <p className="text-[11px] text-slate-500 font-medium">{t.qualification || 'Educator'}</p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>

                <div className="space-y-1 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {t.email}
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {t.phone || 'No phone'}
                  </p>
                </div>

                {/* Assigned Classes / Subjects */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Assigned Subjects ({myAssignments.length})
                    </p>
                    {myAssignments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleUnassignAllForTeacher(teacherUid, t.fullName)}
                        className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-0.5"
                        title="Remove all assignments for this teacher"
                      >
                        <UserMinus className="w-3 h-3" />
                        Unassign All
                      </button>
                    )}
                  </div>
                  {myAssignments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No subject assigned yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {myAssignments.map((asg) => {
                        const cl = classes.find((c) => c.id === asg.classId);
                        const sub = subjects.find((s) => s.id === asg.subjectId);
                        const label = `${cl?.name || 'Class'}: ${sub?.name || 'Subject'}`;
                        return (
                          <span
                            key={asg.id}
                            className="text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/60 px-2 py-0.5 rounded flex items-center gap-1 group"
                          >
                            <span>{label}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAssignment(asg.id, label);
                              }}
                              title={`Remove ${label}`}
                              className="text-blue-400 hover:text-rose-600 hover:bg-rose-100 p-0.5 rounded transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => openAssignModal(t)}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Assign Class/Subject
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(t)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTeacher(t.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Teacher Modal */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        title={editingTeacher ? 'Edit Teacher Details' : 'Add New Teacher'}
      >
        <form onSubmit={handleSaveTeacher} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Mr. David Okafor"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. david.o@graceville.edu"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 803 333 4444"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Qualification / Specialization</label>
            <input
              type="text"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="e.g. B.Sc. Ed Mathematics"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Save Teacher
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Manage Class & Subject Assignments: ${assigningTeacher?.fullName}`}
      >
        <div className="space-y-5">
          {/* Current Assignments Section */}
          {(() => {
            const teacherUid = assigningTeacher?.uid || assigningTeacher?.id;
            const currentTeacherAssignments = assignments.filter((a) => a.teacherId === teacherUid);

            return (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Current Assignments ({currentTeacherAssignments.length})
                  </h4>
                  {currentTeacherAssignments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleUnassignAllForTeacher(teacherUid!, assigningTeacher!.fullName)}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Unassign All
                    </button>
                  )}
                </div>

                {currentTeacherAssignments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No classes or subjects assigned yet.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {currentTeacherAssignments.map((asg) => {
                      const cl = classes.find((c) => c.id === asg.classId);
                      const sub = subjects.find((s) => s.id === asg.subjectId);
                      const label = `${cl?.name || 'Class'}: ${sub?.name || 'Subject'}`;
                      return (
                        <div
                          key={asg.id}
                          className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{cl?.name || 'Class'}</span>
                            <span className="text-slate-400 mx-1.5">—</span>
                            <span className="text-blue-700 font-medium">{sub?.name || 'Subject'}</span>
                            {sub?.code && <span className="text-[10px] text-slate-400 ml-1">({sub.code})</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignment(asg.id, label)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Add / Update Assignment Form */}
          <form onSubmit={handleAssignSubject} className="space-y-4 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Add Class or Subject Assignment
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Class *</label>
              <select
                required
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Subject *</label>
              <select
                required
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

            {/* Quick Bulk Actions for Selected Class */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
              <p className="text-xs font-bold text-indigo-900">Bulk Actions for Selected Class</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAssignAllSubjectsInClass}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Assign All Subjects in Class
                </button>
                <button
                  type="button"
                  onClick={handleUnassignAllSubjectsInClass}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white text-rose-600 border border-rose-200 font-bold text-xs rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  Unassign All Subjects in Class
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Done
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Assign Subject
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
