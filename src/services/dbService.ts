import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  School,
  UserProfile,
  Student,
  Teacher,
  ClassItem,
  SubjectItem,
  ClassSubjectAssignment,
  SubjectResult,
  calculateGrade,
  AppNotification,
  ChatMessage,
  Announcement,
  AdminDirectMessage,
} from '../types';

// Storage keys for localStorage caching/fallback so app works seamlessly even offline
const LOCAL_STORAGE_KEY = 'e3_school_portal_data_v2';

export interface AppStateData {
  schools: School[];
  users: UserProfile[];
  students: Student[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  assignments: ClassSubjectAssignment[];
  results: SubjectResult[];
  notifications: AppNotification[];
  chatMessages: ChatMessage[];
  announcements: Announcement[];
  adminDirectMessages: AdminDirectMessage[];
}

export const INITIAL_DEMO_DATA: AppStateData = {
  schools: [
    {
      id: 'sch_graceville_01',
      name: 'Graceville International School',
      code: 'GIS-001',
      email: 'info@graceville.edu',
      phone: '+234 802 345 6789',
      address: '15 Academic Close, Victoria Island, Lagos',
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80',
      motto: 'Excellence, Knowledge & Virtue',
      active: true,
      subscriptionStatus: 'active',
      currentSession: '2025/2026',
      currentTerm: 'First Term',
      assessmentWeights: {
        assignmentMax: 10,
        quizMax: 10,
        caMax: 20,
        midTermMax: 20,
        examMax: 40,
      },
      createdAt: '2025-01-10T00:00:00.000Z',
    },
    {
      id: 'sch_st_judes_02',
      name: "St. Jude's College",
      code: 'SJC-002',
      email: 'contact@stjudes.edu',
      phone: '+234 803 987 6543',
      address: '42 Heritage Road, Abuja',
      active: true,
      subscriptionStatus: 'active',
      currentSession: '2025/2026',
      currentTerm: 'First Term',
      assessmentWeights: {
        assignmentMax: 10,
        quizMax: 10,
        caMax: 20,
        midTermMax: 20,
        examMax: 40,
      },
      createdAt: '2025-02-01T00:00:00.000Z',
    },
  ],
  users: [
    {
      uid: 'uid_superadmin_01',
      email: 'admin@e3portal.com',
      fullName: 'E3 Super Admin',
      role: 'super_admin',
      active: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      uid: 'uid_principal_01',
      email: 'principal@graceville.edu',
      fullName: 'Dr. Elizabeth Warren',
      role: 'school_admin',
      schoolId: 'sch_graceville_01',
      phone: '+234 802 111 2222',
      active: true,
      createdAt: '2025-01-10T00:00:00.000Z',
    },
    {
      uid: 'uid_teacher_math',
      email: 'david.o@graceville.edu',
      fullName: 'Mr. David Okafor',
      role: 'teacher',
      schoolId: 'sch_graceville_01',
      phone: '+234 803 333 4444',
      active: true,
      createdAt: '2025-01-12T00:00:00.000Z',
    },
    {
      uid: 'uid_teacher_eng',
      email: 'sarah.j@graceville.edu',
      fullName: 'Mrs. Sarah Jenkins',
      role: 'teacher',
      schoolId: 'sch_graceville_01',
      phone: '+234 804 555 6666',
      active: true,
      createdAt: '2025-01-12T00:00:00.000Z',
    },
    {
      uid: 'uid_parent_alex',
      email: 'parent@graceville.edu',
      fullName: 'Mrs. Clara Morgan',
      role: 'parent',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_001',
      phone: '+234 801 234 5678',
      active: true,
      createdAt: '2025-01-15T00:00:00.000Z',
    },
    {
      uid: 'uid_student_alex',
      email: 'alex.morgan@student.graceville.edu',
      fullName: 'Alex Morgan',
      role: 'student',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_001',
      active: true,
      createdAt: '2025-01-15T00:00:00.000Z',
    },
  ],
  classes: [
    { id: 'cls_pri4a', schoolId: 'sch_graceville_01', name: 'Primary 4 Alpha', section: 'Primary', classTeacherId: 'uid_teacher_math' },
    { id: 'cls_pri5b', schoolId: 'sch_graceville_01', name: 'Primary 5 Beta', section: 'Primary', classTeacherId: 'uid_teacher_eng' },
    { id: 'cls_jss1a', schoolId: 'sch_graceville_01', name: 'JSS 1 Excellence', section: 'Secondary' },
  ],
  subjects: [
    { id: 'sub_mth', schoolId: 'sch_graceville_01', name: 'Mathematics', code: 'MTH101', category: 'Sciences' },
    { id: 'sub_eng', schoolId: 'sch_graceville_01', name: 'English Language', code: 'ENG101', category: 'Languages' },
    { id: 'sub_sci', schoolId: 'sch_graceville_01', name: 'Basic Science', code: 'SCI101', category: 'Sciences' },
    { id: 'sub_soc', schoolId: 'sch_graceville_01', name: 'Social Studies', code: 'SOC101', category: 'Humanities' },
    { id: 'sub_tec', schoolId: 'sch_graceville_01', name: 'Basic Technology', code: 'TEC101', category: 'Technology' },
  ],
  teachers: [
    { id: 'tch_01', schoolId: 'sch_graceville_01', uid: 'uid_teacher_math', fullName: 'Mr. David Okafor', email: 'david.o@graceville.edu', phone: '+234 803 333 4444', qualification: 'B.Sc. Ed Mathematics', status: 'active' },
    { id: 'tch_02', schoolId: 'sch_graceville_01', uid: 'uid_teacher_eng', fullName: 'Mrs. Sarah Jenkins', email: 'sarah.j@graceville.edu', phone: '+234 804 555 6666', qualification: 'B.A. English Studies', status: 'active' },
    { id: 'tch_03', schoolId: 'sch_graceville_01', fullName: 'Mr. Emmanuel Davies', email: 'emmanuel.d@graceville.edu', phone: '+234 805 777 8888', qualification: 'B.Tech Physics', status: 'active' },
  ],
  assignments: [
    // Method 2: Subject teachers for Primary 4 Alpha
    { id: 'asgn_01', schoolId: 'sch_graceville_01', classId: 'cls_pri4a', subjectId: 'sub_mth', teacherId: 'uid_teacher_math' },
    { id: 'asgn_02', schoolId: 'sch_graceville_01', classId: 'cls_pri4a', subjectId: 'sub_eng', teacherId: 'uid_teacher_eng' },
    { id: 'asgn_03', schoolId: 'sch_graceville_01', classId: 'cls_pri4a', subjectId: 'sub_sci', teacherId: 'uid_teacher_math' },
    { id: 'asgn_04', schoolId: 'sch_graceville_01', classId: 'cls_pri4a', subjectId: 'sub_soc', teacherId: 'uid_teacher_eng' },
    { id: 'asgn_05', schoolId: 'sch_graceville_01', classId: 'cls_pri4a', subjectId: 'sub_tec', teacherId: 'uid_teacher_math' },
  ],
  students: [
    {
      id: 'stu_001',
      schoolId: 'sch_graceville_01',
      studentId: 'STU-2025-001',
      admissionNumber: 'GIS/2025/041',
      fullName: 'Alex Morgan',
      gender: 'Male',
      dob: '2015-05-14',
      photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80',
      currentClassId: 'cls_pri4a',
      parentName: 'Mrs. Clara Morgan',
      parentEmail: 'parent@graceville.edu',
      parentPhone: '+234 801 234 5678',
      status: 'active',
    },
    {
      id: 'stu_002',
      schoolId: 'sch_graceville_01',
      studentId: 'STU-2025-002',
      admissionNumber: 'GIS/2025/042',
      fullName: 'Sophia Chen',
      gender: 'Female',
      dob: '2015-08-22',
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      currentClassId: 'cls_pri4a',
      parentName: 'Mr. David Chen',
      parentEmail: 'chen.parent@graceville.edu',
      parentPhone: '+234 802 999 0000',
      status: 'active',
    },
    {
      id: 'stu_003',
      schoolId: 'sch_graceville_01',
      studentId: 'STU-2025-003',
      admissionNumber: 'GIS/2025/043',
      fullName: 'Daniel Kalu',
      gender: 'Male',
      dob: '2015-02-10',
      photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
      currentClassId: 'cls_pri4a',
      parentName: 'Dr. Joseph Kalu',
      parentEmail: 'kalu.parent@graceville.edu',
      parentPhone: '+234 803 111 9999',
      status: 'active',
    },
    {
      id: 'stu_004',
      schoolId: 'sch_graceville_01',
      studentId: 'STU-2025-004',
      admissionNumber: 'GIS/2025/044',
      fullName: 'Grace Davies',
      gender: 'Female',
      dob: '2015-11-30',
      currentClassId: 'cls_pri4a',
      parentName: 'Mr. Samuel Davies',
      parentEmail: 'davies.parent@graceville.edu',
      parentPhone: '+234 804 222 8888',
      status: 'active',
    },
  ],
  results: [
    // Mathematics results (Approved)
    {
      id: 'res_001_mth',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_001',
      classId: 'cls_pri4a',
      subjectId: 'sub_mth',
      teacherId: 'uid_teacher_math',
      session: '2025/2026',
      term: 'First Term',
      scores: { assignment: 9, quiz: 8, ca: 18, midTerm: 17, exam: 36 },
      total: 88,
      grade: 'A',
      teacherRemark: 'Outstanding mathematical reasoning and problem-solving skills.',
      status: 'approved',
      updatedAt: '2025-02-10T10:00:00.000Z',
    },
    {
      id: 'res_002_mth',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_002',
      classId: 'cls_pri4a',
      subjectId: 'sub_mth',
      teacherId: 'uid_teacher_math',
      session: '2025/2026',
      term: 'First Term',
      scores: { assignment: 8, quiz: 9, ca: 16, midTerm: 15, exam: 34 },
      total: 82,
      grade: 'A',
      teacherRemark: 'Very thorough and neat work throughout the term.',
      status: 'approved',
      updatedAt: '2025-02-10T10:00:00.000Z',
    },
    {
      id: 'res_003_mth',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_003',
      classId: 'cls_pri4a',
      subjectId: 'sub_mth',
      teacherId: 'uid_teacher_math',
      session: '2025/2026',
      term: 'First Term',
      scores: { assignment: 7, quiz: 7, ca: 14, midTerm: 12, exam: 28 },
      total: 68,
      grade: 'B',
      teacherRemark: 'Good effort, can improve with more practice in algebra.',
      status: 'approved',
      updatedAt: '2025-02-10T10:00:00.000Z',
    },
    {
      id: 'res_004_mth',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_004',
      classId: 'cls_pri4a',
      subjectId: 'sub_mth',
      teacherId: 'uid_teacher_math',
      session: '2025/2026',
      term: 'First Term',
      scores: { assignment: 8, quiz: 6, ca: 15, midTerm: 14, exam: 31 },
      total: 74,
      grade: 'A',
      teacherRemark: 'Consistent effort shown.',
      status: 'approved',
      updatedAt: '2025-02-10T10:00:00.000Z',
    },

    // English Language results (Approved)
    {
      id: 'res_001_eng',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_001',
      classId: 'cls_pri4a',
      subjectId: 'sub_eng',
      teacherId: 'uid_teacher_eng',
      session: '2025/2026',
      term: 'First Term',
      scores: { assignment: 10, quiz: 9, ca: 19, midTerm: 18, exam: 37 },
      total: 93,
      grade: 'A',
      teacherRemark: 'Exemplary reading comprehension and creative writing.',
      status: 'approved',
      updatedAt: '2025-02-11T11:00:00.000Z',
    },
    {
      id: 'res_002_eng',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_002',
      classId: 'cls_pri4a',
      subjectId: 'sub_eng',
      teacherId: 'uid_teacher_eng',
      session: '2025/2026',
      term: 'First Term',
      scores: { assignment: 8, quiz: 8, ca: 16, midTerm: 15, exam: 31 },
      total: 78,
      grade: 'A',
      teacherRemark: 'Strong vocabulary and grammar.',
      status: 'approved',
      updatedAt: '2025-02-11T11:00:00.000Z',
    },

    // Basic Science results (Submitted - Pending School Admin Review)
    {
      id: 'res_001_sci',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_001',
      classId: 'cls_pri4a',
      subjectId: 'sub_sci',
      teacherId: 'uid_teacher_math',
      session: '2025/2026',
      term: 'First Term',
      scores: { assignment: 9, quiz: 8, ca: 17, midTerm: 16, exam: 35 },
      total: 85,
      grade: 'A',
      teacherRemark: 'Keen observer in experiments.',
      status: 'submitted',
      updatedAt: '2025-02-12T09:00:00.000Z',
    },
    {
      id: 'res_002_sci',
      schoolId: 'sch_graceville_01',
      studentId: 'stu_002',
      classId: 'cls_pri4a',
      subjectId: 'sub_sci',
      teacherId: 'uid_teacher_math',
      session: '2025/2026',
      term: 'First Term',
      scores: { assignment: 7, quiz: 8, ca: 15, midTerm: 14, exam: 30 },
      total: 74,
      grade: 'A',
      teacherRemark: 'Good grasp of scientific concepts.',
      status: 'submitted',
      updatedAt: '2025-02-12T09:00:00.000Z',
    },
  ],
  notifications: [
    {
      id: 'notif_001',
      schoolId: 'sch_graceville_01',
      recipientRole: 'teacher',
      recipientId: 'uid_teacher_math',
      title: 'Result Returned for Correction',
      message: 'Admin returned Mathematics scores for Primary 4 Gold for review: "Please double check exam score entries for Alex Morgan". Click to edit now.',
      type: 'result_rejected',
      targetClassId: 'cls_pri4a',
      targetSubjectId: 'sub_mth',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif_002',
      schoolId: 'sch_graceville_01',
      recipientRole: 'parent',
      recipientId: 'parent@graceville.edu',
      title: 'First Term Report Card Ready',
      message: 'The First Term academic performance report for Alex Morgan has been approved and published.',
      type: 'result_approved',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif_003',
      schoolId: 'sch_graceville_01',
      recipientRole: 'all',
      title: 'New Announcement: Inter-House Sports Competition',
      message: 'Graceville International School will host the annual Inter-House Sports competition next month.',
      type: 'announcement',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ],
  chatMessages: [
    {
      id: 'chat_001',
      schoolId: 'sch_graceville_01',
      senderUid: 'parent@graceville.edu',
      senderName: 'Mrs. Clara Morgan',
      senderRole: 'parent',
      recipientUid: 'uid_teacher_math',
      recipientName: 'Mr. David Okafor',
      message: 'Hello Mr. David! I wanted to inquire about Alex\'s progress in Mathematics.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      read: true,
    },
    {
      id: 'chat_002',
      schoolId: 'sch_graceville_01',
      senderUid: 'uid_teacher_math',
      senderName: 'Mr. David Okafor',
      senderRole: 'teacher',
      recipientUid: 'parent@graceville.edu',
      recipientName: 'Mrs. Clara Morgan',
      message: 'Good day Mrs. Morgan! Alex is performing brilliantly, especially in problem solving and mental math.',
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      read: true,
    },
  ],
  announcements: [
    {
      id: 'ann_001',
      schoolId: 'sch_graceville_01',
      title: 'Welcome to First Term 2025/2026 Academic Session',
      content: 'We welcome all parents, teachers, and students to a new term filled with excellence. Please ensure all student details are updated with the administration.',
      authorName: 'School Principal',
      priority: 'important',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
    {
      id: 'ann_002',
      schoolId: 'sch_graceville_01',
      title: 'Mid-Term Break Announcement',
      content: 'The mid-term break will commence on Friday, November 14th. Academic activities resume on Monday, November 17th.',
      authorName: 'School Administrator',
      priority: 'normal',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
  adminDirectMessages: [
    {
      id: 'adm_msg_001',
      schoolId: 'sch_graceville_01',
      recipientEmail: 'parent@graceville.edu',
      recipientName: 'Mrs. Clara Morgan',
      subject: 'School Fees Payment Reminder - First Term',
      content: 'Dear Mrs. Clara Morgan,\n\nThis is a friendly reminder that the outstanding First Term tuition fee for Alex Morgan is due by November 30th. Kindly ignore this notice if payment has already been completed.\n\nThank you,\nFinance Office, Graceville International School',
      senderName: 'Finance Administrator',
      category: 'fees_reminder',
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
  ],
};

// Helper to get local cache
function getLocalStore(): AppStateData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
      return INITIAL_DEMO_DATA;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.notifications) parsed.notifications = INITIAL_DEMO_DATA.notifications;
    if (!parsed.chatMessages) parsed.chatMessages = INITIAL_DEMO_DATA.chatMessages;
    if (!parsed.announcements) parsed.announcements = INITIAL_DEMO_DATA.announcements;
    if (!parsed.adminDirectMessages) parsed.adminDirectMessages = INITIAL_DEMO_DATA.adminDirectMessages;
    return parsed;
  } catch (err) {
    console.error('Error reading local data cache', err);
    return INITIAL_DEMO_DATA;
  }
}

function saveLocalStore(data: AppStateData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving local data cache', err);
  }
}

// Helper to enforce a fast timeout for Firestore network operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore operation timeout')), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

// Database Service with Firestore & Local fallback
export const dbService = {
  // Sync seed data to Firestore if empty or on init
  async initializeDatabase(): Promise<void> {
    try {
      // Check if school exists in firestore with 2s timeout
      const schSnap = await withTimeout(getDocs(collection(db, 'schools')), 2000);
      if (schSnap.empty) {
        console.log('Seeding initial Firestore database...');
        // Write schools
        for (const s of INITIAL_DEMO_DATA.schools) {
          await withTimeout(setDoc(doc(db, 'schools', s.id), s), 2000);
        }
        // Write users
        for (const u of INITIAL_DEMO_DATA.users) {
          await withTimeout(setDoc(doc(db, 'users', u.uid), u), 2000);
        }
        // Write classes
        for (const c of INITIAL_DEMO_DATA.classes) {
          await withTimeout(setDoc(doc(db, 'classes', c.id), c), 2000);
        }
        // Write subjects
        for (const sub of INITIAL_DEMO_DATA.subjects) {
          await withTimeout(setDoc(doc(db, 'subjects', sub.id), sub), 2000);
        }
        // Write teachers
        for (const t of INITIAL_DEMO_DATA.teachers) {
          await withTimeout(setDoc(doc(db, 'teachers', t.id), t), 2000);
        }
        // Write assignments
        for (const a of INITIAL_DEMO_DATA.assignments) {
          await withTimeout(setDoc(doc(db, 'assignments', a.id), a), 2000);
        }
        // Write students
        for (const st of INITIAL_DEMO_DATA.students) {
          await withTimeout(setDoc(doc(db, 'students', st.id), st), 2000);
        }
        // Write results
        for (const r of INITIAL_DEMO_DATA.results) {
          await withTimeout(setDoc(doc(db, 'results', r.id), r), 2000);
        }
        console.log('Firestore seed completed successfully!');
      }
    } catch (err) {
      console.warn('Firestore offline/unavailable, using local store fallback:', err);
    }
  },

  // SCHOOLS
  async getAllSchools(): Promise<School[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'schools')), 2000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as School);
      }
    } catch (err) {
      console.warn('Firestore fetch failed, using local fallback:', err);
    }
    return getLocalStore().schools;
  },

  async getSchoolById(schoolId: string): Promise<School | null> {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'schools', schoolId)), 2000);
      if (snap.exists()) return snap.data() as School;
    } catch (err) {
      console.warn('Firestore error:', err);
    }
    const store = getLocalStore();
    return store.schools.find((s) => s.id === schoolId) || null;
  },

  async createSchool(schoolData: Omit<School, 'id' | 'createdAt'>): Promise<School> {
    const newSchool: School = {
      ...schoolData,
      id: `sch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    try {
      await withTimeout(setDoc(doc(db, 'schools', newSchool.id), newSchool), 2000);
    } catch (err) {
      console.warn('Firestore create error:', err);
    }
    const store = getLocalStore();
    store.schools.push(newSchool);
    saveLocalStore(store);
    return newSchool;
  },

  async updateSchoolStatus(schoolId: string, active: boolean, subscriptionStatus?: 'active' | 'trial' | 'suspended'): Promise<void> {
    const updatePayload: Partial<School> = { active };
    if (subscriptionStatus) updatePayload.subscriptionStatus = subscriptionStatus;

    try {
      await withTimeout(updateDoc(doc(db, 'schools', schoolId), updatePayload), 2000);
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
    const store = getLocalStore();
    const idx = store.schools.findIndex((s) => s.id === schoolId);
    if (idx !== -1) {
      store.schools[idx] = { ...store.schools[idx], ...updatePayload };
      saveLocalStore(store);
    }
  },

  async updateSchoolSettings(schoolId: string, updates: Partial<School>): Promise<void> {
    try {
      await withTimeout(updateDoc(doc(db, 'schools', schoolId), updates), 2000);
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
    const store = getLocalStore();
    const idx = store.schools.findIndex((s) => s.id === schoolId);
    if (idx !== -1) {
      store.schools[idx] = { ...store.schools[idx], ...updates };
      saveLocalStore(store);
    }
  },

  // USER PROFILES
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'users', uid)), 2000);
      if (snap.exists()) return snap.data() as UserProfile;
    } catch (err) {
      console.warn('Firestore user fetch error:', err);
    }
    const store = getLocalStore();
    return store.users.find((u) => u.uid === uid) || null;
  },

  async setUserProfile(user: UserProfile): Promise<void> {
    try {
      await withTimeout(setDoc(doc(db, 'users', user.uid), user), 2000);
    } catch (err) {
      console.warn('Firestore set user error:', err);
    }
    const store = getLocalStore();
    const idx = store.users.findIndex((u) => u.uid === user.uid);
    if (idx !== -1) {
      store.users[idx] = user;
    } else {
      store.users.push(user);
    }
    saveLocalStore(store);
  },

  // STUDENTS
  async getStudentsBySchool(schoolId: string): Promise<Student[]> {
    try {
      const q = query(collection(db, 'students'), where('schoolId', '==', schoolId));
      const snap = await withTimeout(getDocs(q), 2000);
      if (!snap.empty) return snap.docs.map((d) => d.data() as Student);
    } catch (err) {
      console.warn('Firestore students error:', err);
    }
    return getLocalStore().students.filter((s) => s.schoolId === schoolId);
  },

  async addStudent(studentData: Omit<Student, 'id' | 'studentId' | 'createdAt'>): Promise<Student> {
    const store = getLocalStore();
    const count = store.students.filter((s) => s.schoolId === studentData.schoolId).length + 1;
    const year = new Date().getFullYear();
    const formattedCount = String(count).padStart(3, '0');
    
    const newStudent: Student = {
      ...studentData,
      id: `stu_${Date.now()}`,
      studentId: `STU-${year}-${formattedCount}`,
      createdAt: new Date().toISOString(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'students', newStudent.id), newStudent), 2000);
    } catch (err) {
      console.warn('Firestore error:', err);
    }

    store.students.push(newStudent);

    // Also auto-create parent user entry if parent email specified
    if (studentData.parentEmail) {
      const parentUser: UserProfile = {
        uid: `uid_parent_${newStudent.id}`,
        email: studentData.parentEmail,
        fullName: studentData.parentName || 'Parent',
        role: 'parent',
        schoolId: studentData.schoolId,
        studentId: newStudent.id,
        phone: studentData.parentPhone,
        active: true,
      };
      store.users.push(parentUser);
      try {
        await withTimeout(setDoc(doc(db, 'users', parentUser.uid), parentUser), 2000);
      } catch (e) {
        /* ignore */
      }
    }

    saveLocalStore(store);
    return newStudent;
  },

  async updateStudent(studentId: string, updates: Partial<Student>): Promise<void> {
    try {
      await withTimeout(updateDoc(doc(db, 'students', studentId), updates), 2000);
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
    const store = getLocalStore();
    const idx = store.students.findIndex((s) => s.id === studentId);
    if (idx !== -1) {
      store.students[idx] = { ...store.students[idx], ...updates };
      saveLocalStore(store);
    }
  },

  async deleteStudent(studentId: string): Promise<void> {
    try {
      await withTimeout(deleteDoc(doc(db, 'students', studentId)), 2000);
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
    const store = getLocalStore();
    store.students = store.students.filter((s) => s.id !== studentId);
    saveLocalStore(store);
  },

  // TEACHERS
  async getTeachersBySchool(schoolId: string): Promise<Teacher[]> {
    try {
      const q = query(collection(db, 'teachers'), where('schoolId', '==', schoolId));
      const snap = await withTimeout(getDocs(q), 2000);
      if (!snap.empty) return snap.docs.map((d) => d.data() as Teacher);
    } catch (err) {
      console.warn('Firestore error:', err);
    }
    return getLocalStore().teachers.filter((t) => t.schoolId === schoolId);
  },

  async addTeacher(teacherData: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const newTeacher: Teacher = {
      ...teacherData,
      id: `tch_${Date.now()}`,
      uid: teacherData.uid || `uid_teacher_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'teachers', newTeacher.id), newTeacher), 2000);
    } catch (err) {
      console.warn('Firestore error:', err);
    }

    const store = getLocalStore();
    store.teachers.push(newTeacher);

    // Also ensure user profile exists for teacher login
    const teacherUser: UserProfile = {
      uid: newTeacher.uid!,
      email: newTeacher.email,
      fullName: newTeacher.fullName,
      role: 'teacher',
      schoolId: newTeacher.schoolId,
      phone: newTeacher.phone,
      active: true,
    };
    store.users.push(teacherUser);
    try {
      await withTimeout(setDoc(doc(db, 'users', teacherUser.uid), teacherUser), 2000);
    } catch (e) {
      /* ignore */
    }

    saveLocalStore(store);
    return newTeacher;
  },

  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<void> {
    try {
      await withTimeout(updateDoc(doc(db, 'teachers', teacherId), updates), 2000);
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
    const store = getLocalStore();
    const idx = store.teachers.findIndex((t) => t.id === teacherId);
    if (idx !== -1) {
      store.teachers[idx] = { ...store.teachers[idx], ...updates };
      saveLocalStore(store);
    }
  },

  async deleteTeacher(teacherId: string): Promise<void> {
    try {
      await withTimeout(deleteDoc(doc(db, 'teachers', teacherId)), 2000);
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
    const store = getLocalStore();
    store.teachers = store.teachers.filter((t) => t.id !== teacherId);
    saveLocalStore(store);
  },

  // CLASSES
  async getClassesBySchool(schoolId: string): Promise<ClassItem[]> {
    try {
      const q = query(collection(db, 'classes'), where('schoolId', '==', schoolId));
      const snap = await withTimeout(getDocs(q), 2000);
      if (!snap.empty) return snap.docs.map((d) => d.data() as ClassItem);
    } catch (err) {
      console.warn('Firestore error:', err);
    }
    return getLocalStore().classes.filter((c) => c.schoolId === schoolId);
  },

  async addClass(classData: Omit<ClassItem, 'id' | 'createdAt'>): Promise<ClassItem> {
    const newClass: ClassItem = {
      ...classData,
      id: `cls_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    try {
      await withTimeout(setDoc(doc(db, 'classes', newClass.id), newClass), 2000);
    } catch (err) {
      console.warn('Firestore error:', err);
    }
    const store = getLocalStore();
    store.classes.push(newClass);
    saveLocalStore(store);
    return newClass;
  },

  async updateClass(classId: string, updates: Partial<ClassItem>): Promise<void> {
    try {
      await withTimeout(updateDoc(doc(db, 'classes', classId), updates), 2000);
    } catch (err) {
      console.warn('Firestore error:', err);
    }
    const store = getLocalStore();
    const idx = store.classes.findIndex((c) => c.id === classId);
    if (idx !== -1) {
      store.classes[idx] = { ...store.classes[idx], ...updates };
      saveLocalStore(store);
    }
  },

  async deleteClass(classId: string): Promise<void> {
    try {
      await withTimeout(deleteDoc(doc(db, 'classes', classId)), 2000);
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
    const store = getLocalStore();
    store.classes = store.classes.filter((c) => c.id !== classId);
    saveLocalStore(store);
  },

  // SUBJECTS
  async getSubjectsBySchool(schoolId: string): Promise<SubjectItem[]> {
    try {
      const q = query(collection(db, 'subjects'), where('schoolId', '==', schoolId));
      const snap = await withTimeout(getDocs(q), 2000);
      if (!snap.empty) return snap.docs.map((d) => d.data() as SubjectItem);
    } catch (err) {
      console.warn('Firestore error:', err);
    }
    return getLocalStore().subjects.filter((s) => s.schoolId === schoolId);
  },

  async addSubject(subjectData: Omit<SubjectItem, 'id' | 'createdAt'>): Promise<SubjectItem> {
    const newSubject: SubjectItem = {
      ...subjectData,
      id: `sub_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    try {
      await withTimeout(setDoc(doc(db, 'subjects', newSubject.id), newSubject), 2000);
    } catch (err) {
      console.warn('Firestore error:', err);
    }
    const store = getLocalStore();
    store.subjects.push(newSubject);
    saveLocalStore(store);
    return newSubject;
  },

  async updateSubject(subjectId: string, updates: Partial<SubjectItem>): Promise<void> {
    try {
      await withTimeout(updateDoc(doc(db, 'subjects', subjectId), updates), 2000);
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
    const store = getLocalStore();
    const idx = store.subjects.findIndex((s) => s.id === subjectId);
    if (idx !== -1) {
      store.subjects[idx] = { ...store.subjects[idx], ...updates };
      saveLocalStore(store);
    }
  },

  async deleteSubject(subjectId: string): Promise<void> {
    try {
      await withTimeout(deleteDoc(doc(db, 'subjects', subjectId)), 2000);
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
    const store = getLocalStore();
    store.subjects = store.subjects.filter((s) => s.id !== subjectId);
    saveLocalStore(store);
  },

  // CLASS-SUBJECT ASSIGNMENTS
  async getClassSubjectAssignments(schoolId: string): Promise<ClassSubjectAssignment[]> {
    try {
      const q = query(collection(db, 'assignments'), where('schoolId', '==', schoolId));
      const snap = await withTimeout(getDocs(q), 2000);
      if (!snap.empty) return snap.docs.map((d) => d.data() as ClassSubjectAssignment);
    } catch (err) {
      console.warn('Firestore assignments error:', err);
    }
    return getLocalStore().assignments.filter((a) => a.schoolId === schoolId);
  },

  async assignTeacherToClassSubject(schoolId: string, classId: string, subjectId: string, teacherId: string): Promise<void> {
    const store = getLocalStore();
    const existing = store.assignments.find((a) => a.schoolId === schoolId && a.classId === classId && a.subjectId === subjectId);
    
    if (existing) {
      existing.teacherId = teacherId;
      try {
        await withTimeout(updateDoc(doc(db, 'assignments', existing.id), { teacherId }), 2000);
      } catch (e) {
        /* ignore */
      }
    } else {
      const newAsgn: ClassSubjectAssignment = {
        id: `asgn_${Date.now()}`,
        schoolId,
        classId,
        subjectId,
        teacherId,
      };
      store.assignments.push(newAsgn);
      try {
        await withTimeout(setDoc(doc(db, 'assignments', newAsgn.id), newAsgn), 2000);
      } catch (e) {
        /* ignore */
      }
    }
    saveLocalStore(store);
  },

  // RESULTS & ASSESSMENT
  async getResultsByClassAndSubject(schoolId: string, classId: string, subjectId: string): Promise<SubjectResult[]> {
    const localStore = getLocalStore();
    const localResults = localStore.results.filter(
      (r) => r.schoolId === schoolId && (r.classId === classId || !classId) && r.subjectId === subjectId
    );

    const mergedMap = new Map<string, SubjectResult>();
    localResults.forEach((r) => {
      const key = r.id || `${r.studentId}_${r.subjectId}`;
      mergedMap.set(key, r);
    });

    try {
      const q = query(
        collection(db, 'results'),
        where('schoolId', '==', schoolId),
        where('subjectId', '==', subjectId)
      );
      const snap = await withTimeout(getDocs(q), 2000);
      if (!snap.empty) {
        const firestoreResults = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubjectResult) }));
        firestoreResults.forEach((r) => {
          const key = r.id || `${r.studentId}_${r.subjectId}`;
          const existing = mergedMap.get(key);
          if (!existing || new Date(r.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
            mergedMap.set(key, r);
          }
        });
      }
    } catch (err) {
      console.warn('Firestore results error:', err);
    }

    return Array.from(mergedMap.values());
  },

  async saveResultsBatch(resultsList: Partial<SubjectResult>[]): Promise<void> {
    const store = getLocalStore();
    for (const item of resultsList) {
      const total =
        (item.scores?.assignment || 0) +
        (item.scores?.quiz || 0) +
        (item.scores?.ca || 0) +
        (item.scores?.midTerm || 0) +
        (item.scores?.exam || 0);

      const { grade } = calculateGrade(total);

      const existingIndex = store.results.findIndex(
        (r) =>
          (item.id && r.id === item.id) ||
          (r.schoolId === item.schoolId &&
            r.studentId === item.studentId &&
            r.subjectId === item.subjectId)
      );

      const existingRecord = existingIndex !== -1 ? store.results[existingIndex] : null;

      const record: SubjectResult = {
        id: item.id || existingRecord?.id || `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${item.studentId}`,
        schoolId: item.schoolId!,
        studentId: item.studentId!,
        classId: item.classId!,
        subjectId: item.subjectId!,
        teacherId: item.teacherId || existingRecord?.teacherId || '',
        session: item.session || existingRecord?.session || '2025/2026',
        term: item.term || existingRecord?.term || 'First Term',
        scores: item.scores || existingRecord?.scores || { assignment: 0, quiz: 0, ca: 0, midTerm: 0, exam: 0 },
        total,
        grade,
        teacherRemark: item.teacherRemark !== undefined ? item.teacherRemark : (existingRecord?.teacherRemark || ''),
        status: item.status || existingRecord?.status || 'draft',
        adminRemark: item.adminRemark !== undefined ? item.adminRemark : (existingRecord?.adminRemark || ''),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        store.results[existingIndex] = record;
      } else {
        store.results.push(record);
      }

      try {
        await withTimeout(setDoc(doc(db, 'results', record.id), record), 2000);
      } catch (e) {
        console.warn('Firestore set doc error:', e);
      }
    }
    saveLocalStore(store);
  },

  async updateResultStatus(resultIds: string[], status: 'approved' | 'rejected' | 'submitted', adminRemark?: string): Promise<void> {
    const store = getLocalStore();

    let schoolResults: SubjectResult[] = [];
    try {
      if (store.results.length > 0) {
        schoolResults = [...store.results];
      } else if (resultIds.length > 0) {
        const q = query(collection(db, 'results'));
        const snap = await withTimeout(getDocs(q), 2000);
        if (!snap.empty) {
          schoolResults = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubjectResult) }));
        }
      }
    } catch (e) {
      console.warn('updateResultStatus fetch error:', e);
    }

    for (const id of resultIds) {
      if (!id) continue;

      let idx = store.results.findIndex((r) => r.id === id);
      if (idx === -1) {
        idx = store.results.findIndex((r) => `${r.studentId}_${r.subjectId}` === id);
      }

      let res: SubjectResult | null = idx !== -1 ? store.results[idx] : null;

      if (!res) {
        res = schoolResults.find((r) => r.id === id || `${r.studentId}_${r.subjectId}` === id) || null;
      }

      if (!res) {
        try {
          const docSnap = await withTimeout(getDoc(doc(db, 'results', id)), 2000);
          if (docSnap && docSnap.exists()) {
            res = { id: docSnap.id, ...(docSnap.data() as SubjectResult) };
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (res) {
        res.status = status;
        if (adminRemark !== undefined) res.adminRemark = adminRemark;
        res.updatedAt = new Date().toISOString();

        if (idx !== -1) {
          store.results[idx] = res;
        } else {
          const existingInStore = store.results.findIndex((r) => r.id === res!.id);
          if (existingInStore !== -1) {
            store.results[existingInStore] = res;
          } else {
            store.results.push(res);
          }
        }

        const student = store.students.find((s) => s.id === res!.studentId);
        const subject = store.subjects.find((sub) => sub.id === res!.subjectId);
        const studentName = student ? student.fullName : 'Student';
        const subjectName = subject ? subject.name : 'Subject';

        try {
          await withTimeout(setDoc(doc(db, 'results', res.id), res), 2000);
        } catch (e) {
          console.warn('Firestore setDoc error in updateResultStatus:', e);
        }

        // Automatic Notifications based on status change
        if (status === 'rejected') {
          const teacherNotif: AppNotification = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            schoolId: res.schoolId,
            recipientRole: 'teacher',
            recipientId: res.teacherId,
            title: `Result Returned: ${subjectName} (${studentName})`,
            message: `Admin returned result for ${studentName} in ${subjectName}: "${adminRemark || 'Needs revision'}".`,
            type: 'result_rejected',
            targetClassId: res.classId,
            targetSubjectId: res.subjectId,
            targetStudentId: res.studentId,
            targetResultId: res.id,
            read: false,
            createdAt: new Date().toISOString(),
          };
          store.notifications.unshift(teacherNotif);
        } else if (status === 'approved') {
          const parentNotif: AppNotification = {
            id: 'notif_p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            schoolId: res.schoolId,
            recipientRole: 'parent',
            recipientId: student?.parentEmail || student?.id,
            title: `Result Approved: ${subjectName} (${studentName})`,
            message: `Assessment result for ${studentName} in ${subjectName} has been approved and published.`,
            type: 'result_approved',
            targetClassId: res.classId,
            targetSubjectId: res.subjectId,
            targetStudentId: res.studentId,
            targetResultId: res.id,
            read: false,
            createdAt: new Date().toISOString(),
          };
          store.notifications.unshift(parentNotif);
        }
      }
    }
    saveLocalStore(store);
  },

  // PARENT & STUDENT REPORT CARDS
  async getStudentApprovedResults(schoolId: string, studentId: string, studentCode?: string): Promise<SubjectResult[]> {
    const localStore = getLocalStore();
    const isStudentMatch = (r: SubjectResult) =>
      (!r.schoolId || r.schoolId === schoolId) &&
      (r.studentId === studentId || (studentCode ? r.studentId === studentCode : false)) &&
      (r.status === 'approved' || r.status === 'submitted');

    const localResults = localStore.results.filter(isStudentMatch);
    const mergedMap = new Map<string, SubjectResult>();
    localResults.forEach((r) => {
      const key = `${r.studentId}_${r.subjectId}`;
      mergedMap.set(key, r);
    });

    try {
      const q = query(
        collection(db, 'results'),
        where('schoolId', '==', schoolId)
      );
      const snap = await withTimeout(getDocs(q), 2000);
      if (!snap.empty) {
        const firestoreResults = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as SubjectResult) }))
          .filter(isStudentMatch);

        firestoreResults.forEach((r) => {
          const key = `${r.studentId}_${r.subjectId}`;
          const existing = mergedMap.get(key);
          if (!existing || new Date(r.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
            mergedMap.set(key, r);
          }
        });
      }
    } catch (err) {
      console.warn('Firestore results error:', err);
    }

    return Array.from(mergedMap.values());
  },

  async getAllResultsForSchool(schoolId: string): Promise<SubjectResult[]> {
    const localStore = getLocalStore();
    const localResults = localStore.results.filter((r) => r.schoolId === schoolId);

    const mergedMap = new Map<string, SubjectResult>();
    localResults.forEach((r) => {
      const key = r.id || `${r.studentId}_${r.subjectId}`;
      mergedMap.set(key, r);
    });

    try {
      const q = query(collection(db, 'results'), where('schoolId', '==', schoolId));
      const snap = await withTimeout(getDocs(q), 2000);
      if (!snap.empty) {
        const firestoreResults = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubjectResult) }));
        firestoreResults.forEach((r) => {
          const key = r.id || `${r.studentId}_${r.subjectId}`;
          const existing = mergedMap.get(key);
          if (!existing || new Date(r.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
            mergedMap.set(key, r);
          }
        });
      }
    } catch (err) {
      console.warn('Firestore error:', err);
    }

    return Array.from(mergedMap.values());
  },

  // NOTIFICATIONS
  async getNotificationsForUser(
    schoolId: string,
    role: string,
    userUid?: string,
    userEmail?: string
  ): Promise<AppNotification[]> {
    const store = getLocalStore();
    return store.notifications.filter((n) => {
      if (n.schoolId && n.schoolId !== schoolId) return false;
      // If notification is sent to a specific user ID/email
      if (n.recipientId) {
        return Boolean(
          (userUid && n.recipientId === userUid) ||
          (userEmail && n.recipientId === userEmail)
        );
      }
      // General role-based or global notifications
      if (n.recipientRole === 'all') return true;
      if (n.recipientRole === role) return true;
      return false;
    });
  },

  async createNotification(
    notifData: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification> {
    const store = getLocalStore();
    const newNotif: AppNotification = {
      ...notifData,
      id: 'notif_' + Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(newNotif);
    saveLocalStore(store);
    try {
      await withTimeout(setDoc(doc(db, 'notifications', newNotif.id), newNotif), 2000);
    } catch (e) {
      /* ignore */
    }
    return newNotif;
  },

  async markNotificationAsRead(notifId: string): Promise<void> {
    const store = getLocalStore();
    const idx = store.notifications.findIndex((n) => n.id === notifId);
    if (idx !== -1) {
      store.notifications[idx].read = true;
      saveLocalStore(store);
      try {
        await withTimeout(updateDoc(doc(db, 'notifications', notifId), { read: true }), 2000);
      } catch (e) {
        /* ignore */
      }
    }
  },

  async markAllNotificationsAsRead(schoolId: string, role: string, userUid?: string, userEmail?: string): Promise<void> {
    const store = getLocalStore();
    store.notifications.forEach((n) => {
      if (n.schoolId === schoolId) {
        if (n.recipientId) {
          if ((userUid && n.recipientId === userUid) || (userEmail && n.recipientId === userEmail)) {
            n.read = true;
          }
        } else if (n.recipientRole === 'all' || n.recipientRole === role) {
          n.read = true;
        }
      }
    });
    saveLocalStore(store);
  },

  // CHAT MESSAGES
  async getChatMessagesForUser(schoolId: string, userUidOrEmail: string | string[]): Promise<ChatMessage[]> {
    const store = getLocalStore();
    const ids = Array.isArray(userUidOrEmail) ? userUidOrEmail : [userUidOrEmail];
    return store.chatMessages.filter(
      (m) =>
        m.schoolId === schoolId &&
        (ids.includes(m.senderUid) || ids.includes(m.recipientUid))
    );
  },

  async sendChatMessage(
    msgData: Omit<ChatMessage, 'id' | 'createdAt' | 'read'>
  ): Promise<ChatMessage> {
    const store = getLocalStore();
    const newMsg: ChatMessage = {
      ...msgData,
      id: 'chat_' + Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.chatMessages.push(newMsg);

    // Also trigger notification for the recipient
    const chatNotif: AppNotification = {
      id: 'notif_chat_' + Date.now(),
      schoolId: msgData.schoolId,
      recipientId: msgData.recipientUid,
      recipientRole: msgData.senderRole === 'teacher' ? 'parent' : 'teacher',
      title: `Message from ${msgData.senderName}`,
      message: msgData.message,
      type: 'chat',
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(chatNotif);

    saveLocalStore(store);
    try {
      await withTimeout(setDoc(doc(db, 'chatMessages', newMsg.id), newMsg), 2000);
      await withTimeout(setDoc(doc(db, 'notifications', chatNotif.id), chatNotif), 2000);
    } catch (e) {
      /* ignore */
    }
    return newMsg;
  },

  // ANNOUNCEMENTS
  async getAnnouncementsForSchool(schoolId: string): Promise<Announcement[]> {
    const store = getLocalStore();
    return store.announcements
      .filter((a) => a.schoolId === schoolId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createAnnouncement(
    data: Omit<Announcement, 'id' | 'createdAt'>
  ): Promise<Announcement> {
    const store = getLocalStore();
    const newAnn: Announcement = {
      ...data,
      id: 'ann_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    store.announcements.unshift(newAnn);

    // Also trigger broadcast notification
    const broadcastNotif: AppNotification = {
      id: 'notif_ann_' + Date.now(),
      schoolId: data.schoolId,
      recipientRole: 'all',
      title: `Announcement: ${data.title}`,
      message: data.content,
      type: 'announcement',
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(broadcastNotif);

    saveLocalStore(store);
    try {
      await withTimeout(setDoc(doc(db, 'announcements', newAnn.id), newAnn), 2000);
    } catch (e) {
      /* ignore */
    }
    return newAnn;
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const store = getLocalStore();
    store.announcements = store.announcements.filter((a) => a.id !== id);
    saveLocalStore(store);
    try {
      await withTimeout(deleteDoc(doc(db, 'announcements', id)), 2000);
    } catch (e) {
      /* ignore */
    }
  },

  // ADMIN DIRECT MESSAGES
  async getAdminDirectMessagesForUser(schoolId: string, email: string): Promise<AdminDirectMessage[]> {
    const store = getLocalStore();
    return store.adminDirectMessages.filter(
      (m) => m.schoolId === schoolId && m.recipientEmail.toLowerCase() === email.toLowerCase()
    );
  },

  async getAllAdminDirectMessagesForSchool(schoolId: string): Promise<AdminDirectMessage[]> {
    const store = getLocalStore();
    return store.adminDirectMessages.filter((m) => m.schoolId === schoolId);
  },

  async sendAdminDirectMessage(
    msgData: Omit<AdminDirectMessage, 'id' | 'createdAt' | 'read'>
  ): Promise<AdminDirectMessage> {
    const store = getLocalStore();
    const newMsg: AdminDirectMessage = {
      ...msgData,
      id: 'adm_msg_' + Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.adminDirectMessages.unshift(newMsg);

    // Also trigger notification for parent
    const notif: AppNotification = {
      id: 'notif_adm_' + Date.now(),
      schoolId: msgData.schoolId,
      recipientRole: 'parent',
      recipientId: msgData.recipientEmail,
      title: `Admin Notice: ${msgData.subject}`,
      message: msgData.content.substring(0, 120) + '...',
      type: 'admin_message',
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(notif);

    saveLocalStore(store);
    try {
      await withTimeout(setDoc(doc(db, 'adminDirectMessages', newMsg.id), newMsg), 2000);
    } catch (e) {
      /* ignore */
    }
    return newMsg;
  },
};
