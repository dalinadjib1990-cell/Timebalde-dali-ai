import {
  TimetableSlot,
  Teacher,
  SchoolClass,
  Room,
  SubjectRule,
  Conflict,
  InstitutionConfig,
} from '../types';

export function detectTimetableConflicts(
  slots: TimetableSlot[],
  teachers: Teacher[],
  classes: SchoolClass[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig
): Conflict[] {
  const conflicts: Conflict[] = [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // 1. Check Teacher Double Booking
  const teacherSlotIndex = new Map<string, TimetableSlot[]>();
  for (const slot of slots) {
    const key = `${slot.teacherId}_${slot.day}_${slot.period}`;
    if (!teacherSlotIndex.has(key)) {
      teacherSlotIndex.set(key, []);
    }
    teacherSlotIndex.get(key)!.push(slot);
  }

  for (const [key, slotList] of teacherSlotIndex.entries()) {
    if (slotList.length > 1) {
      const teacher = teacherMap.get(slotList[0].teacherId);
      const classNames = slotList
        .map((s) => classMap.get(s.classId)?.name || s.classId)
        .join(' و ');

      conflicts.push({
        id: `conf-teacher-double-${key}`,
        type: 'teacher_double_booking',
        severity: 'error',
        title: 'تعارض أستاذ مزدوج',
        description: `الأستاذ (${teacher?.name || slotList[0].teacherId}) مبرمج في قسمين مختلفين (${classNames}) يوم ${slotList[0].day} في الحصة ${slotList[0].period}.`,
        affectedItems: {
          teacherId: slotList[0].teacherId,
          day: slotList[0].day,
          period: slotList[0].period,
        },
        suggestion: 'قم بنقل إحدى الحصتين إلى فترة زمنية أخرى شاغرة للأستاذ والقسم.',
      });
    }
  }

  // 2. Check Class Double Booking
  const classSlotIndex = new Map<string, TimetableSlot[]>();
  for (const slot of slots) {
    // Only group whole-class or overlapping slots
    const key = `${slot.classId}_${slot.day}_${slot.period}`;
    if (!classSlotIndex.has(key)) {
      classSlotIndex.set(key, []);
    }
    classSlotIndex.get(key)!.push(slot);
  }

  for (const [key, slotList] of classSlotIndex.entries()) {
    // If not intentional split groups 1 & 2
    const hasUnsplitOverlaps =
      slotList.length > 1 &&
      !(slotList.length === 2 && slotList[0].group !== slotList[1].group && slotList[0].isGroupSplit && slotList[1].isGroupSplit);

    if (hasUnsplitOverlaps) {
      const cls = classMap.get(slotList[0].classId);
      conflicts.push({
        id: `conf-class-double-${key}`,
        type: 'class_double_booking',
        severity: 'error',
        title: 'تعارض قسم مزدوج',
        description: `القسم (${cls?.name || slotList[0].classId}) لديه أكثر من حصة متزامنة يوم ${slotList[0].day} في الحصة ${slotList[0].period}.`,
        affectedItems: {
          classId: slotList[0].classId,
          day: slotList[0].day,
          period: slotList[0].period,
        },
        suggestion: 'نقل الحصة الزائدة إلى فترة فراغ في جدول القسم.',
      });
    }
  }

  // 3. Check Room Double Booking
  const roomSlotIndex = new Map<string, TimetableSlot[]>();
  for (const slot of slots) {
    if (!slot.roomId) continue;
    const room = roomMap.get(slot.roomId);
    // Sports ground can be shared up to 2 classes
    const isSpecialSharable = room?.type === 'sports_ground';
    const key = `${slot.roomId}_${slot.day}_${slot.period}`;
    if (!roomSlotIndex.has(key)) {
      roomSlotIndex.set(key, []);
    }
    roomSlotIndex.get(key)!.push(slot);
  }

  for (const [key, slotList] of roomSlotIndex.entries()) {
    const room = roomMap.get(slotList[0].roomId);
    const maxCapacity = room?.type === 'sports_ground' ? 2 : 1;
    if (slotList.length > maxCapacity) {
      conflicts.push({
        id: `conf-room-double-${key}`,
        type: 'room_double_booking',
        severity: 'error',
        title: 'حجز قاعة/مخبر مزدوج',
        description: `تم حجز (${room?.name || slotList[0].roomId}) لأكثر من فوج (${slotList.length} أفواج) يوم ${slotList[0].day} في الحصة ${slotList[0].period}.`,
        affectedItems: {
          roomId: slotList[0].roomId,
          day: slotList[0].day,
          period: slotList[0].period,
        },
        suggestion: 'تعيين قاعة أخرى شاغرة أو تغيير توقيت الحصة.',
      });
    }
  }

  // 4. Check Teacher Unavailability Violations
  for (const slot of slots) {
    const teacher = teacherMap.get(slot.teacherId);
    if (!teacher) continue;

    // Check Tuesday Afternoon Off
    if (config.tuesdayAfternoonOff && slot.day === 'الثلاثاء' && slot.period >= 5) {
      conflicts.push({
        id: `conf-tues-off-${slot.id}`,
        type: 'unavailability_violation',
        severity: 'warning',
        title: 'مخالفة عطلة مساء الثلاثاء',
        description: `حصة مبرمجة للأستاذ (${teacher.name}) مساء الثلاثاء، وهو وقت مخصص للندوات والأنشطة في التنظيم الجزائري.`,
        affectedItems: {
          teacherId: teacher.id,
          classId: slot.classId,
          day: slot.day,
          period: slot.period,
        },
        suggestion: 'نقل الحصة إلى أحد أيام الأسبوع الأخرى أو الفترة الصباحية.',
      });
    }

    // Check teacher-specific unavailabilities
    const isUnavailable = teacher.unavailableSlots.some(
      (u) => u.day === slot.day && u.period === slot.period
    );
    if (isUnavailable) {
      conflicts.push({
        id: `conf-unavail-${slot.id}`,
        type: 'unavailability_violation',
        severity: 'warning',
        title: 'مخالفة قيد عدم توفر الأستاذ',
        description: `الأستاذ (${teacher.name}) مبرمج في حصة يوم ${slot.day} - الحصة ${slot.period} بالرغم من تسجيل عدم توفره في هذا الوقت.`,
        affectedItems: {
          teacherId: teacher.id,
          classId: slot.classId,
          day: slot.day,
          period: slot.period,
        },
        suggestion: 'احترام رغبة الأستاذ ونقل الحصة لوقت مناسب.',
      });
    }
  }

  // 5. Check Subject Hours Consistency per Class vs Official Rules
  for (const cls of classes) {
    const classSlots = slots.filter((s) => s.classId === cls.id);
    const subjectHoursScheduled = new Map<string, number>();

    for (const s of classSlots) {
      subjectHoursScheduled.set(
        s.subjectId,
        (subjectHoursScheduled.get(s.subjectId) || 0) + 1
      );
    }

    const classRules = rules.filter((r) => r.level === cls.level);
    for (const rule of classRules) {
      // Skip optional Amazigh if not enabled for this school/class
      if (rule.subject_id === 'amazigh' && !config.enableAmazigh) continue;
      if (rule.subject_id === 'computer' && !config.enableComputerScience) continue;

      const scheduled = subjectHoursScheduled.get(rule.subject_id) || 0;
      const expected = rule.weekly_hours;

      if (scheduled < expected) {
        conflicts.push({
          id: `conf-hours-deficit-${cls.id}-${rule.subject_id}`,
          type: 'hours_mismatch',
          severity: 'warning',
          title: 'نقص في الحجم الساعي الرسمي',
          description: `القسم (${cls.name}) مبرمج له ${scheduled} سا في مادة (${rule.subject_name}) بينما الحجم الوزاري الرسمي هو ${expected} سا.`,
          affectedItems: {
            classId: cls.id,
            subjectId: rule.subject_id,
          },
          suggestion: `إضافة ${expected - scheduled} حصة لإكمال النصاب الوزاري المعتمد.`,
        });
      } else if (scheduled > expected) {
        conflicts.push({
          id: `conf-hours-excess-${cls.id}-${rule.subject_id}`,
          type: 'hours_mismatch',
          severity: 'warning',
          title: 'زيادة عن الحجم الساعي الرسمي',
          description: `القسم (${cls.name}) مبرمج له ${scheduled} سا في مادة (${rule.subject_name}) بينما الحجم الوزاري الرسمي هو ${expected} سا فقط.`,
          affectedItems: {
            classId: cls.id,
            subjectId: rule.subject_id,
          },
          suggestion: `حذف أو نقل الحصص الزائدة (${scheduled - expected} سا).`,
        });
      }
    }
  }

  // 6. Check Max Daily Hours Per Subject
  for (const cls of classes) {
    for (const day of config.days) {
      const daySlots = slots.filter((s) => s.classId === cls.id && s.day === day);
      const subjectDayCount = new Map<string, number>();
      for (const s of daySlots) {
        subjectDayCount.set(s.subjectId, (subjectDayCount.get(s.subjectId) || 0) + 1);
      }
      for (const [subjectId, count] of subjectDayCount.entries()) {
        // PE can have 2 consecutive hours, but others shouldn't exceed 2h daily
        if (count > 2) {
          conflicts.push({
            id: `conf-max-daily-${cls.id}-${day}-${subjectId}`,
            type: 'max_daily_hours_exceeded',
            severity: 'warning',
            title: 'إرهاق بيداغوجي: تكرار المادة في نفس اليوم',
            description: `القسم (${cls.name}) لديه ${count} حصص من نفس المادة يوم ${day}، مما يرهق التلميذ بيداغوجياً.`,
            affectedItems: {
              classId: cls.id,
              day,
            },
            suggestion: 'توزيع حصص المادة على أيام الأسبوع المختلفة.',
          });
        }
      }
    }
  }

  return conflicts;
}
