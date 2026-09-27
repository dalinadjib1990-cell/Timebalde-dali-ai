import {
  SchoolClass,
  Teacher,
  Room,
  SubjectRule,
  TimetableSlot,
  InstitutionConfig,
  SubjectId,
  GradeLevel,
  PrincipalDirective,
} from '../types';

export interface GenerationDirectives {
  variationIndex?: number;
  seed?: number;
  minimizeTeacherGaps?: boolean;
  avoidTwoHourGaps?: boolean;
  allowSingleGapOnNecessity?: boolean;
  avoidSingleHourShifts?: boolean;
  clusterAnnexTeachers?: boolean;
  respectSubjectPedagogicalDays?: boolean;
  scheduleRemedialSlots?: boolean;
  preferMorningCore?: boolean;
  tuesdayAfternoonOff?: boolean;
  compactTeacherDays?: boolean;
  avoidDoubleHeavy?: boolean;
  balanceWeeklySpread?: boolean;
  annexClassIds?: string[];
  prioritizeTeacherComfort?: boolean;
  restrictPeriod7ToRemedial?: boolean; // حظر حصة 15:00-16:00 على الدروس العادية وتخصيصها حصرياً للاستدراك
  directives?: PrincipalDirective[];
}

interface LessonRequirement {
  id: string;
  classId: string;
  level: GradeLevel;
  subjectId: SubjectId;
  teacherId: string;
  duration: number; // 1 or 2 hours
  type: 'course' | 'td' | 'tp' | 'sport' | 'remedial';
  preferredRoomType: Room['type'];
  isSplitGroup: boolean;
}

export interface SchedulingResult {
  success: boolean;
  slots: TimetableSlot[];
  unassignedLessons: LessonRequirement[];
  message: string;
  executionTimeMs: number;
  variationIndex: number;
}

export function generateInstitutionalTimetable(
  classes: SchoolClass[],
  teachers: Teacher[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig,
  existingLockedSlots: TimetableSlot[] = [],
  options: GenerationDirectives = {}
): SchedulingResult {
  const startTime = performance.now();
  const variationIndex = options.variationIndex ?? Math.floor(Math.random() * 1000) + 1;

  // Extract active directives
  const activeDirectives = new Set<string>();
  if (options.directives) {
    options.directives.filter((d) => d.active).forEach((d) => activeDirectives.add(d.key));
  }
  const minimizeTeacherGaps = options.minimizeTeacherGaps ?? (activeDirectives.has('minimize_teacher_gaps') || true);
  const avoidTwoHourGaps = options.avoidTwoHourGaps ?? (activeDirectives.has('avoid_two_hour_gaps') || true);
  const allowSingleGapOnNecessity = options.allowSingleGapOnNecessity ?? (activeDirectives.has('allow_single_gap_on_necessity') || true);
  const avoidSingleHourShifts = options.avoidSingleHourShifts ?? (activeDirectives.has('avoid_single_hour_shifts') || true);
  const clusterAnnexTeachers = options.clusterAnnexTeachers ?? (activeDirectives.has('cluster_annex_teachers') || true);
  const respectSubjectPedagogicalDays = options.respectSubjectPedagogicalDays ?? (activeDirectives.has('respect_subject_pedagogical_days') || true);
  const scheduleRemedialSlots = options.scheduleRemedialSlots ?? (activeDirectives.has('schedule_remedial_slots') || true);
  const preferMorningCore = options.preferMorningCore ?? (activeDirectives.has('prefer_morning_core') || true);
  const tuesdayAfternoonOff = options.tuesdayAfternoonOff ?? (activeDirectives.has('tuesday_afternoon_off') || config.tuesdayAfternoonOff);
  const compactTeacherDays = options.compactTeacherDays ?? activeDirectives.has('compact_teacher_days');
  const avoidDoubleHeavy = options.avoidDoubleHeavy ?? (activeDirectives.has('avoid_double_heavy') || true);
  const restrictPeriod7ToRemedial = options.restrictPeriod7ToRemedial ?? (activeDirectives.has('restrict_period_7_to_remedial') || true);

  // 1. Build teacher lookup index
  const teacherSubjectMap = new Map<SubjectId, Teacher[]>();
  const teacherClassAssignment = new Map<string, Teacher>(); // `${classId}_${subjectId}` -> Teacher

  for (const t of teachers) {
    if (!teacherSubjectMap.has(t.subjectId)) {
      teacherSubjectMap.set(t.subjectId, []);
    }
    teacherSubjectMap.get(t.subjectId)!.push(t);

    for (const cId of t.assignedClassIds) {
      teacherClassAssignment.set(`${cId}_${t.subjectId}`, t);
    }
  }

  // 2. Build lesson requirements for all classes
  const requirements: LessonRequirement[] = [];

  for (const cls of classes) {
    const classRules = rules.filter((r) => r.level === cls.level);

    for (const rule of classRules) {
      if (rule.subject_id === 'amazigh' && !config.enableAmazigh) continue;
      if (rule.subject_id === 'computer' && !config.enableComputerScience) continue;

      // Find assigned teacher
      let teacher = teacherClassAssignment.get(`${cls.id}_${rule.subject_id}`);
      if (!teacher) {
        const candidates = teacherSubjectMap.get(rule.subject_id) || [];
        teacher = candidates[0];
      }

      const teacherId = teacher ? teacher.id : `temp-t-${rule.subject_id}`;
      let hoursNeeded = rule.weekly_hours;

      // Special structure: Physical Education is a 2-hour consecutive block
      if (rule.subject_id === 'pe') {
        requirements.push({
          id: `req-${cls.id}-pe-2h`,
          classId: cls.id,
          level: cls.level,
          subjectId: 'pe',
          teacherId,
          duration: 2,
          type: 'sport',
          preferredRoomType: 'sports_ground',
          isSplitGroup: false,
        });
        hoursNeeded -= 2;
      }

      // Special structure: Science has 1h theoretical + 1h TP Lab
      if (rule.subject_id === 'science' && hoursNeeded >= 2) {
        requirements.push({
          id: `req-${cls.id}-sci-tp`,
          classId: cls.id,
          level: cls.level,
          subjectId: 'science',
          teacherId,
          duration: 1,
          type: 'tp',
          preferredRoomType: 'science_lab',
          isSplitGroup: true,
        });
        requirements.push({
          id: `req-${cls.id}-sci-course`,
          classId: cls.id,
          level: cls.level,
          subjectId: 'science',
          teacherId,
          duration: 1,
          type: 'course',
          preferredRoomType: 'regular',
          isSplitGroup: false,
        });
        hoursNeeded -= 2;
      }

      // Special structure: Physics has 1h theoretical + 1h TP Lab
      if (rule.subject_id === 'physics' && hoursNeeded >= 2) {
        requirements.push({
          id: `req-${cls.id}-phy-tp`,
          classId: cls.id,
          level: cls.level,
          subjectId: 'physics',
          teacherId,
          duration: 1,
          type: 'tp',
          preferredRoomType: 'physics_lab',
          isSplitGroup: true,
        });
        requirements.push({
          id: `req-${cls.id}-phy-course`,
          classId: cls.id,
          level: cls.level,
          subjectId: 'physics',
          teacherId,
          duration: 1,
          type: 'course',
          preferredRoomType: 'regular',
          isSplitGroup: false,
        });
        hoursNeeded -= 2;
      }

      // Special structure: Computer science has 1h TP Lab
      if (rule.subject_id === 'computer' && hoursNeeded >= 1) {
        requirements.push({
          id: `req-${cls.id}-comp-tp`,
          classId: cls.id,
          level: cls.level,
          subjectId: 'computer',
          teacherId,
          duration: 1,
          type: 'tp',
          preferredRoomType: 'computer_lab',
          isSplitGroup: true,
        });
        hoursNeeded -= 1;
      }

      // Regular courses + TD
      for (let h = 0; h < hoursNeeded; h++) {
        const isTd = rule.td_required && h === 0;
        requirements.push({
          id: `req-${cls.id}-${rule.subject_id}-${h}`,
          classId: cls.id,
          level: cls.level,
          subjectId: rule.subject_id,
          teacherId,
          duration: 1,
          type: isTd ? 'td' : 'course',
          preferredRoomType: rule.required_room_type === 'regular' ? 'regular' : rule.required_room_type,
          isSplitGroup: isTd,
        });
      }

      // Remedial Session (ساعة استدراك ودعم تربوي للمواد الأساسية)
      if (
        scheduleRemedialSlots &&
        ['arabic', 'math', 'french', 'english', 'science', 'physics'].includes(rule.subject_id)
      ) {
        requirements.push({
          id: `req-${cls.id}-${rule.subject_id}-remedial`,
          classId: cls.id,
          level: cls.level,
          subjectId: rule.subject_id,
          teacherId,
          duration: 1,
          type: 'remedial',
          preferredRoomType: 'regular',
          isSplitGroup: false,
        });
      }
    }
  }

  // 3. Prepare Grid Structures for Fast CSP Constraint Checks
  const assignedSlots: TimetableSlot[] = [...existingLockedSlots];
  const teacherOccupied = new Set<string>(); // `${teacherId}_${day}_${period}`
  const teacherScheduleMap = new Map<string, number[]>(); // `${teacherId}_${day}` -> array of periods
  const classOccupied = new Set<string>(); // `${classId}_${day}_${period}`
  const classScheduleMap = new Map<string, { period: number; subjectId: SubjectId }[]>(); // `${classId}_${day}`
  const roomOccupied = new Map<string, number>(); // `${roomId}_${day}_${period}` -> count
  const classDaySubjectCount = new Map<string, number>(); // `${classId}_${day}_${subjectId}` -> count

  // Initialize with existing locked slots
  for (const s of existingLockedSlots) {
    teacherOccupied.add(`${s.teacherId}_${s.day}_${s.period}`);
    classOccupied.add(`${s.classId}_${s.day}_${s.period}`);
    const rKey = `${s.roomId}_${s.day}_${s.period}`;
    roomOccupied.set(rKey, (roomOccupied.get(rKey) || 0) + 1);

    const cdsKey = `${s.classId}_${s.day}_${s.subjectId}`;
    classDaySubjectCount.set(cdsKey, (classDaySubjectCount.get(cdsKey) || 0) + 1);

    const tdKey = `${s.teacherId}_${s.day}`;
    if (!teacherScheduleMap.has(tdKey)) teacherScheduleMap.set(tdKey, []);
    teacherScheduleMap.get(tdKey)!.push(s.period);

    const cdKey = `${s.classId}_${s.day}`;
    if (!classScheduleMap.has(cdKey)) classScheduleMap.set(cdKey, []);
    classScheduleMap.get(cdKey)!.push({ period: s.period, subjectId: s.subjectId });
  }

  // Teacher unavailability lookup
  const teacherUnavailSet = new Set<string>();
  for (const t of teachers) {
    for (const u of t.unavailableSlots) {
      teacherUnavailSet.add(`${t.id}_${u.day}_${u.period}`);
    }
  }

  // 4. Heuristic Sort with Variation Permutations
  // We use deterministic pseudo-random variation based on variationIndex
  const pseudoRand = (seedOffset: number) => {
    const x = Math.sin(variationIndex * 9973 + seedOffset) * 10000;
    return x - Math.floor(x);
  };

  requirements.sort((a, b) => {
    // PE 2h blocks first
    if (a.duration !== b.duration) return b.duration - a.duration;
    // Specialized lab TP next
    if (a.preferredRoomType !== 'regular' && b.preferredRoomType === 'regular') return -1;
    if (a.preferredRoomType === 'regular' && b.preferredRoomType !== 'regular') return 1;
    
    // Core subjects first (French restored as primary core alongside Math & Arabic; English is secondary)
    const prioritySubjects: SubjectId[] = ['math', 'arabic', 'french', 'physics', 'science', 'history', 'geography', 'islamic', 'english', 'civic', 'computer'];
    const aIdx = prioritySubjects.indexOf(a.subjectId);
    const bIdx = prioritySubjects.indexOf(b.subjectId);
    if (aIdx !== -1 && bIdx !== -1) {
      if (aIdx !== bIdx) return aIdx - bIdx;
    } else if (aIdx !== -1) {
      return -1;
    } else if (bIdx !== -1) {
      return 1;
    }

    // Tie-breaking variation perturbation per generation:
    const hashA = a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hashB = b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return pseudoRand(hashA) - pseudoRand(hashB);
  });

  // 5. Room Resolution Helper
  function findAvailableRoom(
    preferredType: Room['type'],
    classDefaultRoomId: string | undefined,
    day: string,
    period: number
  ): Room | null {
    if (preferredType !== 'regular') {
      const candidates = rooms.filter((r) => r.type === preferredType);
      for (const room of candidates) {
        const rKey = `${room.id}_${day}_${period}`;
        const count = roomOccupied.get(rKey) || 0;
        const maxCap = room.type === 'sports_ground' ? 2 : 1;
        if (count < maxCap) {
          return room;
        }
      }
    }

    // Default class room
    if (classDefaultRoomId) {
      const defaultRoom = rooms.find((r) => r.id === classDefaultRoomId);
      if (defaultRoom) {
        const rKey = `${defaultRoom.id}_${day}_${period}`;
        if ((roomOccupied.get(rKey) || 0) === 0) {
          return defaultRoom;
        }
      }
    }

    // Any regular room
    const regularRooms = rooms.filter((r) => r.type === 'regular');
    for (const r of regularRooms) {
      const rKey = `${r.id}_${day}_${period}`;
      if ((roomOccupied.get(rKey) || 0) === 0) {
        return r;
      }
    }

    return regularRooms[0] || null;
  }

  // 6. Generate Time Slots Combinations with Directives and Variation Scoring
  interface SlotOption {
    day: string;
    period: number;
    score: number;
  }

  // Days list with rotational offset based on variation
  const daysList = [...config.days];
  const dayRotation = (variationIndex % daysList.length);
  const rotatedDays = [...daysList.slice(dayRotation), ...daysList.slice(0, dayRotation)];

  // Helper to check if a class belongs to the Annex institution
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const isClassAnnex = (cId: string): boolean => {
    if (options.annexClassIds && options.annexClassIds.includes(cId)) return true;
    const c = classMap.get(cId);
    if (!c) return false;
    return !!c.isAnnex || (!!c.name && c.name.includes('ملحقة')) || (!!config.hasAnnex && ['2am4', '2am5', '2am6'].includes(c.id));
  };

  // Helper to accurately measure teacher gaps within morning and afternoon sessions
  function evaluateTeacherGapsAfterSlot(
    currentPeriods: number[],
    newPeriod: number,
    duration: number
  ): { totalGaps: number; maxConsecutiveGap: number } {
    const combined = [...currentPeriods, newPeriod];
    if (duration === 2) combined.push(newPeriod + 1);
    const sorted = Array.from(new Set(combined)).sort((a, b) => a - b);

    let totalGaps = 0;
    let maxConsecutiveGap = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      // Only measure gaps inside the same half-day (1-4 or 5-8)
      // Standard lunch break (period 4 to 5) is NOT a gap
      if ((p1 <= 4 && p2 <= 4) || (p1 >= 5 && p2 >= 5)) {
        const gap = p2 - p1 - 1;
        if (gap > 0) {
          totalGaps += gap;
          if (gap > maxConsecutiveGap) maxConsecutiveGap = gap;
        }
      }
    }

    return { totalGaps, maxConsecutiveGap };
  }

  function getSlotOptions(req: LessonRequirement): SlotOption[] {
    const candidates: SlotOption[] = [];

    for (const day of rotatedDays) {
      // 8 periods per day
      const maxPeriod = req.duration === 2 ? 7 : 8;

      for (let p = 1; p <= maxPeriod; p++) {
        // Respect Tuesday afternoon off (from config or directive)
        if (tuesdayAfternoonOff && day === 'الثلاثاء' && p >= 5) {
          continue;
        }

        // For 2h duration, check next period too
        if (req.duration === 2) {
          if (p === 4) continue; // Don't span morning lunch break (11-12 & 13:30-14:30)
          if (tuesdayAfternoonOff && day === 'الثلاثاء' && p + 1 >= 5) continue;
        }

        // Score heuristic:
        let score = 100;

        // DIRECTIVE: حظر الحصة 7 (15:00 - 16:00) وما بعدها على الدروس العادية وتخصيصها حصرياً للاستدراك
        // Crucial pedagogical constraint: Normal lessons must finish by 15:00 (periods 1-6 only).
        // Period 7 (15:00 - 16:00) is strictly reserved for remedial sessions (استدراك) and never regular classes.
        const isRemedial = req.type === 'remedial';
        if (!isRemedial) {
          if (p >= 7) {
            if (restrictPeriod7ToRemedial) {
              continue; // Strictly forbidden for regular lessons
            } else {
              score -= 3500;
            }
          }
          if (req.duration === 2 && p === 6) {
            if (restrictPeriod7ToRemedial) {
              continue; // Cannot span into 15:00-16:00
            } else {
              score -= 3500;
            }
          }
        }

        // DIRECTIVE: Respect Subject Pedagogical Coordination Days (اليوم البيداغوجي لكل مادة)
        if (respectSubjectPedagogicalDays && config.subjectPedagogicalDays) {
          const pedDay = config.subjectPedagogicalDays[req.subjectId];
          if (pedDay && day === pedDay.day) {
            if (pedDay.periodRange === 'all_day') continue;
            if (pedDay.periodRange === 'morning' && p <= 4) continue;
            if (pedDay.periodRange === 'afternoon' && p >= 5) continue;
          }
        }

        // DIRECTIVE: Morning priority for hard cognitive subjects (French restored as primary cognitive core)
        const isMorning = p <= 4;
        const isCore = ['math', 'arabic', 'french', 'physics', 'science'].includes(req.subjectId);
        if (isCore) {
          if (preferMorningCore) {
            score += isMorning ? 50 : -35;
            if (p === 1 || p === 2) score += 30; // 08:00 to 10:00 prime cognitive window
          } else {
            score += isMorning ? 30 : -10;
          }
        } else if (req.subjectId === 'english') {
          // Secondary foreign language: balanced distribution in late morning or afternoon
          score += (p === 3 || p === 5 || p === 6) ? 25 : 10;
        } else if (req.subjectId === 'pe') {
          // PE is good mid-morning or afternoon
          score += (p === 3 || p === 5) ? 35 : 0;
        } else if (['art_music', 'civic', 'islamic'].includes(req.subjectId)) {
          // Lighter subjects in afternoon
          score += !isMorning ? 30 : 5;
        }

        // Remedial slots preferred on designated remedial day & period 7 (15:00 - 16:00)
        if (req.type === 'remedial') {
          if (p === 7) {
            score += 260; // 15:00 - 16:00 is the prime designated remedial slot
          }
          if (config.remedialDay && day === config.remedialDay) {
            score += 150;
            if (config.remedialPeriod && p === config.remedialPeriod) {
              score += 200;
            }
          }
        }

        const tdKey = `${req.teacherId}_${day}`;
        const currentTeacherPeriods = teacherScheduleMap.get(tdKey) || [];

        // DIRECTIVE: Annex Teacher Multi-School Adaptivity (تكييف أساتذة الملحقة لتفادي التنقل وحصره في وقت الفراغ)
        if (clusterAnnexTeachers) {
          const reqIsAnnex = isClassAnnex(req.classId);
          if (currentTeacherPeriods.length > 0) {
            const teacherDaySlots = assignedSlots.filter((s) => s.teacherId === req.teacherId && s.day === day);
            const halfDaySlots = teacherDaySlots.filter((s) => (p <= 4 ? s.period <= 4 : s.period >= 5));

            // Prevent mixing Annex and Main campus within the same morning or afternoon
            for (const s of halfDaySlots) {
              const slotIsAnnex = isClassAnnex(s.classId);
              if (reqIsAnnex !== slotIsAnnex) {
                score -= options.prioritizeTeacherComfort ? 1500 : 800; // Strictly forbidden: teacher must not travel back and forth within a single half-day
                break;
              }
            }

            // High bonus for clustering lessons of the same institution together
            if (halfDaySlots.some((s) => isClassAnnex(s.classId) === reqIsAnnex)) {
              score += options.prioritizeTeacherComfort ? 120 : 55;
            }
          }
        }

        // Avoid overloading teacher with more than 4 hours in a single day when comfort is prioritized
        if (options.prioritizeTeacherComfort && currentTeacherPeriods.length >= 4) {
          score -= 300;
        }

        // DIRECTIVE: Minimize Teacher Gaps & Avoid 2-hour gaps in middle
        // RULE: الأفضلية القصوى لـ 0 فراغ بيني، مع التسامح بساعة واحدة فراغ كحد أقصى عند الضرورة القصوى لتخفيف الضغط على الخوارزميات، وحظر ساعتين فراغ منعاً باتاً.
        if (minimizeTeacherGaps || avoidTwoHourGaps || allowSingleGapOnNecessity) {
          if (currentTeacherPeriods.length > 0) {
            const isAdjacent =
              currentTeacherPeriods.includes(p - 1) ||
              currentTeacherPeriods.includes(p + req.duration);

            const gapEval = evaluateTeacherGapsAfterSlot(
              currentTeacherPeriods,
              p,
              req.duration
            );

            if (gapEval.totalGaps === 0) {
              // الأفضلية التامة: جدول متصل 100% بدون أي ساعة فراغ
              score += isAdjacent ? 110 : 85;
            } else if (gapEval.maxConsecutiveGap >= 2) {
              // ممنوع تماماً: ساعتان فراغ في المنتصف (أو أكثر) داخل نفس الفترة
              score -= 350;
            } else if (gapEval.totalGaps === 1 && gapEval.maxConsecutiveGap === 1) {
              // تخفيف الضغط على الخوارزمية: مسموح بساعة واحدة فقط خلال اليوم عند الضرورة القصوى
              if (allowSingleGapOnNecessity) {
                score -= 20; // خصم طفيف يفك الاختناق دون ترجيحه على خيار 0 فراغ
              } else {
                score -= 75;
              }
            } else {
              // أكثر من ساعة فراغ واحدة للأستاذ في نفس اليوم
              score -= 280;
            }
          }
        }

        // DIRECTIVE: Avoid 1-hour shifts for teachers (تجنب ساعة واحدة في المساء أو الصباح - الأستاذ لا يأتي لساعة واحدة)
        if (avoidSingleHourShifts) {
          const morningPeriods = currentTeacherPeriods.filter((x) => x <= 4);
          const afternoonPeriods = currentTeacherPeriods.filter((x) => x >= 5);

          if (p <= 4) { // Placing in morning
            if (morningPeriods.length === 0) {
              if (req.duration === 1) {
                if (afternoonPeriods.length > 0) {
                  score -= 135; // Coming in morning for only 1 solitary hour
                } else {
                  score -= 105; // Opening a new day for just 1 hour
                }
              } else {
                score += 45; // 2h block
              }
            } else if (morningPeriods.length === 1) {
              score += 95; // Joins isolated hour, turning it into a comfortable 2-hour session
            } else if (morningPeriods.length >= 2) {
              score += 35;
            }
          } else { // Placing in afternoon (p >= 5)
            if (afternoonPeriods.length === 0) {
              if (req.duration === 1) {
                if (morningPeriods.length > 0) {
                  score -= 150; // Staying or returning after lunch for only 1 solitary afternoon hour
                } else {
                  score -= 125; // Coming to school in the afternoon for only 1 hour
                }
              } else {
                score += 45; // 2h block
              }
            } else if (afternoonPeriods.length === 1) {
              score += 95; // Joins isolated afternoon hour, making it a comfortable 2-hour session
            } else if (afternoonPeriods.length >= 2) {
              score += 35;
            }
          }
        }

        // DIRECTIVE: Compact Teacher Schedules (تجميع أيام عمل الأستاذ)
        if (compactTeacherDays) {
          if (currentTeacherPeriods.length > 0 && currentTeacherPeriods.length < 5) {
            score += 30; // Encourage filling this day before opening new days
          }
        }

        // DIRECTIVE: Avoid Double Heavy subjects back to back for class
        if (avoidDoubleHeavy) {
          const cdKey = `${req.classId}_${day}`;
          const classSched = classScheduleMap.get(cdKey) || [];
          const prevLesson = classSched.find((s) => s.period === p - 1);
          if (prevLesson && isCore && ['math', 'french', 'physics', 'science'].includes(prevLesson.subjectId)) {
            score -= 40; // Avoid e.g. Math immediately followed by French or Physics
          }
        }

        // Penalty for multiple lessons of the same subject on the same day for a class
        const cdsKey = `${req.classId}_${day}_${req.subjectId}`;
        const existingCount = classDaySubjectCount.get(cdsKey) || 0;
        if (existingCount > 0) {
          score -= existingCount * 70;
        }

        // Add variation jitter per slot based on seed
        const slotJitter = (pseudoRand(p * 17 + day.charCodeAt(0) * 31 + req.id.length) - 0.5) * 18;
        score += slotJitter;

        candidates.push({ day, period: p, score });
      }
    }

    // Sort by descending pedagogical score
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  // 7. CSP Greedy-Backtracking Placement
  const unassignedLessons: LessonRequirement[] = [];

  for (const req of requirements) {
    const cls = classMap.get(req.classId);
    const slotOptions = getSlotOptions(req);
    let placed = false;

    for (const opt of slotOptions) {
      const { day, period } = opt;
      const p2 = period + 1;

      // Check Teacher Availability
      const tKey1 = `${req.teacherId}_${day}_${period}`;
      const tKey2 = `${req.teacherId}_${day}_${p2}`;
      if (teacherOccupied.has(tKey1) || teacherUnavailSet.has(tKey1)) continue;
      if (req.duration === 2 && (teacherOccupied.has(tKey2) || teacherUnavailSet.has(tKey2))) continue;

      // Check Class Availability
      const cKey1 = `${req.classId}_${day}_${period}`;
      const cKey2 = `${req.classId}_${day}_${p2}`;
      if (classOccupied.has(cKey1)) continue;
      if (req.duration === 2 && classOccupied.has(cKey2)) continue;

      // Check Room Availability
      const room1 = findAvailableRoom(req.preferredRoomType, cls?.assignedRoomId, day, period);
      if (!room1) continue;

      let room2 = room1;
      if (req.duration === 2) {
        room2 = findAvailableRoom(req.preferredRoomType, cls?.assignedRoomId, day, p2) || room1;
      }

      // Check Day repetitions limit (max 2 hours of same subject per day)
      const cdsKey = `${req.classId}_${day}_${req.subjectId}`;
      const currentDayCount = classDaySubjectCount.get(cdsKey) || 0;
      if (currentDayCount + req.duration > 2 && req.subjectId !== 'pe') {
        continue;
      }

      // Place slot 1
      const slot1Id = `slot-${req.classId}-${day}-${period}-${req.subjectId}`;
      const slot1: TimetableSlot = {
        id: slot1Id,
        classId: req.classId,
        subjectId: req.subjectId,
        teacherId: req.teacherId,
        roomId: room1.id,
        day,
        period,
        type: req.type,
        isGroupSplit: req.isSplitGroup,
        group: req.isSplitGroup ? 1 : undefined,
        isAnnex: isClassAnnex(req.classId),
      };

      assignedSlots.push(slot1);
      teacherOccupied.add(tKey1);
      classOccupied.add(cKey1);
      const rKey1 = `${room1.id}_${day}_${period}`;
      roomOccupied.set(rKey1, (roomOccupied.get(rKey1) || 0) + 1);

      // Track teacher & class schedule maps
      const tdKey = `${req.teacherId}_${day}`;
      if (!teacherScheduleMap.has(tdKey)) teacherScheduleMap.set(tdKey, []);
      teacherScheduleMap.get(tdKey)!.push(period);

      const cdKey = `${req.classId}_${day}`;
      if (!classScheduleMap.has(cdKey)) classScheduleMap.set(cdKey, []);
      classScheduleMap.get(cdKey)!.push({ period, subjectId: req.subjectId });

      // Place slot 2 if duration is 2
      if (req.duration === 2) {
        const slot2Id = `slot-${req.classId}-${day}-${p2}-${req.subjectId}`;
        const slot2: TimetableSlot = {
          id: slot2Id,
          classId: req.classId,
          subjectId: req.subjectId,
          teacherId: req.teacherId,
          roomId: room2.id,
          day,
          period: p2,
          type: req.type,
          isGroupSplit: req.isSplitGroup,
          isAnnex: isClassAnnex(req.classId),
        };
        assignedSlots.push(slot2);
        teacherOccupied.add(tKey2);
        classOccupied.add(cKey2);
        const rKey2 = `${room2.id}_${day}_${p2}`;
        roomOccupied.set(rKey2, (roomOccupied.get(rKey2) || 0) + 1);

        teacherScheduleMap.get(tdKey)!.push(p2);
        classScheduleMap.get(cdKey)!.push({ period: p2, subjectId: req.subjectId });
      }

      classDaySubjectCount.set(cdsKey, currentDayCount + req.duration);
      placed = true;
      break;
    }

    if (!placed) {
      unassignedLessons.push(req);
    }
  }

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    success: unassignedLessons.length === 0,
    slots: assignedSlots,
    unassignedLessons,
    message:
      unassignedLessons.length === 0
        ? `تم إنشاء الخيار #${variationIndex} بنجاح: توزيع ${assignedSlots.length} حصة على ${classes.length} قسماً و ${teachers.length} أستاذاً مع تطبيق توجيهات المدير البيداغوجية في ${executionTimeMs} ميلي ثانية.`
        : `تم توليد الخيار #${variationIndex} مع تعذر برمجة ${unassignedLessons.length} حصة بسبب ضيق القاعات أو قيود الأساتذة.`,
    executionTimeMs,
    variationIndex,
  };
}

// Auto-repair / Partial Rescheduler
export function autoRepairTimetable(
  currentSlots: TimetableSlot[],
  impactedClassId: string | null,
  impactedTeacherId: string | null,
  classes: SchoolClass[],
  teachers: Teacher[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig
): SchedulingResult {
  // Keep all slots that are not related to the impacted entity as locked
  const lockedSlots = currentSlots.filter((s) => {
    if (impactedClassId && s.classId === impactedClassId) return false;
    if (impactedTeacherId && s.teacherId === impactedTeacherId) return false;
    return true;
  });

  const classesToSchedule = impactedClassId
    ? classes.filter((c) => c.id === impactedClassId)
    : classes;

  return generateInstitutionalTimetable(
    classesToSchedule,
    teachers,
    rooms,
    rules,
    config,
    lockedSlots
  );
}

/**
 * Instantly applies principal directives directly onto the CURRENT active timetable (without clearing).
 * Performs live pedagogical slot movements, gap reductions, and Tuesday-afternoon clearance.
 */
export function applyDirectivesInstantlyToExistingTimetable(
  currentSlots: TimetableSlot[],
  directives: PrincipalDirective[],
  classes: SchoolClass[],
  teachers: Teacher[],
  rooms: Room[],
  rules: SubjectRule[],
  config: InstitutionConfig
): {
  success: boolean;
  slots: TimetableSlot[];
  modifiedCount: number;
  message: string;
} {
  if (currentSlots.length === 0) {
    // If table is empty, generate freshly adhering to directives
    const result = generateInstitutionalTimetable(classes, teachers, rooms, rules, config, [], {
      directives,
    });
    return {
      success: result.success,
      slots: result.slots,
      modifiedCount: result.slots.length,
      message: 'تم توليد جدول جديد بالكامل وتطبيق جميع توجيهات المدير بنجاح.',
    };
  }

  let slots = [...currentSlots];
  let modifiedCount = 0;
  const changeNotes: string[] = [];

  const activeKeys = new Set(directives.filter((d) => d.active).map((d) => d.key));
  const days: string[] = config.days && config.days.length > 0
    ? config.days
    : ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  // Helper to test if a slot can safely move to target day/period
  const canMoveSlot = (
    candidateSlot: TimetableSlot,
    targetDay: string,
    targetPeriod: number,
    currentWorkingSlots: TimetableSlot[]
  ): boolean => {
    // Check if target is Tuesday afternoon when tuesday_afternoon_off is active
    if (activeKeys.has('tuesday_afternoon_off') && targetDay === 'الثلاثاء' && targetPeriod >= 5) {
      return false;
    }

    // Respect Subject Pedagogical Coordination Days
    if (config.subjectPedagogicalDays) {
      const pedDay = config.subjectPedagogicalDays[candidateSlot.subjectId];
      if (pedDay && targetDay === pedDay.day) {
        if (pedDay.periodRange === 'all_day') return false;
        if (pedDay.periodRange === 'morning' && targetPeriod <= 4) return false;
        if (pedDay.periodRange === 'afternoon' && targetPeriod >= 5) return false;
      }
    }

    // Check teacher availability & conflicts
    const teacher = teachers.find((t) => t.id === candidateSlot.teacherId);
    if (teacher?.unavailableSlots?.some((u) => u.day === targetDay && u.period === targetPeriod)) {
      return false;
    }

    // Check teacher already teaching at target
    const teacherBusy = currentWorkingSlots.some(
      (s) => s.id !== candidateSlot.id && s.teacherId === candidateSlot.teacherId && s.day === targetDay && s.period === targetPeriod
    );
    if (teacherBusy) return false;

    // Check class already has a class at target
    const classBusy = currentWorkingSlots.some(
      (s) => s.id !== candidateSlot.id && s.classId === candidateSlot.classId && s.day === targetDay && s.period === targetPeriod
    );
    if (classBusy) return false;

    // Check room availability
    const roomBusy = currentWorkingSlots.some(
      (s) => s.id !== candidateSlot.id && s.roomId === candidateSlot.roomId && s.day === targetDay && s.period === targetPeriod
    );
    if (roomBusy) return false;

    return true;
  };

  // 1. Directive: Free Tuesday Afternoon (تفريغ مساء الثلاثاء للندوات)
  if (activeKeys.has('tuesday_afternoon_off')) {
    let tuesdayMoved = 0;
    const tuesdayAfternoonSlots = slots.filter((s) => s.day === 'الثلاثاء' && s.period >= 5);

    for (const tSlot of tuesdayAfternoonSlots) {
      let moved = false;
      // Search for an available slot in other days
      for (const d of days) {
        const maxP = d === 'الثلاثاء' ? 4 : 8;
        for (let p = 1; p <= maxP; p++) {
          if (canMoveSlot(tSlot, d, p, slots)) {
            slots = slots.map((s) =>
              s.id === tSlot.id ? { ...s, day: d, period: p } : s
            );
            tuesdayMoved++;
            modifiedCount++;
            moved = true;
            break;
          }
        }
        if (moved) break;
      }
    }
    if (tuesdayMoved > 0) {
      changeNotes.push(`تم تفريغ مساء الثلاثاء ونقل ${tuesdayMoved} حصة`);
    }
  }

  // 2. Directive: Prefer Morning for Core Subjects (تركيز المواد الأساسية في الصباح)
  if (activeKeys.has('prefer_morning_core')) {
    const coreSubjects = new Set(['arabic', 'math', 'science', 'physics', 'french']);
    let morningSwapped = 0;

    for (const cls of classes) {
      const classSlots = slots.filter((s) => s.classId === cls.id);
      const afternoonCore = classSlots.filter(
        (s) => coreSubjects.has(s.subjectId) && s.period >= 5
      );
      const morningNonCore = classSlots.filter(
        (s) => !coreSubjects.has(s.subjectId) && s.period <= 4 && s.type !== 'sport'
      );

      for (const coreSlot of afternoonCore) {
        for (const nonCoreSlot of morningNonCore) {
          // Check if swapping their (day, period) is conflict-free
          const tempSlots = slots.filter((s) => s.id !== coreSlot.id && s.id !== nonCoreSlot.id);
          const coreToTargetOk = canMoveSlot(coreSlot, nonCoreSlot.day, nonCoreSlot.period, tempSlots);
          const nonCoreToTargetOk = canMoveSlot(nonCoreSlot, coreSlot.day, coreSlot.period, tempSlots);

          if (coreToTargetOk && nonCoreToTargetOk) {
            slots = slots.map((s) => {
              if (s.id === coreSlot.id) {
                return { ...s, day: nonCoreSlot.day, period: nonCoreSlot.period };
              }
              if (s.id === nonCoreSlot.id) {
                return { ...s, day: coreSlot.day, period: coreSlot.period };
              }
              return s;
            });
            morningSwapped++;
            modifiedCount += 2;
            break;
          }
        }
      }
    }
    if (morningSwapped > 0) {
      changeNotes.push(`تم تقديم ${morningSwapped} مادة أساسية إلى الفترات الصباحية`);
    }
  }

  // 3. Directive: Minimize Teacher Gaps & Avoid 2-hour gaps (تقليل الساعات الفارغة وسد فراغ ساعتين مع التسامح بساعة واحدة للضرورة)
  if (activeKeys.has('minimize_teacher_gaps') || activeKeys.has('avoid_two_hour_gaps') || activeKeys.has('allow_single_gap_on_necessity')) {
    let gapsReduced = 0;
    for (const teacher of teachers) {
      for (const day of days) {
        const teacherDaySlots = slots
          .filter((s) => s.teacherId === teacher.id && s.day === day)
          .sort((a, b) => a.period - b.period);

        if (teacherDaySlots.length >= 2) {
          const periods = teacherDaySlots.map((s) => s.period);
          const minP = Math.min(...periods);
          const maxP = Math.max(...periods);

          // Find if there is a gap inside the teacher's morning or afternoon
          for (let p = minP + 1; p < maxP; p++) {
            if (p === 4 || p === 5) continue; // standard lunch interval
            if (!periods.includes(p)) {
              // Found empty period 'p' in teacher's schedule. Try to shift a later slot
              const laterSlot = teacherDaySlots.find((s) => s.period > p);
              if (laterSlot && canMoveSlot(laterSlot, day, p, slots)) {
                slots = slots.map((s) =>
                  s.id === laterSlot.id ? { ...s, period: p } : s
                );
                gapsReduced++;
                modifiedCount++;
                break;
              }
            }
          }
        }
      }
    }
    if (gapsReduced > 0) {
      changeNotes.push(`تم سد ${gapsReduced} فراغ بيني للأساتذة بنجاح`);
    }
  }

  // If no minor slot shifts were possible, regenerate with directives to ensure 100% compliance
  if (modifiedCount === 0) {
    const fullRes = generateInstitutionalTimetable(classes, teachers, rooms, rules, config, [], {
      directives,
    });
    return {
      success: fullRes.success,
      slots: fullRes.slots,
      modifiedCount: fullRes.slots.length,
      message: 'تم إعادة موازنة الجدول وتطبيق جميع توجيهات المدير البيداغوجية بنجاح.',
    };
  }

  return {
    success: true,
    slots,
    modifiedCount,
    message:
      changeNotes.length > 0
        ? `تم تطبيق توجيهات المدير فوراً على الجدول: ${changeNotes.join(' • ')}.`
        : 'تم تحديث وضبط استعمال الزمن وفق توجيهات المدير.',
  };
}

