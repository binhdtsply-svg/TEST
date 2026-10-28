/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlbumPost, Comment, UserRole, UserAccount, AttachedFile } from '../types';
import { initialAlbumPosts } from '../data/demoData';
import { auditService } from './AuditService';
import { tenantService } from './TenantService';
import { parseDateToTimestamp } from './SchoolYearDateNormalizer';

// Standard demo posts with rich media to showcase Facebook/Zalo layout
const defaultSeedPosts: AlbumPost[] = [
  {
    id: 'alb-1',
    organizationId: 'org-lhp',
    classId: '11A1',
    authorId: 'tc-01',
    authorName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    authorRole: 'TEACHER',
    title: 'Khoảnh khắc Rực rỡ Ngày Khai giảng & Vinh danh 20/11',
    content: 'Lưu giữ những nụ cười trong trẻo và thanh xuân tuyệt đẹp của tập thể 11A1 thân yêu. Chúc các em luôn giữ vững ngọn lửa nhiệt huyết, đam mê học tập và tình đoàn kết gắn bó này! 🎓✨',
    createdAt: '20/11/2025 14:30',
    tags: ['#11A1Family', '#NhoMaiThanhXuan', '#LeHongPhong', '#VinhDanh20-11'],
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
        name: 'Tập thể 11A1 trong lễ vinh danh',
        caption: 'Toàn thể lớp 11A1 trong tà áo dài và đồng phục chỉnh tề'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        name: 'Tiết mục múa văn nghệ',
        caption: 'Tiết mục múa đoạt giải Nhất cấp trường'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80',
        name: 'Nhóm bạn rạng rỡ sau buổi lễ',
        caption: 'Gương mặt hân hoan nhận thưởng của ban cán sự'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
        name: 'Cô trò chụp hình lưu niệm',
        caption: 'Kỷ niệm khó quên ngày 20/11'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80'
    ],
    reactions: {
      love: ['hs-01', 'hs-02', 'hs-05', 'hs-06', 'hs-07', 'hs-08', 'hs-09', 'hs-10'],
      applause: ['hs-03', 'hs-04', 'hs-11', 'hs-12'],
      plant: ['hs-13', 'hs-14'],
      like: []
    },
    commentsCount: 2,
    sharesCount: 5,
    visibility: 'public',
    isPinned: true,
    status: 'published',
    parentVisible: true,
    createdBy: 'tc-01',
    comments: [
      {
        id: 'ac-1',
        postId: 'alb-1',
        authorId: 'hs-01',
        authorName: 'Nguyễn Gia Huy',
        authorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
        authorRole: 'CLASS_OFFICER',
        content: 'Ảnh cô chụp lớp đẹp lung linh và sắc nét luôn ạ! Chúng em cảm ơn Cô rất nhiều ❤️',
        createdAt: '20/11/2025 15:30'
      },
      {
        id: 'ac-2',
        postId: 'alb-1',
        authorId: 'tc-01',
        authorName: 'Cô Nguyễn Thị Mai Lan (GVCN)',
        authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        authorRole: 'TEACHER',
        parentCommentId: 'ac-1',
        content: 'Cô chúc cả lớp mình luôn đoàn kết và giữ mãi nụ cười tỏa sáng thế này nhé!',
        createdAt: '20/11/2025 15:45'
      }
    ]
  },
  {
    id: 'alb-2',
    organizationId: 'org-lhp',
    classId: '11A1',
    authorId: 'hs-01',
    authorName: 'Nguyễn Gia Huy (Lớp trưởng)',
    authorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    authorRole: 'CLASS_OFFICER',
    title: 'Hội thao Chào mừng Ngày Thành lập Đoàn 26/3',
    content: 'Đội bóng đá và kéo co 11A1 đã thi đấu hết mình, cống hiến những pha bóng kịch tính và xuất sắc giành Huy chương Bạc toàn khối! Cảm ơn toàn thể các bạn cổ động viên nhiệt thành!',
    createdAt: '24/03/2026 11:15',
    tags: ['#HoiThao26-3', '#DoanKet11A1', '#HuyChuongBac'],
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
        name: 'Trận chung kết bóng đá',
        caption: 'Pha sút phạt đẹp mắt của lớp 11A1'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
        name: 'Toàn đội nâng cúp',
        caption: 'Giây phút nhận cúp và huy chương'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80',
        name: 'Khán đài cổ vũ cuồng nhiệt',
        caption: 'Cổ động viên 11A1 cháy hết mình'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80'
    ],
    reactions: {
      love: ['tc-01', 'hs-02', 'hs-03', 'hs-04'],
      applause: ['hs-05', 'hs-06', 'hs-07', 'hs-08', 'hs-09', 'hs-10', 'hs-11', 'hs-12'],
      plant: ['hs-13'],
      like: []
    },
    commentsCount: 1,
    sharesCount: 3,
    visibility: 'public',
    isPinned: false,
    status: 'published',
    parentVisible: true,
    createdBy: 'hs-01',
    comments: [
      {
        id: 'ac-3',
        postId: 'alb-2',
        authorId: 'hs-02',
        authorName: 'Trần Phương Linh',
        authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        authorRole: 'STUDENT',
        content: 'Đội bóng đá nam đá quá đỉnh luôn, tự hào 11A1! 👏🏆',
        createdAt: '24/03/2026 12:00'
      }
    ]
  },
  {
    id: 'alb-3',
    organizationId: 'org-lhp',
    classId: '11A1',
    authorId: 'hs-04',
    authorName: 'Phạm Minh Đức',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    authorRole: 'STUDENT',
    title: 'Hành trình Trải nghiệm & Hoạt động Ngoại khóa Địa đạo Củ Chi',
    content: 'Chuyến đi học tập lịch sử thực tế vô cùng bổ ích và ý nghĩa. Cả lớp đã có những kỷ niệm gắn kết, cùng tham gia các trò chơi teambuilding và thưởng thức ẩm thực truyền thống.',
    createdAt: '18/11/2025 17:20',
    tags: ['#NgoaiKhoaCuChi', '#HocTapTraiNghiem', '#11A1Tour'],
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
        name: 'Hoạt động cắm trại',
        caption: 'Không gian sinh hoạt tập thể ngoài trời'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
        name: 'Nhóm học sinh trải nghiệm',
        caption: 'Nụ cười sau chặng đường hành quân'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80'
    ],
    reactions: {
      love: ['tc-01', 'hs-01', 'hs-02', 'hs-03'],
      applause: ['hs-05', 'hs-06'],
      plant: ['hs-07', 'hs-08', 'hs-09'],
      like: []
    },
    commentsCount: 0,
    sharesCount: 1,
    visibility: 'public',
    isPinned: false,
    status: 'published',
    parentVisible: true,
    createdBy: 'hs-04',
    comments: []
  }
];

class AlbumService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private posts: AlbumPost[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
      }
    });
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.notify();
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const key = tenantService.getTenantStorageKey('album_posts_v2', tId);
      const saved = localStorage.getItem(key);
      if (saved) {
        this.posts = JSON.parse(saved);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacy = localStorage.getItem('kgcns_album_posts_v2');
          if (legacy) {
            this.posts = JSON.parse(legacy);
            localStorage.setItem(key, legacy);
          } else {
            this.posts = [...defaultSeedPosts];
          }
        } else {
          this.posts = [];
        }
      }
    } catch {
      this.posts = tId === 'tenant-lan-nguyen' ? [...defaultSeedPosts] : [];
    }
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('album_posts_v2', tId), JSON.stringify(this.posts));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getAll(userRole: UserRole = 'TEACHER', tagFilter?: string): AlbumPost[] {
    let list = this.posts;

    // Filter by role permissions
    if (userRole === 'PARENT') {
      list = list.filter(p => p.parentVisible);
    }

    if (tagFilter && tagFilter !== 'all') {
      list = list.filter(p => 
        (p.tags && p.tags.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()))) ||
        p.title.toLowerCase().includes(tagFilter.toLowerCase())
      );
    }

    // Sort: Pinned first, then newest
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const diff = parseDateToTimestamp(b.createdAt) - parseDateToTimestamp(a.createdAt);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  public getPostById(id: string): AlbumPost | undefined {
    return this.posts.find(p => p.id === id);
  }

  public createPost(
    payload: {
      title: string;
      content: string;
      tags?: string[];
      media: Array<{ type: 'image' | 'video'; url: string; name?: string; caption?: string }>;
      attachments?: AttachedFile[];
      parentVisible?: boolean;
      isPinned?: boolean;
    },
    user: UserAccount
  ): { success: boolean; post?: AlbumPost; error?: string } {
    // 1. Validation limits
    const imageCount = payload.media.filter(m => m.type === 'image').length;
    const videoCount = payload.media.filter(m => m.type === 'video').length;

    if (imageCount > 15) {
      return { success: false, error: 'Chỉ được tải lên tối đa 15 hình ảnh trong một bài đăng!' };
    }
    if (videoCount > 1) {
      return { success: false, error: 'Chỉ được đính kèm tối đa 1 video trong một bài đăng!' };
    }
    if (!payload.title.trim() && !payload.content.trim() && payload.media.length === 0) {
      return { success: false, error: 'Vui lòng nhập nội dung hoặc đính kèm ảnh/video cho bài đăng!' };
    }

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    const newPost: AlbumPost = {
      id: `alb-${Date.now()}`,
      organizationId: 'org-lhp',
      classId: '11A1',
      authorId: user.id,
      authorName: user.name || (user.role === 'TEACHER' ? 'Cô Nguyễn Thị Mai Lan (GVCN)' : 'Học viên 11A1'),
      authorAvatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      authorRole: user.role,
      title: payload.title.trim() || 'Khoảnh khắc kỷ niệm',
      content: payload.content.trim(),
      createdAt: formattedDate,
      tags: payload.tags || ['#KỷNiệm11A1'],
      media: payload.media,
      images: payload.media.filter(m => m.type === 'image').map(m => m.url),
      videoUrl: payload.media.find(m => m.type === 'video')?.url,
      attachments: payload.attachments || [],
      reactions: {
        love: [],
        applause: [],
        plant: [],
        like: []
      },
      commentsCount: 0,
      sharesCount: 0,
      visibility: 'public',
      isPinned: user.role === 'TEACHER' ? (payload.isPinned || false) : false,
      status: 'published',
      parentVisible: payload.parentVisible !== undefined ? payload.parentVisible : true,
      createdBy: user.id,
      comments: []
    };

    this.posts.unshift(newPost);
    this.saveToStorage();

    auditService.logEvent(
      'ALBUM_POST_CREATED',
      user,
      newPost.title,
      `Đăng bài Album kỷ niệm với ${newPost.media.length} tệp phương tiện`,
      { targetId: newPost.id }
    );

    return { success: true, post: newPost };
  }

  public updatePost(
    postId: string,
    updates: Partial<AlbumPost>,
    user: UserAccount
  ): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Không tìm thấy bài đăng!' };

    // Permission check: Teacher can edit any, student can edit only own
    if (user.role !== 'TEACHER' && post.authorId !== user.id) {
      return { success: false, error: 'Bạn không có quyền chỉnh sửa bài viết của người khác!' };
    }

    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        ...updates,
        updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
      };
    });

    this.saveToStorage();
    return { success: true };
  }

  public deletePost(postId: string, user: UserAccount): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Bài viết không tồn tại!' };

    // Teacher can delete any inappropriate post, students can only delete their own
    if (user.role !== 'TEACHER' && post.authorId !== user.id) {
      return { success: false, error: 'Chỉ GVCN hoặc chính tác giả mới có quyền xóa bài viết này!' };
    }

    this.posts = this.posts.filter(p => p.id !== postId);
    this.saveToStorage();

    auditService.logEvent(
      'ALBUM_POST_DELETED',
      user,
      post.title,
      `Xóa bài đăng Album (${post.authorName})`,
      { targetId: postId }
    );

    return { success: true };
  }

  public togglePin(postId: string, user: UserAccount): { success: boolean; error?: string } {
    if (user.role !== 'TEACHER') {
      return { success: false, error: 'Chỉ GVCN mới có quyền ghim bài viết!' };
    }

    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;
      return { ...p, isPinned: !p.isPinned };
    });

    this.saveToStorage();
    return { success: true };
  }

  // Tương tác Reaction: 1 reaction active per user, can switch reaction cleanly
  public toggleReaction(
    postId: string,
    reactionType: 'love' | 'applause' | 'plant',
    user: UserAccount
  ) {
    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;

      const userId = user.id;
      const currentLove = p.reactions.love || [];
      const currentApplause = p.reactions.applause || [];
      const currentPlant = p.reactions.plant || [];

      const wasLove = currentLove.includes(userId);
      const wasApplause = currentApplause.includes(userId);
      const wasPlant = currentPlant.includes(userId);

      // Clear previous reaction from all types
      let newLove = currentLove.filter(id => id !== userId);
      let newApplause = currentApplause.filter(id => id !== userId);
      let newPlant = currentPlant.filter(id => id !== userId);

      // If user clicked the same reaction they had, it's now removed (toggled off)
      // Otherwise, add to the selected reactionType
      if (reactionType === 'love' && !wasLove) {
        newLove.push(userId);
      } else if (reactionType === 'applause' && !wasApplause) {
        newApplause.push(userId);
      } else if (reactionType === 'plant' && !wasPlant) {
        newPlant.push(userId);
      }

      return {
        ...p,
        reactions: {
          ...p.reactions,
          love: newLove,
          applause: newApplause,
          plant: newPlant
        }
      };
    });

    this.saveToStorage();
  }

  // Bình luận thực tế với hỗ trợ Trả lời (Nested replies)
  public addComment(
    postId: string,
    content: string,
    user: UserAccount,
    parentCommentId?: string
  ): { success: boolean; comment?: Comment; error?: string } {
    if (!content.trim()) {
      return { success: false, error: 'Nội dung bình luận không được để trống!' };
    }

    const newComment: Comment = {
      id: `acmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      authorId: user.id,
      authorName: user.name || 'Thành viên lớp',
      authorAvatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      authorRole: user.role,
      content: content.trim(),
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
      parentCommentId,
      status: 'active'
    };

    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;
      const allComments = [...(p.comments || []), newComment];
      return {
        ...p,
        comments: allComments,
        commentsCount: allComments.length
      };
    });

    this.saveToStorage();

    auditService.logEvent(
      'COMMENT_CREATED',
      user,
      `Bình luận bài viết ${postId}`,
      content.substring(0, 80),
      { targetId: postId, commentId: newComment.id }
    );

    return { success: true, comment: newComment };
  }

  public deleteComment(postId: string, commentId: string, user: UserAccount): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Bài viết không tồn tại!' };

    const comment = post.comments?.find(c => c.id === commentId);
    if (!comment) return { success: false, error: 'Bình luận không tồn tại!' };

    // Teacher can delete ANY comment; student can only delete their own comment
    if (user.role !== 'TEACHER' && comment.authorId !== user.id) {
      return { success: false, error: 'Bạn không có quyền xóa bình luận của người khác!' };
    }

    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;
      // Filter out this comment and any child replies
      const remaining = (p.comments || []).filter(c => c.id !== commentId && c.parentCommentId !== commentId);
      return {
        ...p,
        comments: remaining,
        commentsCount: remaining.length
      };
    });

    this.saveToStorage();

    auditService.logEvent(
      'COMMENT_DELETED',
      user,
      `Xóa bình luận bài viết ${postId}`,
      `Bình luận của ${comment.authorName}`,
      { targetId: postId, commentId }
    );

    return { success: true };
  }

  public incrementShareCount(postId: string) {
    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;
      return { ...p, sharesCount: (p.sharesCount || 0) + 1 };
    });
    this.saveToStorage();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const albumService = new AlbumService();
