/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { studentService } from '../services/StudentService';
import { Student } from '../types';

/**
 * Custom hook to subscribe to the single source of truth for students.
 * Automatically re-renders the component whenever students are added, edited, or archived.
 */
export function useStudents(includeArchived = false): Student[] {
  const [students, setStudents] = useState<Student[]>(() => studentService.getAll(includeArchived));

  useEffect(() => {
    // Initial fetch
    setStudents(studentService.getAll(includeArchived));

    // Subscribe to changes
    const unsubscribe = studentService.subscribe(() => {
      setStudents(studentService.getAll(includeArchived));
    });

    return () => {
      unsubscribe();
    };
  }, [includeArchived]);

  return students;
}
