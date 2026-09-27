import { InstitutionConfig, SchoolClass, Teacher, Room } from '../types';

export function getPeriodsForShift(shift: 'standard' | 'early_13h' | 'late_14h') {
  const morningPeriods = [
    { id: 1, name: 'الحصة 1', timeRange: '08:00 - 09:00', isMorning: true },
    { id: 2, name: 'الحصة 2', timeRange: '09:00 - 10:00', isMorning: true },
    { id: 3, name: 'الحصة 3', timeRange: '10:00 - 11:00', isMorning: true },
    { id: 4, name: 'الحصة 4', timeRange: '11:00 - 12:00', isMorning: true },
  ];

  if (shift === 'early_13h') {
    return [
      ...morningPeriods,
      { id: 5, name: 'الحصة 5', timeRange: '13:00 - 14:00', isMorning: false },
      { id: 6, name: 'الحصة 6', timeRange: '14:00 - 15:00', isMorning: false },
      { id: 7, name: 'الحصة 7 (استدراك)', timeRange: '15:00 - 16:00', isMorning: false },
      { id: 8, name: 'الحصة 8', timeRange: '16:00 - 17:00', isMorning: false },
    ];
  }

  if (shift === 'late_14h') {
    return [
      ...morningPeriods,
      { id: 5, name: 'الحصة 5', timeRange: '14:00 - 15:00', isMorning: false },
      { id: 6, name: 'الحصة 6', timeRange: '15:00 - 16:00', isMorning: false },
      { id: 7, name: 'الحصة 7 (استدراك)', timeRange: '16:00 - 17:00', isMorning: false },
      { id: 8, name: 'الحصة 8', timeRange: '17:00 - 18:00', isMorning: false },
    ];
  }

  // Standard 13:00 - 17:00 (نظام المتوسطات الجزائرية المعتمد: إنهاء الدروس النظامية 15:00)
  return [
    ...morningPeriods,
    { id: 5, name: 'الحصة 5', timeRange: '13:00 - 14:00', isMorning: false },
    { id: 6, name: 'الحصة 6', timeRange: '14:00 - 15:00', isMorning: false },
    { id: 7, name: 'الحصة 7 (استدراك)', timeRange: '15:00 - 16:00', isMorning: false },
    { id: 8, name: 'الحصة 8', timeRange: '16:00 - 17:00', isMorning: false },
  ];
}

export const DEFAULT_INSTITUTION_CONFIG: InstitutionConfig = {
  name: 'متوسطة العربي بن مهيدي النموذجية',
  academicYear: '2026/2027',
  directorName: 'الأستاذ دالي نجيب (مدير المؤسسة)',
  educationDirectorate: 'مديرية التربية لولاية الجزائر وسط',
  commune: 'الجزائر العاصمة',
  days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  periods: getPeriodsForShift('early_13h'),
  tuesdayAfternoonOff: true,
  enableAmazigh: false,
  enableComputerScience: true,
  afternoonShiftMode: 'early_13h',
  hasAnnex: true,
  annexName: 'ملحقة المؤسسة (3 أقسام 2 متوسط)',
  remedialDay: 'الأربعاء',
  remedialPeriod: 7,
  subjectPedagogicalDays: {
    arabic: { day: 'الأحد', periodRange: 'afternoon' },
    math: { day: 'الثلاثاء', periodRange: 'morning' },
    french: { day: 'الخميس', periodRange: 'morning' },
    english: { day: 'الخميس', periodRange: 'afternoon' },
    science: { day: 'الاثنين', periodRange: 'morning' },
    physics: { day: 'الأربعاء', periodRange: 'afternoon' },
    history: { day: 'الأحد', periodRange: 'morning' },
    geography: { day: 'الأحد', periodRange: 'morning' },
    pe: { day: 'الثلاثاء', periodRange: 'afternoon' },
    islamic: { day: 'الاثنين', periodRange: 'afternoon' },
    civic: { day: 'الاثنين', periodRange: 'afternoon' },
    art_music: { day: 'الأربعاء', periodRange: 'morning' },
    computer: { day: 'الخميس', periodRange: 'morning' },
  },
};

// Default classes (20 classes: 5 in 1AM, 6 in 2AM, 5 in 3AM, 4 in 4AM)
export const DEFAULT_CLASSES: SchoolClass[] = [
  // 1 متوسط (5 أقسام)
  { id: '1am1', name: '1AM1', level: '1AM', studentCount: 36, assignedRoomId: 'room-01' },
  { id: '1am2', name: '1AM2', level: '1AM', studentCount: 35, assignedRoomId: 'room-02' },
  { id: '1am3', name: '1AM3', level: '1AM', studentCount: 38, assignedRoomId: 'room-03' },
  { id: '1am4', name: '1AM4', level: '1AM', studentCount: 34, assignedRoomId: 'room-04' },
  { id: '1am5', name: '1AM5', level: '1AM', studentCount: 36, assignedRoomId: 'room-05' },

  // 2 متوسط (6 أقسام - منها 3 أقسام في ملحقة المؤسسة)
  { id: '2am1', name: '2AM1', level: '2AM', studentCount: 38, assignedRoomId: 'room-06' },
  { id: '2am2', name: '2AM2', level: '2AM', studentCount: 37, assignedRoomId: 'room-07' },
  { id: '2am3', name: '2AM3', level: '2AM', studentCount: 35, assignedRoomId: 'room-08' },
  { id: '2am4', name: '2AM4 (ملحقة)', level: '2AM', studentCount: 36, assignedRoomId: 'room-09', isAnnex: true, annexName: 'ملحقة المؤسسة' },
  { id: '2am5', name: '2AM5 (ملحقة)', level: '2AM', studentCount: 38, assignedRoomId: 'room-10', isAnnex: true, annexName: 'ملحقة المؤسسة' },
  { id: '2am6', name: '2AM6 (ملحقة)', level: '2AM', studentCount: 34, assignedRoomId: 'room-11', isAnnex: true, annexName: 'ملحقة المؤسسة' },

  // 3 متوسط (5 أقسام)
  { id: '3am1', name: '3AM1', level: '3AM', studentCount: 35, assignedRoomId: 'room-12' },
  { id: '3am2', name: '3AM2', level: '3AM', studentCount: 36, assignedRoomId: 'room-13' },
  { id: '3am3', name: '3AM3', level: '3AM', studentCount: 34, assignedRoomId: 'room-14' },
  { id: '3am4', name: '3AM4', level: '3AM', studentCount: 37, assignedRoomId: 'room-15' },
  { id: '3am5', name: '3AM5', level: '3AM', studentCount: 36, assignedRoomId: 'room-16' },

  // 4 متوسط (4 أقسام)
  { id: '4am1', name: '4AM1', level: '4AM', studentCount: 34, assignedRoomId: 'room-17' },
  { id: '4am2', name: '4AM2', level: '4AM', studentCount: 35, assignedRoomId: 'room-18' },
  { id: '4am3', name: '4AM3', level: '4AM', studentCount: 33, assignedRoomId: 'room-19' },
  { id: '4am4', name: '4AM4', level: '4AM', studentCount: 36, assignedRoomId: 'room-20' },
];

export const DEFAULT_ROOMS: Room[] = [
  // Classrooms 1 to 20
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `room-${String(i + 1).padStart(2, '0')}`,
    name: `قاعة التدريس رقم ${i + 1}`,
    type: 'regular' as const,
    capacity: 40,
    isShared: false,
  })),
  // Specialized Rooms & Labs
  { id: 'lab-sci-1', name: 'مخبر علوم الطبيعة والحياة 1', type: 'science_lab', capacity: 20, isShared: true },
  { id: 'lab-sci-2', name: 'مخبر علوم الطبيعة والحياة 2', type: 'science_lab', capacity: 20, isShared: true },
  { id: 'lab-phy-1', name: 'مخبر العلوم الفيزيائية والتكنولوجيا 1', type: 'physics_lab', capacity: 20, isShared: true },
  { id: 'lab-phy-2', name: 'مخبر العلوم الفيزيائية والتكنولوجيا 2', type: 'physics_lab', capacity: 20, isShared: true },
  { id: 'lab-comp-1', name: 'قاعة الإعلام الآلي (المعلوماتية)', type: 'computer_lab', capacity: 25, isShared: true },
  { id: 'art-room-1', name: 'ورشة التربية الفنية والموسيقية', type: 'art_room', capacity: 40, isShared: true },
  { id: 'sport-field-1', name: 'الميدان وفناء التربية البدنية 1', type: 'sports_ground', capacity: 80, isShared: true },
  { id: 'sport-field-2', name: 'الميدان وفناء التربية البدنية 2', type: 'sports_ground', capacity: 80, isShared: true },
];

// No fake/dummy teacher names! The principal fills their actual teachers list manually
export const DEFAULT_TEACHERS: Teacher[] = [];

/**
 * Generates clean structural teaching positions WITHOUT fake personal names
 * (e.g. "أستاذ رياضيات 1", "أستاذ لغة عربية 1") based on the actual classes count
 */
export function generateStructuralTeacherPositions(
  classes: SchoolClass[],
  rules?: any[]
): Teacher[] {
  if (!classes || classes.length === 0) return [];
  const classIds = classes.map((c) => c.id);
  const totalClasses = classes.length;

  const positions: Teacher[] = [];

  const subjectConfigs: { id: any; namePrefix: string; hoursPerClass: number; maxPerTeacher: number; pedDay: string; pedRange: 'morning' | 'afternoon' }[] = [
    { id: 'arabic', namePrefix: 'أستاذ(ة) اللغة العربية', hoursPerClass: 5, maxPerTeacher: 4, pedDay: 'الأحد', pedRange: 'afternoon' },
    { id: 'math', namePrefix: 'أستاذ(ة) الرياضيات', hoursPerClass: 5, maxPerTeacher: 4, pedDay: 'الثلاثاء', pedRange: 'morning' },
    { id: 'french', namePrefix: 'أستاذ(ة) اللغة الفرنسية', hoursPerClass: 4, maxPerTeacher: 5, pedDay: 'الخميس', pedRange: 'morning' },
    { id: 'english', namePrefix: 'أستاذ(ة) اللغة الإنجليزية', hoursPerClass: 2, maxPerTeacher: 10, pedDay: 'الخميس', pedRange: 'afternoon' },
    { id: 'science', namePrefix: 'أستاذ(ة) العلوم الطبيعية', hoursPerClass: 2, maxPerTeacher: 10, pedDay: 'الاثنين', pedRange: 'morning' },
    { id: 'physics', namePrefix: 'أستاذ(ة) العلوم الفيزيائية', hoursPerClass: 2, maxPerTeacher: 10, pedDay: 'الأربعاء', pedRange: 'afternoon' },
    { id: 'history', namePrefix: 'أستاذ(ة) التاريخ والجغرافيا', hoursPerClass: 2, maxPerTeacher: 10, pedDay: 'الأحد', pedRange: 'morning' },
    { id: 'islamic', namePrefix: 'أستاذ(ة) التربية الإسلامية', hoursPerClass: 1, maxPerTeacher: 18, pedDay: 'الاثنين', pedRange: 'afternoon' },
    { id: 'civic', namePrefix: 'أستاذ(ة) التربية المدنية', hoursPerClass: 1, maxPerTeacher: 18, pedDay: 'الاثنين', pedRange: 'afternoon' },
    { id: 'pe', namePrefix: 'أستاذ(ة) التربية البدنية', hoursPerClass: 2, maxPerTeacher: 10, pedDay: 'الثلاثاء', pedRange: 'afternoon' },
    { id: 'art_music', namePrefix: 'أستاذ(ة) التربية الفنية والموسيقية', hoursPerClass: 1, maxPerTeacher: 20, pedDay: 'الأربعاء', pedRange: 'morning' },
    { id: 'computer', namePrefix: 'أستاذ(ة) الإعلام الآلي', hoursPerClass: 1, maxPerTeacher: 20, pedDay: 'الخميس', pedRange: 'morning' },
  ];

  subjectConfigs.forEach((sc) => {
    const numTeachers = Math.max(1, Math.ceil(totalClasses / sc.maxPerTeacher));
    const classesPerTeacher = Math.ceil(totalClasses / numTeachers);

    for (let i = 0; i < numTeachers; i++) {
      const assigned = classIds.slice(i * classesPerTeacher, (i + 1) * classesPerTeacher);
      if (assigned.length > 0) {
        positions.push({
          id: `t-${sc.id}-${i + 1}`,
          name: `${sc.namePrefix} (منصب ${i + 1})`,
          subjectId: sc.id,
          assignedClassIds: assigned,
          maxWeeklyHours: 18,
          minWeeklyHours: 16,
          unavailableSlots: [],
          pedagogicalDay: sc.pedDay,
          pedagogicalPeriodRange: sc.pedRange,
          notes: `منصب مادة ${sc.namePrefix}`,
        });
      }
    }
  });

  return positions;
}
