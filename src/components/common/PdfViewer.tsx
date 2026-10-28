/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Download,
  AlertCircle,
  Loader2,
  FileText,
  RefreshCw
} from 'lucide-react';

// Configure pdfjs worker
try {
  if (typeof window !== 'undefined') {
    // Set standard worker CDN or local URL
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }
} catch {
  // Fallback to inline worker
}

interface PdfViewerProps {
  url: string;
  fileName?: string;
  fileSize?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  fileName = 'Tai_Lieu.pdf',
  fileSize
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        let pdfSource: string | Uint8Array = url;

        // If URL is '#' or sample dummy or unreachable, generate or fetch safely
        if (!url || url === '#' || url.includes('dummy.pdf')) {
          // Provide a generated sample PDF buffer or sample viewer
          pdfSource = url;
        }

        // Attempt getDocument
        const loadingTask = pdfjsLib.getDocument({
          url: typeof pdfSource === 'string' ? pdfSource : undefined,
          data: typeof pdfSource !== 'string' ? pdfSource : undefined,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });

        const loadedPdf = await loadingTask.promise;
        if (!isMounted) return;
        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setLoading(false);
      } catch (err: any) {
        console.warn('PDF.js standard load failed, attempting fallback...', err);
        if (!isMounted) return;
        // Check if URL can be fetched as blob
        try {
          if (url && url !== '#' && !url.includes('dummy.pdf')) {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
            const loadedPdf = await loadingTask.promise;
            if (!isMounted) return;
            setPdfDoc(loadedPdf);
            setNumPages(loadedPdf.numPages);
            setLoading(false);
            return;
          }
        } catch (fetchErr) {
          console.warn('Blob fetch also failed:', fetchErr);
        }

        setError('Không thể kết xuất trang trực tiếp qua Canvas (do chính sách CORS của máy chủ tệp). Bạn có thể xem tài liệu qua khung nhúng bên dưới hoặc tải về máy.');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [url]);

  // Render Current Page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Viewport with scale and rotation
        const viewport = page.getViewport({ scale: scale, rotation: rotation });

        // High DPI sharpness
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform,
          viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale, rotation]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((p) => p + 1);
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 2.5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.6));
  const handleResetZoom = () => setScale(1.2);
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/90 border-b border-slate-700/80 px-4 py-2 text-white shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading || !!error}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
            title="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1 px-2 text-xs font-bold font-mono">
            <span>Trang</span>
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= numPages) setCurrentPage(val);
              }}
              disabled={loading || !!error || numPages <= 0}
              className="w-12 rounded-md bg-slate-900 border border-slate-700 px-1.5 py-0.5 text-center text-xs font-bold text-white focus:outline-hidden"
            />
            <span className="text-slate-400">/ {numPages || 1}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading || !!error}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white cursor-pointer"
            title="Trang tiếp theo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={loading || !!error}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors text-white cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <button
            onClick={handleResetZoom}
            disabled={loading || !!error}
            className="px-2.5 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-bold font-mono text-white transition-colors cursor-pointer"
            title="Tỷ lệ 100%"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            disabled={loading || !!error}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors text-white cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <button
            onClick={handleRotate}
            disabled={loading || !!error}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors text-white cursor-pointer"
            title="Xoay 90°"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
            title="Tải tệp PDF về máy"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tải về</span>
          </button>
        </div>
      </div>

      {/* Main Preview Content */}
      <div className="flex-1 overflow-auto bg-slate-950/90 flex items-center justify-center p-4 min-h-[420px]">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-xs font-bold">Đang tải và kết xuất tài liệu PDF...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center max-w-2xl w-full p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>

            {url ? (
              <iframe
                src={url}
                title={fileName}
                className="w-full h-[60vh] rounded-xl bg-white border border-slate-700 shadow-lg"
              />
            ) : null}

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-md cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Tải tệp PDF về máy ({fileSize || 'PDF'})</span>
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="flex items-center justify-center my-auto transition-transform duration-150">
            <canvas
              ref={canvasRef}
              className="rounded-xl bg-white shadow-2xl max-w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
};
