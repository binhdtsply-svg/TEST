/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubjectConfig } from '../types';

/**
 * Standard Vietnamese short label mapping for table column headers and compact tags
 */
export const getVietnameseSubjectShortName = (fullNameOrCode?: string): string => {
  if (!fullNameOrCode) return 'Môn học';
  const clean = fullNameOrCode.trim();

  // If already full Vietnamese or English code, map to appropriate Vietnamese short label
  switch (clean.toUpperCase()) {
    case 'MATH':
    case 'TOÁN':
    case 'TOÁN HỌC':
      return 'Toán';

    case 'LIT':
    case 'VAN':
    case 'NGỮ VĂN':
    case 'VĂN HỌC':
      return 'Ngữ văn';

    case 'ENG':
    case 'ANH':
    case 'TIẾNG ANH':
    case 'NGOẠI NGỮ':
      return 'Tiếng Anh';

    case 'PHYS':
    case 'LY':
    case 'LÍ':
    case 'VẬT LÍ':
    case 'VẬT LÝ':
      return 'Vật lí';

    case 'CHEM':
    case 'HOA':
    case 'HÓA HỌC':
    case 'HÓA':
      return 'Hóa học';

    case 'BIO':
    case 'SINH':
    case 'SINH HỌC':
      return 'Sinh học';

    case 'HIST':
    case 'SU':
    case 'LỊCH SỬ':
    case 'SỬ':
      return 'Lịch sử';

    case 'GEOG':
    case 'DIA':
    case 'ĐỊA LÍ':
    case 'ĐỊA LÝ':
    case 'ĐỊA':
      return 'Địa lí';

    case 'INF':
    case 'TIN':
    case 'TIN HỌC':
      return 'Tin học';

    case 'ECON_LAW':
    case 'KTPL':
    case 'GD KINH TẾ & PHÁP LUẬT':
    case 'GIÁO DỤC KINH TẾ VÀ PHÁP LUẬT':
      return 'KT&PL';

    case 'TECH':
    case 'CN':
    case 'CÔNG NGHỆ':
      return 'Công nghệ';

    case 'DEF':
    case 'QPAN':
    case 'GIÁO DỤC QUỐC PHÒNG - AN':
    case 'GIÁO DỤC QUỐC PHÒNG VÀ AN NINH':
    case 'GDQP-AN':
      return 'GDQP-AN';

    case 'PE':
    case 'GDTC':
    case 'GIÁO DỤC THỂ CHẤT':
    case 'THỂ DỤC':
      return 'Thể chất';

    case 'FLAG':
    case 'CHAO_CO':
    case 'CHÀO CỜ':
      return 'Chào cờ';

    case 'CLASS':
    case 'SHL':
    case 'SINH HOẠT LỚP':
      return 'SHL';

    case 'EXP':
    case 'TNHN':
    case 'HOẠT ĐỘNG TRẢI NGHIỆM, HƯỚNG NGHIỆP':
    case 'HOẠT ĐỘNG TRẢI NGHIỆM VÀ HƯỚNG NGHIỆP':
    case 'HĐTN-HN':
    case 'HĐTN, HN':
      return 'HĐTN-HN';

    case 'GDDP':
    case 'NỘI DUNG GIÁO DỤC ĐỊA PHƯƠNG':
    case 'GIÁO DỤC ĐỊA PHƯƠNG':
      return 'GDĐP';

    case 'MUSIC':
    case 'AN':
    case 'AM_NHAC':
    case 'ÂM NHẠC':
      return 'Nhạc';

    case 'ART':
    case 'MT':
    case 'MI_THUAT':
    case 'MĨ THUẬT':
    case 'MỸ THUẬT':
      return 'Mĩ thuật';

    case 'KHTN':
    case 'KHOA HỌC TỰ NHIÊN':
      return 'KHTN';

    case 'LSDL':
    case 'LỊCH SỬ VÀ ĐỊA LÍ':
    case 'LỊCH SỬ VÀ ĐỊA LÝ':
      return 'LS&ĐL';

    case 'TIENG_VIET':
    case 'TIẾNG VIỆT':
      return 'Tiếng Việt';

    case 'DAO_DUC':
    case 'ĐẠO ĐỨC':
      return 'Đạo đức';

    case 'TNXH':
    case 'TỰ NHIÊN VÀ XÃ HỘI':
      return 'TN&XH';

    case 'KHOA_HOC':
    case 'KHOA HỌC':
      return 'Khoa học';

    case 'TIN_CN':
    case 'TIN HỌC VÀ CÔNG NGHỆ':
      return 'Tin & CN';

    default:
      return clean;
  }
};

/**
 * Standard Full Vietnamese Name for all subjects
 */
export const getVietnameseSubjectFullName = (subjectOrName?: SubjectConfig | string): string => {
  if (!subjectOrName) return 'Môn học';
  const name = typeof subjectOrName === 'string' ? subjectOrName : subjectOrName.name || subjectOrName.subjectName || '';
  const clean = name.trim();

  switch (clean.toUpperCase()) {
    case 'MATH':
    case 'TOÁN':
    case 'TOÁN HỌC':
      return 'Toán học';

    case 'LIT':
    case 'VAN':
    case 'NGỮ VĂN':
      return 'Ngữ văn';

    case 'ENG':
    case 'ANH':
    case 'TIẾNG ANH':
      return 'Tiếng Anh';

    case 'PHYS':
    case 'LY':
    case 'LÍ':
    case 'VẬT LÍ':
    case 'VẬT LÝ':
      return 'Vật lí';

    case 'CHEM':
    case 'HOA':
    case 'HÓA HỌC':
    case 'HÓA':
      return 'Hóa học';

    case 'BIO':
    case 'SINH':
    case 'SINH HỌC':
      return 'Sinh học';

    case 'HIST':
    case 'SU':
    case 'LỊCH SỬ':
    case 'SỬ':
      return 'Lịch sử';

    case 'GEOG':
    case 'DIA':
    case 'ĐỊA LÍ':
    case 'ĐỊA LÝ':
    case 'ĐỊA':
      return 'Địa lí';

    case 'INF':
    case 'TIN':
    case 'TIN HỌC':
      return 'Tin học';

    case 'ECON_LAW':
    case 'KTPL':
    case 'GDKTPL':
    case 'GDKT&PL':
    case 'GD KINH TẾ & PHÁP LUẬT':
    case 'GD KINH TẾ VÀ PHÁP LUẬT':
    case 'GIÁO DỤC KINH TẾ VÀ PHÁP LUẬT':
      return 'Giáo dục kinh tế và pháp luật';

    case 'TECH':
    case 'CN':
    case 'CÔNG NGHỆ':
      return 'Công nghệ';

    case 'DEF':
    case 'QPAN':
    case 'GIÁO DỤC QUỐC PHÒNG - AN':
    case 'GIÁO DỤC QUỐC PHÒNG VÀ AN NINH':
    case 'GDQP-AN':
      return 'Giáo dục quốc phòng và an ninh';

    case 'PE':
    case 'GDTC':
    case 'GIÁO DỤC THỂ CHẤT':
      return 'Giáo dục thể chất';

    case 'FLAG':
    case 'CHAO_CO':
    case 'CHÀO CỜ':
      return 'Chào cờ';

    case 'CLASS':
    case 'SHL':
    case 'SINH HOẠT LỚP':
      return 'Sinh hoạt lớp';

    case 'EXP':
    case 'TNHN':
    case 'HOẠT ĐỘNG TRẢI NGHIỆM, HƯỚNG NGHIỆP':
    case 'HĐTN-HN':
      return 'Hoạt động trải nghiệm, hướng nghiệp';

    case 'GDDP':
    case 'NỘI DUNG GIÁO DỤC ĐỊA PHƯƠNG':
    case 'GIÁO DỤC ĐỊA PHƯƠNG':
      return 'Nội dung giáo dục của địa phương';

    case 'MUSIC':
    case 'AN':
    case 'AM_NHAC':
    case 'ÂM NHẠC':
      return 'Âm nhạc';

    case 'ART':
    case 'MT':
    case 'MI_THUAT':
    case 'MĨ THUẬT':
    case 'MỸ THUẬT':
      return 'Mĩ thuật';

    case 'KHTN':
    case 'KHOA HỌC TỰ NHIÊN':
      return 'Khoa học tự nhiên';

    case 'LSDL':
    case 'LỊCH SỬ VÀ ĐỊA LÍ':
    case 'LỊCH SỬ VÀ ĐỊA LÝ':
      return 'Lịch sử và Địa lí';

    case 'TIENG_VIET':
    case 'TIẾNG VIỆT':
      return 'Tiếng Việt';

    case 'DAO_DUC':
    case 'ĐẠO ĐỨC':
      return 'Đạo đức';

    case 'TNXH':
    case 'TỰ NHIÊN VÀ XÃ HỘI':
      return 'Tự nhiên và Xã hội';

    case 'KHOA_HOC':
    case 'KHOA HỌC':
      return 'Khoa học';

    case 'TIN_CN':
    case 'TIN HỌC VÀ CÔNG NGHỆ':
      return 'Tin học và Công nghệ';

    default:
      return clean;
  }
};
