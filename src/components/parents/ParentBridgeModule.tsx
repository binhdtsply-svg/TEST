/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HeartHandshake,
  Send,
  MessageSquare,
  Share2,
  Check,
  CheckCircle2,
  Phone,
  ShieldCheck,
  UserCheck,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Clock,
  Search,
  Plus,
  Bell,
  Calendar,
  AlertCircle,
  Eye,
  Trash2,
  Edit2,
  Pin,
  MessageCircle,
  Lock,
  ChevronRight,
  ExternalLink,
  Smile,
  RotateCcw,
  Film,
  FileArchive,
  MoreVertical,
  Download,
  X
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { parentCommunicationService } from '../../services/ParentCommunicationService';
import { notificationProvider } from '../../services/NotificationProvider';
import { AttachedFile, ParentConversation, ParentAnnouncement, Comment, Student, ParentMessage } from '../../types';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { ModalLayout } from '../common/ModalLayout';
import { AccessRestricted } from '../common/AccessRestricted';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { parseDateToTimestamp } from '../../services/SchoolYearDateNormalizer';

interface ParentBridgeModuleProps {
  onOpenFilePreview?: (file: AttachedFile) => void;
  initialTab?: 'announcements' | 'private';
  initialStudentId?: string;
}

export const ParentBridgeModule: React.FC<ParentBridgeModuleProps> = ({
  onOpenFilePreview,
  initialTab,
  initialStudentId
}) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';
  const isParent = currentUser.role === 'PARENT';

  // Strict Access Guard for Parent Bridge Space
  if (!isTeacher && !isParent) {
    return (
      <AccessRestricted
        userRole={currentUser.role}
        requiredRole="PARENT"
        moduleName="Nhịp cầu Phụ huynh"
      />
    );
  }

  const students = studentService.getAll();

  // Active Main Tabs: 'announcements' (Thông báo & Thư ngỏ) | 'private' (Trao đổi riêng 1-1)
  const [activeTab, setActiveTab] = useState<'announcements' | 'private'>(initialTab || 'announcements');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Preview file state
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handlePreview = (file: AttachedFile) => {
    if (onOpenFilePreview) {
      onOpenFilePreview(file);
    } else {
      setPreviewFile(file);
    }
  };

  // ==========================================
  // TAB 1: THÔNG BÁO & THƯ NGỎ (Dedicated Parent Announcements)
  // ==========================================
  const [announcements, setAnnouncements] = useState<ParentAnnouncement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Announcement Modal State
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<ParentAnnouncement | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ParentAnnouncement['category']>('Thông báo');
  const [formContent, setFormContent] = useState('');
  const [formEventDate, setFormEventDate] = useState('');
  const [formEventTime, setFormEventTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formFiles, setFormFiles] = useState<AttachedFile[]>([]);
  const announcementFileInputRef = useRef<HTMLInputElement>(null);
  const [formChannels, setFormChannels] = useState<{ inApp: boolean; zalo: boolean; sms: boolean }>({
    inApp: true,
    zalo: true,
    sms: false
  });
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const loadAnnouncements = () => {
    setAnnouncements(parentCommunicationService.getAnnouncements());
  };

  useEffect(() => {
    loadAnnouncements();
    return parentCommunicationService.subscribe(loadAnnouncements);
  }, []);

  const handleOpenCreateAnnouncement = () => {
    setEditingAnnId(null);
    setFormTitle('');
    setFormCategory('Thông báo');
    setFormContent('');
    setFormEventDate('');
    setFormEventTime('');
    setFormLocation('');
    setFormFiles([]);
    setFormChannels({ inApp: true, zalo: true, sms: false });
    setIsCreatingModalOpen(true);
  };

  const handleOpenEditAnnouncement = (ann: ParentAnnouncement) => {
    setEditingAnnId(ann.id);
    setFormTitle(ann.title);
    setFormCategory(ann.category);
    setFormContent(ann.content);
    setFormEventDate(ann.eventDate || '');
    setFormEventTime(ann.eventTime || '');
    setFormLocation(ann.location || '');
    setFormFiles(ann.attachments || []);
    setIsCreatingModalOpen(true);
  };

  const handleDeleteAnnouncement = (ann: ParentAnnouncement) => {
    setAnnouncementToDelete(ann);
  };

  const confirmDeleteAnnouncement = () => {
    if (announcementToDelete) {
      parentCommunicationService.deleteAnnouncement(announcementToDelete.id);
      setAnnouncementToDelete(null);
      showToast('Đã xóa thông báo phụ huynh.');
    }
  };

  const handleTogglePin = (id: string) => {
    parentCommunicationService.togglePinAnnouncement(id);
    showToast('Đã cập nhật trạng thái ghim thông báo.');
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    if (editingAnnId) {
      parentCommunicationService.updateAnnouncement(editingAnnId, {
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        eventDate: formEventDate || undefined,
        eventTime: formEventTime || undefined,
        location: formLocation.trim() || undefined,
        attachments: formFiles
      });
      showToast('Đã cập nhật thông báo.');
    } else {
      const channelsList: ('IN_APP' | 'ZALO' | 'SMS')[] = [];
      if (formChannels.inApp) channelsList.push('IN_APP');
      if (formChannels.zalo) channelsList.push('ZALO');
      if (formChannels.sms) channelsList.push('SMS');

      const newAnn: ParentAnnouncement = {
        id: `pa-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        eventDate: formEventDate || undefined,
        eventTime: formEventTime || undefined,
        location: formLocation.trim() || undefined,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: 'TEACHER',
        createdAt: new Date().toLocaleDateString('vi-VN'),
        isPinned: false,
        allowComments: true,
        channels: channelsList,
        attachments: formFiles,
        comments: []
      };

      parentCommunicationService.addAnnouncement(newAnn);

      // Broadcast notification
      if (channelsList.length > 0) {
        notificationProvider.sendMultiChannelNotification(
          `[GVCN] ${formTitle.trim()}`,
          formContent.trim(),
          channelsList
        );
      }

      showToast('Đã đăng thông báo gửi tới Phụ huynh.');
    }

    setIsCreatingModalOpen(false);
  };

  const handleAddComment = (announcementId: string) => {
    const text = commentInput[announcementId]?.trim();
    if (!text) return;

    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      authorId: currentUser.id,
      authorName: isTeacher ? `${currentUser.name} (GVCN)` : `${currentUser.name} (Phụ huynh)`,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      content: text,
      createdAt: new Date().toLocaleDateString('vi-VN')
    };

    parentCommunicationService.addCommentToAnnouncement(announcementId, newComment);
    setCommentInput((prev) => ({ ...prev, [announcementId]: '' }));
    showToast('Đã gửi phản hồi.');
  };

  const handleAnnouncementFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        showToast(`Tệp "${file.name}" vượt quá dung lượng cho phép (tối đa 20MB).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64Url = loadEvt.target?.result as string;
        const sizeStr =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(1)} KB`;

        let inferredType: AttachedFile['type'] = 'other';
        const nameLower = file.name.toLowerCase();
        if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)$/i.test(nameLower)) {
          inferredType = 'image';
        } else if (file.type.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(nameLower)) {
          inferredType = 'video';
        } else if (file.type.includes('pdf') || /\.pdf$/i.test(nameLower)) {
          inferredType = 'pdf';
        } else if (file.type.includes('word') || /\.(doc|docx)$/i.test(nameLower)) {
          inferredType = 'doc';
        } else if (file.type.includes('excel') || file.type.includes('sheet') || /\.(xls|xlsx|csv)$/i.test(nameLower)) {
          inferredType = 'sheet';
        }

        const newAtt: AttachedFile = {
          id: `ann-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: sizeStr,
          type: inferredType,
          url: base64Url
        };

        setFormFiles((prev) => [...prev, newAtt]);
        showToast(`Đã đính kèm ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Filtered Announcements with pinned sorted first
  const filteredAnnouncements = announcements
    .filter((ann) => {
      if (selectedCategory !== 'Tất cả' && ann.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ann.title.toLowerCase().includes(q);
        const matchContent = ann.content.toLowerCase().includes(q);
        if (!matchTitle && !matchContent) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aPin = a.isPinned ? 1 : 0;
      const bPin = b.isPinned ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      const diff = parseDateToTimestamp(b.createdAt) - parseDateToTimestamp(a.createdAt);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });

  // ==========================================
  // TAB 2: TRAO ĐỔI RIÊNG 1-1 (Private Messaging)
  // ==========================================
  const [conversations, setConversations] = useState<ParentConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ParentConversation | null>(null);
  const selectedStudentIdRef = useRef<string | null>(initialStudentId || null);
  const [messageText, setMessageText] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [chatAttachments, setChatAttachments] = useState<AttachedFile[]>([]);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [messageToDeleteForMe, setMessageToDeleteForMe] = useState<{ msg: ParentMessage; studentId: string } | null>(null);
  const [messageToRecall, setMessageToRecall] = useState<{ msg: ParentMessage; studentId: string } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const classSettings = classService.getSettings();

  // If initialStudentId prop changes, sync ref and conversation
  useEffect(() => {
    if (initialStudentId) {
      selectedStudentIdRef.current = initialStudentId;
      if (isTeacher) {
        const teacherConvs = parentCommunicationService.getConversationsForTeacher();
        const found = teacherConvs.find((c) => c.studentId === initialStudentId);
        if (found) {
          setSelectedConversation(found);
        }
      }
    }
  }, [initialStudentId, isTeacher]);

  const loadConversations = useCallback(() => {
    if (isTeacher) {
      const teacherConvs = parentCommunicationService.getConversationsForTeacher();
      setConversations(teacherConvs);
      
      const targetId = selectedStudentIdRef.current;
      if (targetId) {
        const found = teacherConvs.find((c) => c.studentId === targetId);
        if (found) {
          setSelectedConversation(found);
          return;
        }
      }
      
      // Only set to first conversation if no active conversation was previously selected
      if (!selectedStudentIdRef.current && teacherConvs.length > 0) {
        setSelectedConversation(teacherConvs[0]);
        selectedStudentIdRef.current = teacherConvs[0].studentId;
      }
    } else if (isParent) {
      const childId = currentUser.childStudentId || 'hs-01';
      const parentConv = parentCommunicationService.getConversationForStudent(childId);
      setConversations([parentConv]);
      setSelectedConversation(parentConv);
      selectedStudentIdRef.current = parentConv.studentId;
    }
  }, [isTeacher, isParent, currentUser.childStudentId]);

  useEffect(() => {
    loadConversations();
    return parentCommunicationService.subscribe(loadConversations);
  }, [loadConversations]);

  useEffect(() => {
    if (activeTab === 'private') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages, activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileCategory: 'image' | 'video' | 'doc') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64Url = loadEvt.target?.result as string;
        const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`;

        let inferredType: AttachedFile['type'] = 'other';
        if (file.type.startsWith('image/')) inferredType = 'image';
        else if (file.type.startsWith('video/')) inferredType = 'video';
        else if (file.type.includes('pdf')) inferredType = 'pdf';
        else if (file.type.includes('word') || file.type.includes('doc')) inferredType = 'doc';
        else if (file.type.includes('excel') || file.type.includes('sheet')) inferredType = 'sheet';

        const newAtt: AttachedFile = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: sizeStr,
          type: inferredType,
          url: base64Url
        };

        setChatAttachments((prev) => [...prev, newAtt]);
        showToast(`Đã đính kèm ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && chatAttachments.length === 0) || !selectedConversation) return;

    // Lock active student ID before sending
    selectedStudentIdRef.current = selectedConversation.studentId;

    parentCommunicationService.sendMessage(selectedConversation.studentId, {
      senderRole: currentUser.role as 'TEACHER' | 'PARENT',
      senderName: currentUser.name,
      content: messageText.trim(),
      attachments: chatAttachments.length > 0 ? [...chatAttachments] : undefined
    });

    setMessageText('');
    setChatAttachments([]);
  };

  const confirmDeleteMessageForMe = () => {
    if (messageToDeleteForMe) {
      parentCommunicationService.deleteMessageForMe(
        messageToDeleteForMe.studentId,
        messageToDeleteForMe.msg.id,
        currentUser.role as 'TEACHER' | 'PARENT'
      );
      setMessageToDeleteForMe(null);
      setActiveMenuMessageId(null);
      showToast('Đã xóa tin nhắn ở phía bạn.');
    }
  };

  const confirmRecallMessage = () => {
    if (messageToRecall) {
      try {
        parentCommunicationService.recallMessage(
          messageToRecall.studentId,
          messageToRecall.msg.id,
          currentUser.role as 'TEACHER' | 'PARENT'
        );
        setMessageToRecall(null);
        setActiveMenuMessageId(null);
        showToast('Đã thu hồi tin nhắn cho cả hai bên.');
      } catch (err: any) {
        showToast(err.message || 'Không thể thu hồi tin nhắn.');
        setMessageToRecall(null);
      }
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchStudent.trim()) return true;
    const q = searchStudent.toLowerCase();
    return (
      c.studentName.toLowerCase().includes(q) ||
      c.parentName.toLowerCase().includes(q) ||
      c.parentPhone.includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-toast flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Container Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 shadow-2xs">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Nhịp cầu Phụ huynh
                </h2>
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200">
                  Kênh riêng biệt GVCN - CMHS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thông báo chính thức từ GVCN và kênh trao đổi bảo mật riêng tư 1-1 với Phụ huynh
              </p>
            </div>
          </div>

          {/* 2 Main Navigation Subtabs */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-white text-rose-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>1. Thông báo & Thư ngỏ</span>
              {announcements.length > 0 && (
                <span className="ml-1 rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.2 text-[10px] font-black">
                  {announcements.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('private')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'private'
                  ? 'bg-white text-rose-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>2. Trao đổi riêng (1-1)</span>
              {isTeacher && (
                <span className="ml-1 rounded-full bg-slate-200 text-slate-700 px-1.5 py-0.2 text-[10px] font-black">
                  {students.length} PH
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUBTAB 1: THÔNG BÁO & THƯ NGỎ CỦA GVCN */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'announcements' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  {['Tất cả', 'Thông báo', 'Thư ngỏ', 'Lịch họp phụ huynh', 'Kế hoạch phối hợp'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm thông báo..."
                    className="rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-hidden w-40 sm:w-48"
                  />
                </div>
              </div>

              {isTeacher && (
                <button
                  onClick={handleOpenCreateAnnouncement}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tạo thông báo gửi PH</span>
                </button>
              )}
            </div>

            {/* Announcements List */}
            {filteredAnnouncements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                <Bell className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Chưa có thông báo nào từ GVCN</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Các thư ngỏ, lịch họp phụ huynh và kế hoạch phối hợp sẽ được GVCN đăng tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                      ann.isPinned
                        ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {ann.isPinned && (
                            <span className="flex items-center gap-1 rounded-md bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-black">
                              <Pin className="h-3 w-3" />
                              ĐÃ GHIM
                            </span>
                          )}
                          <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-bold border border-slate-200">
                            {ann.category}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {ann.createdAt}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                          {ann.title}
                        </h3>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Người gửi: <span className="font-bold text-slate-700">{ann.authorName}</span>
                        </div>
                      </div>

                      {isTeacher && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleTogglePin(ann.id)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              ann.isPinned
                                ? 'text-rose-600 bg-rose-50'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                            title={ann.isPinned ? 'Bỏ ghim' : 'Ghim thông báo'}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditAnnouncement(ann)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="Sửa"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(ann)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                      {ann.content}
                    </div>

                    {/* Attachments */}
                    {ann.attachments && ann.attachments.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <div className="text-xs font-bold text-slate-600">Văn bản / Kế hoạch đính kèm:</div>
                        <div className="flex flex-wrap gap-2">
                          {ann.attachments.map((file) => (
                            <button
                              key={file.id}
                              onClick={() => handlePreview(file)}
                              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Paperclip className="h-3.5 w-3.5 text-rose-500" />
                              <span>{file.name}</span>
                              <span className="text-[10px] text-slate-400">({file.size})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments & Feedback Section */}
                    {ann.allowComments && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <MessageCircle className="h-3.5 w-3.5 text-rose-500" />
                          <span>Phản hồi & Ý kiến đóng góp ({ann.comments?.length || 0})</span>
                        </div>

                        {/* Existing comments */}
                        {ann.comments && ann.comments.length > 0 && (
                          <div className="space-y-2">
                            {ann.comments.map((comm) => (
                              <div
                                key={comm.id}
                                className="rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-slate-800">
                                    {comm.authorName}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{comm.createdAt}</span>
                                </div>
                                <p className="text-slate-600">{comm.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comment Input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={commentInput[ann.id] || ''}
                            onChange={(e) =>
                              setCommentInput({ ...commentInput, [ann.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(ann.id);
                            }}
                            placeholder="Nhập ý kiến phản hồi tới GVCN..."
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-rose-500"
                          />
                          <button
                            onClick={() => handleAddComment(ann.id)}
                            className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            Gửi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBTAB 2: TRAO ĐỔI RIÊNG 1-1 */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'private' && (
          <div className="mt-5 animate-fade-in">
            {isTeacher ? (
              /* Teacher View: 2-Column Responsive Layout */
              <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
                {/* Left Sidebar: Conversations List (for Teacher) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col h-[600px] shadow-2xs">
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        placeholder="Tìm học sinh / phụ huynh..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-800 outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {filteredConversations.map((conv) => {
                      const isSelected = selectedConversation?.studentId === conv.studentId;
                      const lastMsg = conv.messages[conv.messages.length - 1];

                      return (
                        <button
                          key={conv.studentId}
                          onClick={() => {
                            setSelectedConversation(conv);
                            selectedStudentIdRef.current = conv.studentId;
                          }}
                          className={`w-full rounded-xl p-3 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white hover:bg-rose-50/50 border border-slate-200'
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-black text-xs ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {conv.studentName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div
                                className={`text-xs font-black truncate ${
                                  isSelected ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                {conv.studentName}
                              </div>
                              {conv.unreadCount > 0 && !isSelected && (
                                <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[9px] font-black">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[11px] truncate mt-0.5 ${
                                isSelected ? 'text-white/80' : 'text-slate-500'
                              }`}
                            >
                              PH: {conv.parentName}
                            </div>
                            {lastMsg && (
                              <div
                                className={`text-[10px] truncate mt-1 ${
                                  isSelected ? 'text-white/70' : 'text-slate-400'
                                }`}
                              >
                                {lastMsg.content}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Panel: Teacher Chat Area */}
                <div className="rounded-2xl border border-slate-200 bg-white flex flex-col h-[600px] overflow-hidden shadow-2xs">
                  {selectedConversation ? (
                    <>
                      {/* Teacher Chat Header */}
                      <div className="border-b border-slate-200 bg-slate-50/90 px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 font-black text-sm">
                            {selectedConversation.studentName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                Học viên: {selectedConversation.studentName}
                              </h4>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-black">
                                <ShieldCheck className="h-3 w-3" />
                                Kênh bảo mật GVCN ↔ CMHS
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              Phụ huynh: <span className="font-bold text-slate-700">{selectedConversation.parentName}</span>
                              {selectedConversation.parentPhone && (
                                <span className="ml-2 font-mono text-slate-600">• {selectedConversation.parentPhone}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {selectedConversation.parentPhone && (
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={`tel:${selectedConversation.parentPhone}`}
                              className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                            >
                              <Phone className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Gọi điện</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Messages Stream */}
                      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/40">
                        {selectedConversation.messages.filter((m) => !m.deletedForTeacher).length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-400 py-12">
                            <MessageCircle className="h-8 w-8 text-slate-300 mb-2" />
                            <span>Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên tới Phụ huynh.</span>
                          </div>
                        ) : (
                          selectedConversation.messages
                            .filter((msg) => !msg.deletedForTeacher)
                            .map((msg) => {
                              const isTeacherSender = msg.senderRole === 'TEACHER';
                              const isMenuOpen = activeMenuMessageId === msg.id;

                              return (
                                <div
                                  key={msg.id}
                                  className={`group relative flex flex-col ${isTeacherSender ? 'items-end' : 'items-start'}`}
                                >
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                                    <span className="font-bold text-slate-600">
                                      {isTeacherSender ? 'Tôi (GVCN)' : msg.senderName}
                                    </span>
                                    <span>•</span>
                                    <span>{msg.timestamp}</span>
                                  </div>

                                  <div className="relative flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%]">
                                    {/* Action button for Sender/Receiver */}
                                    {isTeacherSender && (
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setActiveMenuMessageId(isMenuOpen ? null : msg.id)}
                                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-opacity cursor-pointer"
                                          title="Tùy chọn tin nhắn"
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </button>
                                        {isMenuOpen && (
                                          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-white p-1 shadow-lg border border-slate-200 text-xs text-slate-700 animate-scale-in">
                                            {!msg.isRecalled && isTeacherSender && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveMenuMessageId(null);
                                                  setMessageToRecall({ msg, studentId: selectedConversation.studentId });
                                                }}
                                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-bold text-left cursor-pointer"
                                              >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                Thu hồi tin nhắn
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuMessageId(null);
                                                setMessageToDeleteForMe({ msg, studentId: selectedConversation.studentId });
                                              }}
                                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-left cursor-pointer"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                              Xóa ở phía tôi
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Message Bubble */}
                                    {msg.isRecalled ? (
                                      <div className="flex items-center gap-2 italic text-slate-400 bg-slate-100/90 border border-slate-200/80 px-3.5 py-2 rounded-2xl text-xs">
                                        <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                                        <span>Tin nhắn đã được thu hồi</span>
                                        {msg.recalledAt && <span className="text-[10px] text-slate-400 font-mono">({msg.recalledAt})</span>}
                                      </div>
                                    ) : (
                                      <div
                                        className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed space-y-2 ${
                                          isTeacherSender
                                            ? 'bg-rose-600 text-white rounded-br-xs shadow-xs'
                                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-2xs'
                                        }`}
                                        style={{ wordBreak: 'break-word' }}
                                      >
                                        {msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>}

                                        {/* Attachments rendering */}
                                        {msg.attachments && msg.attachments.length > 0 && (
                                          <div className="space-y-2 pt-1">
                                            {msg.attachments.map((att) => {
                                              if (att.type === 'image' || att.url?.startsWith('data:image')) {
                                                return (
                                                  <div key={att.id} className="overflow-hidden rounded-xl border border-white/20">
                                                    <img
                                                      src={att.url}
                                                      alt={att.name}
                                                      onClick={() => handlePreview(att)}
                                                      className="max-h-48 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                                    />
                                                    <div className="p-1 text-[10px] opacity-80 truncate">{att.name} ({att.size})</div>
                                                  </div>
                                                );
                                              }
                                              if (att.type === 'video' || att.url?.startsWith('data:video')) {
                                                return (
                                                  <div key={att.id} className="rounded-xl overflow-hidden bg-black/20 p-1">
                                                    <video
                                                      controls
                                                      src={att.url}
                                                      className="max-h-52 w-full rounded-lg"
                                                    />
                                                    <div className="p-1 text-[10px] opacity-80 truncate">{att.name} ({att.size})</div>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <div
                                                  key={att.id}
                                                  onClick={() => handlePreview(att)}
                                                  className={`flex items-center justify-between gap-2 p-2 rounded-xl cursor-pointer transition-colors ${
                                                    isTeacherSender
                                                      ? 'bg-white/15 hover:bg-white/25 text-white'
                                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <FileText className="h-4 w-4 shrink-0" />
                                                    <div className="min-w-0">
                                                      <p className="text-xs font-bold truncate max-w-[180px]">{att.name}</p>
                                                      <p className="text-[10px] opacity-75">{att.size}</p>
                                                    </div>
                                                  </div>
                                                  <Download className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Action button for non-sender (delete for me) */}
                                    {!isTeacherSender && (
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setActiveMenuMessageId(isMenuOpen ? null : msg.id)}
                                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-opacity cursor-pointer"
                                          title="Tùy chọn tin nhắn"
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </button>
                                        {isMenuOpen && (
                                          <div className="absolute left-0 top-full mt-1 z-50 w-40 rounded-xl bg-white p-1 shadow-lg border border-slate-200 text-xs text-slate-700 animate-scale-in">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuMessageId(null);
                                                setMessageToDeleteForMe({ msg, studentId: selectedConversation.studentId });
                                              }}
                                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-left cursor-pointer"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                              Xóa ở phía tôi
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Attached Files Preview Bar */}
                      {chatAttachments.length > 0 && (
                        <div className="px-4 py-2 bg-rose-50/90 border-t border-rose-100 flex flex-wrap gap-2 text-xs text-rose-800">
                          {chatAttachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-lg px-2 py-1 shadow-2xs">
                              {att.type === 'image' && <ImageIcon className="h-3.5 w-3.5 text-rose-500" />}
                              {att.type === 'video' && <Film className="h-3.5 w-3.5 text-blue-500" />}
                              {att.type !== 'image' && att.type !== 'video' && <Paperclip className="h-3.5 w-3.5 text-slate-500" />}
                              <span className="truncate max-w-[140px] font-semibold">{att.name}</span>
                              <span className="text-[10px] text-slate-400">({att.size})</span>
                              <button
                                type="button"
                                onClick={() => setChatAttachments(chatAttachments.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Hidden File Inputs */}
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'image')}
                      />
                      <input
                        type="file"
                        ref={videoInputRef}
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'video')}
                      />
                      <input
                        type="file"
                        ref={docInputRef}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'doc')}
                      />

                      {/* Teacher Input Form */}
                      <form
                        onSubmit={handleSendMessage}
                        className="border-t border-slate-200 bg-white p-3 sm:p-4 flex items-center gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Gửi hình ảnh"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Gửi video"
                        >
                          <Film className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => docInputRef.current?.click()}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Gửi tệp đính kèm (PDF, Word, Excel...)"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <input
                          type="text"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Nhập nội dung trao đổi riêng với Phụ huynh..."
                          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                        />
                        <button
                          type="submit"
                          disabled={!messageText.trim() && chatAttachments.length === 0}
                          className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Gửi</span>
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-slate-400">
                      Chọn một học sinh từ danh sách bên trái để bắt đầu trao đổi.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Parent View: Full-Width Dedicated 1-1 Chat Interface */
              <div className="w-full max-w-none rounded-2xl border border-slate-200 bg-white flex flex-col h-[620px] overflow-hidden shadow-2xs">
                {/* Parent Chat Header: Full Width with Teacher & Student Details */}
                <div className="border-b border-slate-200 bg-gradient-to-r from-rose-50/90 via-white to-slate-50 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
                      alt={classSettings.homeroomTeacherName || 'GVCN'}
                      className="h-11 w-11 rounded-full object-cover border-2 border-rose-200 shadow-2xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900">
                          {classSettings.homeroomTeacherName || 'Cô Nguyễn Thị Mai Lan'}
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-black">
                          GVCN {classSettings.className || '11A1'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-black">
                          <ShieldCheck className="h-3 w-3" />
                          Kênh trao đổi riêng 1-1
                        </span>
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                          Theo dõi học sinh: <strong className="text-slate-900 font-bold">{selectedConversation?.studentName || 'Nguyễn Gia Huy'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          CMHS: <strong className="text-slate-900 font-bold">{selectedConversation?.parentName || currentUser.name}</strong>
                        </span>
                        {selectedConversation?.parentPhone && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-500">{selectedConversation.parentPhone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {classSettings.teacherPhone && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${classSettings.teacherPhone}`}
                        className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Hotline GVCN: {classSettings.teacherPhone}</span>
                        <span className="sm:hidden">Gọi GVCN</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Parent Message List: Full Width, Left (Teacher) vs Right (Parent) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
                  {(!selectedConversation || selectedConversation.messages.filter((m) => !m.deletedForParent).length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-400 py-12">
                      <MessageCircle className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600 text-sm">Chưa có tin nhắn trong cuộc hội thoại</p>
                      <p className="mt-1 text-slate-400">Gửi câu hỏi hoặc phản hồi tới Giáo viên chủ nhiệm tại khung bên dưới.</p>
                    </div>
                  ) : (
                    selectedConversation.messages
                      .filter((msg) => !msg.deletedForParent)
                      .map((msg) => {
                        const isParentSender = msg.senderRole === 'PARENT';
                        const isMenuOpen = activeMenuMessageId === msg.id;

                        return (
                          <div
                            key={msg.id}
                            className={`group relative flex flex-col ${isParentSender ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                              <span className="font-bold text-slate-600">
                                {isParentSender ? 'Tôi (Phụ huynh)' : `${classSettings.homeroomTeacherName || 'Cô Mai Lan'} (GVCN)`}
                              </span>
                              <span>•</span>
                              <span>{msg.timestamp}</span>
                            </div>

                            <div className="relative flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%]">
                              {/* Action button for Sender (Parent) */}
                              {isParentSender && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setActiveMenuMessageId(isMenuOpen ? null : msg.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-opacity cursor-pointer"
                                    title="Tùy chọn tin nhắn"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>
                                  {isMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-white p-1 shadow-lg border border-slate-200 text-xs text-slate-700 animate-scale-in">
                                      {!msg.isRecalled && isParentSender && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenuMessageId(null);
                                            setMessageToRecall({ msg, studentId: selectedConversation.studentId });
                                          }}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-bold text-left cursor-pointer"
                                        >
                                          <RotateCcw className="h-3.5 w-3.5" />
                                          Thu hồi tin nhắn
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuMessageId(null);
                                          setMessageToDeleteForMe({ msg, studentId: selectedConversation.studentId });
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-left cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Xóa ở phía tôi
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Message Bubble */}
                              {msg.isRecalled ? (
                                <div className="flex items-center gap-2 italic text-slate-400 bg-slate-100/90 border border-slate-200/80 px-3.5 py-2 rounded-2xl text-xs">
                                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Tin nhắn đã được thu hồi</span>
                                  {msg.recalledAt && <span className="text-[10px] text-slate-400 font-mono">({msg.recalledAt})</span>}
                                </div>
                              ) : (
                                <div
                                  className={`rounded-2xl px-4 sm:px-5 py-3 text-xs sm:text-sm leading-relaxed space-y-2 ${
                                    isParentSender
                                      ? 'bg-rose-600 text-white rounded-br-xs shadow-xs'
                                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-2xs'
                                  }`}
                                  style={{ wordBreak: 'break-word' }}
                                >
                                  {msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>}

                                  {/* Attachments rendering */}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                      {msg.attachments.map((att) => {
                                        if (att.type === 'image' || att.url?.startsWith('data:image')) {
                                          return (
                                            <div key={att.id} className="overflow-hidden rounded-xl border border-white/20">
                                              <img
                                                src={att.url}
                                                alt={att.name}
                                                onClick={() => handlePreview(att)}
                                                className="max-h-48 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                              />
                                              <div className="p-1 text-[10px] opacity-80 truncate">{att.name} ({att.size})</div>
                                            </div>
                                          );
                                        }
                                        if (att.type === 'video' || att.url?.startsWith('data:video')) {
                                          return (
                                            <div key={att.id} className="rounded-xl overflow-hidden bg-black/20 p-1">
                                              <video
                                                controls
                                                src={att.url}
                                                className="max-h-52 w-full rounded-lg"
                                              />
                                              <div className="p-1 text-[10px] opacity-80 truncate">{att.name} ({att.size})</div>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div
                                            key={att.id}
                                            onClick={() => handlePreview(att)}
                                            className={`flex items-center justify-between gap-2 p-2 rounded-xl cursor-pointer transition-colors ${
                                              isParentSender
                                                ? 'bg-white/15 hover:bg-white/25 text-white'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <FileText className="h-4 w-4 shrink-0" />
                                              <div className="min-w-0">
                                                <p className="text-xs font-bold truncate max-w-[180px]">{att.name}</p>
                                                <p className="text-[10px] opacity-75">{att.size}</p>
                                              </div>
                                            </div>
                                            <Download className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action button for non-sender (delete for me) */}
                              {!isParentSender && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setActiveMenuMessageId(isMenuOpen ? null : msg.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-opacity cursor-pointer"
                                    title="Tùy chọn tin nhắn"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>
                                  {isMenuOpen && (
                                    <div className="absolute left-0 top-full mt-1 z-50 w-40 rounded-xl bg-white p-1 shadow-lg border border-slate-200 text-xs text-slate-700 animate-scale-in">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuMessageId(null);
                                          setMessageToDeleteForMe({ msg, studentId: selectedConversation.studentId });
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-left cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Xóa ở phía tôi
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attached Files Preview Bar */}
                {chatAttachments.length > 0 && (
                  <div className="px-4 py-2 bg-rose-50/90 border-t border-rose-100 flex flex-wrap gap-2 text-xs text-rose-800">
                    {chatAttachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-lg px-2 py-1 shadow-2xs">
                        {att.type === 'image' && <ImageIcon className="h-3.5 w-3.5 text-rose-500" />}
                        {att.type === 'video' && <Film className="h-3.5 w-3.5 text-blue-500" />}
                        {att.type !== 'image' && att.type !== 'video' && <Paperclip className="h-3.5 w-3.5 text-slate-500" />}
                        <span className="truncate max-w-[140px] font-semibold">{att.name}</span>
                        <span className="text-[10px] text-slate-400">({att.size})</span>
                        <button
                          type="button"
                          onClick={() => setChatAttachments(chatAttachments.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden File Inputs for Parent */}
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'image')}
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'video')}
                />
                <input
                  type="file"
                  ref={docInputRef}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'doc')}
                />

                {/* Parent Message Input Form: Full Width Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-slate-200 bg-white p-3 sm:p-4 flex items-center gap-2 sm:gap-3"
                >
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Gửi hình ảnh"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Gửi video"
                  >
                    <Film className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Đính kèm đơn từ / tài liệu"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Nhập nội dung trao đổi riêng tới Giáo viên chủ nhiệm..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() && chatAttachments.length === 0}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                  >
                    <Send className="h-4 w-4" />
                    <span>Gửi tin nhắn</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Announcement Modal */}
      {isCreatingModalOpen && (
        <ModalLayout
          isOpen={true}
          onClose={() => setIsCreatingModalOpen(false)}
          title={editingAnnId ? 'Chỉnh sửa Thông báo Phụ huynh' : 'Tạo Thông báo / Thư ngỏ gửi Phụ huynh'}
          subtitle="Thông tin sẽ được gửi trực tiếp tới toàn thể Cha mẹ học sinh của lớp"
          icon={HeartHandshake}
          maxWidthClass="max-w-xl"
          footer={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingModalOpen(false)}
                className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAnnouncement}
                className="rounded-2xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition-colors"
              >
                Đăng thông báo
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveAnnouncement} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu đề thông báo / Thư ngỏ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="VD: Thư ngỏ về Kế hoạch phối hợp giáo dục Học kỳ I..."
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phân loại</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden bg-white"
              >
                <option value="Thông báo">Thông báo chung</option>
                <option value="Thư ngỏ">Thư ngỏ của GVCN</option>
                <option value="Lịch họp phụ huynh">Lịch họp Ban đại diện / Họp lớp</option>
                <option value="Kế hoạch phối hợp">Kế hoạch phối hợp giáo dục</option>
                <option value="Dặn dò">Dặn dò cần lưu ý</option>
              </select>
            </div>

            {/* Cài đặt mốc thời gian / Lịch hẹn (Đồng bộ vào Lịch công tác GVCN) */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span>Cài đặt lịch / Thời gian diễn ra (Đồng bộ Lịch công tác chủ nhiệm)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ngày diễn ra
                  </label>
                  <input
                    type="date"
                    value={formEventDate}
                    onChange={(e) => setFormEventDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-hidden bg-white focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Giờ diễn ra
                  </label>
                  <input
                    type="time"
                    value={formEventTime}
                    onChange={(e) => setFormEventTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-hidden bg-white focus:border-rose-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Địa điểm tổ chức (nếu có)
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="VD: Phòng học 12A1, Hội trường B..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-hidden bg-white focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nội dung chi tiết <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Nội dung truyền đạt tới quý Phụ huynh..."
                rows={4}
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-hidden focus:border-rose-500"
                required
              />
            </div>

            {/* Multi-channel broadcast toggles */}
            <div className="rounded-2xl bg-rose-50/50 p-3 border border-rose-200">
              <label className="block text-xs font-bold text-rose-900 mb-2">
                Kênh phát sóng đồng thời:
              </label>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formChannels.inApp}
                    onChange={(e) => setFormChannels({ ...formChannels, inApp: e.target.checked })}
                    className="rounded text-rose-600"
                  />
                  <span>Thông báo ứng dụng</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formChannels.zalo}
                    onChange={(e) => setFormChannels({ ...formChannels, zalo: e.target.checked })}
                    className="rounded text-rose-600"
                  />
                  <span>Nhóm Zalo lớp</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formChannels.sms}
                    onChange={(e) => setFormChannels({ ...formChannels, sms: e.target.checked })}
                    className="rounded text-rose-600"
                  />
                  <span>SMS Phụ huynh</span>
                </label>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Tài liệu / File đính kèm</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={announcementFileInputRef}
                    onChange={handleAnnouncementFileUpload}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.gif,.mp4"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => announcementFileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>+ Tải lên tệp từ máy</span>
                  </button>
                </div>
              </div>

              {/* Upload area if empty */}
              {formFiles.length === 0 ? (
                <div
                  onClick={() => announcementFileInputRef.current?.click()}
                  className="rounded-2xl border border-dashed border-slate-300 p-4 text-center bg-slate-50/70 hover:bg-rose-50/40 hover:border-rose-300 transition-colors cursor-pointer"
                >
                  <Paperclip className="mx-auto h-5 w-5 text-slate-400 mb-1" />
                  <p className="text-xs font-bold text-slate-700">Nhấn để chọn tệp đính kèm</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hỗ trợ PDF, Word, Excel, Hình ảnh, Video, Tài liệu (Tối đa 20MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 mt-2">
                  <div className="flex flex-wrap gap-2">
                    {formFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="truncate max-w-[200px] font-medium">{file.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">({file.size})</span>
                        <button
                          type="button"
                          onClick={() => setFormFiles(formFiles.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer p-0.5"
                          title="Xóa tệp đính kèm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => announcementFileInputRef.current?.click()}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      + Thêm tệp khác
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </ModalLayout>
      )}

      {/* Confirm Delete Announcement Modal */}
      <ConfirmDeleteModal
        isOpen={!!announcementToDelete}
        title="Xác nhận xóa thông báo"
        itemName={announcementToDelete?.title}
        message="Thông báo này sẽ bị xóa vĩnh viễn khỏi danh sách thông báo gửi tới Phụ huynh."
        confirmText="Xóa thông báo"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteAnnouncement}
        onClose={() => setAnnouncementToDelete(null)}
      />

      {/* Confirm Delete Message For Me Modal */}
      <ConfirmDeleteModal
        isOpen={!!messageToDeleteForMe}
        title="Xóa tin nhắn ở phía tôi"
        itemName={
          messageToDeleteForMe?.msg.content
            ? messageToDeleteForMe.msg.content.length > 50
              ? `${messageToDeleteForMe.msg.content.substring(0, 50)}...`
              : messageToDeleteForMe.msg.content
            : messageToDeleteForMe?.msg.attachments?.[0]?.name
            ? `Tệp: ${messageToDeleteForMe.msg.attachments[0].name}`
            : 'Tin nhắn'
        }
        message="Tin nhắn này sẽ chỉ bị xóa và ẩn khỏi giao diện của bạn. Phía đối phương vẫn có thể xem tin nhắn này."
        confirmText="Xóa phía tôi"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteMessageForMe}
        onClose={() => setMessageToDeleteForMe(null)}
      />

      {/* Confirm Recall Message Modal */}
      <ConfirmDeleteModal
        isOpen={!!messageToRecall}
        title="Thu hồi tin nhắn"
        itemName={
          messageToRecall?.msg.content
            ? messageToRecall.msg.content.length > 50
              ? `${messageToRecall.msg.content.substring(0, 50)}...`
              : messageToRecall.msg.content
            : messageToRecall?.msg.attachments?.[0]?.name
            ? `Tệp: ${messageToRecall.msg.attachments[0].name}`
            : 'Tin nhắn'
        }
        message="Tin nhắn này sẽ được thu hồi đối với cả Giáo viên và Phụ huynh. Toàn bộ nội dung và tệp đính kèm sẽ được xóa bảo mật."
        confirmText="Thu hồi ngay"
        cancelText="Hủy bỏ"
        onConfirm={confirmRecallMessage}
        onClose={() => setMessageToRecall(null)}
      />

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
};
