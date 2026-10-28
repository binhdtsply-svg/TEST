/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../types';

export interface ValidatedStudentRow {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  group: number;
  officerRole?: string;
  phone?: string;
  email?: string;
  address?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  status: 'VALID' | 'DUPLICATE_EXISTING' | 'DUPLICATE_BATCH' | 'INVALID';
  errors: string[];
  warnings: string[];
}

export interface ExcelParseResult {
  fileName: string;
  totalRows: number;
  validCount: number;
  duplicateExistingCount: number;
  duplicateBatchCount: number;
  invalidCount: number;
  rows: ValidatedStudentRow[];
  parsedStudentsToImport: Array<Partial<Student>>;
}

/**
 * Downloads the standardized Excel template for Homeroom Teacher student roster import.
 */
export async function downloadStudentImportTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  // Sheet 1: DanhSachHocSinh with standardized column names & demo rows
  const demoRows = [
    {
      studentCode: 'HS-01',
      fullName: 'Nguyễn Văn An',
      gender: 'Nam',
      dob: '15/03/2008',
      phone: '0901234567',
      email: 'an.nguyen@example.com',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      fatherName: 'Nguyễn Văn Bình',
      fatherPhone: '0908111222',
      motherName: 'Lê Thị Cúc',
      motherPhone: '0908333444',
      group: 1,
      officerRole: 'Lớp trưởng'
    },
    {
      studentCode: 'HS-02',
      fullName: 'Trần Thị Mai',
      gender: 'Nữ',
      dob: '20/07/2008',
      phone: '0912345678',
      email: 'mai.tran@example.com',
      address: '456 Lê Lợi, Quận 1, TP.HCM',
      fatherName: 'Trần Văn Dũng',
      fatherPhone: '0918111222',
      motherName: 'Phạm Thị Hoa',
      motherPhone: '0918333444',
      group: 2,
      officerRole: 'Bí thư chi đoàn'
    },
    {
      studentCode: 'HS-03',
      fullName: 'Lê Hoàng Long',
      gender: 'Nam',
      dob: '05/11/2008',
      phone: '0923456789',
      email: 'long.le@example.com',
      address: '789 Cách Mạng Tháng 8, Quận 3, TP.HCM',
      fatherName: 'Lê Văn Hải',
      fatherPhone: '0928111222',
      motherName: 'Nguyễn Thị Lan',
      motherPhone: '0928333444',
      group: 3,
      officerRole: ''
    }
  ];

  const wsRoster = XLSX.utils.json_to_sheet(demoRows, {
    header: [
      'studentCode',
      'fullName',
      'gender',
      'dob',
      'phone',
      'email',
      'address',
      'fatherName',
      'fatherPhone',
      'motherName',
      'motherPhone',
      'group',
      'officerRole'
    ]
  });

  // Set column widths for readability
  wsRoster['!cols'] = [
    { wch: 14 }, // studentCode
    { wch: 24 }, // fullName
    { wch: 10 }, // gender
    { wch: 14 }, // dob
    { wch: 14 }, // phone
    { wch: 25 }, // email
    { wch: 32 }, // address
    { wch: 22 }, // fatherName
    { wch: 14 }, // fatherPhone
    { wch: 22 }, // motherName
    { wch: 14 }, // motherPhone
    { wch: 8 },  // group
    { wch: 18 }  // officerRole
  ];

  // Sheet 2: HuongDan
  const instructionsData = [
    { 'TÊN CỘT': 'studentCode', 'Ý NGHĨA': 'Mã định danh học sinh', 'ĐỊNH DẠNG / VÍ DỤ': 'Bắt buộc. Duy nhất trong lớp (VD: HS-01, HS-02)', 'LƯU Ý': 'Không để trống' },
    { 'TÊN CỘT': 'fullName', 'Ý NGHĨA': 'Họ và tên học sinh', 'ĐỊNH DẠNG / VÍ DỤ': 'Bắt buộc. Ví dụ: Nguyễn Văn An', 'LƯU Ý': 'Không để trống' },
    { 'TÊN CỘT': 'gender', 'Ý NGHĨA': 'Giới tính', 'ĐỊNH DẠNG / VÍ DỤ': 'Nam / Nữ / Khác', 'LƯU Ý': 'Mặc định là Nam nếu để trống' },
    { 'TÊN CỘT': 'dob', 'Ý NGHĨA': 'Ngày tháng năm sinh', 'ĐỊNH DẠNG / VÍ DỤ': 'Ưu tiên DD/MM/YYYY (VD: 15/03/2008)', 'LƯU Ý': 'Đúng định dạng ngày tháng' },
    { 'TÊN CỘT': 'phone', 'Ý NGHĨA': 'Số điện thoại học sinh', 'ĐỊNH DẠNG / VÍ DỤ': 'Ví dụ: 0901234567', 'LƯU Ý': 'Tùy chọn' },
    { 'TÊN CỘT': 'email', 'Ý NGHĨA': 'Email học sinh', 'ĐỊNH DẠNG / VÍ DỤ': 'Ví dụ: an.nguyen@example.com', 'LƯU Ý': 'Tùy chọn' },
    { 'TÊN CỘT': 'address', 'Ý NGHĨA': 'Địa chỉ nơi ở', 'ĐỊNH DẠNG / VÍ DỤ': 'Ví dụ: 123 Nguyễn Huệ, Quận 1', 'LƯU Ý': 'Tùy chọn' },
    { 'TÊN CỘT': 'fatherName', 'Ý NGHĨA': 'Họ và tên Cha / Giám hộ', 'ĐỊNH DẠNG / VÍ DỤ': 'Ví dụ: Nguyễn Văn Bình', 'LƯU Ý': 'Tùy chọn' },
    { 'TÊN CỘT': 'fatherPhone', 'Ý NGHĨA': 'Số điện thoại Cha', 'ĐỊNH DẠNG / VÍ DỤ': 'Ví dụ: 0908111222', 'LƯU Ý': 'Tùy chọn' },
    { 'TÊN CỘT': 'motherName', 'Ý NGHĨA': 'Họ và tên Mẹ', 'ĐỊNH DẠNG / VÍ DỤ': 'Ví dụ: Lê Thị Cúc', 'LƯU Ý': 'Tùy chọn' },
    { 'TÊN CỘT': 'motherPhone', 'Ý NGHĨA': 'Số điện thoại Mẹ', 'ĐỊNH DẠNG / VÍ DỤ': 'Ví dụ: 0908333444', 'LƯU Ý': 'Tùy chọn' },
    { 'TÊN CỘT': 'group', 'Ý NGHĨA': 'Phân tổ sinh hoạt', 'ĐỊNH DẠNG / VÍ DỤ': 'Số từ 1 đến 4 (VD: 1, 2, 3, 4)', 'LƯU Ý': 'Mặc định 1 nếu để trống' },
    { 'TÊN CỘT': 'officerRole', 'Ý NGHĨA': 'Chức vụ ban cán sự lớp', 'ĐỊNH DẠNG / VÍ DỤ': 'Lớp trưởng, Lớp phó, Bí thư, Tổ trưởng...', 'LƯU Ý': 'Để trống nếu là học sinh bình thường' },
    { 'TÊN CỘT': '', 'Ý NGHĨA': '', 'ĐỊNH DẠNG / VÍ DỤ': '', 'LƯU Ý': '' },
    { 'TÊN CỘT': 'QUY TẮC BẢO MẬT', 'Ý NGHĨA': 'KHÔNG NHẬP MẬT KHẨU / TOKEN', 'ĐỊNH DẠNG / VÍ DỤ': 'Tuyệt đối không nhập mật khẩu, mã đăng nhập hoặc thông tin bảo mật vào file Excel.', 'LƯU Ý': 'Hệ thống tự động cấp phát an toàn sau khi nhập' },
    { 'TÊN CỘT': 'DÒNG MINH HỌA', 'Ý NGHĨA': 'DÒNG MINH HỌA — XÓA HOẶC THAY THẾ TRƯỚC KHI UPLOAD', 'ĐỊNH DẠNG / VÍ DỤ': '3 dòng trong sheet DanhSachHocSinh là ví dụ mẫu. Bạn có thể xóa hoặc ghi đè danh sách thật.', 'LƯU Ý': 'Hệ thống sẽ tự động lọc bỏ các dòng chứa từ khóa minh họa' },
    { 'TÊN CỘT': 'QUY TRÌNH IMPORT', 'Ý NGHĨA': 'Kiểm tra trước khi lưu', 'ĐỊNH DẠNG / VÍ DỤ': 'Sau khi upload, hệ thống hiển thị bảng kiểm tra và thống kê hợp lệ / trùng lặp để GVCN xác nhận.', 'LƯU Ý': 'Không ghi đè dữ liệu lớp học hiện có' }
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
  wsInstructions['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 45 },
    { wch: 40 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsRoster, 'DanhSachHocSinh');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'HuongDan');

  XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh_Lop_Chu_Nhiem.xlsx');
}

/**
 * Robust date normalizer for Excel imported dates.
 * Handles Excel date serial numbers, DD/MM/YYYY, YYYY-MM-DD, and checks validity.
 */
export function normalizeExcelDob(raw: any): { formatted: string; isValid: boolean; error?: string } {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { formatted: '01/01/2008', isValid: true };
  }

  // Handle number (Excel serial date number)
  if (typeof raw === 'number' || (!isNaN(Number(raw)) && Number(raw) > 20000 && !String(raw).includes('/'))) {
    try {
      const serial = Number(raw);
      const utcDays = Math.floor(serial - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      const day = String(dateInfo.getUTCDate()).padStart(2, '0');
      const month = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const year = dateInfo.getUTCFullYear();
      if (year >= 1990 && year <= 2025) {
        return { formatted: `${day}/${month}/${year}`, isValid: true };
      }
    } catch {
      // fallback
    }
  }

  const str = String(raw).trim();

  // Match DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1990 && year <= 2025) {
      return {
        formatted: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
        isValid: true
      };
    }
    return { formatted: str, isValid: false, error: 'Ngày tháng năm không hợp lệ' };
  }

  // Match YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1990 && year <= 2025) {
      return {
        formatted: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
        isValid: true
      };
    }
    return { formatted: str, isValid: false, error: 'Ngày tháng năm không hợp lệ' };
  }

  return { formatted: str, isValid: false, error: 'dob không đúng định dạng DD/MM/YYYY' };
}

/**
 * Checks if a row is a demo / instruction row that should be ignored.
 */
function isDemoOrInstructionRow(row: Record<string, any>): boolean {
  const values = Object.values(row).map(v => String(v || '').toLowerCase());
  const rowJoined = values.join(' ');

  if (
    rowJoined.includes('dòng minh họa') ||
    rowJoined.includes('dòng ví dụ') ||
    rowJoined.includes('minh họa') ||
    rowJoined.includes('sample') ||
    rowJoined.includes('hướng dẫn') ||
    rowJoined.includes('quy tắc') ||
    rowJoined.startsWith('---')
  ) {
    return true;
  }
  return false;
}

/**
 * Parses and validates an Excel file uploaded by GVCN.
 */
export async function parseAndValidateStudentExcel(
  file: File,
  existingStudents: Student[]
): Promise<ExcelParseResult> {
  const XLSX = await import('xlsx');
  const existingCodeSet = new Set(
    existingStudents.map(s => String(s.code || '').trim().toUpperCase())
  );

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Find sheet 'DanhSachHocSinh' or first sheet
        const sheetName =
          workbook.SheetNames.find(
            n => n.toLowerCase().includes('danhsach') || n.toLowerCase().includes('hocsinh')
          ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error('Không tìm thấy sheet dữ liệu trong tệp Excel.');
        }

        // Parse to JSON array of objects
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        const validatedRows: ValidatedStudentRow[] = [];
        const seenBatchCodes = new Set<string>();
        const parsedStudentsToImport: Array<Partial<Student>> = [];

        let validCount = 0;
        let duplicateExistingCount = 0;
        let duplicateBatchCount = 0;
        let invalidCount = 0;

        rawJson.forEach((rawRow, idx) => {
          // Skip empty rows
          const hasAnyValue = Object.values(rawRow).some(v => String(v || '').trim() !== '');
          if (!hasAnyValue) return;

          // Skip demo markers / instruction rows
          if (isDemoOrInstructionRow(rawRow)) return;

          const rowNumber = idx + 2; // +2 considering Excel header row at line 1

          // Flexible header resolution (supports English keys & Vietnamese column titles)
          const getField = (...keys: string[]): string => {
            for (const k of keys) {
              if (rawRow[k] !== undefined && String(rawRow[k]).trim() !== '') {
                return String(rawRow[k]).trim();
              }
              // Case-insensitive check
              const matchedKey = Object.keys(rawRow).find(
                rk => rk.toLowerCase().trim() === k.toLowerCase().trim()
              );
              if (matchedKey && rawRow[matchedKey] !== undefined && String(rawRow[matchedKey]).trim() !== '') {
                return String(rawRow[matchedKey]).trim();
              }
            }
            return '';
          };

          const rawCode = getField('studentCode', 'Mã HS', 'Mã học sinh', 'code', 'MaHS');
          const rawName = getField('fullName', 'Họ và tên', 'Họ tên', 'Tên học sinh', 'HoTen');
          const rawGender = getField('gender', 'Giới tính', 'GioiTinh');
          const rawDob = getField('dob', 'Ngày sinh', 'NgaySinh', 'birthDate');
          const rawPhone = getField('phone', 'Số điện thoại', 'SĐT', 'SDT', 'phoneStudent');
          const rawEmail = getField('email', 'Email', 'Thư điện tử');
          const rawAddress = getField('address', 'Địa chỉ', 'DiaChi', 'Nơi ở');
          const rawFatherName = getField('fatherName', 'Họ tên Cha', 'Tên cha', 'HoTenCha', 'Cha');
          const rawFatherPhone = getField('fatherPhone', 'SĐT Cha', 'Số điện thoại cha', 'SDTCha');
          const rawMotherName = getField('motherName', 'Họ tên Mẹ', 'Tên mẹ', 'HoTenMe', 'Mẹ');
          const rawMotherPhone = getField('motherPhone', 'SĐT Mẹ', 'Số điện thoại mẹ', 'SDTMe');
          const rawGroup = getField('group', 'Tổ', 'To', 'Nhóm');
          const rawOfficer = getField('officerRole', 'Chức vụ', 'Chức vụ cán sự', 'ChucVu', 'Ban cán sự');

          const errors: string[] = [];
          const warnings: string[] = [];

          // Validation 1: Required Full Name
          if (!rawName) {
            errors.push('fullName bị trống');
          }

          // Validation 2: Required Student Code
          if (!rawCode) {
            errors.push('studentCode bị trống');
          }

          // Validation 3: Date of birth format
          const dobResult = normalizeExcelDob(rawDob);
          if (!dobResult.isValid && rawDob) {
            errors.push(dobResult.error || 'dob không đúng định dạng DD/MM/YYYY');
          }

          // Duplicate checks
          const upperCode = rawCode.toUpperCase();
          let rowStatus: ValidatedStudentRow['status'] = 'VALID';

          if (errors.length > 0) {
            rowStatus = 'INVALID';
            invalidCount++;
          } else if (existingCodeSet.has(upperCode)) {
            rowStatus = 'DUPLICATE_EXISTING';
            duplicateExistingCount++;
            warnings.push('Đã tồn tại học sinh có mã này trong lớp (sẽ bỏ qua)');
          } else if (seenBatchCodes.has(upperCode)) {
            rowStatus = 'DUPLICATE_BATCH';
            duplicateBatchCount++;
            warnings.push('Mã học sinh bị trùng lặp trong tệp Excel');
          } else {
            rowStatus = 'VALID';
            validCount++;
            seenBatchCodes.add(upperCode);

            const genderVal = rawGender.toLowerCase().includes('nữ') || rawGender.toLowerCase() === 'nu' ? 'Nữ' : 'Nam';
            const groupNum = Number(rawGroup) >= 1 && Number(rawGroup) <= 4 ? Number(rawGroup) : 1;

            parsedStudentsToImport.push({
              code: rawCode,
              fullName: rawName,
              gender: genderVal,
              dob: dobResult.formatted || '01/01/2008',
              group: groupNum,
              officerRole: rawOfficer || undefined,
              phone: rawPhone || '',
              email: rawEmail || '',
              address: rawAddress || 'TP. Hồ Chí Minh',
              fatherName: rawFatherName || '',
              fatherPhone: rawFatherPhone || '',
              motherName: rawMotherName || '',
              motherPhone: rawMotherPhone || '',
              parent: {
                fatherName: rawFatherName || '',
                fatherPhone: rawFatherPhone || '',
                motherName: rawMotherName || '',
                motherPhone: rawMotherPhone || '',
                address: rawAddress || 'TP. Hồ Chí Minh',
                zaloConnected: true
              },
              status: 'Đang học'
            });
          }

          validatedRows.push({
            rowNumber,
            studentCode: rawCode || '(Trống)',
            fullName: rawName || '(Trống)',
            gender: rawGender === 'Nữ' || rawGender === 'Nu' ? 'Nữ' : 'Nam',
            dob: dobResult.formatted || rawDob || '01/01/2008',
            group: Number(rawGroup) || 1,
            officerRole: rawOfficer || undefined,
            phone: rawPhone,
            email: rawEmail,
            address: rawAddress,
            fatherName: rawFatherName,
            fatherPhone: rawFatherPhone,
            motherName: rawMotherName,
            motherPhone: rawMotherPhone,
            status: rowStatus,
            errors,
            warnings
          });
        });

        resolve({
          fileName: file.name,
          totalRows: validatedRows.length,
          validCount,
          duplicateExistingCount,
          duplicateBatchCount,
          invalidCount,
          rows: validatedRows,
          parsedStudentsToImport
        });
      } catch (err: any) {
        reject(new Error(err?.message || 'Không thể đọc nội dung tệp Excel. Vui lòng kiểm tra lại định dạng tệp.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc tệp từ máy tính.'));
    };

    reader.readAsArrayBuffer(file);
  });
}
