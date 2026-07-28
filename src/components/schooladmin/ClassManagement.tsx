import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { ClassItem, Teacher, Student } from '../../types';
import { Modal } from '../common/Modal';
import { Layers, PlusCircle, Edit2, Trash2, Users, GraduationCap } from 'lucide-react';

export const ClassManagement: React.FC = () => {
  const { currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [name, setName] = useState('');
  const [section, setSection] = useState('Primary');
  const [classTeacherId, setClassTeacherId] = useState('');

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    const [clData, tcData, stData] = await Promise.all([
      dbService.getClassesBySchool(schoolId),
      dbService.getTeachersBySchool(schoolId),
      dbService.getStudentsBySchool(schoolId),
    ]);
    setClasses(clData);
    setTeachers(tcData);
    setStudents(stData);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingClass(null);
    setName('');
    setSection('Primary');
    setClassTeacherId('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: ClassItem) => {
    setEditingClass(c);
    setName(c.name);
    setSection(c.section || 'Primary');
    setClassTeacherId(c.classTeacherId || '');
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingClass) {
      await dbService.updateClass(editingClass.id, {
        name,
        section,
        classTeacherId,
      });
    } else {
      await dbService.addClass({
        schoolId,
        name,
        section,
        classTeacherId,
      });
    }

    setIsModalOpen(false);
    await loadData();
  };

  const handleDeleteClass = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this class stream?')) {
      await dbService.deleteClass(id);
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            <h1 className="text-lg font-bold text-slate-900">Class & Stream Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Define grade levels, section streams, and assign class head teachers.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Class
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => {
          const classTeacher = teachers.find((t) => (t.uid || t.id) === c.classTeacherId);
          const classStudents = students.filter((s) => s.currentClassId === c.id);

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {c.section || 'General'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{c.name}</h3>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> Class Teacher:
                    </span>
                    <span className="font-bold text-slate-800">
                      {classTeacher ? classTeacher.fullName : 'Not Assigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Total Enrolled:
                    </span>
                    <span className="font-bold text-blue-600">{classStudents.length} Students</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Edit Class Stream' : 'Create New Class Stream'}
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Class Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primary 4 Alpha or JSS 1 Gold"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Section / Level</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="Nursery">Nursery / Pre-Primary</option>
              <option value="Primary">Primary School</option>
              <option value="Junior Secondary">Junior Secondary (JSS)</option>
              <option value="Senior Secondary">Senior Secondary (SS)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assign Class Head Teacher</label>
            <select
              value={classTeacherId}
              onChange={(e) => setClassTeacherId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="">-- No Class Teacher Assigned --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.uid || t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Save Class
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
