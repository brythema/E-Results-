import { Teacher, ClassSubjectAssignment, UserProfile, ClassItem, SubjectItem } from '../types';

/**
 * Returns all matching alias IDs for a given teacher (uid, id, email).
 */
export function getTeacherAliasIds(
  teacherOrUser?: Partial<Teacher> | Partial<UserProfile> | null,
  allTeachers: Teacher[] = []
): string[] {
  if (!teacherOrUser) return [];

  const ids = new Set<string>();

  if (teacherOrUser.uid) {
    ids.add(teacherOrUser.uid);
    ids.add(teacherOrUser.uid.toLowerCase());
  }
  if ((teacherOrUser as any).id) {
    ids.add((teacherOrUser as any).id);
    ids.add((teacherOrUser as any).id.toLowerCase());
  }
  if (teacherOrUser.email) {
    ids.add(teacherOrUser.email);
    ids.add(teacherOrUser.email.toLowerCase());
  }

  // Also lookup in allTeachers list to cross-link uid <-> id <-> email
  allTeachers.forEach((t) => {
    const matches =
      (teacherOrUser.uid && (t.uid === teacherOrUser.uid || t.id === teacherOrUser.uid)) ||
      ((teacherOrUser as any).id && (t.id === (teacherOrUser as any).id || t.uid === (teacherOrUser as any).id)) ||
      (teacherOrUser.email && t.email?.toLowerCase() === teacherOrUser.email?.toLowerCase());

    if (matches) {
      if (t.id) {
        ids.add(t.id);
        ids.add(t.id.toLowerCase());
      }
      if (t.uid) {
        ids.add(t.uid);
        ids.add(t.uid.toLowerCase());
      }
      if (t.email) {
        ids.add(t.email);
        ids.add(t.email.toLowerCase());
      }
    }
  });

  return Array.from(ids);
}

/**
 * Filter assignments to strictly ONLY those explicitly assigned to this teacher.
 */
export function getTeacherAssignments(
  assignments: ClassSubjectAssignment[],
  teacherOrUser?: Partial<Teacher> | Partial<UserProfile> | null,
  allTeachers: Teacher[] = []
): ClassSubjectAssignment[] {
  const aliasIds = getTeacherAliasIds(teacherOrUser, allTeachers);
  if (aliasIds.length === 0) return [];

  const aliasSet = new Set(aliasIds.map((id) => id.toLowerCase()));

  return assignments.filter((a) => {
    if (!a.teacherId) return false;
    return aliasSet.has(a.teacherId.toLowerCase());
  });
}

/**
 * Returns strictly the list of ClassItems where this teacher teaches at least one subject.
 */
export function getTeacherAssignedClasses(
  classes: ClassItem[],
  assignments: ClassSubjectAssignment[],
  teacherOrUser?: Partial<Teacher> | Partial<UserProfile> | null,
  allTeachers: Teacher[] = []
): ClassItem[] {
  const teacherAsgns = getTeacherAssignments(assignments, teacherOrUser, allTeachers);
  const assignedClassIdSet = new Set(teacherAsgns.map((a) => a.classId));
  return classes.filter((c) => assignedClassIdSet.has(c.id));
}

/**
 * Returns strictly the list of SubjectItems assigned to this teacher for a specific class.
 */
export function getTeacherAssignedSubjectsForClass(
  classId: string,
  subjects: SubjectItem[],
  assignments: ClassSubjectAssignment[],
  teacherOrUser?: Partial<Teacher> | Partial<UserProfile> | null,
  allTeachers: Teacher[] = []
): SubjectItem[] {
  const teacherAsgns = getTeacherAssignments(assignments, teacherOrUser, allTeachers);
  const assignedSubjectIdSet = new Set(
    teacherAsgns.filter((a) => a.classId === classId).map((a) => a.subjectId)
  );
  return subjects.filter((s) => assignedSubjectIdSet.has(s.id));
}

/**
 * Verify whether a specific class and subject combination is assigned to this teacher.
 */
export function isCourseAssignedToTeacher(
  classId: string,
  subjectId: string,
  assignments: ClassSubjectAssignment[],
  teacherOrUser?: Partial<Teacher> | Partial<UserProfile> | null,
  allTeachers: Teacher[] = []
): boolean {
  if (!classId || !subjectId) return false;
  const teacherAsgns = getTeacherAssignments(assignments, teacherOrUser, allTeachers);
  return teacherAsgns.some((a) => a.classId === classId && a.subjectId === subjectId);
}
