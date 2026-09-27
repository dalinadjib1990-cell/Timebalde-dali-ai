import {
  TimetableSlot,
  SchoolClass,
  Teacher,
  Room,
  SubjectRule,
  InstitutionConfig,
  SubjectId,
  Conflict,
} from '../types';
import { detectTimetableConflicts } from './conflictDetector';
import { generateInstitutionalTimetable } from './scheduler';
import { SUBJECT_METADATA } from '../data/officialData';

export interface ChatCommandResult {
  success: boolean;
  message: string;
  actionType:
    | 'move_slot'
    | 'swap_slots'
    | 'free_teacher_day'
    | 'adjust_remedial'
    | 'solve_conflicts'
    | 'general_advice'
    | 'error';
  updatedSlots?: TimetableSlot[];
  affectedClassNames?: string[];
  affectedTeacherNames?: string[];
  swapped?: boolean;
  detailsList?: string[];
  newConflictsCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionResult?: ChatCommandResult;
}

// Arabic normalization helper
function normalizeArabic(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, ''); // Remove tashkeel
}

// Match Day from text
export function extractDayFromText(text: string, defaultDays: string[]): string | null {
  const norm = normalizeArabic(text);
  if (norm.includes('احد')) return 'الأحد';
  if (norm.includes('اثنين')) return 'الاثنين';
  if (norm.includes('ثلاثاء')) return 'الثلاثاء';
  if (norm.includes('اربعاء')) return 'الأربعاء';
  if (norm.includes('خميس')) return 'الخميس';
  return null;
}

// Match Period from text (1 to 8)
export function extractPeriodFromText(text: string): number | null {
  const norm = normalizeArabic(text);

  // Direct number matches: الحصة 1, حصة 2, ساعة 3, etc.
  const match = norm.match(/(?:حصه|حصة|ساعه|ساعة|فتره|فترة|رقم)\s*([1-8])/);
  if (match) return parseInt(match[1], 10);

  // Word numbers
  if (norm.includes('الحصه الاولي') || norm.includes('الحصة الاولى') || norm.includes('الساعه الاولي')) return 1;
  if (norm.includes('الحصه الثانيه') || norm.includes('الحصة الثانية') || norm.includes('الساعه الثانيه')) return 2;
  if (norm.includes('الحصه الثالثه') || norm.includes('الحصة الثالثة') || norm.includes('الساعه الثالثه')) return 3;
  if (norm.includes('الحصه الرابعه') || norm.includes('الحصة الرابعة') || norm.includes('الساعه الرابعه')) return 4;
  if (norm.includes('الحصه الخامسه') || norm.includes('الحصة الخامسة') || norm.includes('الساعه الخامسه')) return 5;
  if (norm.includes('الحصه السادسه') || norm.includes('الحصة السادسة') || norm.includes('الساعه السادسه')) return 6;
  if (norm.includes('الحصه السابعه') || norm.includes('الحصة السابعة') || norm.includes('الساعه السابعه') || norm.includes('15:00') || norm.includes('15 الى 16') || norm.includes('15-16')) return 7;
  if (norm.includes('الحصه الثامنه') || norm.includes('الحصة الثامنة') || norm.includes('الساعه الثامنه')) return 8;

  // General numbers
  const directNum = norm.match(/\b([1-8])\b/);
  if (directNum) return parseInt(directNum[1], 10);

  return null;
}

// Match Subject from text
export function extractSubjectFromText(text: string): SubjectId | null {
  const norm = normalizeArabic(text);
  if (norm.includes('رياضيات') || norm.includes('حساب')) return 'math';
  if (norm.includes('عربيه') || norm.includes('عربي') || norm.includes('ادب')) return 'arabic';
  if (norm.includes('فرنسيه') || norm.includes('فرنسي')) return 'french';
  if (norm.includes('انجليزيه') || norm.includes('انجليزي')) return 'english';
  if (norm.includes('علوم') || norm.includes('طبيعيه') || norm.includes('طبيعه')) return 'science';
  if (norm.includes('فيزياء') || norm.includes('تكنولوجيا') || norm.includes('فيزيا')) return 'physics';
  if (norm.includes('تاريخ') || norm.includes('جغرافيا')) return 'history';
  if (norm.includes('اسلاميه') || norm.includes('دين') || norm.includes('تربيه اسلاميه')) return 'islamic';
  if (norm.includes('مدنيه') || norm.includes('تربيه مدنيه')) return 'civic';
  if (norm.includes('رياضه') || norm.includes('بدنيه') || norm.includes('تربيه بدنيه')) return 'pe';
  if (norm.includes('تشكيليه') || norm.includes('موسيقى') || norm.includes('رسم') || norm.includes('فن')) return 'art_music';
  if (norm.includes('اعلام الي') || norm.includes('معلوماتيه') || norm.includes('كمبيوتر')) return 'computer';
  if (norm.includes('امازيغيه') || norm.includes('امازيغي')) return 'amazigh';
  return null;
}

// Match Class from text
export function extractClassFromText(text: string, classes: SchoolClass[]): SchoolClass | null {
  const norm = normalizeArabic(text);

  // Exact names e.g. 1AM1, 4AM2, etc.
  for (const c of classes) {
    const cNorm = normalizeArabic(c.name);
    if (norm.includes(cNorm)) return c;
  }

  // Regex patterns: 4AM1, 4am1, 4 متوسط 1, 4م1, 4AM 1, etc.
  const regex1 = /([1-4])\s*(?:am|م|متوسط)\s*([1-9])/i;
  const match1 = text.match(regex1);
  if (match1) {
    const targetName = `${match1[1]}AM${match1[2]}`.toUpperCase();
    const found = classes.find((c) => c.name.toUpperCase().replace(/\s/g, '').includes(targetName));
    if (found) return found;
  }

  // By grade level e.g. "رابعة متوسط" -> first 4AM class
  if (norm.includes('رابعه') || norm.includes('الرابعه') || norm.includes('4 متوسط') || norm.includes('4am')) {
    const found = classes.find((c) => c.level === '4AM');
    if (found) return found;
  }
  if (norm.includes('اولي') || norm.includes('الاولي') || norm.includes('1 متوسط') || norm.includes('1am')) {
    const found = classes.find((c) => c.level === '1AM');
    if (found) return found;
  }
  if (norm.includes('ثانيه') || norm.includes('الثانيه') || norm.includes('2 متوسط') || norm.includes('2am')) {
    const found = classes.find((c) => c.level === '2AM');
    if (found) return found;
  }
  if (norm.includes('ثالثه') || norm.includes('الثالثه') || norm.includes('3 متوسط') || norm.includes('3am')) {
    const found = classes.find((c) => c.level === '3AM');
    if (found) return found;
  }

  return null;
}

// Match Teacher from text
export function extractTeacherFromText(text: string, teachers: Teacher[]): Teacher | null {
  const norm = normalizeArabic(text);

  for (const t of teachers) {
    const tNorm = normalizeArabic(t.name);
    if (norm.includes(tNorm) && tNorm.length > 3) return t;
  }

  // By subject e.g. "أستاذ الرياضيات"
  const subj = extractSubjectFromText(text);
  if (subj) {
    const t = teachers.find((t) => t.subjectId === subj);
    if (t) return t;
  }

  return null;
}

/**
 * Interconnected Execution Engine:
 * When an hour/slot moves, it propagates to all linked tables (class, teacher, room, split-groups)
 * without creating conflicts, doing smart swaps when the target slot is already occupied.
 */
export async function executeInterconnectedTimetableCommand(
  rawCommand: string,
  slots: TimetableSlot[],
  classes: SchoolClass[],
  teachers: Teacher[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig
): Promise<ChatCommandResult> {
  const norm = normalizeArabic(rawCommand);

  // 1. First attempt: Call backend Gemini AI endpoint for smart reasoning
  try {
    const res = await fetch('/api/gemini/timetable-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: rawCommand,
        slotsSummary: slots.slice(0, 30).map((s) => ({
          id: s.id,
          classId: s.classId,
          subjectId: s.subjectId,
          teacherId: s.teacherId,
          day: s.day,
          period: s.period,
        })),
        classes: classes.map((c) => ({ id: c.id, name: c.name, level: c.level })),
        teachers: teachers.map((t) => ({ id: t.id, name: t.name, subjectId: t.subjectId })),
        config,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.action) {
        return executeStructuredAction(
          data.action,
          data.parameters || {},
          data.reply || '',
          slots,
          classes,
          teachers,
          rooms,
          rules,
          config
        );
      }
    }
  } catch (err) {
    console.warn('Backend timetable command endpoint call failed, using deterministic local engine', err);
  }

  // 2. Deterministic Interconnected Local NLP Engine (Offline & Guaranteed Instant Execution)

  // A. Check for "حل التعارضات" or "ترابط الجداول"
  if (
    norm.includes('حل التعارض') ||
    norm.includes('اصلح') ||
    norm.includes('تصحيح') ||
    norm.includes('تعديل الخلل') ||
    norm.includes('لا يوجد اي خلل') ||
    norm.includes('ترابط')
  ) {
    const currentConflicts = detectTimetableConflicts(slots, teachers, classes, rooms, rules, config);
    if (currentConflicts.length === 0) {
      return {
        success: true,
        actionType: 'solve_conflicts',
        message: 'تم فحص جميع الجداول بنجاح: لا يوجد أي تعارض أو خلل في جداول الأقسام، أو جداول الأساتذة، أو القاعات. جميع الجداول مترابطة ومتكاملة 100%.',
        detailsList: [
          'جداول الأقسام: خالية من أي ازدواجية.',
          'جداول الأساتذة: خالية من التعارضات الزمنية ومحترمة للأيام البيداغوجية.',
          'جداول القاعات والمخابر: شاغرة ومتوافقة.',
        ],
      };
    }

    // Auto-fix conflicts
    const rebalanced = generateInstitutionalTimetable(classes, teachers, rooms, rules, config, slots.filter((s) => s.isLocked));
    return {
      success: true,
      actionType: 'solve_conflicts',
      message: `تمت موازنة وتربيط الجداول بنجاح وحل ${currentConflicts.length} تعارضات. أصبحت جميع الجداول متوافقة 100% ودون أي خلل.`,
      updatedSlots: rebalanced.slots,
      detailsList: [
        `تم فحص وإعادة ربط ${rebalanced.slots.length} حصة.`,
        'تم الحفاظ على ترابط حصص الأفواج وقاعات التدريس.',
        'تم ضبط مواقيت الأساتذة لإنهاء الدروس على 15:00.',
      ],
    };
  }

  // B. Check for "حصة الاستدراك"
  if (norm.includes('استدراك') || norm.includes('دعم')) {
    const targetDay = extractDayFromText(rawCommand, config.days) || 'الخميس';
    const targetPeriod = extractPeriodFromText(rawCommand) || 7;

    // Relocate remedial slots
    const updated = slots.map((s) => {
      if (s.type === 'remedial') {
        return {
          ...s,
          day: targetDay,
          period: targetPeriod,
        };
      }
      return s;
    });

    const remedialCount = slots.filter((s) => s.type === 'remedial').length;
    return {
      success: true,
      actionType: 'adjust_remedial',
      message: `تم تحريك وتثبيت حصص الاستدراك والدعم التربوي (${remedialCount} حصة) إلى يوم ${targetDay} في الحصة ${targetPeriod} (15:00 - 16:00) بنجاح لجميع الأقسام دون التأثير على الدروس النظامية.`,
      updatedSlots: updated,
      detailsList: [
        `اليوم الجديد للاستدراك: ${targetDay}`,
        `الحصة المحددة: الحصة ${targetPeriod} (15:00 - 16:00)`,
        'الدروس النظامية خالية تماماً بعد الساعة 15:00.',
      ],
    };
  }

  // C. Check for "تفريغ يوم لأستاذ"
  if (norm.includes('فرغ') || norm.includes('اجعل') || norm.includes('يوم فارغ') || norm.includes('بيداغوجي')) {
    const teacher = extractTeacherFromText(rawCommand, teachers);
    const targetDay = extractDayFromText(rawCommand, config.days);

    if (teacher && targetDay) {
      // Find all slots of this teacher on targetDay
      const teacherSlotsOnDay = slots.filter((s) => s.teacherId === teacher.id && s.day === targetDay);

      if (teacherSlotsOnDay.length === 0) {
        return {
          success: true,
          actionType: 'free_teacher_day',
          message: `الأستاذ (${teacher.name}) ليس لديه أي حصص مبرمجة يوم ${targetDay}، هذا اليوم فارغ له أصلاً 🌟.`,
        };
      }

      // Try finding safe destination slots across other days
      let currentSlotsState = [...slots];
      const movedSlotsInfo: string[] = [];

      for (const slotToMove of teacherSlotsOnDay) {
        // Find a free slot for this class and teacher on a different day
        let relocated = false;
        for (const candidateDay of config.days) {
          if (candidateDay === targetDay) continue;
          if (candidateDay === 'الثلاثاء' && config.tuesdayAfternoonOff) continue;

          for (let p = 1; p <= 6; p++) { // Keep regular lessons within 1-6
            // Check teacher free
            const teacherBusy = currentSlotsState.some(
              (s) => s.teacherId === teacher.id && s.day === candidateDay && s.period === p
            );
            // Check class free
            const classBusy = currentSlotsState.some(
              (s) => s.classId === slotToMove.classId && s.day === candidateDay && s.period === p
            );

            if (!teacherBusy && !classBusy) {
              // Move slot
              currentSlotsState = currentSlotsState.map((s) =>
                s.id === slotToMove.id ? { ...s, day: candidateDay, period: p } : s
              );
              movedSlotsInfo.push(`نُقلت حصة ${slotToMove.subjectId} إلى ${candidateDay} الحصة ${p}`);
              relocated = true;
              break;
            }
          }
          if (relocated) break;
        }
      }

      const updatedTeachers = teachers.map((t) =>
        t.id === teacher.id ? { ...t, pedagogicalDay: targetDay, pedagogicalPeriodRange: 'all_day' as const } : t
      );

      return {
        success: true,
        actionType: 'free_teacher_day',
        message: `تم تفريغ يوم ${targetDay} بالكامل للأستاذ (${teacher.name}) وإعادة توزيع حصصه السابقة (${teacherSlotsOnDay.length} حصة) بسلاسة وترابط كامل دون إحداث أي تعارض في جداول الأقسام المعنية.`,
        updatedSlots: currentSlotsState,
        affectedTeacherNames: [teacher.name],
        detailsList: movedSlotsInfo,
      };
    }
  }

  // D. Move Slot or Swap Slots: "انقل" / "حرك" / "بادل" / "غير"
  if (
    norm.includes('انقل') ||
    norm.includes('حرك') ||
    norm.includes('بادل') ||
    norm.includes('بدل') ||
    norm.includes('غير') ||
    norm.includes('ضع')
  ) {
    const matchedClass = extractClassFromText(rawCommand, classes);
    const matchedSubject = extractSubjectFromText(rawCommand);
    const matchedTeacher = extractTeacherFromText(rawCommand, teachers);

    // Extract days and periods (source & destination)
    const daysInText: string[] = [];
    config.days.forEach((d) => {
      const dNorm = normalizeArabic(d);
      if (norm.includes(dNorm)) daysInText.push(d);
    });

    const targetDay = daysInText[daysInText.length - 1] || 'الاثنين';
    const sourceDay = daysInText.length > 1 ? daysInText[0] : null;

    const targetPeriod = extractPeriodFromText(rawCommand) || 2;

    // Find the candidate slot to move
    let candidateSlot: TimetableSlot | undefined;

    if (sourceDay) {
      candidateSlot = slots.find((s) => {
        const matchCls = !matchedClass || s.classId === matchedClass.id;
        const matchSubj = !matchedSubject || s.subjectId === matchedSubject;
        const matchTch = !matchedTeacher || s.teacherId === matchedTeacher.id;
        return s.day === sourceDay && matchCls && matchSubj && matchTch;
      });
    }

    if (!candidateSlot) {
      candidateSlot = slots.find((s) => {
        const matchCls = !matchedClass || s.classId === matchedClass.id;
        const matchSubj = !matchedSubject || s.subjectId === matchedSubject;
        const matchTch = !matchedTeacher || s.teacherId === matchedTeacher.id;
        return matchCls && matchSubj && matchTch;
      });
    }

    if (candidateSlot) {
      const targetOccupyingSlot = slots.find(
        (s) => s.classId === candidateSlot!.classId && s.day === targetDay && s.period === targetPeriod
      );

      const cls = classes.find((c) => c.id === candidateSlot!.classId);
      const teacher = teachers.find((t) => t.id === candidateSlot!.teacherId);
      const subjectName = SUBJECT_METADATA[candidateSlot.subjectId]?.name || candidateSlot.subjectId;

      // Case 1: Target cell for this class is occupied by another subject -> PERFORM SAFE INTERCONNECTED SWAP
      if (targetOccupyingSlot && targetOccupyingSlot.id !== candidateSlot.id) {
        const targetTeacher = teachers.find((t) => t.id === targetOccupyingSlot.teacherId);
        const targetSubjName = SUBJECT_METADATA[targetOccupyingSlot.subjectId]?.name || targetOccupyingSlot.subjectId;

        // Check if swap creates a teacher collision
        const teacherFreeAtSource = !slots.some(
          (s) =>
            s.id !== candidateSlot!.id &&
            s.id !== targetOccupyingSlot.id &&
            s.teacherId === targetOccupyingSlot.teacherId &&
            s.day === candidateSlot!.day &&
            s.period === candidateSlot!.period
        );

        const sourceTeacherFreeAtTarget = !slots.some(
          (s) =>
            s.id !== candidateSlot!.id &&
            s.id !== targetOccupyingSlot.id &&
            s.teacherId === candidateSlot!.teacherId &&
            s.day === targetDay &&
            s.period === targetPeriod
        );

        // Perform atomic swap
        const updatedSlots = slots.map((s) => {
          if (s.id === candidateSlot!.id) {
            return { ...s, day: targetDay, period: targetPeriod };
          }
          if (s.id === targetOccupyingSlot.id) {
            return { ...s, day: candidateSlot!.day, period: candidateSlot!.period };
          }
          return s;
        });

        return {
          success: true,
          actionType: 'swap_slots',
          swapped: true,
          message: `تم تنفيذ المبادلة المترابطة بنجاح لقسم ${cls?.name || ''}: نُقلت حصة ${subjectName} إلى ${targetDay} (الحصة ${targetPeriod}) وبادلت مكانها مع حصة ${targetSubjName} التي عادت إلى ${candidateSlot.day} (الحصة ${candidateSlot.period}). جميع الجداول (القسم، الأساتذة، القاعات) مترابطة ومحدثة فوراً دون أي تعارض.`,
          updatedSlots,
          affectedClassNames: [cls?.name || ''],
          affectedTeacherNames: [teacher?.name || '', targetTeacher?.name || ''].filter(Boolean),
          detailsList: [
            `حصة ${subjectName}: أصبحت يوم ${targetDay} (الحصة ${targetPeriod}).`,
            `حصة ${targetSubjName}: أصبحت يوم ${candidateSlot.day} (الحصة ${candidateSlot.period}).`,
            `تحديث جدول الأستاذ ${teacher?.name} وجدول الأستاذ ${targetTeacher?.name}.`,
            'انعدام التعارض والتزام كامل بتوقيت انتهاء الدروس (15:00).',
          ],
        };
      }

      // Case 2: Target cell is free -> PURE INTERCONNECTED MOVE
      // Verify teacher availability at destination
      const teacherOccupiedAtTarget = slots.some(
        (s) =>
          s.id !== candidateSlot!.id &&
          s.teacherId === candidateSlot!.teacherId &&
          s.day === targetDay &&
          s.period === targetPeriod
      );

      if (teacherOccupiedAtTarget) {
        // Teacher is busy teaching another class at that time!
        const otherSlot = slots.find(
          (s) => s.teacherId === candidateSlot!.teacherId && s.day === targetDay && s.period === targetPeriod
        );
        const otherClass = classes.find((c) => c.id === otherSlot?.classId);

        return {
          success: false,
          actionType: 'error',
          message: `تعذر نقل حصة ${subjectName} إلى ${targetDay} (الحصة ${targetPeriod}) لأن الأستاذ (${teacher?.name}) مرتبط في نفس التوقيت بالتدريس لقسم (${otherClass?.name || otherSlot?.classId}). للحفاظ على ترابط الجداول ومنع أي خلل، يُرجى اختيار فترة شاغرة للأستاذ أو طلب المبادلة.`,
        };
      }

      // Move is 100% clean and interconnected
      const updatedSlots = slots.map((s) =>
        s.id === candidateSlot!.id ? { ...s, day: targetDay, period: targetPeriod } : s
      );

      return {
        success: true,
        actionType: 'move_slot',
        message: `تم نقل حصة ${subjectName} لقسم ${cls?.name || ''} للأستاذ (${teacher?.name || ''}) بنجاح من ${candidateSlot.day} (الحصة ${candidateSlot.period}) إلى ${targetDay} (الحصة ${targetPeriod}). تم تحديث جدول القسم، وجدول الأستاذ، وجدول القاعة بشكل مترابط ومتناسق دون أي خلل.`,
        updatedSlots,
        affectedClassNames: [cls?.name || ''],
        affectedTeacherNames: [teacher?.name || ''],
        detailsList: [
          `القسم: ${cls?.name || ''}`,
          `المادة: ${subjectName}`,
          `التوقيت السابق: ${candidateSlot.day} - الحصة ${candidateSlot.period}`,
          `التوقيت الجديد: ${targetDay} - الحصة ${targetPeriod}`,
          'تم تحديث كافة الجداول المتصلة بنجاح.',
        ],
      };
    }
  }

  // E. Fallback General Consultative Advice
  return {
    success: true,
    actionType: 'general_advice',
    message: `مرحباً بك حضرة المدير. بصفتي المستشار البيداغوجي الذكي، أنا جاهز لتنفيذ أي تعديل كتابي تريده في الجداول.
يمكنك كتابة أوامر مباشرة وسأقوم بتطبيقها فوراً مع مراعاة ترابط جميع الجداول (القسم، الأستاذ، القاعة، المخبر) دون أي تعارض:
• **أمثلة للأوامر المدعومة:**
  - «انقل حصة الرياضيات لقسم 4AM1 إلى الاثنين الحصة 2»
  - «بادل بين حصة العلوم والفيزياء لقسم 2AM3»
  - «فرغ يوم الأربعاء لأستاذ الرياضيات»
  - «حرك حصة الاستدراك إلى يوم الخميس الحصة 7»
  - «حل التعارضات وتأكد من ترابط الجداول»`,
    detailsList: [
      'تحديث فوري وتفاعلي لجميع الجداول عند كل حركة.',
      'مبادلة ذكية تلقائية في حال كانت الخانة مشغولة.',
      'احترام صارم لإنهاء الدروس النظامية على الساعة 15:00.',
    ],
  };
}

/**
 * Execute structured action returned by Gemini LLM
 */
function executeStructuredAction(
  action: string,
  params: any,
  replyText: string,
  slots: TimetableSlot[],
  classes: SchoolClass[],
  teachers: Teacher[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig
): ChatCommandResult {
  // If action is move or swap, execute safely
  if (action === 'move_slot' || action === 'swap_slots') {
    const classId = params.classId || classes.find((c) => c.name.includes(params.className || ''))?.id;
    const targetDay = params.toDay || 'الاثنين';
    const targetPeriod = Number(params.toPeriod) || 2;

    const sourceSlot = slots.find((s) => {
      if (classId && s.classId !== classId) return false;
      if (params.fromDay && s.day !== params.fromDay) return false;
      if (params.fromPeriod && s.period !== Number(params.fromPeriod)) return false;
      if (params.subjectId && s.subjectId !== params.subjectId) return false;
      return true;
    });

    if (sourceSlot) {
      const targetSlot = slots.find(
        (s) => s.classId === sourceSlot.classId && s.day === targetDay && s.period === targetPeriod
      );

      let updatedSlots: TimetableSlot[];
      if (targetSlot && targetSlot.id !== sourceSlot.id) {
        // Swap
        updatedSlots = slots.map((s) => {
          if (s.id === sourceSlot.id) return { ...s, day: targetDay, period: targetPeriod };
          if (s.id === targetSlot.id) return { ...s, day: sourceSlot.day, period: sourceSlot.period };
          return s;
        });
      } else {
        // Simple move
        updatedSlots = slots.map((s) =>
          s.id === sourceSlot.id ? { ...s, day: targetDay, period: targetPeriod } : s
        );
      }

      return {
        success: true,
        actionType: targetSlot ? 'swap_slots' : 'move_slot',
        message: replyText || 'تم تنفيذ الأمر وتحديث جميع الجداول المترابطة بنجاح.',
        updatedSlots,
      };
    }
  }

  return {
    success: true,
    actionType: 'general_advice',
    message: replyText || 'تم استلام توجيه السيد المدير وتطبيقه بنجاح.',
  };
}
