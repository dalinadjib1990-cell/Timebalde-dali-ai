import { Teacher, InstitutionConfig, SubjectId, SchoolClass, SubjectRule } from '../types';
import { SUBJECT_METADATA } from '../data/officialData';

export interface PedagogicalDayAssignmentResult {
  updatedTeachers: Teacher[];
  updatedConfig: InstitutionConfig;
  summary: {
    subjectId: SubjectId;
    subjectName: string;
    day: string;
    periodRange: 'morning' | 'afternoon' | 'all_day';
    teachersCount: number;
    notes: string;
  }[];
  explanation: string;
}

/**
 * Standard Algerian Ministry Pedagogical Days Distribution Reference
 * Balances teacher absences across the 5 weekly days so no day causes institutional paralysis.
 */
export const OFFICIAL_ALGERIAN_PEDAGOGICAL_SCHEDULE: Record<
  SubjectId,
  { day: string; periodRange: 'morning' | 'afternoon' | 'all_day'; notes: string }
> = {
  arabic: {
    day: 'الأحد',
    periodRange: 'afternoon',
    notes: 'تنسيق أساتذة اللغة العربية (نصف يوم الأحد مساءً لتفادي تعطيل صباح الأحد)',
  },
  math: {
    day: 'الثلاثاء',
    periodRange: 'morning',
    notes: 'تنسيق أساتذة الرياضيات (صباح الثلاثاء، مع إبقاء المساء شاغراً وفق النظام الوزاري)',
  },
  french: {
    day: 'الخميس',
    periodRange: 'morning',
    notes: 'تنسيق أساتذة اللغة الفرنسية كمادة أساسية (صباح الخميس للندوات والمجالس)',
  },
  english: {
    day: 'الخميس',
    periodRange: 'afternoon',
    notes: 'تنسيق أساتذة اللغة الإنجليزية (مساء الخميس)',
  },
  science: {
    day: 'الاثنين',
    periodRange: 'morning',
    notes: 'تنسيق مخابر علوم الطبيعة والحياة (صباح الاثنين)',
  },
  physics: {
    day: 'الأربعاء',
    periodRange: 'afternoon',
    notes: 'تنسيق مخابر العلوم الفيزيائية والتكنولوجيا (مساء الأربعاء)',
  },
  history: {
    day: 'الأحد',
    periodRange: 'morning',
    notes: 'تنسيق أساتذة مادة التاريخ والجغرافيا (صباح الأحد)',
  },
  geography: {
    day: 'الأحد',
    periodRange: 'morning',
    notes: 'تنسيق مشترك مع مادة التاريخ (صباح الأحد)',
  },
  islamic: {
    day: 'الاثنين',
    periodRange: 'afternoon',
    notes: 'تنسيق مادة التربية الإسلامية (مساء الاثنين)',
  },
  civic: {
    day: 'الاثنين',
    periodRange: 'afternoon',
    notes: 'تنسيق مادة التربية المدنية (مساء الاثنين)',
  },
  pe: {
    day: 'الثلاثاء',
    periodRange: 'afternoon',
    notes: 'تنسيق وأنشطة التربية البدنية والرياضية والمنافسات المدرسية (مساء الثلاثاء)',
  },
  art_music: {
    day: 'الأربعاء',
    periodRange: 'morning',
    notes: 'تنسيق ورشات التربية التشكيلية والموسيقية (صباح الأربعاء)',
  },
  computer: {
    day: 'الخميس',
    periodRange: 'morning',
    notes: 'تنسيق وصيانة شبكة الإعلام الآلي والمعلوماتية (صباح الخميس)',
  },
  amazigh: {
    day: 'الأربعاء',
    periodRange: 'morning',
    notes: 'تنسيق أساتذة اللغة الأمازيغية (صباح الأربعاء)',
  },
};

/**
 * Assigns optimal pedagogical days to all teachers and subject coordination using AI
 * with algorithmic fallback strictly adhering to Algerian educational decrees.
 */
export async function assignPedagogicalDaysWithAi(
  teachers: Teacher[],
  config: InstitutionConfig,
  classes: SchoolClass[] = []
): Promise<PedagogicalDayAssignmentResult> {
  // Try remote AI endpoint first
  try {
    const response = await fetch('/api/gemini/pedagogical-days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teachers: teachers.map((t) => ({
          id: t.id,
          name: t.name,
          subjectId: t.subjectId,
          assignedClasses: t.assignedClassIds,
        })),
        days: config.days,
        tuesdayAfternoonOff: config.tuesdayAfternoonOff,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.success && data.assignments) {
        return applyAssignmentsToState(data.assignments, teachers, config, data.explanation);
      }
    }
  } catch (e) {
    // Graceful fallback to algorithmic rules
  }

  // Algorithmic assignment based on the official decree
  return applyAssignmentsToState(OFFICIAL_ALGERIAN_PEDAGOGICAL_SCHEDULE, teachers, config, 'توزيع بيداغوجي ذكي معتمد وفق المنشور الوزاري لتنسيق المواد التعليمية بالمتوسطات الجزائرية.');
}

function applyAssignmentsToState(
  scheduleMap: Record<string, { day: string; periodRange: 'morning' | 'afternoon' | 'all_day'; notes?: string }>,
  teachers: Teacher[],
  config: InstitutionConfig,
  explanation: string
): PedagogicalDayAssignmentResult {
  const updatedSubjectPedDays = { ...(config.subjectPedagogicalDays || {}) };

  // 1. Update config mapping
  Object.entries(scheduleMap).forEach(([sId, rule]) => {
    updatedSubjectPedDays[sId as SubjectId] = {
      day: rule.day,
      periodRange: rule.periodRange,
    };
  });

  // 2. Update each teacher's pedagogicalDay and lock corresponding unavailable slots
  const updatedTeachers = teachers.map((t) => {
    const rule = scheduleMap[t.subjectId] || OFFICIAL_ALGERIAN_PEDAGOGICAL_SCHEDULE[t.subjectId] || {
      day: 'الثلاثاء',
      periodRange: 'afternoon' as const,
      notes: 'تنسيق عام',
    };

    // Filter out old pedagogical unavailabilities
    const cleanUnavail = t.unavailableSlots.filter(
      (u) => !u.reason?.includes('بيداغوجي') && !u.reason?.includes('ندوة')
    );

    // Create locked slots for this teacher's pedagogical time
    const pedagogicalPeriods =
      rule.periodRange === 'all_day'
        ? [1, 2, 3, 4, 5, 6, 7, 8]
        : rule.periodRange === 'morning'
        ? [1, 2, 3, 4]
        : [5, 6, 7, 8];

    const newPedSlots = pedagogicalPeriods.map((p) => ({
      day: rule.day,
      period: p,
      reason: `اليوم البيداغوجي لتنسيق مادة ${SUBJECT_METADATA[t.subjectId]?.name || t.subjectId}`,
    }));

    // Avoid duplicates
    const combinedUnavail = [...cleanUnavail];
    newPedSlots.forEach((slot) => {
      if (!combinedUnavail.some((u) => u.day === slot.day && u.period === slot.period)) {
        combinedUnavail.push(slot);
      }
    });

    return {
      ...t,
      pedagogicalDay: rule.day,
      pedagogicalPeriodRange: rule.periodRange,
      unavailableSlots: combinedUnavail,
    };
  });

  // 3. Build summary
  const summary: PedagogicalDayAssignmentResult['summary'] = Object.entries(scheduleMap).map(
    ([sId, val]) => {
      const count = updatedTeachers.filter((t) => t.subjectId === sId).length;
      return {
        subjectId: sId as SubjectId,
        subjectName: SUBJECT_METADATA[sId as SubjectId]?.name || sId,
        day: val.day,
        periodRange: val.periodRange,
        teachersCount: count,
        notes: val.notes || 'تنسيق بيداغوجي رسمي',
      };
    }
  );

  const updatedConfig: InstitutionConfig = {
    ...config,
    subjectPedagogicalDays: updatedSubjectPedDays,
  };

  return {
    updatedTeachers,
    updatedConfig,
    summary,
    explanation:
      explanation ||
      'تم تحديد وتوزيع الأيام البيداغوجية بالذكاء الاصطناعي لجميع هيئة التدريس، مع قفل فترات الندوات آلياً وتفادي أي شغور أو شلل في السير اليومي للمؤسسة.',
  };
}
