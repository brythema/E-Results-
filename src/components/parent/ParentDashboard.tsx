import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import {
  Student,
  SubjectResult,
  ClassItem,
  SubjectItem,
  AdminDirectMessage,
  Announcement,
  Teacher,
  ClassSubjectAssignment,
} from '../../types';
import { ReportCardView } from '../common/ReportCardView';
import {
  GraduationCap,
  MessageSquare,
  Sparkles,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface ParentDashboardProps {
  onNavigateTab?: (tab: string, recipientUid?: string) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onNavigateTab }) => {
  const { currentUser, currentSchool } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';
  const parentEmail = currentUser?.email || 'parent@graceville.edu';

  const [childrenList, setChildrenList] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [approvedResults, setApprovedResults] = useState<SubjectResult[]>([]);
  const [directMessages, setDirectMessages] = useState<AdminDirectMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [childTeachers, setChildTeachers] = useState<
    Array<{ teacher: Teacher; subjects: string[] }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParentData();
  }, [schoolId, parentEmail]);

  const loadParentData = async () => {
    setLoading(true);
    const [stData, clData, sbData, asgnData, dmData, annData, tcData] = await Promise.all([
      dbService.getStudentsBySchool(schoolId),
      dbService.getClassesBySchool(schoolId),
      dbService.getSubjectsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
      dbService.getAdminDirectMessagesForUser(schoolId, parentEmail),
      dbService.getAnnouncementsForSchool(schoolId),
      dbService.getTeachersBySchool(schoolId),
    ]);

    setClasses(clData);
    setTeachers(tcData);
    setAssignments(asgnData);
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
      const childSubjects =
        classAsgns.length > 0
          ? sbData.filter((s) => classAsgns.some((a) => a.subjectId === s.id))
          : sbData;
      setSubjects(childSubjects);
      updateChildTeachers(first.currentClassId, tcData, asgnData, sbData);
      loadChildResults(first.id);
    }
    setLoading(false);
  };

  const updateChildTeachers = (
    classId: string,
    allTeachers: Teacher[],
    allAsgns: ClassSubjectAssignment[],
    allSubjects: SubjectItem[]
  ) => {
    const classAsgns = allAsgns.filter((a) => a.classId === classId);
    const subMap = new Map<string, string>();
    allSubjects.forEach((s) => subMap.set(s.id, s.name));

    const teacherMap = new Map<string, { teacher: Teacher; subjects: Set<string> }>();

    classAsgns.forEach((asgn) => {
      const teacher = allTeachers.find(
        (t) =>
          t.id === asgn.teacherId ||
          t.uid === asgn.teacherId ||
          (t.email && asgn.teacherId && t.email.toLowerCase() === asgn.teacherId.toLowerCase())
      );
      if (teacher) {
        const existing = teacherMap.get(teacher.id) || { teacher, subjects: new Set<string>() };
        const subName = subMap.get(asgn.subjectId);
        if (subName) existing.subjects.add(subName);
        teacherMap.set(teacher.id, existing);
      }
    });

    const result = Array.from(teacherMap.values()).map((v) => ({
      teacher: v.teacher,
      subjects: Array.from(v.subjects),
    }));

    setChildTeachers(result);
  };

  const loadChildResults = async (studentId: string, studentCode?: string) => {
    const child = childrenList.find((s) => s.id === studentId || s.studentId === studentId);
    const code = studentCode || child?.studentId;
    const results = await dbService.getStudentApprovedResults(schoolId, studentId, code);
    setApprovedResults(results);
  };

  const handleSelectChild = async (child: Student) => {
    setSelectedChild(child);
    const [sbData, asgnData, tcData] = await Promise.all([
      dbService.getSubjectsBySchool(schoolId),
      dbService.getClassSubjectAssignments(schoolId),
      dbService.getTeachersBySchool(schoolId),
    ]);
    const classAsgns = asgnData.filter((a) => a.classId === child.currentClassId);
    const childSubjects =
      classAsgns.length > 0
        ? sbData.filter((s) => classAsgns.some((a) => a.subjectId === s.id))
        : sbData;
    setSubjects(childSubjects);
    updateChildTeachers(child.currentClassId, tcData, asgnData, sbData);
    loadChildResults(child.id);
  };

  const activeClass = classes.find((c) => c.id === selectedChild?.currentClassId);

  return (
    <div className="space-y-6">
      {/* Parent Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2.5 py-1 rounded-full inline-block mb-2">
              Parent Portal
            </span>
            <h1 className="text-xl font-bold tracking-tight">Parent Academic Portal</h1>
            <p className="text-xs text-slate-300 mt-1">
              Secure access to view your child's academic progress, report cards, and communicate directly with educators.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab?.('chat')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            Teacher Chat Box
          </button>
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

      {/* Direct Teacher Communication Banner */}
      {selectedChild && childTeachers.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Assigned Subject Teachers for {selectedChild.fullName}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Enrolled in {activeClass?.name || 'Assigned Class'} • Direct academic inquiries
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab?.('chat')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Open All Messages</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {childTeachers.map(({ teacher, subjects: teacherSubs }) => (
              <div
                key={teacher.id}
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {teacher.fullName}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Teacher
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                    <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{teacherSubs.join(', ') || 'Subject Instructor'}</span>
                  </p>
                </div>

                <div className="pt-2.5 mt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                    {teacher.email}
                  </span>
                  <button
                    onClick={() => onNavigateTab?.('chat', teacher.uid || teacher.email)}
                    className="flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Message</span>
                  </button>
                </div>
              </div>
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
