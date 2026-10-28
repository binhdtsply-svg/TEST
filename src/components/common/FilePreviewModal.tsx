/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCode
} from 'lucide-react';
import { AttachedFile } from '../../types';

const PdfViewer = lazy(() => import('./PdfViewer').then(m => ({ default: m.PdfViewer })));
const WordViewer = lazy(() => import('./WordViewer').then(m => ({ default: m.WordViewer })));
const ExcelViewer = lazy(() => import('./ExcelViewer').then(m => ({ default: m.ExcelViewer })));

function ViewerLoadingFallback() {
  return (
    <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center gap-3 text-slate-300">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold">Đang tải trình xem tài liệu...</p>
    </div>
  );
}

interface FilePreviewModalProps {
  file: AttachedFile | null;
  filesList?: AttachedFile[]; // optional list for next/prev gallery
  gallery?: AttachedFile[]; // alias
  onSelectGalleryItem?: (item: AttachedFile) => void;
  isOpen?: boolean;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  filesList,
  gallery,
  onSelectGalleryItem,
  isOpen = true,
  onClose
}) => {
  const effectiveList = filesList || gallery;
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Synchronize index when file or list changes
  useEffect(() => {
    if (file && effectiveList && effectiveList.length > 0) {
      const idx = effectiveList.findIndex((f) => f.url === file.url || f.id === file.id);
      if (idx !== -1) setCurrentIndex(idx);
    }
    setZoomLevel(1);
    setRotation(0);
  }, [file, effectiveList]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (file || isOpen)) {
        onClose();
      } else if (e.key === 'ArrowRight' && effectiveList && effectiveList.length > 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && effectiveList && effectiveList.length > 1) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isOpen, effectiveList, currentIndex]);

  if (!file && !isOpen) return null;
  const currentFile = effectiveList && effectiveList.length > 0 ? effectiveList[currentIndex] || file : file;
  if (!currentFile) return null;

  const fileName = currentFile.name || (currentFile as any).fileName || 'Tệp đính kèm';
  const fileUrl = currentFile.url;
  const fileSize = currentFile.size || 'Tệp tin';

  const isImage =
    (currentFile.type as string) === 'image' ||
    /\.(jpeg|jpg|jpe|jfif|png|webp|gif|svg|bmp|ico|avif)$/i.test(fileName) ||
    /\.(jpeg|jpg|jpe|jfif|png|webp|gif|svg|bmp|ico|avif)/i.test(fileUrl || '') ||
    (fileUrl && fileUrl.includes('images.unsplash.com')) ||
    (fileUrl && fileUrl.startsWith('data:image/')) ||
    (fileUrl && fileUrl.startsWith('blob:') && ((currentFile.type as string) === 'image' || /\.(jpeg|jpg|png|webp|gif)/i.test(fileName)));

  const isPdf = (currentFile.type as string) === 'pdf' || (currentFile.type as string) === 'application/pdf' || /\.pdf$/i.test(fileName);
  const isVideo = (currentFile.type as string) === 'video' || /\.(mp4|mov|webm|ogg)$/i.test(fileName);
  const isSheet = (currentFile.type as string) === 'sheet' || /\.(xls|xlsx|csv)$/i.test(fileName);
  const isDoc = (currentFile.type as string) === 'doc' || /\.(doc|docx|ppt|pptx)$/i.test(fileName);
  const isTxt = /\.(txt|md|json|log)$/i.test(fileName);

  const handleNext = () => {
    if (!effectiveList || effectiveList.length <= 1) return;
    const nextIdx = (currentIndex + 1) % effectiveList.length;
    setCurrentIndex(nextIdx);
    if (onSelectGalleryItem) onSelectGalleryItem(effectiveList[nextIdx]);
    setZoomLevel(1);
    setRotation(0);
  };

  const handlePrev = () => {
    if (!effectiveList || effectiveList.length <= 1) return;
    const prevIdx = (currentIndex - 1 + effectiveList.length) % effectiveList.length;
    setCurrentIndex(prevIdx);
    if (onSelectGalleryItem) onSelectGalleryItem(effectiveList[prevIdx]);
    setZoomLevel(1);
    setRotation(0);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="file-preview-dialog"
        className="relative flex h-full max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
              {isImage && <ImageIcon className="h-5 w-5" />}
              {isPdf && <FileText className="h-5 w-5 text-rose-600" />}
              {isVideo && <Video className="h-5 w-5 text-purple-600" />}
              {isSheet && <FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
              {isDoc && <FileText className="h-5 w-5 text-blue-600" />}
              {isTxt && <FileCode className="h-5 w-5 text-amber-600" />}
            </div>
            <div className="truncate">
              <h3 className="truncate text-sm font-extrabold text-slate-800">{fileName}</h3>
              <p className="text-xs text-slate-500">
                {fileSize} {filesList && filesList.length > 1 ? `• (${currentIndex + 1}/${filesList.length})` : ''}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {/* Image zoom & rotate toolbars */}
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mr-2 shadow-2xs">
                <button
                  onClick={handleZoomIn}
                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Phóng to (+)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Thu nhỏ (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Xoay 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                {(zoomLevel !== 1 || rotation !== 0) && (
                  <button
                    onClick={handleResetView}
                    className="px-2 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                  >
                    100%
                  </button>
                )}
              </div>
            )}

            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Tải về máy</span>
            </a>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer ml-1"
              title="Đóng (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 overflow-auto bg-slate-900/90 flex items-center justify-center p-4 min-h-[350px]">
          {/* Gallery Prev / Next Buttons */}
          {filesList && filesList.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-all cursor-pointer shadow-lg hover:scale-105"
                title="Tệp trước đó (Mũi tên trái)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-all cursor-pointer shadow-lg hover:scale-105"
                title="Tệp tiếp theo (Mũi tên phải)"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Render by File Type */}
          {isImage && fileUrl ? (
            <div className="flex items-center justify-center w-full h-full overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                referrerPolicy="no-referrer"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl select-none"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-full min-h-[520px] max-h-[78vh] flex flex-col">
              <Suspense fallback={<ViewerLoadingFallback />}>
                <PdfViewer
                  url={fileUrl || ''}
                  fileName={fileName}
                  fileSize={fileSize}
                />
              </Suspense>
            </div>
          ) : isDoc ? (
            <div className="w-full h-full min-h-[520px] max-h-[78vh] flex flex-col">
              <Suspense fallback={<ViewerLoadingFallback />}>
                <WordViewer
                  url={fileUrl || ''}
                  fileName={fileName}
                  fileSize={fileSize}
                />
              </Suspense>
            </div>
          ) : isVideo && fileUrl ? (
            <div className="w-full flex items-center justify-center">
              <video
                src={fileUrl}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl"
              />
            </div>
          ) : isSheet ? (
            <div className="w-full h-full min-h-[520px] max-h-[78vh] flex flex-col">
              <Suspense fallback={<ViewerLoadingFallback />}>
                <ExcelViewer
                  url={fileUrl || ''}
                  fileName={fileName}
                  fileSize={fileSize}
                />
              </Suspense>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-800">{fileName}</h4>
                <p className="text-xs text-slate-500 mt-1">Dung lượng: {fileSize}</p>
              </div>
              <a
                href={fileUrl}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Mở tệp / Tải về máy</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
export const MediaViewerModal = FilePreviewModal;
export const FileViewerModal = FilePreviewModal;
