export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'parent' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId?: string;
  phone?: string;
  studentId?: string; // For parent/student linkage
  active: boolean;
  createdAt?: string;
}

export interface AssessmentWeights {
  assignmentMax: number; // default 10
  quizMax: number;       // default 10
  caMax: number;         // default 20
  midTermMax: number;    // default 20
  examMax: number;       // default 40
}

export interface School {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  motto?: string;
  active: boolean;
  subscriptionStatus: 'active' | 'trial' | 'suspended';
  currentSession: string; // e.g., "2025/2026"
  currentTerm: 'First Term' | 'Second Term' | 'Third Term';
  assessmentWeights: AssessmentWeights;
  createdAt: string;
}

export interface Student {
  id: string;
  schoolId: string;
  studentId: string; // Auto-generated ID e.g., STU-2025-001
  admissionNumber: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dob: string;
  photoUrl?: string;
  currentClassId: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface Teacher {
  id: string;
  schoolId: string;
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  qualification?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface ClassItem {
  id: string;
  schoolId: string;
  name: string; // e.g., "Primary 1", "JSS 1 Gold", "SS 2 Science"
  section?: string;
  classTeacherId?: string;
  createdAt?: string;
}

export interface SubjectItem {
  id: string;
  schoolId: string;
  name: string; // e.g., "Mathematics", "English Language"
  code: string; // e.g., "MTH101"
  category?: string;
  createdAt?: string;
}

// Assignment mapping between Class, Subject, and Teacher
export interface ClassSubjectAssignment {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
}

export interface ScoreBreakdown {
  assignment: number;
  quiz: number;
  ca: number;
  midTerm: number;
  exam: number;
}

export interface SubjectResult {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  session: string;
  term: string;
  scores: ScoreBreakdown;
  total: number; // Calculated automatically
  grade: string; // Calculated automatically (A, B, C, D, E, F)
  teacherRemark?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  adminRemark?: string;
  updatedAt: string;
}

export interface ReportCardSummary {
  student: Student;
  className: string;
  school: School;
  results: Array<{
    subjectName: string;
    subjectCode: string;
    scores: ScoreBreakdown;
    total: number;
    grade: string;
    teacherRemark?: string;
  }>;
  overallTotal: number;
  possibleTotal: number;
  average: number;
  percentage: number;
  overallGrade: string;
  totalSubjects: number;
  principalRemark?: string;
}

export function calculateGrade(total: number): { grade: string; remark: string } {
  if (total >= 70) return { grade: 'A', remark: 'Excellent' };
  if (total >= 60) return { grade: 'B', remark: 'Very Good' };
  if (total >= 50) return { grade: 'C', remark: 'Good' };
  if (total >= 45) return { grade: 'D', remark: 'Pass' };
  if (total >= 40) return { grade: 'E', remark: 'Fair' };
  return { grade: 'F', remark: 'Fail' };
}

export interface AppNotification {
  id: string;
  schoolId: string;
  recipientRole: UserRole | 'all';
  recipientId?: string; // user uid, teacher id, or parent email
  title: string;
  message: string;
  type: 'result_rejected' | 'result_submitted' | 'result_approved' | 'announcement' | 'admin_message' | 'chat';
  targetClassId?: string;
  targetSubjectId?: string;
  targetStudentId?: string;
  targetResultId?: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  schoolId: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  recipientUid: string; // teacher uid/id or parent email/id
  recipientName: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  authorName: string;
  priority?: 'normal' | 'important' | 'urgent';
  createdAt: string;
}

export interface AdminDirectMessage {
  id: string;
  schoolId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  content: string;
  senderName: string;
  category: 'fees_reminder' | 'academic' | 'notice';
  read: boolean;
  createdAt: string;
}

