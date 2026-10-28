import { ConductEvaluationGrade, ConductEvaluationPeriodType, SurveyTemplate, StudentSurveyResponse } from '../types';

/**
 * Safely unwraps an answer value from any legacy or structured format:
 * - Plain string (trimming whitespace and filtering out corrupted '[object Object]')
 * - Primitive number or boolean
 * - Object with { label, value } or { value } or { text } or { name } or { grade } or { selfAssessment }
 * - Array of choices or objects
 * - Boolean map from checkboxes: { "Tốt": true }
 * Guaranteed to never return a raw object that casts to '[object Object]'.
 */
export function unwrapAnswerValue(val: any): any {
  if (val === undefined || val === null) {
    return '';
  }

  // Primitive strings: preserve string intact
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '[object Object]' || trimmed === '[object object]') {
      return '';
    }
    return val;
  }

  // Primitive numbers / booleans
  if (typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }

  // Arrays (e.g. multiple choice, elective subjects)
  if (Array.isArray(val)) {
    const unwrappedArr = val
      .map((item) => unwrapAnswerValue(item))
      .filter((x) => x !== undefined && x !== null && x !== '' && x !== '[object Object]' && x !== '[object object]');
    return unwrappedArr;
  }

  // Structured Objects
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) {
      return '';
    }

    // 1. Check for option structure: { label, value }
    if (typeof val.label === 'string' && val.label.trim() && val.label.trim() !== '[object Object]' && val.label.trim() !== '[object object]') {
      return val.label.trim();
    }
    if (typeof val.value === 'string' && val.value.trim() && val.value.trim() !== '[object Object]' && val.value.trim() !== '[object object]') {
      return val.value.trim();
    }
    if (typeof val.text === 'string' && val.text.trim() && val.text.trim() !== '[object Object]' && val.text.trim() !== '[object object]') {
      return val.text.trim();
    }
    if (typeof val.title === 'string' && val.title.trim() && val.title.trim() !== '[object Object]' && val.title.trim() !== '[object object]') {
      return val.title.trim();
    }
    if (typeof val.name === 'string' && val.name.trim() && val.name.trim() !== '[object Object]' && val.name.trim() !== '[object object]') {
      return val.name.trim();
    }
    if (typeof val.content === 'string' && val.content.trim() && val.content.trim() !== '[object Object]' && val.content.trim() !== '[object object]') {
      return val.content.trim();
    }
    if (typeof val.display === 'string' && val.display.trim() && val.display.trim() !== '[object Object]' && val.display.trim() !== '[object object]') {
      return val.display.trim();
    }
    if (typeof val.selected === 'string' && val.selected.trim() && val.selected.trim() !== '[object Object]' && val.selected.trim() !== '[object object]') {
      return val.selected.trim();
    }
    if (typeof val.choice === 'string' && val.choice.trim() && val.choice.trim() !== '[object Object]' && val.choice.trim() !== '[object object]') {
      return val.choice.trim();
    }
    if (typeof val.option === 'string' && val.option.trim() && val.option.trim() !== '[object Object]' && val.option.trim() !== '[object object]') {
      return val.option.trim();
    }

    // Check if label/value are numbers
    if (typeof val.label === 'number' || typeof val.value === 'number') {
      return val.label !== undefined ? val.label : val.value;
    }

    // 2. Check for domain keys in survey section objects
    if (val.grade !== undefined && val.grade !== null) {
      const u = unwrapAnswerValue(val.grade);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.selfAssessment !== undefined && val.selfAssessment !== null) {
      const u = unwrapAnswerValue(val.selfAssessment);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.xepLoai !== undefined && val.xepLoai !== null) {
      const u = unwrapAnswerValue(val.xepLoai);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.result !== undefined && val.result !== null) {
      const u = unwrapAnswerValue(val.result);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.conductSelfEvaluation !== undefined && val.conductSelfEvaluation !== null) {
      const u = unwrapAnswerValue(val.conductSelfEvaluation);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.conductEvaluation !== undefined && val.conductEvaluation !== null) {
      const u = unwrapAnswerValue(val.conductEvaluation);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.selfEvaluation !== undefined && val.selfEvaluation !== null) {
      const u = unwrapAnswerValue(val.selfEvaluation);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.answer !== undefined && val.answer !== null) {
      const u = unwrapAnswerValue(val.answer);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.note !== undefined && val.note !== null) {
      const u = unwrapAnswerValue(val.note);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.conductNote !== undefined && val.conductNote !== null) {
      const u = unwrapAnswerValue(val.conductNote);
      if (u !== undefined && u !== null && u !== '') return u;
    }
    if (val.commitment !== undefined && val.commitment !== null) {
      const u = unwrapAnswerValue(val.commitment);
      if (u !== undefined && u !== null && u !== '') return u;
    }

    // 3. Multi-select boolean map: { "Tốt": true, "Khá": false }
    const entries = Object.entries(val);
    const truthyEntries = entries.filter(
      ([k, v]) => Boolean(v) && v !== 'false' && k !== '[object Object]' && k !== '[object object]'
    );
    const isBooleanMap = entries.length > 0 && entries.every(
      ([, v]) => typeof v === 'boolean' || v === 'true' || v === 'false' || v === 1 || v === 0
    );
    if (isBooleanMap && truthyEntries.length > 0) {
      return truthyEntries.length === 1 ? truthyEntries[0][0] : truthyEntries.map(([k]) => k);
    }

    // 4. Single non-empty string attribute fallback
    const stringEntries = entries.filter(
      ([k, v]) => typeof v === 'string' && v.trim() && v.trim() !== '[object Object]' && v.trim() !== '[object object]'
    );
    if (stringEntries.length === 1) {
      return (stringEntries[0][1] as string).trim();
    }

    // 5. If it's an object with label/value where label is an object
    if (typeof val.label === 'object' && val.label !== null) {
      const inner = unwrapAnswerValue(val.label);
      if (inner) return inner;
    }
    if (typeof val.value === 'object' && val.value !== null) {
      const inner = unwrapAnswerValue(val.value);
      if (inner) return inner;
    }

    // 6. Grid map: format each entry safely to text rather than returning raw object
    const isGridMap = entries.length > 0 && entries.every(
      ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || (Array.isArray(v) && v.every(item => typeof item === 'string'))
    );
    if (isGridMap) {
      const formatted = entries
        .map(([k, v]) => {
          const vClean = Array.isArray(v)
            ? v.map(item => extractCleanAnswerText(item)).filter(Boolean).join(', ')
            : extractCleanAnswerText(v);
          if (!vClean || vClean === '[object Object]' || vClean === '[object object]') return '';
          return `${k}: ${vClean}`;
        })
        .filter(Boolean);
      return formatted.length > 0 ? formatted.join('; ') : '';
    }

    // If completely unknown object structure, record for verification rather than guessing
    console.warn('[surveyAnswerUtils] Unidentified answer object structure:', Object.keys(val));
    return '';
  }

  return '';
}

/**
 * Extracts a clean string representation from any answer value, guaranteed to never return '[object Object]'.
 */
export function extractCleanAnswerText(val: any): string {
  if (val === undefined || val === null) return '';

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '[object Object]' || trimmed === '[object object]') return '';
    return val;
  }

  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }

  if (Array.isArray(val)) {
    return val
      .map(item => extractCleanAnswerText(item))
      .filter(s => s.length > 0 && s !== '[object Object]' && s !== '[object object]')
      .join(', ');
  }

  if (typeof val === 'object') {
    // Check known value fields in order
    const candidateKeys = [
      'label', 'value', 'text', 'title', 'name', 'content', 'display',
      'selected', 'choice', 'option', 'grade', 'selfAssessment', 'xepLoai',
      'result', 'answer', 'note', 'conductNote', 'commitment', 'description'
    ];
    for (const k of candidateKeys) {
      if (val[k] !== undefined && val[k] !== null) {
        const text = extractCleanAnswerText(val[k]);
        if (text) return text;
      }
    }

    // Check if it's a key-value grid map
    const pairs = Object.entries(val)
      .map(([k, v]) => {
        const vText = extractCleanAnswerText(v);
        return vText ? `${k}: ${vText}` : '';
      })
      .filter(s => s.length > 0 && !s.includes('[object Object]'));
    if (pairs.length > 0) return pairs.join('; ');

    return '';
  }

  return '';
}

/**
 * Normalizes conduct evaluation grades into one of the 4 standard levels:
 * - 'Tốt'
 * - 'Khá'
 * - 'Đạt'
 * - 'Chưa đạt'
 *
 * Guaranteed to distinguish 'Chưa đạt' from 'Đạt' by checking 'chưa' first.
 * Returns undefined if the grade cannot be recognized (never returns '[object Object]').
 */
export function normalizeConductGrade(val: any): ConductEvaluationGrade | undefined {
  if (val === undefined || val === null) {
    return undefined;
  }

  const unwrapped = unwrapAnswerValue(val);
  if (!unwrapped) {
    return undefined;
  }

  let str = '';
  if (typeof unwrapped === 'string') {
    str = unwrapped.trim();
  } else if (typeof unwrapped === 'number') {
    str = String(unwrapped).trim();
  } else if (Array.isArray(unwrapped) && unwrapped.length > 0) {
    const firstItem = unwrapAnswerValue(unwrapped[0]);
    str = typeof firstItem === 'string' ? firstItem.trim() : (typeof firstItem === 'number' ? String(firstItem) : '');
  } else if (typeof unwrapped === 'object' && unwrapped !== null) {
    const candidate = unwrapped.grade || unwrapped.selfAssessment || unwrapped.xepLoai || unwrapped.result || unwrapped.label || unwrapped.value;
    if (candidate) {
      const u = unwrapAnswerValue(candidate);
      str = typeof u === 'string' ? u.trim() : '';
    }
  }

  if (!str || str === '[object Object]' || str === '[object object]') {
    return undefined;
  }

  const lower = str.toLowerCase();

  // 1. 'Chưa đạt' MUST be checked before 'Đạt'
  if (
    lower.includes('chưa đạt') ||
    lower.includes('chua dat') ||
    lower.includes('chua_dat') ||
    lower.includes('chuadat') ||
    lower.includes('chưa') ||
    lower.includes('chua') ||
    lower.includes('không đạt') ||
    lower.includes('khong dat')
  ) {
    return 'Chưa đạt';
  }

  // 2. 'Tốt'
  if (
    lower.includes('tốt') ||
    lower.includes('tot') ||
    lower === 'good' ||
    lower === 'excellent' ||
    lower.startsWith('tốt')
  ) {
    return 'Tốt';
  }

  // 3. 'Khá'
  if (
    lower.includes('khá') ||
    lower.includes('kha') ||
    lower === 'fair' ||
    lower.startsWith('khá')
  ) {
    return 'Khá';
  }

  // 4. 'Đạt'
  if (
    lower.includes('đạt') ||
    lower.includes('dat') ||
    lower === 'pass' ||
    lower.startsWith('đạt') ||
    lower.includes('trung bình') ||
    lower === 'tb'
  ) {
    return 'Đạt';
  }

  return undefined;
}

/**
 * Determines the exact conduct evaluation period (semester) from a template or survey:
 * - 'SEMESTER_1' (HKI)
 * - 'SEMESTER_2' (HKII)
 * - 'FULL_YEAR' (Cả năm)
 * If semester information is missing or ambiguous, returns undefined (never guesses or contaminates).
 */
export function determineConductSemester(
  template?: SurveyTemplate | null,
  survey?: StudentSurveyResponse | null
): ConductEvaluationPeriodType | undefined {
  if (!template && !survey) return undefined;

  // 1. Direct metadata or property on template or survey
  const directPeriod = (template as any)?.periodType || (template as any)?.metadata?.periodType || (survey as any)?.periodType;
  if (directPeriod === 'SEMESTER_1' || directPeriod === 'SEMESTER_2' || directPeriod === 'FULL_YEAR') {
    return directPeriod;
  }

  const directSemester = (template as any)?.semester || (template as any)?.metadata?.semester || (survey as any)?.semester;
  if (directSemester === 1 || directSemester === '1' || directSemester === 'HK1' || directSemester === 'SEMESTER_1') {
    return 'SEMESTER_1';
  }
  if (directSemester === 2 || directSemester === '2' || directSemester === 'HK2' || directSemester === 'SEMESTER_2') {
    return 'SEMESTER_2';
  }

  // 2. Specific Template ID
  const templateId = (template?.id || survey?.surveyTemplateId || '').toLowerCase();
  if (templateId === 'template-conduct-hk1' || templateId.includes('conduct-hk1') || templateId.includes('conduct-hki')) {
    return 'SEMESTER_1';
  }
  if (templateId === 'template-conduct-hk2' || templateId.includes('conduct-hk2') || templateId.includes('conduct-hkii')) {
    return 'SEMESTER_2';
  }

  // 3. Title and description analysis
  const fullText = [
    template?.title || '',
    template?.description || '',
    (survey as any)?.title || ''
  ].join(' ').toLowerCase();

  if (!fullText.trim()) return undefined;

  // Semester 2 check (must not be confused with Semester 1)
  const isSem2 = /(?:hk\s*2|hk\s*ii\b|học\s*kỳ\s*2|học\s*kỳ\s*ii\b|giữa\s*kỳ\s*2|cuối\s*kỳ\s*2)/i.test(fullText);

  // Semester 1 check
  const isSem1 = /(?:hk\s*1|hk\s*i\b|học\s*kỳ\s*1|học\s*kỳ\s*i\b|giữa\s*kỳ\s*1|cuối\s*kỳ\s*1)/i.test(fullText);

  // Full year check
  const isFullYear = /(?:cả\s*năm|toàn\s*năm|full\s*year)/i.test(fullText);

  if (isSem2 && !isSem1) return 'SEMESTER_2';
  if (isSem1 && !isSem2) return 'SEMESTER_1';
  if (isFullYear && !isSem1 && !isSem2) return 'FULL_YEAR';

  // If both or neither match: do NOT guess!
  return undefined;
}

/**
 * Robust answer getter that handles:
 * - Direct answers[key]
 * - Direct answers[fallbackKey] (e.g. q.id vs q.key)
 * - Dot-nested path (e.g. 'conductSelfEvaluation.grade')
 * - Searching inside domain objects
 */
export function getSafeSurveyAnswer(answers: any, primaryKey?: string, fallbackKey?: string): any {
  if (!answers || typeof answers !== 'object') return undefined;

  // 1. Check primaryKey
  if (primaryKey && answers[primaryKey] !== undefined && answers[primaryKey] !== null && answers[primaryKey] !== '') {
    return answers[primaryKey];
  }

  // 2. Check fallbackKey
  if (fallbackKey && answers[fallbackKey] !== undefined && answers[fallbackKey] !== null && answers[fallbackKey] !== '') {
    return answers[fallbackKey];
  }

  // 3. Nested dot notation for primaryKey
  if (primaryKey && primaryKey.includes('.')) {
    const parts = primaryKey.split('.');
    let curr = answers;
    let found = true;
    for (const p of parts) {
      if (curr === undefined || curr === null || typeof curr !== 'object') {
        found = false;
        break;
      }
      curr = curr[p];
    }
    if (found && curr !== undefined && curr !== null && curr !== '') {
      return curr;
    }
  }

  // 4. Nested dot notation for fallbackKey
  if (fallbackKey && fallbackKey.includes('.')) {
    const parts = fallbackKey.split('.');
    let curr = answers;
    let found = true;
    for (const p of parts) {
      if (curr === undefined || curr === null || typeof curr !== 'object') {
        found = false;
        break;
      }
      curr = curr[p];
    }
    if (found && curr !== undefined && curr !== null && curr !== '') {
      return curr;
    }
  }

  // 5. Look inside answers.otherText
  if (answers.otherText && typeof answers.otherText === 'object') {
    if (primaryKey && answers.otherText[primaryKey]) return answers.otherText[primaryKey];
    if (fallbackKey && answers.otherText[fallbackKey]) return answers.otherText[fallbackKey];
  }

  // 6. Search inside known domain groups if key relates to conduct
  const checkConductKey = (primaryKey || fallbackKey || '').toLowerCase();
  if (
    checkConductKey.includes('conduct') ||
    checkConductKey.includes('grade') ||
    checkConductKey.includes('ren-luyen') ||
    checkConductKey.includes('xep-loai')
  ) {
    const c = answers.conductSelfEvaluation || answers.conductEvaluation || answers.selfEvaluation;
    if (c) {
      if (typeof c === 'string') return c;
      if (typeof c === 'object') {
        if (checkConductKey.includes('note') || checkConductKey.includes('minh-chung')) {
          return c.note || c.conductNote || c.minhChung || '';
        }
        if (checkConductKey.includes('commitment') || checkConductKey.includes('muc-tieu')) {
          return c.commitment || c.phuongHuong || '';
        }
        return c.grade || c.selfAssessment || c.xepLoai || c.result || c;
      }
    }
  }

  return undefined;
}

/**
 * Format answer for clean user-facing display without ever rendering '[object Object]'
 */
export function formatAnswerForDisplay(val: any, otherText?: string): string {
  if (val === undefined || val === null || val === '') {
    return 'Chưa có câu trả lời';
  }

  if (val === 'Khác' && otherText) {
    return `Khác: ${otherText}`;
  }

  const unwrapped = unwrapAnswerValue(val);
  if (unwrapped === undefined || unwrapped === null || unwrapped === '') {
    return 'Chưa có câu trả lời';
  }

  if (Array.isArray(unwrapped)) {
    if (unwrapped.length === 0) return 'Chưa có câu trả lời';
    const items = unwrapped
      .map((item) => {
        const itemUnwrapped = unwrapAnswerValue(item);
        if (itemUnwrapped === 'Khác' && otherText) return `Khác: ${otherText}`;
        if (typeof itemUnwrapped === 'string') return itemUnwrapped.trim();
        if (typeof itemUnwrapped === 'number' || typeof itemUnwrapped === 'boolean') return String(itemUnwrapped);
        if (typeof itemUnwrapped === 'object' && itemUnwrapped !== null) {
          const innerStr = formatAnswerForDisplay(itemUnwrapped);
          return innerStr === 'Chưa có câu trả lời' ? '' : innerStr;
        }
        return '';
      })
      .filter((s) => s && s !== '[object Object]' && s !== '[object object]');
    return items.length > 0 ? items.join(', ') : 'Chưa có câu trả lời';
  }

  if (typeof unwrapped === 'object' && unwrapped !== null) {
    // If it's a key-value grid map: { "Tiêu chí 1": "Tốt", "Tiêu chí 2": "Khá" }
    const pairs = Object.entries(unwrapped)
      .map(([k, v]) => {
        const unwrapV = unwrapAnswerValue(v);
        const strV = typeof unwrapV === 'string' ? unwrapV.trim() : (typeof unwrapV === 'number' ? String(unwrapV) : '');
        if (!strV || strV === '[object Object]' || strV === '[object object]') return '';
        return `${k}: ${strV}`;
      })
      .filter((s) => s.length > 0);
    if (pairs.length > 0) {
      return pairs.join('; ');
    }
    return 'Chưa có câu trả lời';
  }

  const str = String(unwrapped).trim();
  if (str === '[object Object]' || str === '[object object]' || str === '') {
    return 'Chưa có câu trả lời';
  }
  return str;
}

