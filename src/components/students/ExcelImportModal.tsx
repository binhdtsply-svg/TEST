/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  AlertTriangle,
  FileCheck2,
  ShieldCheck,
  RefreshCw,
  FileText
} from 'lucide-react';
import { studentService } from '../../services/StudentService';
import {
  downloadStudentImportTemplate,
  parseAndValidateStudentExcel,
  ExcelParseResult,
  ValidatedStudentRow
} from '../../utils/studentExcelUtils';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialFile?: File | null;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFile = null
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    duplicates: string[];
    errors: string[];
  } | null>(null);

  // Auto-process initialFile if passed
  React.useEffect(() => {
    if (initialFile && isOpen) {
      processSelectedFile(initialFile);
    }
  }, [initialFile, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleDownload = () => {
    downloadStudentImportTemplate();
  };

  const processSelectedFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessingFile(true);
    try {
      const existingStudents = studentService.getAll(true);
      const result = await parseAndValidateStudentExcel(file, existingStudents);
      setParseResult(result);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleCommitImport = () => {
    if (!parseResult || parseResult.parsedStudentsToImport.length === 0) return;

    setIsImporting(true);
    try {
      const res = studentService.importStudentsBatch(parseResult.parsedStudentsToImport);
      setImportResult(res);
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi trong quá trình nhập danh sách.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setParseResult(null);
    setErrorMessage(null);
    setImportResult(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-bold shadow-2xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Nhập Danh Sách Học Sinh Từ Excel
              </h3>
              <p className="text-xs text-slate-500">
                {step === 1 && 'Bước 1/3: Tải mẫu chuẩn hoặc tải tệp danh sách (.xlsx)'}
                {step === 2 && `Bước 2/3: Kiểm tra định dạng & xác nhận dữ liệu (${parseResult?.fileName || ''})`}
                {step === 3 && 'Bước 3/3: Hoàn tất quá trình nhập danh sách'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 5-Step Visual Workflow Breadcrumbs */}
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-2.5">
          <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-600 overflow-x-auto">
            <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-emerald-700' : 'text-slate-500'}`}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-800 font-bold">1</span>
              Tải mẫu
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-700 font-bold">2</span>
              Điền thông tin
            </span>
            <span className="text-slate-300">→</span>
            <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-blue-700' : 'text-slate-500'}`}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-800 font-bold">3</span>
              Tải file lên
            </span>
            <span className="text-slate-300">→</span>
            <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-amber-700' : 'text-slate-500'}`}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[10px] text-amber-800 font-bold">4</span>
              Kiểm tra dữ liệu
            </span>
            <span className="text-slate-300">→</span>
            <span className={`flex items-center gap-1.5 ${step === 3 ? 'text-emerald-700' : 'text-slate-500'}`}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-800 font-bold">5</span>
              Xác nhận nhập
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Upload & Download Template */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Template Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
                    <Download className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Mẫu Excel chuẩn danh sách lớp chủ nhiệm</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Bao gồm 2 sheet: <strong>DanhSachHocSinh</strong> (cột chuẩn & dòng mẫu) và <strong>HuongDan</strong> (quy tắc điền).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải mẫu Excel danh sách học sinh</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-emerald-600 mb-3">
                  {isProcessingFile ? (
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Kéo thả file Excel vào đây hoặc bấm để chọn tệp
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Hỗ trợ định dạng <strong>.xlsx, .xls, .csv</strong>. Hệ thống tự động kiểm tra họ tên, mã định danh, ngày sinh và loại bỏ dòng trùng lặp.
                </p>

                <label className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 cursor-pointer active:scale-95 transition-all">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Chọn file Excel từ máy tính</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Privacy and Security Notice */}
              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-blue-900">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Bảo mật thông tin:</strong> Tuyệt đối không nhập mật khẩu hay thông tin bảo mật vào file Excel. Sau khi nhập, GVCN có thể cấp mã truy cập riêng biệt an toàn qua tính năng Cấp mã kích hoạt.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Validation Table */}
          {step === 2 && parseResult && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-lg font-black text-slate-800">{parseResult.totalRows}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng số dòng</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <div className="text-lg font-black text-emerald-700">{parseResult.validCount}</div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Hợp lệ để nhập</div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <div className="text-lg font-black text-amber-700">
                    {parseResult.duplicateExistingCount + parseResult.duplicateBatchCount}
                  </div>
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Trùng mã (bỏ qua)</div>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center">
                  <div className="text-lg font-black text-rose-700">{parseResult.invalidCount}</div>
                  <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Lỗi định dạng</div>
                </div>
              </div>

              {/* Table of Rows */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 w-12 text-center">Dòng</th>
                        <th className="p-2.5">Mã HS</th>
                        <th className="p-2.5">Họ và tên</th>
                        <th className="p-2.5">Giới tính</th>
                        <th className="p-2.5">Ngày sinh</th>
                        <th className="p-2.5">Tổ</th>
                        <th className="p-2.5">Chức vụ</th>
                        <th className="p-2.5">Trạng thái kiểm tra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.rows.map((row) => {
                        return (
                          <tr
                            key={row.rowNumber}
                            className={
                              row.status === 'INVALID'
                                ? 'bg-rose-50/50'
                                : row.status === 'DUPLICATE_EXISTING' || row.status === 'DUPLICATE_BATCH'
                                ? 'bg-amber-50/40'
                                : 'hover:bg-slate-50'
                            }
                          >
                            <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">
                              {row.rowNumber}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-800">{row.studentCode}</td>
                            <td className="p-2.5 font-bold text-blue-700">{row.fullName}</td>
                            <td className="p-2.5 text-slate-600">{row.gender}</td>
                            <td className="p-2.5 text-slate-600">{row.dob}</td>
                            <td className="p-2.5 text-slate-600">Tổ {row.group}</td>
                            <td className="p-2.5 text-slate-500">{row.officerRole || '-'}</td>
                            <td className="p-2.5">
                              {row.status === 'VALID' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3" /> Hợp lệ
                                </span>
                              )}
                              {row.status === 'DUPLICATE_EXISTING' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800" title="Mã học sinh đã có trong lớp">
                                  <AlertTriangle className="h-3 w-3" /> Đã có trong lớp (bỏ qua)
                                </span>
                              )}
                              {row.status === 'DUPLICATE_BATCH' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800" title="Mã học sinh bị lặp trong file Excel">
                                  <AlertTriangle className="h-3 w-3" /> Trùng trong file (bỏ qua)
                                </span>
                              )}
                              {row.status === 'INVALID' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800" title={row.errors.join(', ')}>
                                  <AlertCircle className="h-3 w-3" /> {row.errors.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Completion Result Screen */}
          {step === 3 && importResult && (
            <div className="p-6 space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  Đã nhập danh sách thành công
                </h4>
                <p className="text-xs text-slate-600">
                  Hệ thống đã thêm <strong className="text-emerald-700 font-bold">{importResult.imported} học sinh</strong> mới vào lớp học và tự động tạo mã định danh ẩn danh.
                </p>
              </div>

              {importResult.skipped > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-900 max-w-md mx-auto">
                  <div className="flex items-center gap-1.5 font-bold mb-1.5 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Bỏ qua {importResult.skipped} mục do trùng mã học sinh:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] max-h-28 overflow-y-auto">
                    {importResult.duplicates.map((dup, i) => (
                      <li key={i}>{dup}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-xs text-rose-900 max-w-md mx-auto">
                  <div className="flex items-center gap-1.5 font-bold mb-1.5 text-rose-800">
                    <AlertCircle className="h-4 w-4" />
                    <span>Các dòng có lỗi định dạng ({importResult.errors.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] max-h-28 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          {step === 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
              <span>Chỉ thêm mới hoặc cập nhật an toàn, không xóa học sinh hiện tại.</span>
            </div>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Chọn file khác</span>
            </button>
          )}

          {step === 3 && <div />}

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!parseResult || parseResult.validCount === 0 || isImporting}
                  onClick={handleCommitImport}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang nhập dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Xác nhận nhập {parseResult?.validCount || 0} học sinh</span>
                    </>
                  )}
                </button>
              </>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 cursor-pointer active:scale-95 transition-all"
              >
                Đóng & Xem danh sách lớp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
