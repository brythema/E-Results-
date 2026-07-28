import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { Student, Teacher, ClassItem, SubjectItem, SubjectResult } from '../../types';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import {
  GraduationCap,
  Users,
  Layers,
  BookOpen,
  FileCheck2,
  Clock,
  ArrowRight,
  Sparkles,
  Award,
} from 'lucide-react';

interface SchoolAdminDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const SchoolAdminDashboard: React.FC<SchoolAdminDashboardProps> = ({ onNavigateTab }) => {
  const { currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [allResults, setAllResults] = useState<SubjectResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    const [stData, tcData, clData, sbData, rsData] = await Promise.all([
      dbService.getStudentsBySchool(schoolId),
      dbService.getTeachersBySchool(schoolId),
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getAllResultsForSchool(schoolId),
    ]);
    setStudents(stData);
    setTeachers(tcData);
    setClasses(clData);
    setSubjects(sbData);
    setAllResults(rsData);
    setLoading(false);
  };

  const pendingResults = allResults.filter((r) => r.status === 'submitted');
  const approvedResults = allResults.filter((r) => r.status === 'approved');

  return (
    <div className="space-y-6">
      {/* School Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-1 rounded-full inline-block mb-2">
              School Administration
            </span>
            <h1 className="text-2xl font-bold tracking-tight">{currentSchool?.name || 'School Dashboard'}</h1>
            <p className="text-xs text-slate-300 mt-1">
              Active Session: <strong className="text-white">{currentSchool?.currentSession}</strong> • Current Term:{' '}
              <strong className="text-white">{currentSchool?.currentTerm}</strong>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onNavigateTab('results_review')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm"
            >
              <FileCheck2 className="w-4 h-4" />
              Review Results ({pendingResults.length})
            </button>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={students.length}
          subtitle="Enrolled active students"
          icon={GraduationCap}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Teaching Staff"
          value={teachers.length}
          subtitle="Assigned teachers"
          icon={Users}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Active Classes"
          value={classes.length}
          subtitle="Streams & arms"
          icon={Layers}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Pending Approval"
          value={pendingResults.length}
          subtitle="Submitted score sheets"
          icon={Clock}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('students')}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group shadow-xs"
        >
          <GraduationCap className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-105 transition-transform" />
          <h3 className="font-bold text-xs text-slate-900">Students Directory</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Manage records & parents</p>
        </button>

        <button
          onClick={() => onNavigateTab('teachers')}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group shadow-xs"
        >
          <Users className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-105 transition-transform" />
          <h3 className="font-bold text-xs text-slate-900">Teacher Assignments</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Assign subjects & classes</p>
        </button>

        <button
          onClick={() => onNavigateTab('classes')}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group shadow-xs"
        >
          <Layers className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-105 transition-transform" />
          <h3 className="font-bold text-xs text-slate-900">Classes & Subjects</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Curriculum structure</p>
        </button>

        <button
          onClick={() => onNavigateTab('results_review')}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group shadow-xs"
        >
          <FileCheck2 className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-105 transition-transform" />
          <h3 className="font-bold text-xs text-slate-900">Result Approvals</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Approve & publish report cards</p>
        </button>
      </div>

      {/* Pending Results Review Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Teacher Submitted Assessment Scores</h2>
            <p className="text-xs text-slate-500">Requires School Admin verification before publication to parents</p>
          </div>
          <button
            onClick={() => onNavigateTab('results_review')}
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Go to Review Queue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingResults.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Award className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-bold text-slate-700">All submitted results are reviewed!</p>
            <p className="text-[11px] text-slate-500 mt-1">There are no pending score submissions awaiting admin approval right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingResults.slice(0, 5).map((r) => {
              const st = students.find((s) => s.id === r.studentId);
              const cl = classes.find((c) => c.id === r.classId);
              const sub = subjects.find((s) => s.id === r.subjectId);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center">
                      {st?.fullName.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{st?.fullName || 'Student'}</p>
                      <p className="text-[11px] text-slate-500">
                        {cl?.name} • <span className="font-medium text-slate-700">{sub?.name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-sm">{r.total} Marks</span>
                      <span className="block text-[10px] text-slate-500">Grade {r.grade}</span>
                    </div>
                    <Badge variant="warning">Submitted</Badge>
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
