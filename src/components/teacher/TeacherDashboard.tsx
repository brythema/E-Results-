import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { ClassItem, SubjectItem, ClassSubjectAssignment, SubjectResult } from '../../types';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import {
  FileSpreadsheet,
  BookOpen,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface TeacherDashboardProps {
  onNavigateTab: (tab: string) => void;
  onSelectAssignmentForEntry?: (classId: string, subjectId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigateTab,
  onSelectAssignmentForEntry,
}) => {
  const { currentUser, currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const teacherUid = currentUser?.uid || 'uid_teacher_math';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [myResults, setMyResults] = useState<SubjectResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [schoolId, teacherUid]);

  const loadData = async () => {
    setLoading(true);
    const [clData, sbData, asgnData, rsData] = await Promise.all([
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
      dbService.getAllResultsForSchool(schoolId),
    ]);

    setClasses(clData);
    setSubjects(sbData);

    const userTeacherIds = [
      currentUser?.uid,
      currentUser?.email,
      (currentUser as any)?.id,
      'uid_teacher_math',
    ].filter(Boolean) as string[];

    // Filter assignments where this teacher is assigned
    const mine = asgnData.filter(
      (a) => userTeacherIds.includes(a.teacherId) || a.teacherId === teacherUid
    );
    const activeAssignments = mine.length > 0 ? mine : asgnData;
    setAssignments(activeAssignments);

    const teacherClassSubjectKeys = new Set(
      activeAssignments.map((a) => `${a.classId}___${a.subjectId}`)
    );

    const filteredRs = rsData.filter(
      (r) =>
        userTeacherIds.includes(r.teacherId) ||
        r.teacherId === teacherUid ||
        teacherClassSubjectKeys.has(`${r.classId}___${r.subjectId}`) ||
        r.status === 'rejected'
    );
    setMyResults(filteredRs);

    setLoading(false);
  };

  const handleStartEntry = (classId: string, subjectId: string) => {
    if (onSelectAssignmentForEntry) {
      onSelectAssignmentForEntry(classId, subjectId);
    }
    onNavigateTab('assessment_entry');
  };

  return (
    <div className="space-y-6">
      {/* Teacher Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-full inline-block mb-2">
              Teacher Portal
            </span>
            <h1 className="text-xl font-bold tracking-tight">Welcome, {currentUser?.fullName || 'Educator'}</h1>
            <p className="text-xs text-slate-300 mt-1">
              Select an assigned class and subject to enter assessment marks. All totals and grades calculate automatically.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('assessment_entry')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Open Score Entry Sheet
          </button>
        </div>
      </div>

      {/* Rejected Results Alert Card */}
      {myResults.some((r) => r.status === 'rejected') && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-900 uppercase tracking-wider">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                Attention Required: Returned Result Sheets ({
                  Array.from(
                    new Set(
                      myResults
                        .filter((r) => r.status === 'rejected')
                        .map((r) => `${r.classId}___${r.subjectId}`)
                    )
                  ).length
                })
              </span>
            </div>
            <span className="bg-rose-200 text-rose-900 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
              Action Needed
            </span>
          </div>

          <p className="text-xs text-rose-800 leading-relaxed font-medium">
            The School Administrator returned the following assessment score sheet(s) for correction. Click <strong>"Fix & Resubmit Scores"</strong> below to review feedback and update the student marks.
          </p>

          <div className="space-y-2 pt-1">
            {Array.from(
              new Set(
                myResults
                  .filter((r) => r.status === 'rejected')
                  .map((r) => `${r.classId}___${r.subjectId}`)
              )
            ).map((key: string) => {
              const [classId, subjectId] = key.split('___');
              const cl = classes.find((c) => c.id === classId);
              const sub = subjects.find((s) => s.id === subjectId);
              const sample = myResults.find(
                (r) => r.classId === classId && r.subjectId === subjectId && r.status === 'rejected'
              );

              return (
                <div
                  key={key}
                  className="bg-white p-3.5 rounded-xl border border-rose-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {sub?.name || 'Subject'}
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded border border-slate-200">
                        {cl?.name || 'Class'}
                      </span>
                    </div>
                    {sample?.adminRemark && (
                      <p className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                        <span className="font-bold">Admin Feedback:</span> "{sample.adminRemark}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartEntry(classId, subjectId)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Fix & Resubmit Scores</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assigned Subjects"
          value={assignments.length}
          subtitle="Classes & subjects"
          icon={BookOpen}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Scores Drafted / Saved"
          value={myResults.filter((r) => r.status === 'draft').length}
          subtitle="In progress"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Submitted to Admin"
          value={myResults.filter((r) => r.status === 'submitted' || r.status === 'approved').length}
          subtitle="Ready for review"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Assigned Classes & Subjects Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Assigned Teaching Courses</h2>
            <p className="text-xs text-slate-500">Click any course below to enter or edit assessment scores</p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Course Assigned Yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Contact your School Admin to assign classes and subjects to your profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((asgn) => {
              const cl = classes.find((c) => c.id === asgn.classId);
              const sub = subjects.find((s) => s.id === asgn.subjectId);

              // Check existing result status for this course
              const courseResults = myResults.filter(
                (r) => r.classId === asgn.classId && r.subjectId === asgn.subjectId
              );
              const hasRejected = courseResults.some((r) => r.status === 'rejected');
              const submittedCount = courseResults.filter(
                (r) => r.status === 'submitted' || r.status === 'approved'
              ).length;

              return (
                <div
                  key={asgn.id}
                  className={`rounded-2xl border p-4 space-y-3 transition-all group ${
                    hasRejected
                      ? 'bg-rose-50/50 border-rose-300 hover:border-rose-500 hover:bg-rose-50'
                      : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded">
                        {cl?.name}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{sub?.name}</h3>
                      <p className="text-[11px] text-slate-500">{sub?.code}</p>
                    </div>

                    {hasRejected ? (
                      <span className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" /> Rejected
                      </span>
                    ) : (
                      <Badge variant={submittedCount > 0 ? 'success' : 'neutral'}>
                        {submittedCount > 0 ? 'Submitted' : 'Pending'}
                      </Badge>
                    )}
                  </div>

                  {hasRejected && (
                    <div className="p-2 bg-rose-100/70 rounded-lg text-[11px] text-rose-900 font-semibold">
                      ⚠️ Returned for correction before approval
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {courseResults.length} student scores
                    </span>
                    <button
                      onClick={() => handleStartEntry(asgn.classId, asgn.subjectId)}
                      className={`flex items-center gap-1 text-xs font-bold cursor-pointer ${
                        hasRejected
                          ? 'text-rose-600 hover:text-rose-800 font-extrabold'
                          : 'text-blue-600 group-hover:text-blue-800'
                      }`}
                    >
                      {hasRejected ? 'Fix & Resubmit' : 'Enter Scores'} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
