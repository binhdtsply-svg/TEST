import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../auth/middleware';
import { postRepository, PostRow } from '../repositories/PostRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { eventHub } from '../events/EventHub';

const router = Router();

router.use(authenticateToken);

// 1. GET /api/v1/posts - List posts with role filtering
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isParent = user.role === 'PARENT';
  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const rows = postRepository.getPosts(user.tenantId, isParent);

  // Non-teachers should only see approved posts OR their own pending submissions
  const filteredRows = rows.filter(r => {
    const postStatus = (r as any).status || 'approved';
    if (isTeacher) return true;
    if (postStatus === 'approved') return true;
    if (r.author_id === user.userId) return true; // Student author can view their own pending post
    return false;
  });

  return res.json({
    success: true,
    data: filteredRows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      authorId: r.author_id,
      authorName: r.author_name,
      authorRole: r.author_role,
      authorAvatar: r.author_avatar,
      category: r.category,
      title: r.title,
      content: r.content,
      images: JSON.parse(r.images_json || '[]'),
      attachments: JSON.parse(r.attachments_json || '[]'),
      isPinned: Boolean(r.pinned_to_overview),
      pinnedToOverview: Boolean(r.pinned_to_overview),
      parentVisible: Boolean(r.parent_visible),
      reactions: JSON.parse(r.reactions_json || '{"like":[],"love":[],"applause":[],"celebrate":[],"idea":[]}'),
      comments: JSON.parse(r.comments_json || '[]'),
      status: (r as any).status || 'approved',
      reviewedBy: (r as any).reviewed_by || null,
      reviewedAt: (r as any).reviewed_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  });
});

// 2. POST /api/v1/posts - Create new post (FORBIDDEN for PARENT)
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (user.role === 'PARENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_FORBIDDEN_PARENT',
      message: '403 Forbidden: Phụ huynh chỉ có quyền xem Bảng tin ở chế độ Read-Only, không được tạo bài đăng.'
    });
  }

  const isTeacher = user.role === 'TEACHER' || user.role === 'SUPER_ADMIN';
  const isOfficer = user.role === 'CLASS_OFFICER';

  const body = req.body;
  if (!body.title || !body.content) {
    return res.status(400).json({
      success: false,
      errorCode: 'INVALID_PAYLOAD',
      message: 'Tiêu đề và nội dung bài viết không được để trống.'
    });
  }

  const postId = body.id || `post_${Date.now()}`;
  const now = new Date().toISOString();

  // If created by student, enforce status = 'pending' unless teacher is approving/creating
  let initialStatus = 'approved';
  if (isTeacher) {
    initialStatus = body.status || 'approved';
  } else if (isOfficer) {
    initialStatus = body.status || 'approved';
  } else {
    // Student creation requires GVCN approval
    initialStatus = 'pending';
  }

  const authorId = body.authorId || user.userId;
  const authorName = body.authorName || (isTeacher ? 'GVCN' : isOfficer ? 'Cán sự lớp' : 'Học viên');
  const authorRole = body.authorRole || user.role;

  const record: PostRow = {
    id: postId,
    tenant_id: user.tenantId,
    author_id: authorId,
    author_name: authorName,
    author_role: authorRole,
    author_avatar: body.authorAvatar || null,
    category: body.category || 'Thông báo',
    title: body.title,
    content: body.content,
    images_json: JSON.stringify(body.images || []),
    attachments_json: JSON.stringify(body.attachments || []),
    pinned_to_overview: body.pinnedToOverview || body.isPinned ? 1 : 0,
    parent_visible: body.parentVisible !== undefined ? (body.parentVisible ? 1 : 0) : 1,
    reactions_json: JSON.stringify(body.reactions || { like: [], love: [], applause: [], celebrate: [], idea: [] }),
    comments_json: JSON.stringify(body.comments || []),
    status: initialStatus,
    reviewed_by: body.reviewedBy || (initialStatus === 'approved' && isTeacher ? (user.fullName || 'GVCN') : null),
    reviewed_at: body.reviewedAt || (initialStatus === 'approved' && isTeacher ? now : null),
    created_at: body.createdAt || now,
    updated_at: now
  };

  const saved = postRepository.upsertPost(record);

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: initialStatus === 'approved' ? 'POST_CREATED' : 'POST_PENDING_SUBMITTED',
    targetType: 'POST',
    targetId: postId,
    details: `${user.role} gửi bài viết "${record.title}" (Trạng thái: ${initialStatus})`
  });

  // Real-time Event Publication & Notification Routing
  const isParentVisible = Boolean(record.parent_visible);
  const targetRoles = isParentVisible 
    ? ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT']
    : ['TEACHER', 'STUDENT', 'CLASS_OFFICER'];

  eventHub.publish({
    id: `evt_post_${postId}_${Date.now()}`,
    type: 'POST_CREATED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    actorName: record.author_name,
    targetRoles,
    excludeUserIds: [user.userId],
    parentVisible: isParentVisible,
    payload: {
      post: {
        id: record.id,
        tenantId: record.tenant_id,
        authorId: record.author_id,
        authorName: record.author_name,
        authorRole: record.author_role,
        authorAvatar: record.author_avatar,
        category: record.category,
        title: record.title,
        content: record.content,
        images: JSON.parse(record.images_json || '[]'),
        attachments: JSON.parse(record.attachments_json || '[]'),
        isPinned: Boolean(record.pinned_to_overview),
        parentVisible: Boolean(record.parent_visible),
        reactions: JSON.parse(record.reactions_json || '{}'),
        comments: JSON.parse(record.comments_json || '[]'),
        createdAt: record.created_at,
        updatedAt: record.updated_at
      }
    },
    notification: {
      title: `📢 ${record.category || 'Bảng tin'}: ${record.title}`,
      message: `${record.author_name} đã đăng bài viết mới: "${record.content.substring(0, 90)}..."`,
      type: 'info',
      linkTo: 'posts',
      category: 'post'
    },
    timestamp: now
  });

  return res.json({ success: true, data: saved });
});

// 2.1 PATCH /api/v1/posts/:id/approve - GVCN approves pending post
router.patch('/:id/approve', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const postId = req.params.id;
  const teacherName = user.fullName || 'GVCN';
  const now = new Date().toISOString();

  let existing = postRepository.getPostById(user.tenantId, postId);
  if (!existing) {
    existing = postRepository.findAnyPostById(postId);
  }
  if (!existing && req.body && req.body.title && req.body.content) {
    // If not found in SQLite yet, upsert it as approved with student's original information
    const newRecord: PostRow = {
      id: postId,
      tenant_id: user.tenantId,
      author_id: req.body.authorId || user.userId,
      author_name: req.body.authorName || 'Học viên',
      author_role: req.body.authorRole || 'STUDENT',
      author_avatar: req.body.authorAvatar || null,
      category: req.body.category || 'Thông báo',
      title: req.body.title,
      content: req.body.content,
      images_json: JSON.stringify(req.body.images || []),
      attachments_json: JSON.stringify(req.body.attachments || []),
      pinned_to_overview: req.body.pinnedToOverview || req.body.isPinned ? 1 : 0,
      parent_visible: req.body.parentVisible !== undefined ? (req.body.parentVisible ? 1 : 0) : 1,
      reactions_json: JSON.stringify(req.body.reactions || { like: [], love: [], applause: [], celebrate: [], idea: [] }),
      comments_json: JSON.stringify(req.body.comments || []),
      status: 'approved',
      reviewed_by: teacherName,
      reviewed_at: now,
      created_at: req.body.createdAt || now,
      updated_at: now
    };
    postRepository.upsertPost(newRecord);
    existing = newRecord;
  } else if (existing) {
    postRepository.updatePostStatus(existing.tenant_id || user.tenantId, postId, 'approved', teacherName);
    existing = postRepository.getPostById(existing.tenant_id || user.tenantId, postId) || postRepository.findAnyPostById(postId)!;
  } else {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
  }

  // Publish event so connected clients update feed in real time
  eventHub.publish({
    id: `evt_post_approved_${postId}_${Date.now()}`,
    type: 'POST_APPROVED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    actorName: teacherName,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
    parentVisible: Boolean(existing.parent_visible),
    payload: { postId, status: 'approved', reviewedBy: teacherName, reviewedAt: now },
    notification: {
      title: '📢 Bài viết đã được phê duyệt',
      message: `Bài viết "${existing.title}" đã được GVCN duyệt và đăng lên Bảng tin.`,
      type: 'success',
      linkTo: 'posts',
      category: 'post'
    },
    timestamp: now
  });

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'POST_APPROVED',
    targetType: 'POST',
    targetId: postId,
    details: `${teacherName} đã phê duyệt bài viết "${existing.title}" lên Bảng tin`
  });

  return res.json({ success: true, message: 'Đã duyệt bài đăng thành công.', data: existing });
});

// 2.2 PATCH /api/v1/posts/:id/reject - GVCN rejects pending post
router.patch('/:id/reject', requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const postId = req.params.id;
  const teacherName = user.fullName || 'GVCN';
  const reason = req.body?.reason || 'Bài viết chưa phù hợp quy định.';
  const ok = postRepository.updatePostStatus(user.tenantId, postId, 'rejected', teacherName);
  if (!ok) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
  }

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'POST_REJECTED',
    targetType: 'POST',
    targetId: postId,
    details: `${teacherName} đã từ chối bài viết: ${reason}`
  });

  return res.json({ success: true, message: 'Đã từ chối bài đăng.' });
});

// 3. POST /api/v1/posts/:id/comments - Add comment (FORBIDDEN for PARENT)
router.post('/:id/comments', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (user.role === 'PARENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_FORBIDDEN_PARENT',
      message: '403 Forbidden: Phụ huynh chỉ có quyền xem Bảng tin ở chế độ Read-Only, không được gửi bình luận.'
    });
  }

  const { id } = req.params;
  let post = postRepository.getPostById(user.tenantId, id);
  if (!post) {
    const otherTenantPost = postRepository.findAnyPostById(id);
    if (otherTenantPost) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: 'Bạn không có quyền bình luận trên bài viết của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết.' });
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Nội dung bình luận không được để trống.' });
  }

  const comments: any[] = JSON.parse(post.comments_json || '[]');
  const newComment = {
    id: `cmt_${Date.now()}`,
    postId: id,
    authorId: user.userId,
    authorName: req.body.authorName || 'Thành viên',
    authorAvatar: req.body.authorAvatar || null,
    authorRole: user.role,
    content: content.trim(),
    createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
  };

  comments.push(newComment);
  post.comments_json = JSON.stringify(comments);
  post.updated_at = new Date().toISOString();
  postRepository.upsertPost(post);

  // Real-time Event Publication
  eventHub.publish({
    id: `evt_comment_${newComment.id}`,
    type: 'POST_COMMENT_CREATED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    actorName: newComment.authorName,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER'],
    targetUserIds: post.author_id ? [post.author_id] : undefined,
    excludeUserIds: [user.userId],
    parentVisible: false,
    payload: {
      postId: id,
      comment: newComment,
      commentsCount: comments.length
    },
    notification: {
      title: `💬 Bình luận mới từ ${newComment.authorName}`,
      message: `"${newComment.content.substring(0, 80)}" trên bài viết "${post.title}"`,
      type: 'info',
      linkTo: 'posts',
      category: 'comment'
    },
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, data: newComment });
});

// 4. POST /api/v1/posts/:id/reactions - Toggle reaction (FORBIDDEN for PARENT)
router.post('/:id/reactions', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (user.role === 'PARENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_FORBIDDEN_PARENT',
      message: '403 Forbidden: Phụ huynh không được thực hiện tương tác trên Bảng tin.'
    });
  }

  const { id } = req.params;
  const { reactionType } = req.body;
  let post = postRepository.getPostById(user.tenantId, id);
  if (!post) {
    const otherTenantPost = postRepository.findAnyPostById(id);
    if (otherTenantPost) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: 'Bạn không có quyền tương tác với bài viết của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết.' });
  }

  const reactions: Record<string, string[]> = JSON.parse(post.reactions_json || '{"like":[],"love":[],"applause":[],"celebrate":[],"idea":[]}');
  const currentList = reactions[reactionType] || [];
  const hasReacted = currentList.includes(user.userId);
  reactions[reactionType] = hasReacted
    ? currentList.filter(uId => uId !== user.userId)
    : [...currentList, user.userId];

  post.reactions_json = JSON.stringify(reactions);
  post.updated_at = new Date().toISOString();
  postRepository.upsertPost(post);

  // Real-time Event Publication (Data Sync Stream)
  eventHub.publish({
    id: `evt_react_${id}_${user.userId}_${Date.now()}`,
    type: 'POST_REACTION_CHANGED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
    excludeUserIds: [user.userId],
    parentVisible: true,
    payload: {
      postId: id,
      reactions,
      reactionType,
      userId: user.userId,
      hasReacted: !hasReacted
    },
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, reactions });
});

// 4b. PUT /api/v1/posts/:id - Update existing post
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const body = req.body;

  if (user.role === 'PARENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_FORBIDDEN_PARENT',
      message: '403 Forbidden: Phụ huynh không có quyền chỉnh sửa bài viết.'
    });
  }

  if (user.role === 'STUDENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Học sinh không có quyền chỉnh sửa bài viết trên Bảng tin.'
    });
  }

  let post = postRepository.getPostById(user.tenantId, id);
  if (!post) {
    const otherTenantPost = postRepository.findAnyPostById(id);
    if (otherTenantPost) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: 'Bạn không có quyền chỉnh sửa bài viết của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết.' });
  }

  // Ban cán sự can only edit their own posts
  if (user.role === 'CLASS_OFFICER' && post.author_id !== user.userId) {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Cán sự lớp chỉ được quyền chỉnh sửa bài viết của chính mình.'
    });
  }

  if (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN' && post.author_id !== user.userId) {
    return res.status(403).json({
      success: false,
      errorCode: 'PERMISSION_DENIED',
      message: 'Bạn không có quyền chỉnh sửa bài viết này.'
    });
  }

  if (body.title) post.title = body.title.trim();
  if (body.content) post.content = body.content.trim();
  if (body.category) post.category = body.category.trim();
  if (body.images) post.images_json = JSON.stringify(body.images);
  if (body.attachments) post.attachments_json = JSON.stringify(body.attachments);
  if (body.parentVisible !== undefined) post.parent_visible = body.parentVisible ? 1 : 0;
  post.updated_at = new Date().toISOString();

  const saved = postRepository.upsertPost(post);

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'POST_UPDATED',
    targetType: 'POST',
    targetId: id,
    details: `${user.role} chỉnh sửa bài viết "${post.title}"`
  });

  return res.json({ success: true, data: saved });
});

// 5. DELETE /api/v1/posts/:id - Delete post (TEACHER or author within tenant only)
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  if (user.role === 'PARENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_FORBIDDEN_PARENT',
      message: '403 Forbidden: Phụ huynh không có quyền xóa bài đăng.'
    });
  }

  let post = postRepository.getPostById(user.tenantId, id);
  if (!post) {
    const otherTenantPost = postRepository.findAnyPostById(id);
    if (otherTenantPost) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: 'Bạn không có quyền xóa bài viết của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết.' });
  }

  if (user.role === 'CLASS_OFFICER' && post.author_id !== user.userId) {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_ACCESS_DENIED',
      message: 'Cán sự lớp chỉ được quyền xóa bài viết của chính mình.'
    });
  }

  if (user.role !== 'TEACHER' && user.role !== 'SUPER_ADMIN' && post.author_id !== user.userId) {
    return res.status(403).json({ success: false, errorCode: 'PERMISSION_DENIED', message: 'Bạn không có quyền xóa bài viết này.' });
  }

  postRepository.deletePost(user.tenantId, id);

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: 'POST_DELETED',
    targetType: 'POST',
    targetId: id,
    details: `${user.role} xóa bài viết "${post.title}"`
  });

  // Real-time Event Publication
  eventHub.publish({
    id: `evt_post_del_${id}_${Date.now()}`,
    type: 'POST_DELETED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
    excludeUserIds: [user.userId],
    parentVisible: true,
    payload: { postId: id },
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, message: 'Đã xóa bài viết thành công.' });
});

// 6. PATCH /api/v1/posts/:id/pin - Toggle pin status (TEACHER, SUPER_ADMIN, CLASS_OFFICER)
router.patch('/:id/pin', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  if (user.role === 'PARENT' || user.role === 'STUDENT') {
    return res.status(403).json({
      success: false,
      errorCode: 'ROLE_FORBIDDEN',
      message: 'Chỉ Giáo viên chủ nhiệm và Cán sự lớp được phép ghim/bỏ ghim bài viết.'
    });
  }

  let post = postRepository.getPostById(user.tenantId, id);
  if (!post) {
    const otherTenantPost = postRepository.findAnyPostById(id);
    if (otherTenantPost) {
      return res.status(403).json({
        success: false,
        errorCode: 'TENANT_ACCESS_DENIED',
        message: 'Bạn không có quyền ghim bài viết của lớp khác.'
      });
    }
    return res.status(404).json({ success: false, errorCode: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết.' });
  }

  const requestedPinned = typeof req.body?.pinned === 'boolean' ? req.body.pinned : undefined;
  const newPinned = requestedPinned !== undefined 
    ? (requestedPinned ? 1 : 0) 
    : (post.pinned_to_overview ? 0 : 1);
  post.pinned_to_overview = newPinned;
  post.updated_at = new Date().toISOString();

  postRepository.upsertPost(post);

  auditLogRepository.createLog({
    actorUserId: user.userId,
    actorRole: user.role,
    actorTenantId: user.tenantId,
    action: newPinned ? 'POST_PINNED' : 'POST_UNPINNED',
    targetType: 'POST',
    targetId: id,
    details: `${user.role} ${newPinned ? 'ghim' : 'bỏ ghim'} bài viết "${post.title}"`
  });

  eventHub.publish({
    id: `evt_post_pin_${id}_${Date.now()}`,
    type: 'POST_PIN_CHANGED',
    tenantId: user.tenantId,
    actorId: user.userId,
    actorRole: user.role,
    targetRoles: ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'],
    excludeUserIds: [user.userId],
    parentVisible: true,
    payload: { postId: id, isPinned: Boolean(newPinned), pinnedToOverview: Boolean(newPinned) },
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true, isPinned: Boolean(newPinned), pinnedToOverview: Boolean(newPinned) });
});

export default router;
