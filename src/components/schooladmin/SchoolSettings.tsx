import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { Settings, Save, CheckCircle2, Building2, Calendar, Award, Shield } from 'lucide-react';

export const SchoolSettings: React.FC = () => {
  const { currentSchool, refreshAuthData } = useAuth();
  const schoolId = currentSchool?.id || 'sch_graceville_01';

  const [name, setName] = useState(currentSchool?.name || '');
  const [motto, setMotto] = useState(currentSchool?.motto || '');
  const [phone, setPhone] = useState(currentSchool?.phone || '');
  const [address, setAddress] = useState(currentSchool?.address || '');
  const [logoUrl, setLogoUrl] = useState(currentSchool?.logoUrl || '');
  const [currentSession, setCurrentSession] = useState(currentSchool?.currentSession || '2025/2026');
  const [currentTerm, setCurrentTerm] = useState(currentSchool?.currentTerm || 'First Term');

  // Weights
  const weights = currentSchool?.assessmentWeights || {
    assignmentMax: 10,
    quizMax: 10,
    caMax: 20,
    midTermMax: 20,
    examMax: 40,
  };

  const [assignmentMax, setAssignmentMax] = useState(weights.assignmentMax);
  const [quizMax, setQuizMax] = useState(weights.quizMax);
  const [caMax, setCaMax] = useState(weights.caMax);
  const [midTermMax, setMidTermMax] = useState(weights.midTermMax);
  const [examMax, setExamMax] = useState(weights.examMax);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const totalAssessmentMax = Number(assignmentMax) + Number(quizMax) + Number(caMax) + Number(midTermMax) + Number(examMax);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    await dbService.updateSchoolSettings(schoolId, {
      name,
      motto,
      phone,
      address,
      logoUrl,
      currentSession,
      currentTerm: currentTerm as 'First Term' | 'Second Term' | 'Third Term',
      assessmentWeights: {
        assignmentMax: Number(assignmentMax),
        quizMax: Number(quizMax),
        caMax: Number(caMax),
        midTermMax: Number(midTermMax),
        examMax: Number(examMax),
      },
    });

    await refreshAuthData();
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">School Profile & Assessment Configuration</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage official school identity, active academic session/term, and continuous assessment weights.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
            Settings Saved Successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* School Profile Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">General School Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">School Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">School Motto</label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Logo Image URL</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Academic Session & Term Config */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Academic Session & Current Term</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Academic Session *</label>
              <input
                type="text"
                required
                value={currentSession}
                onChange={(e) => setCurrentSession(e.target.value)}
                placeholder="e.g. 2025/2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Academic Term *</label>
              <select
                value={currentTerm}
                onChange={(e) => setCurrentTerm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assessment Weightings Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">Assessment Score Breakdown Weightings</h2>
            </div>

            <div className={`text-xs font-bold px-3 py-1 rounded-full ${
              totalAssessmentMax === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              Total Max = {totalAssessmentMax} Marks
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Teachers will enter numerical marks up to these configured maximum limits for each subject assessment.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assignment</label>
              <input
                type="number"
                min="0"
                max="100"
                value={assignmentMax}
                onChange={(e) => setAssignmentMax(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-center focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quiz</label>
              <input
                type="number"
                min="0"
                max="100"
                value={quizMax}
                onChange={(e) => setQuizMax(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-center focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Continuous Assmt</label>
              <input
                type="number"
                min="0"
                max="100"
                value={caMax}
                onChange={(e) => setCaMax(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-center focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mid-Term Test</label>
              <input
                type="number"
                min="0"
                max="100"
                value={midTermMax}
                onChange={(e) => setMidTermMax(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-center focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Examination</label>
              <input
                type="number"
                min="0"
                max="100"
                value={examMax}
                onChange={(e) => setExamMax(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-center focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Configuration...' : 'Save School Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
