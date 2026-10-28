/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AcademicPeriod, SubjectGrade } from '../types';

/**
 * Helper to check if a value is an entered valid numeric score (0 to 10).
 * Rules:
 * - Accepts 0 (number 0 or string "0")
 * - Accepts floats / numbers between 0 and 10 (e.g. 7.5, "8.25")
 * - Strictly rejects null, undefined, empty string "", spaces, NaN, or non-numeric strings
 */
export function isEnteredValidScore(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return false;
  if (Array.isArray(value)) return false;
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  
  const cleanStr = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  const num = typeof cleanStr === 'number' ? cleanStr : Number(cleanStr);
  return !isNaN(num) && isFinite(num) && num >= 0 && num <= 10;
}

/**
 * Safely parse an entered score to a valid number or undefined
 */
export function parseEnteredScore(value: any): number | undefined {
  if (!isEnteredValidScore(value)) return undefined;
  const cleanStr = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  return typeof cleanStr === 'number' ? cleanStr : Number(cleanStr);
}

export interface CalculateSubjectAverageParams {
  assessmentMode?: 'SCORE_10' | 'COMMENT_ONLY' | 'HYBRID' | string;
  regularScores?: (number | string | undefined | null)[];
  tx1?: number | string | undefined | null;
  tx2?: number | string | undefined | null;
  tx3?: number | string | undefined | null;
  tx4?: number | string | undefined | null;
  tx5?: number | string | undefined | null;
  tx6?: number | string | undefined | null;
  midterm?: number | string | undefined | null;
  finalExam?: number | string | undefined | null;
  period?: AcademicPeriod;
  tbHk1?: number | string | undefined | null;
  tbHk2?: number | string | undefined | null;
  tbCaNam?: number | string | undefined | null;
}

/**
 * Single Source of Truth for calculating subject average:
 * 
 * Vietnam MOET Rules (TT 22 / TT 26 / TT 43):
 * - Each entered regular test (TX1, TX2, TX3...) has weight 1.
 * - Entered Midterm test (GK) has weight 2.
 * - Entered Final exam (CK) has weight 3.
 * 
 * Denominator = Sum of weights of ENTERED columns ONLY.
 * Empty columns (null, undefined, "", spaces) DO NOT participate in numerator OR denominator.
 * If no scores are entered at all, returns undefined (never auto-generates 0).
 * Valid score 0 is strictly kept and enters calculation.
 * 
 * For full_year:
 * - If tbHk1 and tbHk2 are both entered: (tbHk1 * 1 + tbHk2 * 2) / 3
 * - If insufficient semester data: returns undefined
 */
export function calculateSubjectAverage(params: CalculateSubjectAverageParams): number | undefined {
  if (!params) return undefined;

  // If qualitative / comment only subject, do not calculate numerical average
  if (params.assessmentMode === 'COMMENT_ONLY') {
    return undefined;
  }

  // Handle Full Year (Điểm cuối năm học) calculation:
  // ĐTB cả năm = (ĐTB môn HKII × 2 + ĐTB môn HKI) / 3, làm tròn 1 chữ số thập phân.
  // Nếu thiếu điểm HKI hoặc HKII thì trả về undefined.
  if (params.period === 'full_year') {
    const hk1Valid = isEnteredValidScore(params.tbHk1);
    const hk2Valid = isEnteredValidScore(params.tbHk2);

    if (hk1Valid && hk2Valid) {
      const vHk1 = Number(params.tbHk1);
      const vHk2 = Number(params.tbHk2);
      return Number(((vHk2 * 2 + vHk1) / 3).toFixed(1));
    }
    return undefined;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  // 1. Regular scores (Weight = 1 each for valid entered scores)
  // Reconcile explicit tx1..tx6 fields and regularScores array
  const explicitTx = [
    params.tx1,
    params.tx2,
    params.tx3,
    params.tx4,
    params.tx5,
    params.tx6
  ];
  const hasExplicitTx = explicitTx.some(isEnteredValidScore);

  const validTxList: number[] = [];
  if (hasExplicitTx) {
    explicitTx.forEach((v) => {
      if (isEnteredValidScore(v)) {
        validTxList.push(Number(v));
      }
    });
  } else if (Array.isArray(params.regularScores) && params.regularScores.length > 0) {
    params.regularScores.forEach((v) => {
      if (isEnteredValidScore(v)) {
        validTxList.push(Number(v));
      }
    });
  }

  for (const score of validTxList) {
    weightedSum += score * 1;
    totalWeight += 1;
  }

  // 2. Midterm test (Weight = 2) - only participates when an entered valid score is present
  if (isEnteredValidScore(params.midterm)) {
    weightedSum += Number(params.midterm) * 2;
    totalWeight += 2;
  }

  // 3. Final exam (Weight = 3) - only participates when an entered valid score is present
  // For midterm milestones (midterm_hk1, midterm_hk2), final exam should not be included
  const isMidtermPeriod = params.period === 'midterm_hk1' || params.period === 'midterm_hk2';
  if (!isMidtermPeriod && isEnteredValidScore(params.finalExam)) {
    weightedSum += Number(params.finalExam) * 3;
    totalWeight += 3;
  }

  // If no component scores have been entered, return undefined (do NOT generate 0)
  if (totalWeight === 0) {
    return undefined;
  }

  return Number((weightedSum / totalWeight).toFixed(1));
}

/**
 * Format a grade for display (returns "—" if undefined or null, or exact number string like "0", "7.5", "10")
 */
export function formatScoreDisplay(val: any): string {
  if (!isEnteredValidScore(val)) return '—';
  return String(val);
}
