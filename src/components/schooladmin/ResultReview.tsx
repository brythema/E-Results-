import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { ClassItem, SubjectItem, Student, SubjectResult, calculateGrade } from '../../types';
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
} from 'lucide-react';

export const ResultReview: React.FC = () => {
  const { currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allResults, setAllResults] = useState<SubjectResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('submitted'); // 'all', 'submitted', 'approved', 'rejected'

  // Modal feedback state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [adminRemark, setAdminRemark] = useState('');

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    const [clData, sbData, stData, rsData] = await Promise.all([
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getStudentsBySchool(schoolId),
      dbService.getAllResultsForSchool(schoolId),
    ]);
    setClasses(clData);
    setSubjects(sbData);
    setStudents(stData);
    setAllResults(rsData);

    if (clData.length > 0 && !selectedClassId) setSelectedClassId(clData[0].id);
    if (sbData.length > 0 && !selectedSubjectId) setSelectedSubjectId(sbData[0].id);
    setLoading(false);
  };

  const handleApproveResult = async (id: string) => {
    await dbService.updateResultStatus([id], 'approved');
    await loadData();
  };

  const handleApproveAllInView = async () => {
    const idsToApprove = filteredResults.map((r) => r.id);
    if (idsToApprove.length === 0) return;
    await dbService.updateResultStatus(idsToApprove, 'approved');
    await loadData();
  };

  const openRejectModal = (id: string) => {
    setSelectedResultId(id);
    setAdminRemark('');
    setIsRejectModalOpen(false);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResultId) return;
    await dbService.updateResultStatus([selectedResultId], 'rejected', adminRemark || 'Returned for correction.');
    setIsRejectModalOpen(false);
    await loadData();
  };

  const filteredResults = allResults.filter((r) => {
    const matchesClass = !selectedClassId || r.classId === selectedClassId;
    const matchesSubject = !selectedSubjectId || r.subjectId === selectedSubjectId;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesClass && matchesSubject && matchesStatus;
  });

  const weights = currentSchool?.assessmentWeights || {
    assignmentMax: 10,
    quizMax: 10,
    caMax: 20,
    midTermMax: 20,
    examMax: 40,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Result Review & Approval</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review teacher score sheets. Approved results become immediately visible to parents and students.
          </p>
        </div>

        {filteredResults.length > 0 && (
          <button
            onClick={handleApproveAllInView}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve All ({filteredResults.length})
          </button>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
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
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Subject</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
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
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Approval Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Pending Approval (Submitted)</option>
            <option value="approved">Approved & Published</option>
            <option value="rejected">Rejected / Returned</option>
            <option value="draft">Teacher Draft</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <th className="p-3 border-b border-slate-800">Student Name</th>
                <th className="p-3 border-b border-slate-800">Subject / Class</th>
                <th className="p-3 border-b border-slate-800 text-center">Asgn ({weights.assignmentMax})</th>
                <th className="p-3 border-b border-slate-800 text-center">Quiz ({weights.quizMax})</th>
                <th className="p-3 border-b border-slate-800 text-center">C.A ({weights.caMax})</th>
                <th className="p-3 border-b border-slate-800 text-center">MidTerm ({weights.midTermMax})</th>
                <th className="p-3 border-b border-slate-800 text-center">Exam ({weights.examMax})</th>
                <th className="p-3 border-b border-slate-800 text-center bg-slate-800">Total</th>
                <th className="p-3 border-b border-slate-800 text-center">Grade</th>
                <th className="p-3 border-b border-slate-800">Status</th>
                <th className="p-3 border-b border-slate-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 italic">
                    No results found matching your selected filters.
                  </td>
                </tr>
              ) : (
                filteredResults.map((res) => {
                  const student = students.find((s) => s.id === res.studentId);
                  const cl = classes.find((c) => c.id === res.classId);
                  const sub = subjects.find((s) => s.id === res.subjectId);

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        {student?.fullName || 'Student'}
                        <span className="block text-[10px] font-normal text-slate-500">
                          {student?.admissionNumber}
                        </span>
                      </td>

                      <td className="p-3 font-medium text-slate-700">
                        <p className="font-bold text-slate-800">{sub?.name || 'Subject'}</p>
                        <span className="text-[10px] text-slate-500">{cl?.name}</span>
                      </td>

                      <td className="p-3 text-center font-medium text-slate-700">{res.scores.assignment}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{res.scores.quiz}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{res.scores.ca}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{res.scores.midTerm}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{res.scores.exam}</td>

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

                      <td className="p-3">
                        {res.status === 'approved' && <Badge variant="success">Approved</Badge>}
                        {res.status === 'submitted' && <Badge variant="warning">Submitted</Badge>}
                        {res.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                        {res.status === 'draft' && <Badge variant="neutral">Draft</Badge>}
                      </td>

                      <td className="p-3 text-right space-x-1">
                        {res.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveResult(res.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            title="Approve & Publish to Parent"
                          >
                            Approve
                          </button>
                        )}

                        {res.status !== 'rejected' && (
                          <button
                            onClick={() => openRejectModal(res.id)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            title="Return for correction"
                          >
                            Reject
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

      {/* Reject Reason Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Return Score Sheet for Correction"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <p className="text-xs text-slate-600">
            Please enter a feedback comment explaining why this result sheet is being returned to the teacher.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Admin Feedback / Correction Remark</label>
            <textarea
              required
              rows={3}
              value={adminRemark}
              onChange={(e) => setAdminRemark(e.target.value)}
              placeholder="e.g. Please verify exam scores for student Alex Morgan before resubmitting."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Return to Teacher
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
