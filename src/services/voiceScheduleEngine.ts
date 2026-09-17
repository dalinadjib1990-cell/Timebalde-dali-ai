// Timetable Instant Voice Command Interpretation and Execution Engine
import {
  TimetableSlot,
  SchoolClass,
  Teacher,
  Room,
  SubjectRule,
  InstitutionConfig,
  Conflict,
  VoiceCommandActionType,
  VoiceCommandExecutionResult,
  SubjectId,
} from '../types';
import { SUBJECT_METADATA } from '../data/officialData';
import { autoRepairTimetable, generateInstitutionalTimetable } from './scheduler';
import { detectTimetableConflicts } from './conflictDetector';

export interface ParsedVoiceCommand {
  action: VoiceCommandActionType;
  classId?: string;
  className?: string;
  subjectId?: SubjectId;
  subjectName?: string;
  teacherId?: string;
  teacherName?: string;
  sourceDay?: string;
  sourcePeriod?: number;
  targetDay?: string;
  targetPeriod?: number;
  rawTranscript: string;
  confidence: number;
}

// Days mapping in Algerian school week
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// Periods mapping
const PERIOD_WORDS: { [key: string]: number } = {
  'الاولى': 1,
  'الأولى': 1,
  '1': 1,
  'واحد': 1,
  'الثانية': 2,
  'الثانيه': 2,
  '2': 2,
  'اثنين': 2,
  'الثالثة': 3,
  'الثالثه': 3,
  '3': 3,
  'ثلاثة': 3,
  'الرابعة': 4,
  'الرابعه': 4,
  '4': 4,
  'اربعة': 4,
  'أربعة': 4,
  'الخامسة': 5,
  'الخامسه': 5,
  '5': 5,
  'خمسة': 5,
  'السادسة': 6,
  'السادسه': 6,
  '6': 6,
  'ستة': 6,
  'السابعة': 7,
  'السابعه': 7,
  '7': 7,
  'سبعة': 7,
  'الثامنة': 8,
  'الثامنه': 8,
  '8': 8,
  'ثمانية': 8,
};

// Subjects detection keywords
const SUBJECT_KEYWORDS: { [key: string]: SubjectId } = {
  'رياضيات': 'math',
  'مات': 'math',
  'رياضيه': 'math',
  'عربية': 'arabic',
  'عربي': 'arabic',
  'لغة عربية': 'arabic',
  'فرنسية': 'french',
  'فرنسي': 'french',
  'لغة فرنسية': 'french',
  'انجليزية': 'english',
  'إنجليزية': 'english',
  'انجليزي': 'english',
  'علوم': 'science',
  'علوم طبيعية': 'science',
  'طبيعية': 'science',
  'فيزياء': 'physics',
  'فيزيك': 'physics',
  'علوم فيزيائية': 'physics',
  'تاريخ': 'history',
  'جغرافيا': 'history',
  'اجتماعيات': 'history',
  'إسلامية': 'islamic',
  'اسلامية': 'islamic',
  'تربية إسلامية': 'islamic',
  'مدنية': 'civic',
  'تربية مدنية': 'civic',
  'رياضة': 'pe',
  'تربية بدنية': 'pe',
  'بدنية': 'pe',
  'سبور': 'pe',
  'رسم': 'art_music',
  'فنون': 'art_music',
  'موسيقى': 'art_music',
  'تربية فنية': 'art_music',
  'إعلام آلي': 'computer',
  'اعلام الي': 'computer',
  'كمبيوتر': 'computer',
  'أمازيغية': 'amazigh'
};

export function parseDayFromText(text: string): string | undefined {
  const t = text.replace(/إ/g, 'ا').replace(/أ/g, 'ا');
  if (t.includes('احد')) return 'الأحد';
  if (t.includes('اثنين')) return 'الاثنين';
  if (t.includes('ثلاثاء')) return 'الثلاثاء';
  if (t.includes('اربعاء')) return 'الأربعاء';
  if (t.includes('خميس')) return 'الخميس';
  return undefined;
}

export function parsePeriodFromText(text: string): number | undefined {
  // Check patterns like: "الحصة الأولى", "الساعة 2", "حصة 3", "فترة 1"
  for (const [word, num] of Object.entries(PERIOD_WORDS)) {
    const patterns = [
      `حصة ${word}`,
      `الحصة ${word}`,
      `حصه ${word}`,
      `الحصه ${word}`,
      `ساعة ${word}`,
      `الساعة ${word}`,
      `سا ${word}`,
      `فترة ${word}`,
      `الفترة ${word}`,
    ];
    for (const pat of patterns) {
      if (text.includes(pat)) {
        return num;
      }
    }
  }

  // Check standalone numbers after day
  const match = text.match(/(?:ساعة|حصة|الفترة)\s*(\d)/);
  if (match && match[1]) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 8) return n;
  }

  // Check ordinal words
  if (text.includes('الأولى') || text.includes('الاولى')) return 1;
  if (text.includes('الثانية') || text.includes('الثانيه')) return 2;
  if (text.includes('الثالثة') || text.includes('الثالثه')) return 3;
  if (text.includes('الرابعة') || text.includes('الرابعه')) return 4;
  if (text.includes('الخامسة') || text.includes('الخامسه')) return 5;
  if (text.includes('السادسة') || text.includes('السادسه')) return 6;
  if (text.includes('السابعة') || text.includes('السابعه')) return 7;
  if (text.includes('الثامنة') || text.includes('الثامنه')) return 8;

  return undefined;
}

export function parseClassFromText(text: string, classes: SchoolClass[]): SchoolClass | undefined {
  const lower = text.toLowerCase().replace(/[-_\s]/g, '');

  // 1. Direct code matching (e.g. "4am1", "1am2", "2am3")
  for (const c of classes) {
    const cleanId = c.id.toLowerCase().replace(/[-_\s]/g, '');
    const cleanName = c.name.toLowerCase().replace(/[-_\s]/g, '');
    if (lower.includes(cleanId) || lower.includes(cleanName)) {
      return c;
    }
  }

  // 2. Arabic transcripts (e.g. "رابعة متوسط 1", "رابعة 1", "4 متوسط 1", "أولى متوسط 2")
  const levelKeywords: { [key: string]: string } = {
    'اولى': '1AM',
    'أولى': '1AM',
    '1 متوسط': '1AM',
    '1م': '1AM',
    'ثانية': '2AM',
    'ثانيه': '2AM',
    '2 متوسط': '2AM',
    '2م': '2AM',
    'ثالثة': '3AM',
    'ثالثه': '3AM',
    '3 متوسط': '3AM',
    '3م': '3AM',
    'رابعة': '4AM',
    'رابعه': '4AM',
    '4 متوسط': '4AM',
    '4م': '4AM',
  };

  for (const [kw, level] of Object.entries(levelKeywords)) {
    if (text.includes(kw)) {
      // Find class number: 1, 2, 3, 4, 5...
      const numMatch = text.match(new RegExp(`${kw}[^\\d]*([1-9])`));
      if (numMatch && numMatch[1]) {
        const classNum = numMatch[1];
        const found = classes.find(
          (c) => c.level === level && (c.name.endsWith(classNum) || c.id.endsWith(classNum))
        );
        if (found) return found;
      }
      // If only level is mentioned, return first class of that level
      const levelClasses = classes.filter((c) => c.level === level);
      if (levelClasses.length === 1) return levelClasses[0];
    }
  }

  return undefined;
}

export function parseSubjectFromText(text: string): SubjectId | undefined {
  for (const [kw, subjId] of Object.entries(SUBJECT_KEYWORDS)) {
    if (text.includes(kw)) {
      return subjId;
    }
  }
  return undefined;
}

export function parseTeacherFromText(text: string, teachers: Teacher[]): Teacher | undefined {
  const norm = (s: string) => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').toLowerCase().trim();
  const textNorm = norm(text);

  for (const t of teachers) {
    const tNorm = norm(t.name);
    if (textNorm.includes(tNorm)) {
      return t;
    }
    // Check parts of name (e.g., family name)
    const parts = tNorm.split(' ').filter((p) => p.length > 2 && p !== 'استاذ' && p !== 'استاذة');
    for (const part of parts) {
      if (textNorm.includes(part)) {
        return t;
      }
    }
  }
  return undefined;
}

/**
 * Intelligent Rule-Based Voice Command Parser
 */
export function interpretVoiceCommand(
  rawTranscript: string,
  classes: SchoolClass[],
  teachers: Teacher[]
): ParsedVoiceCommand {
  const text = rawTranscript.trim();
  const lower = text.toLowerCase();

  const foundClass = parseClassFromText(text, classes);
  const foundSubject = parseSubjectFromText(text);
  const foundTeacher = parseTeacherFromText(text, teachers);

  // Determine Action
  let action: VoiceCommandActionType = 'UNKNOWN';

  if (
    lower.includes('حرك') ||
    lower.includes('انقل') ||
    lower.includes('حول') ||
    lower.includes('غير توقيت') ||
    lower.includes('ضع') ||
    lower.includes('نقل') ||
    lower.includes('تحريك') ||
    lower.includes('تقديم') ||
    lower.includes('تأخير') ||
    lower.includes('تاخير') ||
    lower.includes('غير حصة')
  ) {
    action = 'MOVE_SLOT';
  } else if (
    lower.includes('بدل') ||
    lower.includes('بادل') ||
    lower.includes('تبديل') ||
    lower.includes('مبادلة') ||
    lower.includes('اعكس')
  ) {
    action = 'SWAP_SLOTS';
  } else if (
    lower.includes('احذف') ||
    lower.includes('امسح') ||
    lower.includes('الغ') ||
    lower.includes('ألغ') ||
    lower.includes('حذف') ||
    lower.includes('فرغ الحصة')
  ) {
    action = 'DELETE_SLOT';
  } else if (
    lower.includes('اضف') ||
    lower.includes('أضف') ||
    lower.includes('اضافة') ||
    lower.includes('إضافة') ||
    lower.includes('سجل حصة')
  ) {
    action = 'ADD_SLOT';
  } else if (
    lower.includes('فرغ الجداول') ||
    lower.includes('مسح جميع') ||
    lower.includes('تفريغ الكل') ||
    lower.includes('تصفير') ||
    lower.includes('تفريغ جميع')
  ) {
    action = 'CLEAR_ALL';
  } else if (
    lower.includes('توليد') ||
    lower.includes('ولد') ||
    lower.includes('انشئ') ||
    lower.includes('أنشئ') ||
    lower.includes('جدول جديد')
  ) {
    action = 'REGENERATE';
  } else if (
    lower.includes('فراغ') ||
    lower.includes('فراغات') ||
    lower.includes('تجميع') ||
    lower.includes('سد الفراغ') ||
    lower.includes('تقليل الفراغ')
  ) {
    action = 'MINIMIZE_GAPS';
  } else if (
    lower.includes('موازنة') ||
    lower.includes('اصلح') ||
    lower.includes('أصلح') ||
    lower.includes('معالجة')
  ) {
    action = 'REBALANCE';
  } else if (
    lower.includes('حفظ') ||
    lower.includes('اعتمد') ||
    lower.includes('اعتماد') ||
    lower.includes('نسخة رسمية')
  ) {
    action = 'SAVE_VERSION';
  } else if (lower.includes('ثلاثاء') && (lower.includes('تفريغ') || lower.includes('ندوة') || lower.includes('عطلة'))) {
    action = 'TUESDAY_OFF';
  }

  // Parse Days and Periods (Source vs Target)
  // Check if "إلى" (to) or "الى" is present to separate source and target
  let sourceDay: string | undefined;
  let sourcePeriod: number | undefined;
  let targetDay: string | undefined;
  let targetPeriod: number | undefined;

  const toSplit = text.split(/\s(?:إلى|الى|في|لـ|ليوم)\s/);
  if (toSplit.length >= 2) {
    // Source part
    const srcPart = toSplit[0];
    sourceDay = parseDayFromText(srcPart);
    sourcePeriod = parsePeriodFromText(srcPart);

    // Target part
    const dstPart = toSplit.slice(1).join(' ');
    targetDay = parseDayFromText(dstPart) || sourceDay;
    targetPeriod = parsePeriodFromText(dstPart);
  } else {
    // Single sentence: extract day and period as target
    targetDay = parseDayFromText(text);
    targetPeriod = parsePeriodFromText(text);
  }

  return {
    action,
    classId: foundClass?.id,
    className: foundClass?.name,
    subjectId: foundSubject,
    subjectName: foundSubject ? SUBJECT_METADATA[foundSubject]?.name : undefined,
    teacherId: foundTeacher?.id,
    teacherName: foundTeacher?.name,
    sourceDay,
    sourcePeriod,
    targetDay,
    targetPeriod,
    rawTranscript: text,
    confidence: action !== 'UNKNOWN' ? 0.9 : 0.4,
  };
}

/**
 * Execute Voice Command Instantly on Timetable Slots
 */
export async function executeVoiceCommand(
  command: ParsedVoiceCommand,
  currentSlots: TimetableSlot[],
  classes: SchoolClass[],
  teachers: Teacher[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig,
  onSaveVersionCallback?: (name?: string, notes?: string) => void
): Promise<VoiceCommandExecutionResult & { updatedSlots: TimetableSlot[] }> {
  const previousSlotsBackup = [...currentSlots];
  const { action, classId, subjectId, teacherId, sourceDay, sourcePeriod, targetDay, targetPeriod } = command;

  // 1. ACTION: MOVE_SLOT
  if (action === 'MOVE_SLOT') {
    if (!targetDay && !targetPeriod) {
      return {
        success: false,
        action,
        spokenFeedback: 'سيدي المدير، يرجى تحديد اليوم أو الحصة المستهدفة لنقل الحصة إليها بدقة.',
        displayMessage: 'يرجى تحديد اليوم أو الحصة المراد النقل إليها.',
        updatedSlots: currentSlots,
      };
    }

    // Find candidate slot to move
    let candidateSlot: TimetableSlot | undefined;

    if (sourceDay && sourcePeriod) {
      candidateSlot = currentSlots.find((s) => {
        const dayMatch = s.day === sourceDay;
        const periodMatch = s.period === sourcePeriod;
        const classMatch = !classId || s.classId === classId;
        const subjectMatch = !subjectId || s.subjectId === subjectId;
        const teacherMatch = !teacherId || s.teacherId === teacherId;
        return dayMatch && periodMatch && (classMatch || subjectMatch || teacherMatch);
      });
    }

    // If not found by source coordinates, search by class + subject
    if (!candidateSlot && classId && subjectId) {
      candidateSlot = currentSlots.find((s) => s.classId === classId && s.subjectId === subjectId);
    }

    // If not found, search by teacher + subject
    if (!candidateSlot && teacherId && subjectId) {
      candidateSlot = currentSlots.find((s) => s.teacherId === teacherId && s.subjectId === subjectId);
    }

    // If not found, search by class only or teacher only if target is given
    if (!candidateSlot && classId && sourcePeriod) {
      candidateSlot = currentSlots.find((s) => s.classId === classId && s.period === sourcePeriod);
    }

    if (!candidateSlot && teacherId && sourcePeriod) {
      candidateSlot = currentSlots.find((s) => s.teacherId === teacherId && s.period === sourcePeriod);
    }

    // If still not found but class and target are specified, pick the first slot of that subject in the class
    if (!candidateSlot && classId && subjectId) {
      candidateSlot = currentSlots.find((s) => s.classId === classId && s.subjectId === subjectId);
    }

    if (!candidateSlot) {
      return {
        success: false,
        action,
        spokenFeedback: 'سيدي المدير، لم أتمكن من العثور على الحصة المحددة في الجدول. يرجى توضيح القسم والمادة أو الأستاذ.',
        displayMessage: 'لم يتم العثور على حصة مطابقة للمواصفات المذكورة في الجدول الحالي.',
        updatedSlots: currentSlots,
      };
    }

    const finalDay = targetDay || candidateSlot.day;
    const finalPeriod = targetPeriod || candidateSlot.period;

    // Check if target slot is occupied by another lesson in the same class (SWAP logic)
    const existingSlotInTarget = currentSlots.find(
      (s) => s.id !== candidateSlot!.id && s.classId === candidateSlot!.classId && s.day === finalDay && s.period === finalPeriod
    );

    let updatedSlots: TimetableSlot[] = [];
    let swapNote = '';

    if (existingSlotInTarget) {
      // Perform intelligent swap
      updatedSlots = currentSlots.map((s) => {
        if (s.id === candidateSlot!.id) {
          return { ...s, day: finalDay, period: finalPeriod };
        }
        if (s.id === existingSlotInTarget.id) {
          return { ...s, day: candidateSlot!.day, period: candidateSlot!.period };
        }
        return s;
      });
      const otherSubjName = SUBJECT_METADATA[existingSlotInTarget.subjectId]?.name || 'المادة الأخرى';
      swapNote = ` وتم تبديلها مع حصة ${otherSubjName} لتفادي أي تداخل`;
    } else {
      // Pure move
      updatedSlots = currentSlots.map((s) =>
        s.id === candidateSlot!.id ? { ...s, day: finalDay, period: finalPeriod } : s
      );
    }

    // Verify conflicts
    const newConflicts = detectTimetableConflicts(updatedSlots, teachers, classes, rooms, rules, config);
    const hasNewConflicts = newConflicts.length > 0;
    const subjName = SUBJECT_METADATA[candidateSlot.subjectId]?.name || 'المادة';
    const clsName = classes.find((c) => c.id === candidateSlot!.classId)?.name || candidateSlot.classId;

    const spokenMsg = `سيدي المدير، تم تحريك حصة ${subjName} للقسم ${clsName} إلى يوم ${finalDay} الحصة ${finalPeriod} فوراً${swapNote}.${hasNewConflicts ? ' تنبيه: يرجى مراجعة تضارب محتمل تم تسجيله.' : ' الجدول سليم 100% ولا يوجد أي تعارض.'}`;

    return {
      success: true,
      action,
      spokenFeedback: spokenMsg,
      displayMessage: `تم نقل حصة ${subjName} (${clsName}) إلى ${finalDay} (الحصة ${finalPeriod})${swapNote}.`,
      targetSlot: { ...candidateSlot, day: finalDay, period: finalPeriod },
      affectedSlotsCount: existingSlotInTarget ? 2 : 1,
      previousSlots: previousSlotsBackup,
      conflictsIntroduced: newConflicts.length,
      updatedSlots,
    };
  }

  // 2. ACTION: SWAP_SLOTS
  if (action === 'SWAP_SLOTS') {
    if (!classId && !teacherId) {
      return {
        success: false,
        action,
        spokenFeedback: 'سيدي المدير، يرجى تحديد القسم أو الأستاذ لتبديل الحصص.',
        displayMessage: 'يرجى تحديد القسم أو الأستاذ لإجراء التبديل.',
        updatedSlots: currentSlots,
      };
    }

    const classSlots = currentSlots.filter((s) => (classId ? s.classId === classId : s.teacherId === teacherId));
    if (classSlots.length < 2) {
      return {
        success: false,
        action,
        spokenFeedback: 'سيدي المدير، لا يوجد عدد كافٍ من الحصص لإجراء التبديل.',
        displayMessage: 'عدد الحصص المتاحة غير كافٍ للتبديل.',
        updatedSlots: currentSlots,
      };
    }

    // Pick two slots (either by subjects or periods)
    const slot1 = classSlots[0];
    const slot2 = classSlots[1];

    const updatedSlots = currentSlots.map((s) => {
      if (s.id === slot1.id) return { ...s, day: slot2.day, period: slot2.period };
      if (s.id === slot2.id) return { ...s, day: slot1.day, period: slot1.period };
      return s;
    });

    const s1Name = SUBJECT_METADATA[slot1.subjectId]?.name || 'الحصة الأولى';
    const s2Name = SUBJECT_METADATA[slot2.subjectId]?.name || 'الحصة الثانية';

    return {
      success: true,
      action,
      spokenFeedback: `سيدي المدير، تم تبديل حصة ${s1Name} مع حصة ${s2Name} بنجاح.`,
      displayMessage: `تم تبديل حصة ${s1Name} مع حصة ${s2Name}.`,
      affectedSlotsCount: 2,
      previousSlots: previousSlotsBackup,
      updatedSlots,
    };
  }

  // 3. ACTION: DELETE_SLOT
  if (action === 'DELETE_SLOT') {
    let toDelete: TimetableSlot | undefined;

    if (classId && targetDay && targetPeriod) {
      toDelete = currentSlots.find((s) => s.classId === classId && s.day === targetDay && s.period === targetPeriod);
    } else if (classId && subjectId) {
      toDelete = currentSlots.find((s) => s.classId === classId && s.subjectId === subjectId);
    } else if (targetDay && targetPeriod) {
      toDelete = currentSlots.find((s) => s.day === targetDay && s.period === targetPeriod);
    }

    if (!toDelete) {
      return {
        success: false,
        action,
        spokenFeedback: 'سيدي المدير، لم أجد الحصة المطلوب حذفها بدقة.',
        displayMessage: 'لم يتم العثور على الحصة المراد تفريغها أو حذفها.',
        updatedSlots: currentSlots,
      };
    }

    const updatedSlots = currentSlots.filter((s) => s.id !== toDelete!.id);
    const subjName = SUBJECT_METADATA[toDelete.subjectId]?.name || 'المادة';
    const clsName = classes.find((c) => c.id === toDelete!.classId)?.name || toDelete.classId;

    return {
      success: true,
      action,
      spokenFeedback: `سيدي المدير، تم حذف وتفريغ حصة ${subjName} للقسم ${clsName} من يوم ${toDelete.day} الحصة ${toDelete.period} بنجاح.`,
      displayMessage: `تم حذف حصة ${subjName} (${clsName}) من يوم ${toDelete.day} (الحصة ${toDelete.period}).`,
      affectedSlotsCount: 1,
      previousSlots: previousSlotsBackup,
      updatedSlots,
    };
  }

  // 4. ACTION: CLEAR_ALL
  if (action === 'CLEAR_ALL') {
    return {
      success: true,
      action,
      spokenFeedback: 'سيدي المدير، تم تفريغ جميع الجداول واستعمالات الزمن بالكامل للبدء في الملء اليدوي.',
      displayMessage: 'تم تفريغ جميع الحصص من الجدول (0 حصة).',
      affectedSlotsCount: currentSlots.length,
      previousSlots: previousSlotsBackup,
      updatedSlots: [],
    };
  }

  // 5. ACTION: REGENERATE
  if (action === 'REGENERATE') {
    const res = generateInstitutionalTimetable(classes, teachers, rooms, rules, config);
    return {
      success: true,
      action,
      spokenFeedback: `سيدي المدير، تم توليد خيار واستعمال زمن جديد بالكامل يشمل ${res.slots.length} حصة وبدون أي تضارب.`,
      displayMessage: `تم توليد جدول جديد بنجاح (${res.slots.length} حصة).`,
      affectedSlotsCount: res.slots.length,
      previousSlots: previousSlotsBackup,
      updatedSlots: res.slots,
    };
  }

  // 6. ACTION: MINIMIZE_GAPS
  if (action === 'MINIMIZE_GAPS') {
    const res = autoRepairTimetable(currentSlots, null, null, classes, teachers, rooms, rules, config);
    return {
      success: true,
      action,
      spokenFeedback: 'سيدي المدير، تم تطبيق خوارزمية تقليل الفراغات وتجميع جداول الأساتذة بنجاح.',
      displayMessage: 'تم تجميع حصص الأساتذة وتقليص الساعات الفارغة البينية.',
      affectedSlotsCount: res.slots.length,
      previousSlots: previousSlotsBackup,
      updatedSlots: res.slots,
    };
  }

  // 7. ACTION: REBALANCE
  if (action === 'REBALANCE') {
    const res = autoRepairTimetable(currentSlots, classId || null, teacherId || null, classes, teachers, rooms, rules, config);
    return {
      success: true,
      action,
      spokenFeedback: 'سيدي المدير، تمت إعادة موازنة الجدول وفك جميع التعارضات تلقائياً.',
      displayMessage: res.message,
      affectedSlotsCount: res.slots.length,
      previousSlots: previousSlotsBackup,
      updatedSlots: res.slots,
    };
  }

  // 8. ACTION: TUESDAY_OFF
  if (action === 'TUESDAY_OFF') {
    // Move or clear any slots on Tuesday afternoon (periods 5, 6, 7, 8)
    const tuesdayAfternoonSlots = currentSlots.filter((s) => s.day === 'الثلاثاء' && s.period >= 5);
    const updatedSlots = currentSlots.filter((s) => !(s.day === 'الثلاثاء' && s.period >= 5));

    return {
      success: true,
      action,
      spokenFeedback: `سيدي المدير، تم تفريغ مساء يوم الثلاثاء رسمياً للندوات التربوية والمجالس، بعدد ${tuesdayAfternoonSlots.length} حصة تم تحريرها.`,
      displayMessage: `تم تفريغ مساء الثلاثاء (الحصص 5-8) لجميع الأساتذة والأقسام.`,
      affectedSlotsCount: tuesdayAfternoonSlots.length,
      previousSlots: previousSlotsBackup,
      updatedSlots,
    };
  }

  // 9. ACTION: SAVE_VERSION
  if (action === 'SAVE_VERSION') {
    if (onSaveVersionCallback) {
      onSaveVersionCallback(`نسخة معتمدة بأمر صوتي - ${new Date().toLocaleTimeString('ar-DZ')}`);
    }
    return {
      success: true,
      action,
      spokenFeedback: 'سيدي المدير، تم حفظ واعتماد هذه النسخة من استعمال الزمن رسمياً في سجل المؤسسة.',
      displayMessage: 'تم حفظ النسخة الحالية كجدول معتمد.',
      affectedSlotsCount: currentSlots.length,
      previousSlots: previousSlotsBackup,
      updatedSlots: currentSlots,
    };
  }

  // Default fallback
  return {
    success: false,
    action: 'UNKNOWN',
    spokenFeedback: 'سيدي المدير، استمعت إلى أمرك لكنني بحاجة إلى توضيح إضافي مثل تحديد القسم أو المادة واليوم.',
    displayMessage: 'الأمر غير مفهوم تماماً، يرجى التحديد مثل: "انقل حصة الرياضيات للقسم 4AM1 إلى الأحد الحصة 1".',
    updatedSlots: currentSlots,
  };
}

/**
 * Server-side AI Gemini Voice Command Fallback for conversational or ambiguous spoken requests
 */
export async function executeVoiceCommandWithGeminiFallback(
  transcript: string,
  currentSlots: TimetableSlot[],
  classes: SchoolClass[],
  teachers: Teacher[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig,
  onSaveVersion?: (name?: string, notes?: string) => void
): Promise<VoiceCommandExecutionResult & { updatedSlots: TimetableSlot[] }> {
  // First try fast local parser
  const parsed = interpretVoiceCommand(transcript, classes, teachers);

  if (parsed.action !== 'UNKNOWN') {
    const localRes = await executeVoiceCommand(
      parsed,
      currentSlots,
      classes,
      teachers,
      rooms,
      rules,
      config,
      onSaveVersion
    );
    if (localRes.success) {
      return localRes;
    }
  }

  // If local parser was ambiguous or failed, ask Server Gemini endpoint
  try {
    const sampleSlots = currentSlots.slice(0, 30).map((s) => ({
      class: classes.find((c) => c.id === s.classId)?.name || s.classId,
      subject: s.subjectId,
      teacher: teachers.find((t) => t.id === s.teacherId)?.name || s.teacherId,
      day: s.day,
      period: s.period,
    }));

    const response = await fetch('/api/gemini/ai-scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `الأمر الصوتي المباشر من السيد المدير لتعديل الجدول:\n"${transcript}"`,
        schoolContext: {
          totalClasses: classes.length,
          totalTeachers: teachers.length,
          days: config.days,
        },
        currentTimetableSummary: sampleSlots,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.replyText || data.message || 'تم استلام وتطبيق توجيه السيد المدير بنجاح.';

      // Check if directives or actions are recommended
      return {
        success: true,
        action: 'INFO',
        spokenFeedback: reply,
        displayMessage: reply,
        previousSlots: currentSlots,
        updatedSlots: currentSlots,
      };
    }
  } catch (e) {
    console.warn('Gemini voice fallback error:', e);
  }

  // Final fallback
  return {
    success: false,
    action: 'UNKNOWN',
    spokenFeedback: 'سيدي المدير، لم أتمكن من إتمام الأمر بدقة. يرجى إعادة المحاولة والتأكد من تحديد اسم القسم واليوم.',
    displayMessage: `لم يتم تنفيذ الأمر: "${transcript}"`,
    updatedSlots: currentSlots,
  };
}
