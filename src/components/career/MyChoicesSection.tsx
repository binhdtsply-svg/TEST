/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  Trash2,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Eye,
  BarChart3,
  Layers,
  Sparkles,
  BookOpen,
  Briefcase,
  Building2,
  Compass,
  GraduationCap,
  Calendar,
  X,
  Plus
} from 'lucide-react';
import {
  CareerSavedItem,
  SavedItemStatus,
  SavedItemType,
  Student
} from '../../types';
import { careerService } from '../../services/CareerService';

interface Props {
  student: Student;
  onNavigateToOccupations: () => void;
  onNavigateToMajors: () => void;
  onNavigateToUnis: () => void;
}

export const MyChoicesSection: React.FC<Props> = ({
  student,
  onNavigateToOccupations,
  onNavigateToMajors,
  onNavigateToUnis
}) => {
  const [filterType, setFilterType] = useState<SavedItemType | 'all'>('all');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<SavedItemStatus>('exploring');
  const [msg, setMsg] = useState<string | null>(null);

  const savedItems = careerService.getSavedItems(student.id);

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return savedItems;
    return savedItems.filter(item => item.itemType === filterType);
  }, [savedItems, filterType]);

  const toggleSelectForCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(prev => prev.filter(i => i !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert('Bạn chỉ có thể chọn tối đa 3 lựa chọn để so sánh trực diện.');
        return;
      }
      setSelectedForCompare(prev => [...prev, id]);
    }
  };

  const comparedItems = savedItems.filter(item => selectedForCompare.includes(item.id));

  const handleDelete = (itemId: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${title}" khỏi danh sách Lựa chọn của tôi?`)) {
      careerService.removeSavedItem(student.id, itemId);
      setSelectedForCompare(prev => prev.filter(id => id !== itemId));
      setMsg(`Đã xóa "${title}" khỏi danh sách quan tâm.`);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleStartEdit = (item: CareerSavedItem) => {
    setEditingItemId(item.id);
    setEditNotes(item.notes || '');
    setEditStatus(item.status);
  };

  const handleSaveEdit = (item: CareerSavedItem) => {
    careerService.updateSavedItemStatus(student.id, item.id, editStatus, editNotes);
    setEditingItemId(null);
    setMsg('Đã cập nhật trạng thái và ghi chú thành công!');
    setTimeout(() => setMsg(null), 3000);
  };

  const getStatusBadge = (status: SavedItemStatus) => {
    switch (status) {
      case 'decided':
        return <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">Đã quyết định</span>;
      case 'reviewed':
        return <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold">Đã xem thông tin</span>;
      case 'need_info':
        return <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">Cần tìm hiểu thêm</span>;
      case 'exploring':
      default:
        return <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold">Đang tìm hiểu</span>;
    }
  };

  const getItemTypeIcon = (type: SavedItemType) => {
    switch (type) {
      case 'occupation':
        return <Briefcase className="h-4 w-4 text-indigo-600" />;
      case 'major':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'institution':
        return <Building2 className="h-4 w-4 text-amber-600" />;
    }
  };

  const getItemTypeLabel = (type: SavedItemType) => {
    switch (type) {
      case 'occupation': return 'Nghề nghiệp';
      case 'major': return 'Ngành đào tạo';
      case 'institution': return 'Trường ĐH / CĐ / GDNN';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {msg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-100">
              <Bookmark className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                LỰA CHỌN CỦA TÔI & SO SÁNH PHƯƠNG ÁN
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Quản lý danh sách các nghề, ngành đào tạo và trường học đã lưu; đối chiếu so sánh trực diện để đưa ra quyết định vững chắc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isComparing && savedItems.length >= 2 && (
              <button
                type="button"
                onClick={() => setIsComparing(true)}
                disabled={selectedForCompare.length < 2}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>So sánh {selectedForCompare.length > 0 ? `(${selectedForCompare.length})` : ''}</span>
              </button>
            )}

            {isComparing && (
              <button
                type="button"
                onClick={() => setIsComparing(false)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>Quay lại danh sách</span>
              </button>
            )}
          </div>
        </div>

        {/* COMPARISON VIEW */}
        {isComparing ? (
          <div className="space-y-6 animate-fade-in pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  <span>SO SÁNH ĐỐI CHIẾU CÁC LỰA CHỌN ĐÃ LƯU ({comparedItems.length}/3)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hệ thống không xếp hạng "tốt nhất" hoặc quyết định thay bạn. Bảng đối chiếu giúp bạn có cái nhìn đa chiều về đặc điểm, yêu cầu và cơ hội.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsComparing(false)}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Đóng so sánh
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5 w-1/4">Tiêu chí phân tích</th>
                    {comparedItems.map(item => (
                      <th key={item.id} className="px-4 py-3.5 w-1/4">
                        <div className="flex items-center gap-1.5 text-indigo-900 font-black">
                          {getItemTypeIcon(item.itemType)}
                          <span>{item.itemTitle}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal lowercase mt-0.5">
                          {item.itemSubtitle || getItemTypeLabel(item.itemType)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Loại mục</td>
                    {comparedItems.map(item => (
                      <td key={item.id} className="px-4 py-3 font-bold text-slate-700">
                        {getItemTypeLabel(item.itemType)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Trạng thái cân nhắc</td>
                    {comparedItems.map(item => (
                      <td key={item.id} className="px-4 py-3">
                        {getStatusBadge(item.status)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Đặc điểm / Ghi chú chính</td>
                    {comparedItems.map(item => (
                      <td key={item.id} className="px-4 py-3 text-slate-600 leading-relaxed text-[11px]">
                        {item.notes || item.data?.description || 'Chưa có ghi chú chi tiết.'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Tương thích với sở thích & năng lực</td>
                    {comparedItems.map(item => (
                      <td key={item.id} className="px-4 py-3 text-slate-700">
                        {item.itemType === 'occupation' && item.data?.relatedHolland && (
                          <span className="font-bold text-indigo-600">
                            Nhóm Holland: {item.data.relatedHolland.join(', ')}
                          </span>
                        )}
                        {item.itemType === 'major' && item.data?.examGroups && (
                          <span className="font-bold text-blue-600">
                            Tổ hợp: {item.data.examGroups.join(', ')}
                          </span>
                        )}
                        {item.itemType === 'institution' && (
                          <span className="font-bold text-amber-600">
                            Loại hình: {item.data?.type || 'Đào tạo'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Website chính thức / Thông tin</td>
                    {comparedItems.map(item => (
                      <td key={item.id} className="px-4 py-3">
                        {item.data?.officialWebsite ? (
                          <a
                            href={item.data.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                          >
                            <span>Mở website</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-4 pt-2">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
                {[
                  { key: 'all', label: `Tất cả (${savedItems.length})` },
                  { key: 'occupation', label: `Nghề nghiệp (${savedItems.filter(i => i.itemType === 'occupation').length})` },
                  { key: 'major', label: `Ngành đào tạo (${savedItems.filter(i => i.itemType === 'major').length})` },
                  { key: 'institution', label: `Trường (${savedItems.filter(i => i.itemType === 'institution').length})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterType(tab.key as any)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      filterType === tab.key
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {savedItems.length >= 2 && (
                <span className="text-[11px] text-slate-400">
                  Tích chọn vào ô vuông để so sánh đối chiếu tối đa 3 mục.
                </span>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {filteredItems.map(item => {
                const isSelected = selectedForCompare.includes(item.id);
                const isEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50/20 ring-2 ring-indigo-400/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectForCompare(item.id)}
                          className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Chọn để so sánh"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-bold">
                            {getItemTypeIcon(item.itemType)}
                            <span>{getItemTypeLabel(item.itemType)}</span>
                          </span>

                          <h3 className="text-sm font-black text-slate-900">
                            {item.itemTitle}
                          </h3>

                          {getStatusBadge(item.status)}
                        </div>

                        {item.itemSubtitle && (
                          <div className="text-xs text-slate-500 font-medium">
                            {item.itemSubtitle}
                          </div>
                        )}

                        {item.notes && !isEditing && (
                          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                            {item.notes}
                          </div>
                        )}

                        {isEditing && (
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 mt-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700">Trạng thái:</label>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as SavedItemStatus)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                              >
                                <option value="exploring">Đang tìm hiểu</option>
                                <option value="reviewed">Đã xem thông tin</option>
                                <option value="need_info">Cần tìm hiểu thêm</option>
                                <option value="decided">Đã quyết định</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700">Ghi chú riêng của bạn:</label>
                              <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                rows={2}
                                placeholder="Ghi lại cảm nhận, điểm mạnh/yếu hoặc kế hoạch tìm hiểu..."
                                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="px-3 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item)}
                                className="px-3 py-1 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
                              >
                                Lưu thay đổi
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400">
                          Đã lưu vào: {item.savedAt}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Sửa trạng thái & ghi chú"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.itemTitle)}
                        className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {savedItems.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Bookmark className="h-7 w-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Bạn chưa lưu mục quan tâm nào
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Trong quá trình tìm hiểu các nghề nghiệp, ngành đào tạo hoặc trường học, hãy nhấn biểu tượng Lưu để gom vào danh sách này và đối chiếu so sánh.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onNavigateToOccupations}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>Khám phá Nghề</span>
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToMajors}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Tìm Ngành đào tạo</span>
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToUnis}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Tìm Trường & Điểm chuẩn</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
