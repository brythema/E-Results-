import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { Student, ClassItem, SubjectItem, SubjectResult } from '../../types';
import { ReportCardView } from '../common/ReportCardView';
import { Award, Lock, GraduationCap } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { currentUser, currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const studentId = currentUser?.studentId || 'stu_001';

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [approvedResults, setApprovedResults] = useState<SubjectResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, [schoolId, studentId]);

  const loadStudentData = async () => {
    setLoading(true);
    const [stData, clData, sbData, asgnData] = await Promise.all([
      dbService.getStudentsBySchool(schoolId),
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
    ]);

    setClasses(clData);

    const match = stData.find((s) => s.id === studentId || s.studentId === studentId) || (stData.length > 0 ? stData[0] : null);
    if (match) {
      setStudent(match);
      const classAsgns = asgnData.filter((a) => a.classId === match.currentClassId);
      const studentSubjects = classAsgns.length > 0
        ? sbData.filter((s) => classAsgns.some((a) => a.subjectId === s.id))
        : sbData;
      setSubjects(studentSubjects);

      const results = await dbService.getStudentApprovedResults(schoolId, match.id, match.studentId);
      setApprovedResults(results);
    }
    setLoading(false);
  };

  const activeClass = classes.find((c) => c.id === student?.currentClassId);

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2.5 py-1 rounded-full inline-block mb-2">
              Student Portal
            </span>
            <h1 className="text-xl font-bold tracking-tight">Welcome, {student?.fullName || 'Student'}</h1>
            <p className="text-xs text-slate-300 mt-1">
              View your published report card scores, continuous assessments, and official remarks.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            Read-Only Report
          </div>
        </div>
      </div>

      {student && currentSchool ? (
        <ReportCardView
          school={currentSchool}
          student={student}
          className={activeClass?.name || 'Enrolled Class'}
          subjects={subjects}
          results={approvedResults}
        />
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Student Profile Not Found</h3>
        </div>
      )}
    </div>
  );
};
