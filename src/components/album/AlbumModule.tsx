/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Images,
  Plus,
  Search,
  Filter,
  Sparkles,
  Pin,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { AlbumPost, UserAccount, AttachedFile } from '../../types';
import { authService } from '../../services/AuthService';
import { albumService } from '../../services/AlbumService';
import { classService } from '../../services/ClassService';
import { AlbumPostCard } from './AlbumPostCard';
import { AlbumCreateModal } from './AlbumCreateModal';

interface AlbumModuleProps {
  onOpenFilePreview?: (file: AttachedFile) => void;
}

export const AlbumModule: React.FC<AlbumModuleProps> = () => {
  const [currentUser, setCurrentUser] = useState<UserAccount>(authService.getCurrentUser());
  const [posts, setPosts] = useState<AlbumPost[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AlbumPost | null>(null);

  const classSettings = classService.getSettings();

  useEffect(() => {
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getCurrentUser());
    });

    const loadPosts = () => {
      const allPosts = albumService.getAll(currentUser.role, selectedTag);
      setPosts(allPosts);
    };

    loadPosts();
    const unsubAlbum = albumService.subscribe(loadPosts);

    return () => {
      unsubAuth();
      unsubAlbum();
    };
  }, [currentUser.role, selectedTag]);

  // Tag & search filtering
  const filteredPosts = posts.filter(p => {
    const matchTag = selectedTag === 'all'
      ? true
      : (p.tags && p.tags.some(t => t.toLowerCase().includes(selectedTag.toLowerCase()))) ||
        (p.hashtags && p.hashtags.some(t => t.toLowerCase().includes(selectedTag.toLowerCase())));

    const matchSearch = searchQuery.trim() === ''
      ? true
      : p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.authorName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchTag && matchSearch;
  });

  const isTeacher = currentUser.role === 'TEACHER';
  const isOfficer = currentUser.role === 'CLASS_OFFICER';
  const canCreate = isTeacher || isOfficer || classSettings.interactionSettings.studentCanPostAlbum;

  const filterTabs = [
    { id: 'all', label: 'Tất cả bài đăng' },
    { id: 'tap_the', label: `📸 Tập thể ${classSettings.className || 'Lớp'}` },
    { id: '#VinhDanh20-11', label: '🎉 Vinh danh & Lễ hội' },
    { id: '#HoiThao', label: '🏆 Hội thao & Phong trào' },
    { id: '#NgoaiKhoa', label: '🚌 Học tập Ngoại khóa' },
    { id: '#STEM', label: '🔬 Hoạt động STEM' }
  ];

  const handleOpenEdit = (post: AlbumPost) => {
    setEditingPost(post);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingPost(null);
  };

  return (
    <div className="space-y-5 w-full min-w-0 pb-12">
      {/* Module Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
              <Images className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Album kỷ niệm
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Khoảnh khắc, hoạt động và hành trình thanh xuân của tập thể lớp 11A1
              </p>
            </div>
          </div>
        </div>

        {/* Create Post Button */}
        {canCreate && (
          <button
            onClick={() => {
              setEditingPost(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng bài lên Album</span>
          </button>
        )}
      </div>

      {/* Quick Composer Box (Facebook / Zalo style) */}
      {canCreate && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shadow-2xs shrink-0"
            />
            <button
              onClick={() => {
                setEditingPost(null);
                setIsCreateModalOpen(true);
              }}
              className="flex-1 bg-slate-100 hover:bg-slate-200/70 text-slate-500 rounded-full px-4 py-2.5 text-xs text-left font-medium transition-colors cursor-pointer"
            >
              {currentUser.name}, hãy chia sẻ khoảnh khắc đẹp của lớp hôm nay...
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-2.5 px-2 text-xs">
            <button
              onClick={() => {
                setEditingPost(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Đăng ảnh (Tối đa 15)</span>
            </button>

            <button
              onClick={() => {
                setEditingPost(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 text-slate-600 hover:text-purple-600 font-semibold py-1 px-2 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Khoảnh khắc & Cảm nghĩ</span>
            </button>

            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Hỗ trợ Zalo & Đính kèm file
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin min-w-0 flex-1">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTag(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedTag === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-60 lg:w-56 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, thẻ..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Feed List of Posts */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Images className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Chưa có bài đăng nào phù hợp</h3>
          <p className="text-xs text-slate-400 mt-1">
            Hãy đăng tải những hình ảnh và kỷ niệm đầu tiên lên Album của lớp 11A1!
          </p>
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              + Đăng bài ngay
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <AlbumPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      )}

      {/* Album Create / Edit Modal */}
      <AlbumCreateModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        currentUser={currentUser}
        editingPost={editingPost}
      />
    </div>
  );
};
