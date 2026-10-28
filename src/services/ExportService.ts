/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { classService } from './ClassService';

class ExportService {
  public async exportToExcel(
    data: Array<Record<string, any>>,
    fileName: string,
    sheetName: string = 'Báo cáo'
  ) {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  public async exportMultiSheetExcel(
    sheets: Array<{ name: string; data: Array<Record<string, any>> }>,
    fileName: string
  ) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    sheets.forEach(s => {
      const worksheet = XLSX.utils.json_to_sheet(s.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, s.name);
    });
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  public exportTimetableToExcel(timetable: any) {
    const rows: any[] = [];
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    // Header
    rows.push({
      'Buổi': 'THỜI KHÓA BIỂU',
      'Tiết': timetable.name || 'Lớp 12A1',
      'Thứ 2': '',
      'Thứ 3': '',
      'Thứ 4': '',
      'Thứ 5': '',
      'Thứ 6': '',
      'Thứ 7': ''
    });

    // Morning rows
    [1, 2, 3, 4, 5].forEach(pNum => {
      const rowObj: any = { 'Buổi': 'Sáng', 'Tiết': `Tiết ${pNum}` };
      days.forEach(dayName => {
        const day = timetable.schedule?.find((d: any) => d.dayOfWeek === dayName);
        const p = day?.morningPeriods?.find((x: any) => x.period === pNum);
        rowObj[dayName] = p?.subject ? `${p.subject} (${p.teacher || ''})` : '';
      });
      rows.push(rowObj);
    });

    // Afternoon rows
    [1, 2, 3, 4, 5].forEach(pNum => {
      const rowObj: any = { 'Buổi': 'Chiều', 'Tiết': `Tiết ${pNum}` };
      days.forEach(dayName => {
        const day = timetable.schedule?.find((d: any) => d.dayOfWeek === dayName);
        const p = day?.afternoonPeriods?.find((x: any) => x.period === pNum);
        rowObj[dayName] = p?.subject ? `${p.subject} (${p.teacher || ''})` : '';
      });
      rows.push(rowObj);
    });

    this.exportToExcel(rows, `Thoi_Khoa_Bieu_${timetable.name || 'Lop_12A1'}`, 'Thời khóa biểu');
  }

  public async exportToCSV(data: Array<Record<string, any>>, fileName: string) {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public exportConductEvaluationToExcel(evaluation: any) {
    const classSettings = classService.getSettings() || (window as any).__kgcns_class_settings || {};
    const className = classSettings.className || '12A1';
    const schoolYear = evaluation.schoolYear || classSettings.academicYear || '2025 - 2026';

    const rows: any[] = [];

    // Header info
    rows.push({
      'STT': 'BẢNG ĐÁNH GIÁ, XẾP LOẠI RÈN LUYỆN HỌC SINH ĐỊNH KỲ',
      'Mã học sinh': '',
      'Họ và tên': '',
      'Tổ': '',
      'Điểm cộng (+)': '',
      'Điểm trừ (-)': '',
      'Điểm rèn luyện': '',
      'Tự đánh giá': '',
      'Tập thể đánh giá': '',
      'GVCN đánh giá': '',
      'Kết quả chính thức': '',
      'Chi tiết biểu dương & Vi phạm': '',
      'Nhận xét của GVCN': ''
    });

    rows.push({
      'STT': `Lớp: ${className} | Năm học: ${schoolYear} | Đợt: ${evaluation.periodTitle}`,
      'Mã học sinh': '',
      'Họ và tên': '',
      'Tổ': '',
      'Điểm cộng (+)': '',
      'Điểm trừ (-)': '',
      'Điểm rèn luyện': '',
      'Tự đánh giá': '',
      'Tập thể đánh giá': '',
      'GVCN đánh giá': '',
      'Kết quả chính thức': '',
      'Chi tiết biểu dương & Vi phạm': '',
      'Nhận xét của GVCN': ''
    });

    rows.push({
      'STT': '',
      'Mã học sinh': '',
      'Họ và tên': '',
      'Tổ': '',
      'Điểm cộng (+)': '',
      'Điểm trừ (-)': '',
      'Điểm rèn luyện': '',
      'Tự đánh giá': '',
      'Tập thể đánh giá': '',
      'GVCN đánh giá': '',
      'Kết quả chính thức': '',
      'Chi tiết biểu dương & Vi phạm': '',
      'Nhận xét của GVCN': ''
    });

    // Student rows
    evaluation.evaluations?.forEach((e: any, index: number) => {
      rows.push({
        'STT': index + 1,
        'Mã học sinh': e.studentCode || '',
        'Họ và tên': e.studentName || '',
        'Tổ': e.group ? `Tổ ${e.group}` : '',
        'Điểm cộng (+)': e.plusPoints || 0,
        'Điểm trừ (-)': e.minusPoints || 0,
        'Điểm rèn luyện': e.netPoints || 0,
        'Tự đánh giá': e.selfAssessment || '',
        'Tập thể đánh giá': e.collectiveAssessment || '',
        'GVCN đánh giá': e.teacherAssessment || '',
        'Kết quả chính thức': e.finalGrade || '',
        'Chi tiết biểu dương & Vi phạm': e.autoSummaryNote || '',
        'Nhận xét của GVCN': e.teacherNote || ''
      });
    });

    // Clean safe filename
    const safeTitle = (evaluation.periodTitle || 'Danh_Gia_Ren_Luyen')
      .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    this.exportToExcel(rows, `Bang_Xep_Loai_Ren_Luyen_${className}_${safeTitle}`, 'Đánh giá rèn luyện');
  }

  /**
   * Xuất Báo cáo Kết quả Học tập – Rèn luyện Cả năm Toàn lớp (Excel nhiều tầng header)
   */
  public async exportClassFullYearReportToExcel(reportData: any) {
    const XLSX = await import('xlsx');
    const { className, schoolYear, teacherName, appliedSubjects, rows } = reportData;
    const aoa: any[][] = [];

    // Row 0: Title Banner
    aoa.push(['KẾT QUẢ HỌC TẬP – RÈN LUYỆN CẢ NĂM']);
    // Row 1: Subtitle Info
    aoa.push([`Năm học: ${schoolYear}   |   Lớp: ${className}   |   Giáo viên chủ nhiệm: ${teacherName}`]);

    // Row 2: Header Tier 1
    const headerRow1: any[] = ['TT', 'Họ và tên', 'Mã học viên', 'Tổ'];
    // Row 3: Header Tier 2
    const headerRow2: any[] = ['', '', '', ''];

    appliedSubjects.forEach((sub: any) => {
      const sName = sub.name || sub.subjectName || 'Môn';
      headerRow1.push(sName, '', '');
      headerRow2.push('TB HKI', 'TB HKII', 'Cả năm');
    });

    headerRow1.push(
      'Nghỉ có phép',
      'Nghỉ không phép',
      'Kết quả học tập',
      'Rèn luyện HKI',
      'Rèn luyện HKII',
      'Rèn luyện cả năm',
      'Danh hiệu',
      'Ghi chú'
    );
    headerRow2.push('', '', '', '', '', '', '', '');

    aoa.push(headerRow1);
    aoa.push(headerRow2);

    // Student data rows
    rows.forEach((r: any) => {
      const dataRow: any[] = [
        r.stt,
        r.studentName,
        r.studentCode,
        `Tổ ${r.group}`
      ];

      appliedSubjects.forEach((sub: any) => {
        const sName = sub.name || sub.subjectName || 'Môn';
        const scores = r.subjectScores[sName] || {};
        dataRow.push(
          scores.tbHk1 !== undefined && scores.tbHk1 !== '' ? scores.tbHk1 : '',
          scores.tbHk2 !== undefined && scores.tbHk2 !== '' ? scores.tbHk2 : '',
          scores.tbCaNam !== undefined && scores.tbCaNam !== '' ? scores.tbCaNam : ''
        );
      });

      dataRow.push(
        r.excusedAbsences || 0,
        r.unexcusedAbsences || 0,
        r.academicResult || '',
        r.conductHk1 || '',
        r.conductHk2 || '',
        r.conductCaNam || '',
        r.honorTitle || '',
        r.autoSummaryNote || ''
      );

      aoa.push(dataRow);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Merges configuration
    const merges: any[] = [
      // Title row 0
      { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow1.length - 1 } },
      // Subtitle row 1
      { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow1.length - 1 } },
      // Fixed columns (TT, Họ tên, Mã HV, Tổ) spanning rows 2 and 3
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
      { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }
    ];

    // Subject group merges in row 2
    let colIdx = 4;
    appliedSubjects.forEach(() => {
      merges.push({ s: { r: 2, c: colIdx }, e: { r: 2, c: colIdx + 2 } });
      colIdx += 3;
    });

    // End columns spanning rows 2 and 3
    for (let i = 0; i < 8; i++) {
      merges.push({ s: { r: 2, c: colIdx + i }, e: { r: 3, c: colIdx + i } });
    }

    worksheet['!merges'] = merges;

    // Column widths
    const colWidths: any[] = [
      { wch: 6 }, // TT
      { wch: 24 }, // Họ và tên
      { wch: 14 }, // Mã học viên
      { wch: 8 } // Tổ
    ];
    appliedSubjects.forEach(() => {
      colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 10 });
    });
    colWidths.push(
      { wch: 14 }, // Nghỉ có phép
      { wch: 16 }, // Nghỉ không phép
      { wch: 18 }, // Kết quả học tập
      { wch: 15 }, // Rèn luyện HKI
      { wch: 15 }, // Rèn luyện HKII
      { wch: 16 }, // Rèn luyện cả năm
      { wch: 20 }, // Danh hiệu
      { wch: 40 } // Ghi chú
    );
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kết quả cả năm');
    
    const safeClassName = (className || '12A1').replace(/\s+/g, '_');
    const safeYear = (schoolYear || '2025-2026').replace(/\s+/g, '');
    XLSX.writeFile(workbook, `Ket_Qua_Hoc_Tap_Ren_Luyen_Ca_Nam_Lop_${safeClassName}_${safeYear}.xlsx`);
  }

  /**
   * Xuất Báo cáo Kết quả Học tập – Rèn luyện Cả năm Cá nhân một học viên
   */
  public async exportStudentFullYearReportToExcel(reportData: any) {
    const XLSX = await import('xlsx');
    const { student, className, schoolYear, teacherName, subjectRows, conductHk1, conductHk2, conductCaNam, excusedAbsences, unexcusedAbsences, academicResult, honorTitle, autoSummaryNote, teacherComment } = reportData;

    const aoa: any[][] = [];

    aoa.push(['PHIẾU KẾT QUẢ HỌC TẬP – RÈN LUYỆN CẢ NĂM HỌC']);
    aoa.push([`Năm học: ${schoolYear}   |   Lớp: ${className}`]);
    aoa.push([]);

    aoa.push(['Họ và tên học viên:', student.fullName, '', 'Mã học viên:', student.code]);
    aoa.push(['Ngày sinh:', student.dob || '', '', 'Tổ:', `Tổ ${student.group}`]);
    aoa.push(['Giáo viên chủ nhiệm:', teacherName, '', 'Trạng thái:', student.status || 'Đang học']);
    aoa.push([]);

    // Subject Table Header
    // Find max TX count
    const maxTx = Math.max(...subjectRows.map((s: any) => s.txScores?.length || 0), 3);
    const tableHeader: string[] = ['STT', 'Môn học'];
    for (let i = 1; i <= maxTx; i++) {
      tableHeader.push(`TX${i} (HKII)`);
    }
    tableHeader.push('Điểm giữa học kì II', 'Điểm kiểm tra HKII', 'TB môn HKII', 'TB môn HKI', 'Cả năm', 'Nhận xét');
    aoa.push(tableHeader);

    // Subject Rows
    subjectRows.forEach((s: any, idx: number) => {
      const row: any[] = [idx + 1, s.subjectName];
      if (s.assessmentMode === 'COMMENT_ONLY') {
        for (let i = 1; i <= maxTx; i++) row.push('—');
        row.push('—', '—', s.qualitativeHk2 || '—', s.qualitativeHk1 || '—', s.qualitativeCaNam || '—', s.comment || '');
      } else {
        for (let i = 0; i < maxTx; i++) {
          const sc = s.txScores?.[i];
          row.push(sc !== undefined ? sc : '');
        }
        row.push(
          s.midtermHk2 !== undefined ? s.midtermHk2 : '',
          s.finalExamHk2 !== undefined ? s.finalExamHk2 : '',
          s.tbHk2 !== undefined ? s.tbHk2 : '',
          s.tbHk1 !== undefined ? s.tbHk1 : '',
          s.tbCaNam !== undefined ? s.tbCaNam : '',
          s.comment || ''
        );
      }
      aoa.push(row);
    });

    aoa.push([]);
    aoa.push(['TỔNG KẾT RÈN LUYỆN & CHUYÊN CẦN', '', '', '']);
    aoa.push(['Rèn luyện HKI:', conductHk1, 'Rèn luyện HKII:', conductHk2, 'Rèn luyện Cả năm:', conductCaNam]);
    aoa.push(['Nghỉ có phép:', `${excusedAbsences} buổi`, 'Nghỉ không phép:', `${unexcusedAbsences} buổi`]);
    aoa.push([]);
    aoa.push(['ĐÁNH GIÁ & XẾP LOẠI CHUNG CUỐI NĂM (THEO TT 43/2021/TT-BGDĐT)', '', '', '']);
    aoa.push(['Kết quả học tập:', academicResult || 'Chưa xếp loại', 'Danh hiệu khen thưởng:', honorTitle || '(Không có)']);
    aoa.push(['Ghi chú tổng hợp:', autoSummaryNote || 'Không có ghi nhận đặc biệt']);
    aoa.push(['Nhận xét của GVCN:', teacherComment || 'Chấp hành tốt nội quy trường lớp, tích cực rèn luyện.']);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kết quả cá nhân');

    const safeName = student.fullName.replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `Ket_Qua_Ca_Nam_${student.code}_${safeName}.xlsx`);
  }

  /**
   * Xuất Báo cáo Kết quả Học tập – Rèn luyện Toàn lớp theo Học kỳ I / Học kỳ II / Cả năm
   */
  public async exportClassReportToExcel(reportData: any, period: 'hk1' | 'hk2' | 'full_year' = 'full_year') {
    if (period === 'full_year') {
      return this.exportClassFullYearReportToExcel(reportData);
    }

    const XLSX = await import('xlsx');
    const { className, schoolYear, teacherName, appliedSubjects, rows } = reportData;
    const periodLabel = period === 'hk1' ? 'HỌC KỲ I' : 'HỌC KỲ II';
    const periodFileLabel = period === 'hk1' ? 'Hoc_Ky_I' : 'Hoc_Ky_II';
    const aoa: any[][] = [];

    // Title banner
    aoa.push([`KẾT QUẢ HỌC TẬP – RÈN LUYỆN ${periodLabel}`]);
    aoa.push([`Năm học: ${schoolYear}   |   Lớp: ${className}   |   Giáo viên chủ nhiệm: ${teacherName}`]);

    if (period === 'hk1') {
      // Single-tier subject header for HKI
      const headerRow: string[] = ['TT', 'Họ và tên', 'Mã học viên', 'Tổ'];
      appliedSubjects.forEach((sub: any) => {
        const sName = sub.name || sub.subjectName || 'Môn';
        headerRow.push(`${sName} (TB HKI)`);
      });
      headerRow.push(
        'Nghỉ có phép',
        'Nghỉ không phép',
        'Kết quả học tập HKI',
        'Rèn luyện HKI',
        'Danh hiệu HKI',
        'Ghi chú HKI'
      );
      aoa.push(headerRow);

      // Data rows for HKI
      rows.forEach((r: any) => {
        const dataRow: any[] = [
          r.stt,
          r.studentName,
          r.studentCode,
          `Tổ ${r.group}`
        ];

        appliedSubjects.forEach((sub: any) => {
          const sName = sub.name || sub.subjectName || 'Môn';
          const scores = r.subjectScores[sName] || {};
          dataRow.push(scores.tbHk1 !== undefined && scores.tbHk1 !== '' ? scores.tbHk1 : '—');
        });

        dataRow.push(
          r.excusedAbsencesHk1 ?? 0,
          r.unexcusedAbsencesHk1 ?? 0,
          r.academicResultHk1 || 'Chưa xếp loại',
          r.conductHk1 || 'Chưa đánh giá',
          r.honorTitleHk1 || '',
          r.autoSummaryNoteHk1 || ''
        );

        aoa.push(dataRow);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } }
      ];

      const colWidths: any[] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 14 },
        { wch: 8 }
      ];
      appliedSubjects.forEach(() => colWidths.push({ wch: 14 }));
      colWidths.push(
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 16 },
        { wch: 20 },
        { wch: 40 }
      );
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Kết quả ${periodLabel}`);
      const safeClassName = (className || '12A1').replace(/\s+/g, '_');
      const safeYear = (schoolYear || '2025-2026').replace(/\s+/g, '');
      XLSX.writeFile(workbook, `Ket_Qua_Hoc_Tap_Ren_Luyen_${periodFileLabel}_Lop_${safeClassName}_${safeYear}.xlsx`);
    } else {
      // Multi-tier subject header for HKII (TB HKI | TB HKII | Cả năm)
      const headerRow1: any[] = ['TT', 'Họ và tên', 'Mã học viên', 'Tổ'];
      const headerRow2: any[] = ['', '', '', ''];

      appliedSubjects.forEach((sub: any) => {
        const sName = sub.name || sub.subjectName || 'Môn';
        headerRow1.push(sName, '', '');
        headerRow2.push('TB HKI', 'TB HKII', 'Cả năm');
      });

      headerRow1.push(
        'Nghỉ có phép',
        'Nghỉ không phép',
        'Kết quả học tập HKII',
        'Rèn luyện HKI',
        'Rèn luyện HKII',
        'Rèn luyện cả năm',
        'Danh hiệu HKII',
        'Ghi chú HKII'
      );
      headerRow2.push('', '', '', '', '', '', '', '');

      aoa.push(headerRow1);
      aoa.push(headerRow2);

      // Data rows for HKII
      rows.forEach((r: any) => {
        const dataRow: any[] = [
          r.stt,
          r.studentName,
          r.studentCode,
          `Tổ ${r.group}`
        ];

        appliedSubjects.forEach((sub: any) => {
          const sName = sub.name || sub.subjectName || 'Môn';
          const scores = r.subjectScores[sName] || {};
          dataRow.push(
            scores.tbHk1 !== undefined && scores.tbHk1 !== '' ? scores.tbHk1 : '',
            scores.tbHk2 !== undefined && scores.tbHk2 !== '' ? scores.tbHk2 : '',
            scores.tbCaNam !== undefined && scores.tbCaNam !== '' ? scores.tbCaNam : ''
          );
        });

        dataRow.push(
          r.excusedAbsencesHk2 ?? 0,
          r.unexcusedAbsencesHk2 ?? 0,
          r.academicResultHk2 || 'Chưa xếp loại',
          r.conductHk1 || '',
          r.conductHk2 || '',
          r.conductCaNam || '',
          r.honorTitleHk2 || '',
          r.autoSummaryNoteHk2 || ''
        );

        aoa.push(dataRow);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoa);

      const merges: any[] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow1.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow1.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
        { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }
      ];

      let colIdx = 4;
      appliedSubjects.forEach(() => {
        merges.push({ s: { r: 2, c: colIdx }, e: { r: 2, c: colIdx + 2 } });
        colIdx += 3;
      });

      for (let i = 0; i < 8; i++) {
        merges.push({ s: { r: 2, c: colIdx + i }, e: { r: 3, c: colIdx + i } });
      }

      worksheet['!merges'] = merges;

      const colWidths: any[] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 14 },
        { wch: 8 }
      ];
      appliedSubjects.forEach(() => {
        colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 10 });
      });
      colWidths.push(
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 16 },
        { wch: 20 },
        { wch: 40 }
      );
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Kết quả ${periodLabel}`);
      const safeClassName = (className || '12A1').replace(/\s+/g, '_');
      const safeYear = (schoolYear || '2025-2026').replace(/\s+/g, '');
      XLSX.writeFile(workbook, `Ket_Qua_Hoc_Tap_Ren_Luyen_${periodFileLabel}_Lop_${safeClassName}_${safeYear}.xlsx`);
    }
  }

  /**
   * Xuất Báo cáo Kết quả Học tập – Rèn luyện Cá nhân học viên theo Học kỳ I / Học kỳ II / Cả năm
   */
  public async exportStudentReportToExcel(reportData: any, period: 'hk1' | 'hk2' | 'full_year' = 'full_year') {
    if (period === 'full_year') {
      return this.exportStudentFullYearReportToExcel(reportData);
    }

    const XLSX = await import('xlsx');
    const {
      student,
      className,
      schoolYear,
      teacherName,
      subjectRows,
      conductHk1,
      conductHk2,
      excusedAbsencesHk1,
      unexcusedAbsencesHk1,
      excusedAbsencesHk2,
      unexcusedAbsencesHk2,
      academicResultHk1,
      academicResultHk2,
      honorTitleHk1,
      honorTitleHk2,
      autoSummaryNoteHk1,
      autoSummaryNoteHk2,
      teacherCommentHk1,
      teacherCommentHk2
    } = reportData;

    const periodLabel = period === 'hk1' ? 'HỌC KỲ I' : 'HỌC KỲ II';
    const periodFileLabel = period === 'hk1' ? 'Hoc_Ky_I' : 'Hoc_Ky_II';
    const aoa: any[][] = [];

    aoa.push([`PHIẾU KẾT QUẢ HỌC TẬP – RÈN LUYỆN ${periodLabel}`]);
    aoa.push([`Năm học: ${schoolYear}   |   Lớp: ${className}`]);
    aoa.push([]);

    aoa.push(['Họ và tên học viên:', student.fullName, '', 'Mã học viên:', student.code]);
    aoa.push(['Ngày sinh:', student.dob || '', '', 'Tổ:', `Tổ ${student.group}`]);
    aoa.push(['Giáo viên chủ nhiệm:', teacherName, '', 'Trạng thái:', student.status || 'Đang học']);
    aoa.push([]);

    // Find max TX
    const txListKey = period === 'hk1' ? 'txScoresHk1' : 'txScoresHk2';
    const maxTx = Math.max(...subjectRows.map((s: any) => s[txListKey]?.length || 0), 3);
    const tableHeader: string[] = ['STT', 'Môn học'];
    for (let i = 1; i <= maxTx; i++) {
      tableHeader.push(`TX${i}`);
    }
    tableHeader.push('Giữa kỳ', 'Cuối kỳ', `ĐTB ${periodLabel}`, 'Nhận xét');
    aoa.push(tableHeader);

    // Rows
    subjectRows.forEach((s: any, idx: number) => {
      const row: any[] = [idx + 1, s.subjectName];
      const txs = period === 'hk1' ? s.txScoresHk1 : s.txScoresHk2;
      const gk = period === 'hk1' ? s.midtermHk1 : s.midtermHk2;
      const ck = period === 'hk1' ? s.finalExamHk1 : s.finalExamHk2;
      const tb = period === 'hk1' ? s.tbHk1 : s.tbHk2;
      const q = period === 'hk1' ? s.qualitativeHk1 : s.qualitativeHk2;
      const comment = period === 'hk1' ? (s.commentHk1 || s.comment) : (s.commentHk2 || s.comment);

      if (s.assessmentMode === 'COMMENT_ONLY') {
        for (let i = 1; i <= maxTx; i++) row.push('—');
        row.push('—', '—', q || '—', comment || '');
      } else {
        for (let i = 0; i < maxTx; i++) {
          const sc = txs?.[i];
          row.push(sc !== undefined ? sc : '—');
        }
        row.push(
          gk !== undefined ? gk : '—',
          ck !== undefined ? ck : '—',
          tb !== undefined ? tb : '—',
          comment || ''
        );
      }
      aoa.push(row);
    });

    const excused = period === 'hk1' ? (excusedAbsencesHk1 ?? 0) : (excusedAbsencesHk2 ?? 0);
    const unexcused = period === 'hk1' ? (unexcusedAbsencesHk1 ?? 0) : (unexcusedAbsencesHk2 ?? 0);
    const conduct = period === 'hk1' ? conductHk1 : conductHk2;
    const academic = period === 'hk1' ? (academicResultHk1 || 'Chưa xếp loại') : (academicResultHk2 || 'Chưa xếp loại');
    const honor = period === 'hk1' ? (honorTitleHk1 || '(Không có)') : (honorTitleHk2 || '(Không có)');
    const autoNote = period === 'hk1' ? (autoSummaryNoteHk1 || 'Không có ghi nhận đặc biệt') : (autoSummaryNoteHk2 || 'Không có ghi nhận đặc biệt');
    const comment = period === 'hk1' ? (teacherCommentHk1 || 'Chấp hành tốt nội quy trường lớp, tích cực rèn luyện.') : (teacherCommentHk2 || 'Chấp hành tốt nội quy trường lớp, tích cực rèn luyện.');

    aoa.push([]);
    aoa.push([`TỔNG KẾT RÈN LUYỆN & CHUYÊN CẦN (${periodLabel})`, '', '', '']);
    aoa.push([`Rèn luyện ${periodLabel}:`, conduct, 'Nghỉ có phép:', `${excused} buổi`, 'Nghỉ không phép:', `${unexcused} buổi`]);
    aoa.push([]);
    aoa.push([`ĐÁNH GIÁ & XẾP LOẠI ${periodLabel} (THEO TT 43/2021/TT-BGDĐT)`, '', '', '']);
    aoa.push(['Kết quả học tập:', academic, 'Danh hiệu khen thưởng:', honor]);
    aoa.push(['Ghi chú tổng hợp:', autoNote]);
    aoa.push(['Nhận xét của GVCN:', comment]);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Kết quả ${periodLabel}`);

    const safeName = student.fullName.replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `Ket_Qua_${periodFileLabel}_${student.code}_${safeName}.xlsx`);
  }

  public exportTeacherAccountsToExcel(teachers: any[], customFileName?: string) {
    const data = teachers.map((tch, index) => {
      const assignedClass = tch.className || (tch.tenantId === 'tenant-lan-nguyen' ? '11A1' : tch.tenantId === 'tenant-hoang-nam' ? '12A2' : '10A1');
      const academicYear = tch.academicYear || '2025 - 2026';
      const studentCount = tch.totalStudentsCount ?? (tch.tenantId === 'tenant-lan-nguyen' ? 4 : 1);
      const loginMethodLabel = tch.loginMethod === 'GOOGLE' ? 'Google Workspace' : tch.loginMethod === 'ACCESS_CODE' ? 'Mã đăng nhập' : 'Google & Mã';
      const statusLabel = tch.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa';
      const passwordLabel = tch.hasPassword ? 'Đã thiết lập' : 'Chưa đặt';

      return {
        'STT': index + 1,
        'Họ và tên GVCN': tch.fullName || 'Chưa đặt tên',
        'Email': tch.email || '',
        'Số điện thoại': tch.phone || '',
        'Trường / Đơn vị': tch.schoolName || 'Trường THPT',
        'Không gian quản lý': tch.workspaceName || `Không gian ${tch.fullName || 'GVCN'}`,
        'Lớp phân công': assignedClass,
        'Sĩ số lớp': studentCount,
        'Năm học': academicYear,
        'Mã đăng nhập': tch.activationToken || 'ACT-ACTIVE',
        'Mật khẩu': passwordLabel,
        'Trạng thái tài khoản': statusLabel,
        'Phương thức đăng nhập': loginMethodLabel,
        'Email Google': tch.allowedGoogleEmail || tch.email || '',
        'Ngày tạo': tch.createdAt || '',
        'Lần đăng nhập cuối': tch.lastLoginAt || 'Chưa đăng nhập'
      };
    });

    const safeName = customFileName || `Danh_Sach_Tai_Khoan_GVCN_${new Date().toISOString().split('T')[0]}`;
    this.exportToExcel(data, safeName, 'Danh sách GVCN');
  }

  public printReport(title: string, htmlContent: string) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #111827; }
              h1 { font-size: 20px; text-align: center; margin-bottom: 8px; }
              h2 { font-size: 14px; text-align: center; color: #4B5563; font-weight: normal; margin-bottom: 24px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
              th, td { border: 1px solid #D1D5DB; padding: 8px 12px; text-align: left; }
              th { background-color: #F3F4F6; font-weight: 600; }
              .footer { margin-top: 40px; display: flex; justify-content: space-between; }
              .sign-box { text-align: center; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <h2>Không Gian Chủ Nhiệm Số — THPT Chuyên Lê Hồng Phong</h2>
            <div>${htmlContent}</div>
            <div class="footer">
              <div class="sign-box">
                <p><b>ĐẠI DIỆN BAN CÁN SỰ</b></p>
                <br/><br/><br/>
                <p>(Ký & ghi rõ họ tên)</p>
              </div>
              <div class="sign-box">
                <p><i>TP. Hồ Chí Minh, ngày .... tháng .... năm 2025</i></p>
                <p><b>GIÁO VIÊN CHỦ NHIỆM</b></p>
                <br/><br/><br/>
                <p>Cô Nguyễn Thị Mai Lan</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }
}

export const exportService = new ExportService();
