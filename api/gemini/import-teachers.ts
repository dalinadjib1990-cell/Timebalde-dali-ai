import { generateContentWithRotatingPool } from '../../src/server/geminiPool';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rawText, availableSubjects, availableClasses } = req.body || {};
    if (!rawText) {
      return res.status(400).json({ success: false, error: 'Text content is required' });
    }

    const prompt = `
استخرج قائمة أساتذة التعليم المتوسط الجزائري من النص التالي:
"${rawText}"

المواد المتاحة في المؤسسة:
${JSON.stringify(availableSubjects || [])}

الأقسام المتاحة:
${JSON.stringify(availableClasses || [])}

استخرج كل أستاذ في شكل كائن:
{
  "teachers": [
    {
      "name": "اسم ولقب الأستاذ",
      "subjectId": "arabic | math | science | physics | french | english | history | islamic | civic | art_music | pe | computer | amazigh",
      "assignedClassIds": [],
      "maxWeeklyHours": 18,
      "minWeeklyHours": 18,
      "phone": "",
      "notes": ""
    }
  ]
}
`;

    const poolResult = await generateContentWithRotatingPool({
      contents: prompt,
      responseMimeType: 'application/json',
    });

    if (poolResult.text) {
      try {
        const parsed = JSON.parse(poolResult.text);
        return res.status(200).json({
          success: true,
          teachers: parsed.teachers || [],
          modelUsed: poolResult.modelUsed,
        });
      } catch {
        // Fallback
      }
    }

    // Fallback parser if text has teacher lines
    const lines = rawText.split('\n').filter((l: string) => l.trim().length > 0);
    const parsedTeachers: any[] = [];

    lines.forEach((line: string, idx: number) => {
      const parts = line.split(/[,;\t-]/).map((p: string) => p.trim());
      if (parts[0]) {
        parsedTeachers.push({
          id: `t-imp-${Date.now()}-${idx}`,
          name: parts[0],
          subjectId: 'arabic',
          assignedClassIds: [],
          maxWeeklyHours: 18,
          minWeeklyHours: 18,
          phone: parts[1] || '',
          notes: 'مستورد بالمعالج الذكي',
          unavailableSlots: [],
        });
      }
    });

    return res.status(200).json({
      success: true,
      teachers: parsedTeachers,
    });
  } catch (error: any) {
    console.error('Error in Vercel import-teachers endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل استيراد قائمة الأساتذة بالذكاء الاصطناعي',
      details: error?.message || String(error),
    });
  }
}
