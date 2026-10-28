/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Post, Comment, PostCategory, UserRole, UserAccount } from '../types';
import { initialPosts } from '../data/demoData';
import { tenantService } from './TenantService';
import { inAppNotificationService } from './InAppNotificationService';
import { authService } from './AuthService';
import { postRepositoryClient } from './PostRepositoryClient';
import { submissionService } from './SubmissionService';
import { parseDateToTimestamp } from './SchoolYearDateNormalizer';

export function parsePostDateToTimestamp(dateStr?: string | number | Date | null): number {
  return parseDateToTimestamp(dateStr);
}

class PostService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private posts: Post[] = [...initialPosts];
  private listeners: Array<() => void> = [];
  private isFetching: boolean = false;

  private deletedPostIds: Set<string> = new Set();

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadDeletedPostIds(this.activeTenantId);
    this.loadFromStorage(this.activeTenantId);
    this.fetchFromServer();

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadDeletedPostIds(nextTenantId);
        this.loadFromStorage(nextTenantId);
        this.notify();
        this.fetchFromServer();
      }
    });
  }

  private loadDeletedPostIds(tenantId: string): void {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const key = tenantService.getTenantStorageKey('deleted_post_ids', tId);
      const saved = localStorage.getItem(key);
      if (saved) {
        const arr = JSON.parse(saved);
        this.deletedPostIds = new Set(Array.isArray(arr) ? arr : []);
      } else {
        this.deletedPostIds = new Set();
      }
    } catch {
      this.deletedPostIds = new Set();
    }
  }

  private saveDeletedPostIds(tenantId?: string): void {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      const key = tenantService.getTenantStorageKey('deleted_post_ids', tId);
      localStorage.setItem(key, JSON.stringify(Array.from(this.deletedPostIds)));
    } catch {
      // ignore
    }
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadDeletedPostIds(this.activeTenantId);
    this.loadFromStorage(this.activeTenantId);
    this.notify();
    this.fetchFromServer();
  }

  public refresh(): void {
    this.fetchFromServer();
  }

  public async fetchFromServer(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      const res = await postRepositoryClient.getPosts();
      if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Filter out any posts that user explicitly deleted
        const serverPosts = res.data.filter((p: Post) => !this.deletedPostIds.has(p.id));
        const serverMap = new Map<string, Post>();
        serverPosts.forEach((p: Post) => serverMap.set(p.id, p));

        // Preserve local posts and merge, respecting local pin overrides
        const localMap = new Map<string, Post>();
        this.posts.forEach(p => {
          if (!this.deletedPostIds.has(p.id)) {
            localMap.set(p.id, p);
          }
        });

        const merged: Post[] = serverPosts.map((serverPost: Post) => {
          const localPost = localMap.get(serverPost.id);
          const authoritativePinned = serverPost.isPinned ?? serverPost.pinnedToOverview;
          const finalStatus = (localPost?.status === 'approved' || serverPost.status === 'approved')
            ? 'approved'
            : (localPost?.status === 'rejected' || serverPost.status === 'rejected')
              ? 'rejected'
              : (localPost?.status || serverPost.status || 'approved');
          if (localPost) {
            return {
              ...localPost,
              ...serverPost,
              status: finalStatus,
              isPinned: authoritativePinned !== undefined ? authoritativePinned : Boolean(localPost.isPinned || localPost.pinnedToOverview),
              pinnedToOverview: authoritativePinned !== undefined ? authoritativePinned : Boolean(localPost.pinnedToOverview || localPost.isPinned),
              reactions: localPost.reactions || serverPost.reactions,
              comments: (localPost.comments && localPost.comments.length >= (serverPost.comments?.length || 0)) ? localPost.comments : (serverPost.comments || [])
            };
          }
          return {
            ...serverPost,
            status: finalStatus,
            isPinned: Boolean(authoritativePinned),
            pinnedToOverview: Boolean(authoritativePinned)
          };
        });

        // Add local-only posts
        for (const [id, localPost] of localMap.entries()) {
          if (!serverMap.has(id)) {
            merged.push(localPost);
          }
        }

        this.posts = merged;
        this.saveToStorage();
        this.notify();
      }
    } catch (err) {
      console.warn('[PostService] Sync notice:', err);
    } finally {
      this.isFetching = false;
    }
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const key = tenantService.getTenantStorageKey('posts', tId);
      const saved = localStorage.getItem(key);
      if (saved) {
        this.posts = JSON.parse(saved);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacy = localStorage.getItem('kgcns_posts');
          if (legacy) {
            this.posts = JSON.parse(legacy);
            localStorage.setItem(key, legacy);
          } else {
            this.posts = [...initialPosts];
          }
        } else {
          this.posts = [
            {
              id: `post-welcome-${tId}`,
              authorId: 'teacher-01',
              authorName: tId === 'tenant-hoang-nam' ? 'Thầy Trần Hoàng Nam (GVCN)' : 'GVCN',
              authorRole: 'TEACHER',
              authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              category: 'Thông báo',
              title: 'Chào mừng các em học sinh đến với Không gian Chủ nhiệm Số!',
              content: 'Kênh thông tin chính thức của lớp học, kết nối Thầy/Cô, Học sinh và Phụ huynh.',
              images: [],
              pinnedToOverview: true,
              parentVisible: true,
              reactions: { like: [], love: [], applause: [], celebrate: [], idea: [] },
              comments: [],
              createdAt: '08:00 05/09/2025'
            }
          ];
        }
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('posts', tId), JSON.stringify(this.posts));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getAll(category: PostCategory = 'Tất cả', forRole: UserRole = 'TEACHER'): Post[] {
    const currentUser = authService.getCurrentUser();
    // Only published/approved posts appear on the public feed (pending posts are isolated to approval workflow, unless author is viewing)
    let list = this.posts.filter(p => {
      if (this.deletedPostIds.has(p.id)) return false;
      if (p.status === 'approved') return true;
      if (p.status === 'pending' || p.status === 'rejected') {
        // Author can view their own pending/rejected post on their personal feed
        return currentUser && (p.authorId === currentUser.id || p.authorId === currentUser.studentId);
      }
      return p.authorRole === 'TEACHER' || !p.requiresApproval;
    });
    if (forRole === 'PARENT') {
      list = list.filter(p => p.parentVisible);
    }
    if (category !== 'Tất cả') {
      list = list.filter(p => p.category === category);
    }
    // Sort strictly: pinned posts first, then newest posted time first
    return [...list].sort((a, b) => {
      const aPinned = Boolean(a.isPinned || a.pinnedToOverview || a.pinned);
      const bPinned = Boolean(b.isPinned || b.pinnedToOverview || b.pinned);
      if (aPinned !== bPinned) {
        return bPinned ? 1 : -1;
      }
      if (aPinned && bPinned) {
        if (typeof a.pinOrder === 'number' && typeof b.pinOrder === 'number' && a.pinOrder !== b.pinOrder) {
          return a.pinOrder - b.pinOrder;
        }
        if (a.pinnedAt && b.pinnedAt) {
          const pinDiff = parseDateToTimestamp(b.pinnedAt) - parseDateToTimestamp(a.pinnedAt);
          if (pinDiff !== 0) return pinDiff;
        }
      }
      const dateA = a.publishedAt || a.postedAt || a.createdAt;
      const dateB = b.publishedAt || b.postedAt || b.createdAt;
      const diff = parseDateToTimestamp(dateB) - parseDateToTimestamp(dateA);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  public getPostsForRole(role: UserRole = 'TEACHER'): Post[] {
    return this.getAll('Tất cả', role);
  }

  public getPinnedPosts(): Post[] {
    return this.posts
      .filter(p => !this.deletedPostIds.has(p.id))
      .filter(p => (p.status === 'approved' || !p.status) && (p.isPinned || p.pinnedToOverview || p.pinned))
      .sort((a, b) => {
        if (typeof a.pinOrder === 'number' && typeof b.pinOrder === 'number' && a.pinOrder !== b.pinOrder) {
          return a.pinOrder - b.pinOrder;
        }
        if (a.pinnedAt && b.pinnedAt) {
          const pinDiff = parseDateToTimestamp(b.pinnedAt) - parseDateToTimestamp(a.pinnedAt);
          if (pinDiff !== 0) return pinDiff;
        }
        const dateA = a.publishedAt || a.postedAt || a.createdAt;
        const dateB = b.publishedAt || b.postedAt || b.createdAt;
        const diff = parseDateToTimestamp(dateB) - parseDateToTimestamp(dateA);
        if (diff !== 0) return diff;
        return (b.id || '').localeCompare(a.id || '');
      });
  }

  public getUnpinnedPosts(category: PostCategory = 'Tất cả', forRole: UserRole = 'TEACHER'): Post[] {
    let list = this.posts.filter(p => 
      !this.deletedPostIds.has(p.id) &&
      (p.status === 'approved' || (!p.status && p.authorRole === 'TEACHER') || (!p.status && !p.requiresApproval)) &&
      !(p.isPinned || p.pinnedToOverview || p.pinned)
    );
    if (forRole === 'PARENT') {
      list = list.filter(p => p.parentVisible);
    }
    if (category !== 'Tất cả') {
      list = list.filter(p => p.category === category);
    }
    return [...list].sort((a, b) => {
      const dateA = a.publishedAt || a.postedAt || a.createdAt;
      const dateB = b.publishedAt || b.postedAt || b.createdAt;
      const diff = parseDateToTimestamp(dateB) - parseDateToTimestamp(dateA);
      if (diff !== 0) return diff;
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  public getPostById(id: string): Post | undefined {
    return this.posts.find(p => p.id === id);
  }

  public getPendingPosts(): Post[] {
    return this.posts.filter(p => p.status === 'pending');
  }

  public createPost(post: Omit<Post, 'id' | 'createdAt' | 'reactions' | 'comments'>): Post {
    const authorUser = authService.getCurrentUser();
    if (authorUser.role === 'PARENT') {
      throw new Error('403 Forbidden: Phụ huynh chỉ có quyền xem Bảng tin ở chế độ Read-Only, không được tạo bài đăng.');
    }

    const isTeacher = authorUser.role === 'TEACHER' || authorUser.role === 'SUPER_ADMIN';
    const isApprovalRequired = !isTeacher || post.requiresApproval === true || post.status === 'pending';
    const postStatus: 'pending' | 'approved' = isApprovalRequired ? 'pending' : 'approved';

    const newPost: Post = {
      authorId: authorUser.id,
      authorName: authorUser.name,
      authorAvatar: authorUser.avatar,
      authorRole: authorUser.role,
      category: 'Thông báo',
      content: '',
      parentVisible: true,
      ...post,
      id: `post-${Date.now()}`,
      status: postStatus,
      requiresApproval: isApprovalRequired,
      reactions: {
        like: [],
        love: [],
        applause: [],
        celebrate: [],
        idea: []
      },
      comments: [],
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
    };

    if (isApprovalRequired) {
      // Create approval submission for GVCN in SubmissionService
      try {
        const result = submissionService.createSubmission({
          studentId: authorUser.studentId || authorUser.id,
          studentName: authorUser.name || 'Học viên',
          studentGroup: (authorUser as any).group || 1,
          submissionType: 'post_approval',
          category: `Bảng tin: ${newPost.category || 'Thông báo'}`,
          description: newPost.title ? `[${newPost.title}] ${newPost.content}` : newPost.content,
          evidence: (newPost as any).attachments || [],
          parentVisible: newPost.parentVisible,
          postId: newPost.id,
          originalData: { postId: newPost.id }
        }, authorUser);

        const subId = result.submission?.id || `sub-post-${newPost.id}`;
        newPost.submissionId = subId;

        inAppNotificationService.addNotification({
          eventId: `POST_PENDING:${newPost.id}:${Date.now()}`,
          tenantId: this.activeTenantId,
          workspaceId: this.activeTenantId,
          classId: '11A1',
          title: '📝 Bài đăng mới cần GVCN duyệt',
          desc: `${authorUser.name} vừa gửi bài đăng "${newPost.title || newPost.category}" chờ phê duyệt.`,
          category: 'post' as any,
          targetRoles: ['TEACHER'],
          targetModule: 'approvals',
          targetTab: 'pending',
          meta: {
            postId: newPost.id,
            submissionId: subId,
            authorName: authorUser.name,
            title: newPost.title
          },
          type: 'warning'
        }, authorUser);
      } catch (err) {
        console.warn('[PostService] Error registering approval submission:', err);
      }
    }

    this.posts.unshift(newPost);
    this.saveToStorage();
    this.notify();

    // Persist to server backend immediately (so GVCN and SQLite database have record of pending/approved post)
    postRepositoryClient.createPost({
      id: newPost.id,
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      images: newPost.images,
      attachments: (newPost as any).attachments || [],
      pinnedToOverview: newPost.pinnedToOverview,
      parentVisible: newPost.parentVisible,
      authorId: newPost.authorId,
      authorName: authorUser.name,
      authorRole: authorUser.role,
      authorAvatar: authorUser.avatar,
      status: newPost.status
    }).catch(err => console.warn('[PostService] Server create error:', err));

    if (!isApprovalRequired) {
      // Trigger in-app notification to class members only for published posts
      inAppNotificationService.notifyPostPublished(newPost, authorUser);
    }

    return newPost;
  }

  public findPostForSubmission(sub: any): Post | undefined {
    if (!sub) return undefined;

    // 1. Check direct postId in sub
    const directPostId = sub.originalData?.postId || sub.postId;
    if (directPostId) {
      const found = this.posts.find(p => p.id === directPostId);
      if (found) return found;
    }

    // 2. Check by submissionId matching post.submissionId
    if (sub.id) {
      const bySubId = this.posts.find(p => p.submissionId === sub.id || p.id === `post-${sub.id}` || p.id === `post-${sub.id.replace('sub-', '')}`);
      if (bySubId) return bySubId;
    }

    // 3. Match by student and pending status
    const isPostSub = sub.submissionType === 'post_approval' || (typeof sub.category === 'string' && sub.category.startsWith('Bảng tin'));
    if (isPostSub) {
      // Find candidate matching author and pending status
      const candidate = this.posts.find(p => 
        (p.authorId === sub.studentId || p.authorId === sub.proposedById || p.authorName === sub.studentName) &&
        (p.status === 'pending' || !p.status)
      );
      if (candidate) return candidate;

      // Also check any post with matching content
      const desc = sub.description || '';
      const byContent = this.posts.find(p => 
        (p.authorId === sub.studentId || p.authorId === sub.proposedById) &&
        (desc.includes(p.content) || (p.title && desc.includes(p.title)))
      );
      if (byContent) return byContent;

      // 4. Restore post from submission data if not present locally
      return this.restorePostFromSubmission(sub);
    }

    return undefined;
  }

  public restorePostFromSubmission(sub: any): Post {
    let title = 'Bài đăng học viên';
    let content = sub.description || '';
    if (content.startsWith('[') && content.includes(']')) {
      const closeIdx = content.indexOf(']');
      title = content.substring(1, closeIdx).trim();
      content = content.substring(closeIdx + 1).trim();
    }

    let category: PostCategory = 'Thông báo';
    if (typeof sub.category === 'string') {
      const cleanCat = sub.category.replace('Bảng tin:', '').trim();
      if (['Thông báo', 'Học tập', 'Khen thưởng', 'Phong trào', 'Nhắc nhở'].includes(cleanCat)) {
        category = cleanCat as PostCategory;
      }
    }

    const postId = sub.originalData?.postId || sub.postId || `post-${sub.id ? sub.id.replace('sub-', '') : Date.now()}`;
    const newPost: Post = {
      id: postId,
      submissionId: sub.id,
      authorId: sub.studentId || sub.proposedById || 'student',
      authorName: sub.studentName || sub.proposedBy || 'Học viên',
      authorRole: sub.proposedByRole || 'STUDENT',
      authorAvatar: sub.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      category,
      title,
      content,
      images: [],
      attachments: sub.evidence || sub.evidenceFiles || [],
      parentVisible: sub.parentVisible !== undefined ? sub.parentVisible : true,
      status: 'pending',
      requiresApproval: true,
      reactions: { like: [], love: [], applause: [], celebrate: [], idea: [] },
      comments: [],
      createdAt: sub.proposedAt || new Date().toLocaleDateString('vi-VN')
    };

    if (!sub.originalData) sub.originalData = {};
    sub.originalData.postId = newPost.id;
    sub.postId = newPost.id;

    const existingIdx = this.posts.findIndex(p => p.id === newPost.id);
    if (existingIdx >= 0) {
      return this.posts[existingIdx];
    }

    this.posts.unshift(newPost);
    this.saveToStorage();
    return newPost;
  }

  public approvePost(id: string, teacher: UserAccount): Post | null {
    const post = this.posts.find(p => p.id === id);
    if (!post) return null;

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    post.status = 'approved';
    post.reviewedBy = teacher.name;
    post.reviewedAt = formattedDate;

    this.saveToStorage();
    this.notify();

    // Persist to server backend now that it's approved
    postRepositoryClient.approvePost(post.id, {
      ...post,
      status: 'approved',
      reviewedBy: teacher.name,
      reviewedAt: formattedDate
    }).catch(err => {
      console.warn('[PostService] Server approve notice, upserting post:', err);
      postRepositoryClient.createPost({
        ...post,
        status: 'approved',
        reviewedBy: teacher.name,
        reviewedAt: formattedDate
      }).catch(e => console.warn('[PostService] Server create fallback notice:', e));
    });

    // Notify class members
    inAppNotificationService.notifyPostPublished(post, teacher);

    return post;
  }

  public rejectPost(id: string, teacher: UserAccount, reason?: string, note?: string): Post | null {
    const post = this.posts.find(p => p.id === id);
    if (!post) return null;

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    post.status = 'rejected';
    post.rejectionReason = reason ? (note ? `${reason}: ${note}` : reason) : note;
    post.reviewedBy = teacher.name;
    post.reviewedAt = formattedDate;

    this.saveToStorage();
    this.notify();

    postRepositoryClient.rejectPost(post.id, post.rejectionReason).catch(err => {
      console.warn('[PostService] Server reject notice:', err);
    });

    return post;
  }

  public editAndApprovePost(
    id: string,
    teacher: UserAccount,
    patch: { title?: string; content?: string; category?: PostCategory; parentVisible?: boolean; attachments?: any[] }
  ): Post | null {
    const post = this.posts.find(p => p.id === id);
    if (!post) return null;

    const now = new Date();
    const formattedDate = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    if (patch.title !== undefined) post.title = patch.title;
    if (patch.content !== undefined) post.content = patch.content;
    if (patch.category !== undefined) post.category = patch.category;
    if (patch.parentVisible !== undefined) post.parentVisible = patch.parentVisible;
    if (patch.attachments !== undefined) post.attachments = patch.attachments;

    post.status = 'approved';
    post.reviewedBy = teacher.name;
    post.reviewedAt = formattedDate;

    this.saveToStorage();
    this.notify();

    // Persist to server
    postRepositoryClient.approvePost(post.id, {
      ...post,
      status: 'approved',
      reviewedBy: teacher.name,
      reviewedAt: formattedDate
    }).catch(err => {
      postRepositoryClient.createPost({
        ...post,
        status: 'approved',
        reviewedBy: teacher.name,
        reviewedAt: formattedDate
      }).catch(e => console.warn('[PostService] Server create fallback notice:', e));
    });

    inAppNotificationService.notifyPostPublished(post, teacher);
    return post;
  }

  public deletePost(id: string) {
    const currentUser = authService.getCurrentUser();
    if (currentUser.role === 'PARENT') {
      return;
    }
    this.deletedPostIds.add(id);
    this.saveDeletedPostIds();
    this.posts = this.posts.filter(p => p.id !== id);
    this.saveToStorage();
    postRepositoryClient.deletePost(id).catch(err => console.warn('[PostService] Server delete error:', err));
  }

  public togglePin(id: string) {
    const currentUser = authService.getCurrentUser();
    if (currentUser.role === 'PARENT') {
      return;
    }
    let targetNextPinned = false;
    let targetPost: Post | undefined;
    this.posts = this.posts.map(p => {
      if (p.id === id) {
        const nextPinned = !(p.isPinned || p.pinnedToOverview);
        targetNextPinned = nextPinned;
        targetPost = {
          ...p,
          isPinned: nextPinned,
          pinnedToOverview: nextPinned
        };
        return targetPost;
      }
      return p;
    });
    this.saveToStorage();
    postRepositoryClient.togglePin(id, targetNextPinned, targetPost).catch(err => {
      console.warn('[PostService] Error syncing pin status to server:', err);
    });
  }

  public unpinPost(id: string) {
    const currentUser = authService.getCurrentUser();
    if (currentUser.role === 'PARENT') {
      return;
    }
    let targetPost: Post | undefined;
    this.posts = this.posts.map(p => {
      if (p.id === id) {
        targetPost = {
          ...p,
          isPinned: false,
          pinnedToOverview: false
        };
        return targetPost;
      }
      return p;
    });
    this.saveToStorage();
    postRepositoryClient.togglePin(id, false, targetPost).catch(err => {
      console.warn('[PostService] Error syncing unpin status to server:', err);
    });
  }

  public toggleParentVisible(id: string) {
    const currentUser = authService.getCurrentUser();
    if (currentUser.role === 'PARENT') {
      return;
    }
    this.posts = this.posts.map(p => p.id === id ? { ...p, parentVisible: !p.parentVisible } : p);
    this.saveToStorage();
  }

  public toggleReaction(postId: string, reactionType: keyof Post['reactions'], userId: string) {
    const currentUser = authService.getCurrentUser();
    if (currentUser.role === 'PARENT') {
      return; // Read-Only for PARENT
    }
    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;
      const currentList = p.reactions[reactionType] || [];
      const hasReacted = currentList.includes(userId);
      const updatedList = hasReacted
        ? currentList.filter(id => id !== userId)
        : [...currentList, userId];

      return {
        ...p,
        reactions: {
          ...p.reactions,
          [reactionType]: updatedList
        }
      };
    });
    this.saveToStorage();

    // Persist reaction to server backend
    postRepositoryClient.toggleReaction(postId, reactionType as string)
      .catch(err => console.warn('[PostService] Server reaction error:', err));
  }

  public addComment(postId: string, comment: Omit<Comment, 'id' | 'postId' | 'createdAt'>): Comment {
    const currentUser = authService.getCurrentUser();
    if (currentUser.role === 'PARENT') {
      throw new Error('403 Forbidden: Phụ huynh chỉ có quyền xem Bảng tin ở chế độ Read-Only, không được gửi bình luận.');
    }
    const targetPost = this.posts.find(p => p.id === postId);

    const newComment: Comment = {
      ...comment,
      id: `cmt-${Date.now()}`,
      postId,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
    };

    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: [...p.comments, newComment]
      };
    });

    this.saveToStorage();

    // Persist comment to server backend
    postRepositoryClient.addComment(postId, {
      content: comment.content,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar
    }).catch(err => console.warn('[PostService] Server comment error:', err));

    // Trigger in-app notification
    if (targetPost) {
      // If teacher is replying on a post where students commented
      const otherComments = (targetPost.comments || []).filter(c => c.authorId !== currentUser.id);
      const lastOtherComment = otherComments[otherComments.length - 1];

      if (currentUser.role === 'TEACHER' && lastOtherComment && lastOtherComment.authorId !== targetPost.authorId) {
        inAppNotificationService.notifyPostReply(targetPost, lastOtherComment, newComment, currentUser);
      } else {
        inAppNotificationService.notifyPostComment(targetPost, newComment, currentUser);
      }
    }

    return newComment;
  }

  public deleteComment(postId: string, commentId: string) {
    const currentUser = authService.getCurrentUser();
    if (currentUser.role === 'PARENT') {
      return;
    }
    this.posts = this.posts.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: p.comments.filter(c => c.id !== commentId)
      };
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

export const postService = new PostService();
