import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileText,
  Award,
  BookOpen,
  Calendar,
  Building,
} from 'lucide-react';
import { LegalValidationReport, InstitutionConfig } from '../types';
import { printElement } from '../services/exportService';

interface Props {
  report: LegalValidationReport;
  config: InstitutionConfig;
}

export const LegalValidationView: React.FC<Props> = ({ report, config }) => {
  const handlePrintCertificate = () => {
    printElement('printable-legal-certificate');
  };

  return (
    <div id="legal-validation-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0a0a0a] text-white rounded-2xl p-6 shadow-xl border border-[#222] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#141414] border border-[#d4af37]/40 rounded-full text-[#d4af37] text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>تقرير المطابقة والامتثال الوزاري</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#d4af37]">
            شهادة فحص واستيفاء القواعد والقرارات الوزارية
          </h2>
          <p className="text-[#888] text-xs md:text-sm mt-1 max-w-2xl">
            مستند رسمي للمصادقة على جدول استعمال الزمن المعتمد وعرضه على مفتشية التعليم المتوسط
            ومديرية التربية.
          </p>
        </div>

        <button
          id="print-certificate-btn"
          onClick={handlePrintCertificate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#c59e2e] text-black text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة شهادة المطابقة</span>
        </button>
      </div>

      {/* Printable Report Certificate Canvas */}
      <div
        id="printable-legal-certificate"
        className="bg-[#0a0a0a] rounded-2xl shadow-xl border border-[#222] p-8 space-y-6 text-white"
      >
        {/* Official Header */}
        <div className="border-b-2 border-[#d4af37]/40 pb-5 text-center space-y-1">
          <div className="text-xs font-bold text-[#888]">
            الجمهورية الجزائرية الديمقراطية الشعبية
          </div>
          <div className="text-sm font-bold text-[#ccc]">
            وزارة التربية الوطنية — {config.educationDirectorate}
          </div>
          <h1 className="text-xl font-bold text-[#d4af37] pt-2">
            شهادة مطابقة استعمال الزمن المدرسي للمنظومة الوزارية
          </h1>
          <div className="text-xs text-[#666]">
            المؤسسة: <strong className="text-white">{config.name}</strong> • السنة الدراسية:{' '}
            <strong className="text-white">{config.academicYear}</strong>
          </div>
        </div>

        {/* Score & Gauge Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0f0f0f] p-6 rounded-2xl border border-[#222]">
          <div className="text-center md:text-right space-y-1">
            <div className="text-xs text-[#888] font-semibold">درجة الامتثال الرسمية</div>
            <div className="text-4xl font-bold text-[#4ade80] font-mono">
              {report.overallScore}%
            </div>
            <div className="text-xs text-[#4ade80] font-bold">
              {report.status === 'compliant'
                ? 'مطابق تماماً للنصوص الوزارية'
                : 'يحتوي على ملاحظات طفيفة'}
            </div>
          </div>

          <div className="text-center space-y-1 border-y md:border-y-0 md:border-x border-[#222] py-3 md:py-0">
            <div className="text-xs text-[#888] font-semibold">المرجع القانوني الأساسي</div>
            <div className="text-xs font-bold text-[#d4af37] leading-relaxed">
              {report.officialDecreeReference}
            </div>
            <div className="text-[11px] text-[#666]">
              والمنشور الوزاري رقم 154 المنظم للحياة المدرسية
            </div>
          </div>

          <div className="text-center md:text-left space-y-1">
            <div className="text-xs text-[#888] font-semibold">إحصائيات الهيكل المدرسي</div>
            <div className="text-xs text-[#aaa] font-medium">
              <div>
                عدد الأفواج: <strong className="text-white">{report.totalClasses} قسماً</strong>
              </div>
              <div>
                هيئة التدريس: <strong className="text-[#60a5fa]">{report.totalTeachers} أستاذاً</strong>
              </div>
              <div>
                الحصص الأسبوعية: <strong className="text-[#d4af37]">{report.totalSlots} حصة</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Cards */}
        <div className="space-y-3">
          <h3 className="font-bold text-[#e0e0e0] text-sm border-b border-[#222] pb-2">
            بنود التدقيق والفحص القانوني والبيداغوجي:
          </h3>

          <div className="space-y-2.5">
            {report.items.map((item) => (
              <div
                key={item.ruleId}
                className="p-4 bg-[#121212] rounded-xl border border-[#222] flex items-start gap-3"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    item.status === 'passed'
                      ? 'bg-[#1a2e1a] text-[#4ade80] border border-[#4ade80]/30'
                      : 'bg-[#1a120a] text-[#d4af37] border border-[#d4af37]/30'
                  }`}
                >
                  {item.status === 'passed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-white">{item.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'passed'
                          ? 'bg-[#1a2e1a] text-[#4ade80] border border-[#4ade80]/30'
                          : 'bg-[#1a120a] text-[#d4af37] border border-[#d4af37]/30'
                      }`}
                    >
                      {item.status === 'passed' ? 'مستوفى بنجاح' : 'تنبيه تنظيمي'}
                    </span>
                  </div>
                  <p className="text-xs text-[#aaa] leading-relaxed">{item.details}</p>
                  <div className="text-[11px] text-[#666] font-medium">
                    السند القانوني: {item.sourceCitation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Signatures Box */}
        <div className="pt-8 border-t-2 border-[#222] grid grid-cols-2 text-center text-xs text-[#888]">
          <div className="space-y-12">
            <div className="font-bold text-[#ccc]">رئيس مصلحة التنظيم التربوي / المفتش</div>
            <div className="text-[#555] text-[11px]">(الختم والتأشيرة)</div>
          </div>
          <div className="space-y-12">
            <div className="font-bold text-[#ccc]">
              مدير المتوسطة: {config.directorName}
            </div>
            <div className="text-[#555] text-[11px]">
              حرر بالجزائر في: {report.generatedAt}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
