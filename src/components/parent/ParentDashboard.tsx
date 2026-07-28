import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { Student, ClassItem, SubjectItem, SubjectResult, AdminDirectMessage, Announcement } from '../../types';
import { ReportCardView } from '../common/ReportCardView';
import { StatCard } from '../common/StatCard';
import {
  Users,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Lock,
  Megaphone,
  Mail,
  AlertCircle,
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const { currentUser, currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const parentEmail = currentUser?.email || 'parent@graceville.edu';

  const [childrenList, setChildrenList] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [approvedResults, setApprovedResults] = useState<SubjectResult[]>([]);
  const [directMessages, setDirectMessages] = useState<AdminDirectMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParentData();
  }, [schoolId, parentEmail]);

  const loadParentData = async () => {
    setLoading(true);
    const [stData, clData, sbData, asgnData, dmData, annData] = await Promise.all([
      dbService.getStudentsBySchool(schoolId),
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
      dbService.getAdminDirectMessagesForUser(schoolId, parentEmail),
      dbService.getAnnouncementsForSchool(schoolId),
    ]);

    setClasses(clData);
    setDirectMessages(dmData);
    setAnnouncements(annData);

    // Filter children belonging to this parent email or linked studentId
    const myChildren = stData.filter(
      (s) =>
        s.parentEmail.toLowerCase() === parentEmail.toLowerCase() ||
        s.id === currentUser?.studentId
    );

    setChildrenList(myChildren);

    if (myChildren.length > 0) {
      const first = myChildren[0];
      setSelectedChild(first);
      const classAsgns = asgnData.filter((a) => a.classId === first.currentClassId);
      const childSubjects = classAsgns.length > 0
        ? sbData.filter((s) => classAsgns.some((a) => a.subjectId === s.id))
        : sbData;
      setSubjects(childSubjects);
      loadChildResults(first.id);
    }
    setLoading(false);
  };

  const loadChildResults = async (studentId: string, studentCode?: string) => {
    const child = childrenList.find((s) => s.id === studentId || s.studentId === studentId);
    const code = studentCode || child?.studentId;
    const results = await dbService.getStudentApprovedResults(schoolId, studentId, code);
    setApprovedResults(results);
  };

  const handleSelectChild = async (child: Student) => {
    setSelectedChild(child);
    const [sbData, asgnData] = await Promise.all([
      dbService.getSubjectsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
    ]);
    const classAsgns = asgnData.filter((a) => a.classId === child.currentClassId);
    const childSubjects = classAsgns.length > 0
      ? sbData.filter((s) => classAsgns.some((a) => a.subjectId === s.id))
      : sbData;
    setSubjects(childSubjects);
    loadChildResults(child.id);
  };

  const activeClass = classes.find((c) => c.id === selectedChild?.currentClassId);

  return (
    <div className="space-y-6">
      {/* Parent Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2.5 py-1 rounded-full inline-block mb-2">
              Parent Portal
            </span>
            <h1 className="text-xl font-bold tracking-tight">Parent Academic Portal</h1>
            <p className="text-xs text-slate-300 mt-1">
              Secure access to view your child's published academic progress, continuous assessment scores, and term report card.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            Read-Only Access
          </div>
        </div>
      </div>

      {/* Child Switcher (if multiple children linked) */}
      {childrenList.length > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Ward / Child</p>
          <div className="flex flex-wrap gap-2">
            {childrenList.map((child) => (
              <button
                key={child.id}
                onClick={() => handleSelectChild(child)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedChild?.id === child.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                {child.fullName}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedChild && currentSchool ? (
        <ReportCardView
          school={currentSchool}
          student={selectedChild}
          className={activeClass?.name || 'Class Enrolled'}
          subjects={subjects}
          results={approvedResults}
        />
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Student Linked to Account</h3>
          <p className="text-xs text-slate-500 mt-1">
            Please contact your school administrator to link your parent email ({parentEmail}) to your child's profile.
          </p>
        </div>
      )}
    </div>
  );
};
