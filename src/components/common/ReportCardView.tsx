import React, { useState } from 'react';
import { School, Student, SubjectResult, SubjectItem, calculateGrade } from '../../types';
import { GraduationCap, Award, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ReportCardViewProps {
  school: School;
  student: Student;
  className: string;
  subjects: SubjectItem[];
  results: SubjectResult[];
  principalRemark?: string;
  onClose?: () => void;
}

export const ReportCardView: React.FC<ReportCardViewProps> = ({
  school,
  student,
  className,
  subjects,
  results,
  principalRemark = 'Excellent performance! Keep striving for academic distinction.',
}) => {
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const generateDirectPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cleanStudentName = (student.fullName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanTerm = (school.currentTerm || 'Term').replace(/[^a-zA-Z0-9]/g, '_');

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ACADEMIC PERFORMANCE REPORT', 105, 8, { align: 'center' });

    // School Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text((school.name || 'School').toUpperCase(), 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    if (school.motto) {
      doc.text(`"${school.motto}"`, 105, 25, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.text(`${school.address || ''} • Tel: ${school.phone || ''}`, 105, 30, { align: 'center' });
    doc.text(`Term: ${school.currentTerm || ''} | Session: ${school.currentSession || ''}`, 105, 35, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.line(10, 38, 200, 38);

    // Student Info Box
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 42, 190, 24, 'F');
    doc.rect(10, 42, 190, 24, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Student Name:`, 14, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(student.fullName || 'N/A', 42, 48);

    doc.setFont('helvetica', 'bold');
    doc.text(`Admission No:`, 14, 54);
    doc.setFont('helvetica', 'normal');
    doc.text(student.admissionNumber || student.studentId || 'N/A', 42, 54);

    doc.setFont('helvetica', 'bold');
    doc.text(`Class Enrolled:`, 14, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(className || 'N/A', 42, 60);

    doc.setFont('helvetica', 'bold');
    doc.text(`Parent / Guardian:`, 110, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(student.parentName || 'N/A', 145, 48);

    doc.setFont('helvetica', 'bold');
    doc.text(`Gender:`, 110, 54);
    doc.setFont('helvetica', 'normal');
    doc.text(student.gender || 'N/A', 145, 54);

    doc.setFont('helvetica', 'bold');
    doc.text(`Student ID:`, 110, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(student.studentId || 'N/A', 145, 60);

    // Results Table Header
    let y = 72;
    doc.setFillColor(15, 23, 42);
    doc.rect(10, y, 190, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('SUBJECT', 14, y + 5.5);
    doc.text('ASGN', 80, y + 5.5, { align: 'center' });
    doc.text('QUIZ', 95, y + 5.5, { align: 'center' });
    doc.text('CA', 110, y + 5.5, { align: 'center' });
    doc.text('MIDTERM', 128, y + 5.5, { align: 'center' });
    doc.text('EXAM', 146, y + 5.5, { align: 'center' });
    doc.text('TOTAL', 165, y + 5.5, { align: 'center' });
    doc.text('GRADE', 185, y + 5.5, { align: 'center' });

    y += 8;
    doc.setTextColor(15, 23, 42);

    resultRows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, y, 190, 7, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(10, y + 7, 200, y + 7);

      doc.setFont('helvetica', 'bold');
      doc.text(String(r.subjectName || '').substring(0, 28), 14, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(String(r.assignment), 80, y + 5, { align: 'center' });
      doc.text(String(r.quiz), 95, y + 5, { align: 'center' });
      doc.text(String(r.ca), 110, y + 5, { align: 'center' });
      doc.text(String(r.midTerm), 128, y + 5, { align: 'center' });
      doc.text(String(r.exam), 146, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(String(r.total), 165, y + 5, { align: 'center' });
      doc.text(String(r.grade), 185, y + 5, { align: 'center' });

      y += 7;
    });

    // Summary Box
    y += 5;
    doc.setFillColor(15, 23, 42);
    doc.rect(10, y, 190, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL MARKS: ${totalObtained} / ${possibleTotal}`, 14, y + 7);
    doc.text(`AVERAGE: ${averagePercentage}%`, 80, y + 7);
    doc.text(`OVERALL GRADE: ${overallGrade}`, 130, y + 7);
    doc.text(`CLASSIFICATION: ${overallRemark}`, 195, y + 7, { align: 'right' });

    // Remarks & Footer
    y += 18;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("Principal's Remarks:", 10, y);
    doc.setFont('helvetica', 'italic');
    doc.text(principalRemark, 10, y + 5);

    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 10, y);
    doc.text('Official E3 School Portal Report Card', 200, y, { align: 'right' });

    doc.save(`Report_Card_${cleanStudentName}_${cleanTerm}.pdf`);
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      generateDirectPDF();
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Map all subjects the student is taking with available approved results
  const resultRows = subjects.map((sub) => {
    const res = results.find((r) => r.subjectId === sub.id);
    if (res) {
      const { grade, remark } = calculateGrade(res.total);
      return {
        id: res.id,
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        assignment: res.scores.assignment,
        quiz: res.scores.quiz,
        ca: res.scores.ca,
        midTerm: res.scores.midTerm,
        exam: res.scores.exam,
        total: res.total,
        grade: res.grade || grade,
        teacherRemark: res.teacherRemark || remark,
        hasResult: true,
      };
    }
    return {
      id: `pending_${sub.id}`,
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      assignment: '-',
      quiz: '-',
      ca: '-',
      midTerm: '-',
      exam: '-',
      total: '-',
      grade: 'Pending',
      teacherRemark: 'Pending approval',
      hasResult: false,
    };
  });

  // Append any extra result items not matching current subject list
  results.forEach((res) => {
    if (!subjects.some((s) => s.id === res.subjectId)) {
      const { grade, remark } = calculateGrade(res.total);
      resultRows.push({
        id: res.id,
        subjectId: res.subjectId,
        subjectName: 'Subject',
        subjectCode: '',
        assignment: res.scores.assignment,
        quiz: res.scores.quiz,
        ca: res.scores.ca,
        midTerm: res.scores.midTerm,
        exam: res.scores.exam,
        total: res.total,
        grade: res.grade || grade,
        teacherRemark: res.teacherRemark || remark,
        hasResult: true,
      });
    }
  });

  const approvedRows = resultRows.filter((r) => r.hasResult);
  const totalObtained = approvedRows.reduce((acc, r) => acc + (typeof r.total === 'number' ? r.total : 0), 0);
  const possibleTotal = approvedRows.length * 100;
  const averagePercentage = approvedRows.length > 0 ? (totalObtained / approvedRows.length).toFixed(1) : '0';
  const { grade: overallGrade, remark: overallRemark } = calculateGrade(Number(averagePercentage));

  const weights = school.assessmentWeights || {
    assignmentMax: 10,
    quizMax: 10,
    caMax: 20,
    midTermMax: 20,
    examMax: 40,
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 max-w-4xl mx-auto printable-report">
      {/* Action Trigger Topbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 no-print border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Official Student Report Card</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            {downloadingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Report Card...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Report Card
              </>
            )}
          </button>
        </div>
      </div>

      {/* Official Report Card Layout */}
      <div id="report-card-capture" className="border-4 border-slate-900 p-6 rounded-xl bg-white">
        {/* School Header */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.name}
                className="w-16 h-16 object-cover rounded-xl border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-xl">
                {school.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{school.name}</h1>
              {school.motto && <p className="text-xs italic font-medium text-slate-600">{`"${school.motto}"`}</p>}
              <p className="text-xs text-slate-500 mt-1">{school.address} • Tel: {school.phone}</p>
            </div>
          </div>
          <div className="mt-3 inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Academic Performance Report — {school.currentTerm}, {school.currentSession}
          </div>
        </div>

        {/* Student Information Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs text-slate-800">
          <div className="flex items-center gap-3 md:col-span-1">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                className="w-16 h-16 rounded-xl object-cover border-2 border-slate-300"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg">
                <GraduationCap className="w-8 h-8" />
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Student Name</p>
              <p className="font-bold text-slate-900 text-sm">{student.fullName}</p>
              <p className="text-[11px] text-slate-600">{student.gender}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Admission No.</p>
            <p className="font-bold text-slate-800 mt-0.5">{student.admissionNumber}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Student ID</p>
            <p className="font-semibold text-slate-800">{student.studentId}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Class Enrolled</p>
            <p className="font-bold text-slate-800 mt-0.5">{className}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Parent / Guardian</p>
            <p className="font-semibold text-slate-800">{student.parentName}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Academic Term</p>
            <p className="font-bold text-slate-800 mt-0.5">{school.currentTerm}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Session</p>
            <p className="font-semibold text-slate-800">{school.currentSession}</p>
          </div>
        </div>

        {/* Assessment Weight Distribution Key */}
        <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200/80 px-3 py-2 rounded-lg mb-4 text-[11px] text-blue-900">
          <span className="font-bold">Score Breakdown Weighting:</span>
          <span className="font-medium">
            Assignment ({weights.assignmentMax}m) + Quiz ({weights.quizMax}m) + C.A ({weights.caMax}m) + Mid-Term ({weights.midTermMax}m) + Exam ({weights.examMax}m) = 100 Marks
          </span>
        </div>

        {/* Results Subject Breakdown Table */}
        <div className="overflow-x-auto border border-slate-300 rounded-lg mb-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="p-2.5 border-b border-slate-700">Subject</th>
                <th className="p-2.5 border-b border-slate-700 text-center">Asgn ({weights.assignmentMax})</th>
                <th className="p-2.5 border-b border-slate-700 text-center">Quiz ({weights.quizMax})</th>
                <th className="p-2.5 border-b border-slate-700 text-center">C.A ({weights.caMax})</th>
                <th className="p-2.5 border-b border-slate-700 text-center">MidTerm ({weights.midTermMax})</th>
                <th className="p-2.5 border-b border-slate-700 text-center">Exam ({weights.examMax})</th>
                <th className="p-2.5 border-b border-slate-700 text-center bg-slate-800">Total</th>
                <th className="p-2.5 border-b border-slate-700 text-center">Grade</th>
                <th className="p-2.5 border-b border-slate-700">Teacher Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {resultRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                    No approved subject results recorded for this term yet.
                  </td>
                </tr>
              ) : (
                resultRows.map((r, idx) => (
                  <tr key={r.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                      {r.subjectName}
                      {r.subjectCode && <span className="text-[10px] font-normal text-slate-500 block">{r.subjectCode}</span>}
                    </td>
                    <td className="p-2.5 text-center font-medium text-slate-700">{r.assignment}</td>
                    <td className="p-2.5 text-center font-medium text-slate-700">{r.quiz}</td>
                    <td className="p-2.5 text-center font-medium text-slate-700">{r.ca}</td>
                    <td className="p-2.5 text-center font-medium text-slate-700">{r.midTerm}</td>
                    <td className="p-2.5 text-center font-medium text-slate-700">{r.exam}</td>
                    <td className="p-2.5 text-center font-black text-slate-900 bg-slate-100 border-x border-slate-200 text-sm">
                      {r.total}
                    </td>
                    <td className="p-2.5 text-center font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          !r.hasResult
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 font-medium'
                            : r.grade === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.grade === 'B'
                            ? 'bg-blue-100 text-blue-800'
                            : r.grade === 'C'
                            ? 'bg-sky-100 text-sky-800'
                            : r.grade === 'D' || r.grade === 'E'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.grade}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 italic text-[11px] max-w-[180px]">
                      {r.teacherRemark}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Overall Summary Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-xl mb-6 text-center">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Total Marks</p>
            <p className="text-xl font-bold mt-0.5">{totalObtained} / {possibleTotal}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Overall Average (%)</p>
            <p className="text-xl font-bold mt-0.5 text-blue-300">{averagePercentage}%</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Overall Grade</p>
            <p className="text-xl font-black mt-0.5 text-amber-300">{overallGrade}</p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Classification</p>
            <p className="text-sm font-semibold mt-1 text-slate-200">{overallRemark}</p>
          </div>
        </div>

        {/* Grading Scale Reference Key */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 mb-6 text-[11px]">
          <p className="font-bold text-slate-700 mb-1">Grading Key Scale:</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-slate-600 font-medium">
            <span className="bg-white border px-1.5 py-0.5 rounded">A: 70-100% (Excellent)</span>
            <span className="bg-white border px-1.5 py-0.5 rounded">B: 60-69% (Very Good)</span>
            <span className="bg-white border px-1.5 py-0.5 rounded">C: 50-59% (Good)</span>
            <span className="bg-white border px-1.5 py-0.5 rounded">D: 45-49% (Pass)</span>
            <span className="bg-white border px-1.5 py-0.5 rounded">E: 40-44% (Fair)</span>
            <span className="bg-white border px-1.5 py-0.5 rounded">F: 0-39% (Fail)</span>
          </div>
        </div>

        {/* Remarks and Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-xs">
          <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
            <p className="font-bold text-slate-800 uppercase text-[10px] text-slate-500 mb-1">Principal's Remarks</p>
            <p className="text-slate-700 italic font-medium">{principalRemark}</p>
          </div>

          <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50 flex flex-col justify-between">
            <div>
              <p className="font-bold text-slate-800 uppercase text-[10px] text-slate-500 mb-1">Official Verification</p>
              <p className="text-slate-600 text-[11px]">Automatically verified and approved via E3 School Portal.</p>
            </div>
            <div className="flex justify-between items-end mt-4 pt-2 border-t border-slate-300">
              <div>
                <div className="w-24 h-6 border-b border-slate-400 mb-1"></div>
                <p className="text-[10px] text-slate-500 font-semibold">School Stamp / Sign</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Date Issued</p>
                <p className="text-[11px] font-bold text-slate-700">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
