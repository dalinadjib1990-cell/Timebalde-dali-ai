import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  TimetableSlot,
  Teacher,
  SchoolClass,
  Room,
  SubjectRule,
  InstitutionConfig,
} from '../types';
import { SUBJECT_METADATA } from '../data/officialData';

export function exportTimetableToExcel(
  slots: TimetableSlot[],
  teachers: Teacher[],
  classes: SchoolClass[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig
) {
  const wb = XLSX.utils.book_new();
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // 1. General Master Sheet
  const masterRows: any[] = [];
  masterRows.push(['DALI TIMETABLE AI — استعمال الزمن العام للمؤسسة']);
  masterRows.push([`المؤسسة: ${config.name}`, `السنة الدراسية: ${config.academicYear}`]);
  masterRows.push(['']);

  const header = ['القسم', 'المستوى', 'اليوم', 'الفترة', 'التوقيت', 'المادة', 'الأستاذ', 'القاعة / المخبر', 'نوع الحصة'];
  masterRows.push(header);

  for (const s of slots) {
    const cls = classMap.get(s.classId);
    const teacher = teacherMap.get(s.teacherId);
    const room = roomMap.get(s.roomId);
    const periodDef = config.periods.find((p) => p.id === s.period);
    const subjName = SUBJECT_METADATA[s.subjectId]?.name || s.subjectId;

    masterRows.push([
      cls?.name || s.classId,
      cls?.level || '',
      s.day,
      `الحصة ${s.period}`,
      periodDef?.timeRange || '',
      subjName,
      teacher?.name || '',
      room?.name || '',
      s.type === 'tp' ? 'أعمال تطبيقية (TP)' : s.type === 'td' ? 'أعمال موجهة (TD)' : s.type === 'sport' ? 'تربية بدنية' : 'درس عادي',
    ]);
  }

  const masterSheet = XLSX.utils.aoa_to_sheet(masterRows);
  XLSX.utils.book_append_sheet(wb, masterSheet, 'الجدول العام');

  // 2. Official Rules Sheet
  const rulesRows: any[] = [];
  rulesRows.push(['المواقيت والمعاملات الرسمية المستخرجة من الوثيقة الوزارية 2026/2027']);
  rulesRows.push(['المادة', 'المستوى', 'الحجم الساعي الأسبوعي', 'الأعمال الموجهة (TD)', 'المعامل', 'المخبر المطلوب', 'المصدر الرسمي']);

  for (const r of rules) {
    rulesRows.push([
      r.subject_name,
      r.level,
      `${r.weekly_hours} سا`,
      r.additional_minutes > 0 ? `${r.additional_minutes} دقيقة (أ.م)` : '—',
      r.coefficient,
      r.required_room_type,
      r.source_document,
    ]);
  }

  const rulesSheet = XLSX.utils.aoa_to_sheet(rulesRows);
  XLSX.utils.book_append_sheet(wb, rulesSheet, 'المواقيت والمعاملات');

  // 3. Teachers Summary Sheet
  const teachersRows: any[] = [];
  teachersRows.push(['قائمة الأساتذة والأفواج التربوية المسندة']);
  teachersRows.push(['اسم الأستاذ', 'المادة', 'الأقسام المسندة', 'عدد الأقسام', 'النصاب الساعي الأسبوعي']);

  for (const t of teachers) {
    const classNames = t.assignedClassIds.map((cId) => classMap.get(cId)?.name || cId).join('، ');
    teachersRows.push([
      t.name,
      SUBJECT_METADATA[t.subjectId]?.name || t.subjectId,
      classNames,
      t.assignedClassIds.length,
      `${t.maxWeeklyHours} سا`,
    ]);
  }

  const teachersSheet = XLSX.utils.aoa_to_sheet(teachersRows);
  XLSX.utils.book_append_sheet(wb, teachersSheet, 'الأساتذة والنصاب');

  // Save Workbook
  XLSX.writeFile(wb, `استعمال_الزمن_${config.name.replace(/\s+/g, '_')}_2026_2027.xlsx`);
}

export function exportTimetableToWord(
  title: string,
  htmlContent: string,
  schoolName: string
) {
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>${title}</title>
  <style>
    body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; margin: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; direction: rtl; }
    th, td { border: 1px solid #333; padding: 8px; text-align: center; font-size: 12px; }
    th { background-color: #f2f2f2; font-weight: bold; }
    .header-box { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 10px; }
  </style>
  </head><body>
  <div class="header-box">
    <h3>الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</h3>
    <h2>${schoolName}</h2>
    <h3>${title} — الموسم الدراسي 2026/2027</h3>
  </div>
  ${htmlContent}
  </body></html>`;

  const blob = new Blob(['\ufeff', header], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printElement(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>طباعة استعمال الزمن — DALI TIMETABLE AI</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; direction: rtl; padding: 20px; color: #111; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #444; padding: 8px 6px; text-align: center; font-size: 11px; }
        th { background: #f0fdf4; color: #166534; font-weight: 700; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${el.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
}
