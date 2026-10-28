import { guideRepository } from '../server/repositories/GuideRepository';
import { sessionRepository } from '../server/repositories/SessionRepository';
import { teacherAccountRepository } from '../server/repositories/TeacherAccountRepository';
import http from 'http';

function makeRequest(options: http.RequestOptions, body?: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode || 500, data: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode || 500, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING TEACHER GUIDE REGRESSION TESTS ---');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  // 1. Check Guide Repository has 5 categories initialized
  const categories = guideRepository.getCategories();
  assert(categories.length >= 5, `Guide has at least 5 categories (found ${categories.length})`);

  const categoryTitles = categories.map(c => c.title);
  assert(categoryTitles.some(t => t.includes('Giới thiệu')), 'Group 1: Giới thiệu về trang web exists');
  assert(categoryTitles.some(t => t.includes('cấu hình chung')), 'Group 2: Hướng dẫn cài đặt cấu hình chung lớp học exists');
  assert(categoryTitles.some(t => t.includes('khảo sát')), 'Group 3: Tạo các bài khảo sát exists');
  assert(categoryTitles.some(t => t.includes('học tập, phong trào') || t.includes('phong trào')), 'Group 4: Tạo các nội dung về học tập, phong trào exists');
  assert(categoryTitles.some(t => t.includes('phụ huynh')), 'Group 5: Tạo liên kết với phụ huynh exists');

  // 2. Fetch teacher account for session validation
  const existingTeachers = teacherAccountRepository.getAll();
  const sampleTeacher = existingTeachers[0];

  const teacherSession = sessionRepository.createSession({
    userId: sampleTeacher ? sampleTeacher.id : 'usr_teacher_demo',
    role: 'TEACHER',
    tenantId: sampleTeacher ? sampleTeacher.tenant_id : 'default-tenant',
    teacherId: sampleTeacher ? sampleTeacher.teacher_id : 'gvcn_demo',
    credentialVersion: sampleTeacher ? sampleTeacher.credential_version : 1,
    isTestCredential: false
  });
  const teacherToken = teacherSession.token;

  // 3. Test GET /api/v1/guide/content with teacher token
  const teacherRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/guide/content',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${teacherToken}`,
    },
  });

  assert(teacherRes.statusCode === 200, `Teacher GET /api/v1/guide/content returns 200 (got ${teacherRes.statusCode})`);
  assert(teacherRes.data.success === true, 'Teacher response success === true');
  assert(Array.isArray(teacherRes.data.categories), 'Teacher response contains categories array');
  assert(Array.isArray(teacherRes.data.articles), 'Teacher response contains articles array');
  assert(teacherRes.data.isAdmin === false, 'Teacher response correctly identifies isAdmin === false');
  
  // Verify all articles returned to teacher are published
  const unpubArticle = teacherRes.data.articles.find((a: any) => !a.isPublished);
  assert(!unpubArticle, 'Teacher receives ONLY published articles (isPublished: true)');

  // 4. Test GVCN cannot call POST /api/v1/guide/articles (RBAC test)
  const teacherPostRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/guide/articles',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${teacherToken}`,
      'Content-Type': 'application/json',
    },
  }, {
    title: 'Hacking guide from teacher',
    categoryId: categories[0].id,
    content: 'Illegal content',
  });
  assert(teacherPostRes.statusCode === 403, `Teacher POST /api/v1/guide/articles returns 403 Forbidden (got ${teacherPostRes.statusCode})`);

  // 5. Test GVCN cannot call PUT /api/v1/guide/articles/:id
  const testArticleId = teacherRes.data.articles[0]?.id || 'art-test';
  const teacherPutRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1/guide/articles/${testArticleId}`,
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${teacherToken}`,
      'Content-Type': 'application/json',
    },
  }, {
    title: 'Hacked title',
  });
  assert(teacherPutRes.statusCode === 403, `Teacher PUT /api/v1/guide/articles/:id returns 403 Forbidden (got ${teacherPutRes.statusCode})`);

  // 6. Test GVCN cannot call DELETE /api/v1/guide/articles/:id
  const teacherDelRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1/guide/articles/${testArticleId}`,
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${teacherToken}`,
    },
  });
  assert(teacherDelRes.statusCode === 403, `Teacher DELETE /api/v1/guide/articles/:id returns 403 Forbidden (got ${teacherDelRes.statusCode})`);

  // 7. Admin creates a draft article in persistent storage -> GVCN does NOT see it
  const draftTitle = `Draft Test Article ${Date.now()}`;
  const createdDraft = guideRepository.createArticle({
    title: draftTitle,
    categoryId: categories[0].id,
    content: 'Draft content for testing',
    isPublished: false,
  }, 'usr-super-admin');
  assert(Boolean(createdDraft && createdDraft.id), 'Admin created draft article in repository');
  const draftId = createdDraft.id;

  // Teacher checks content over HTTP -> draft article should NOT be present
  const teacherCheckDraft = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/guide/content',
    method: 'GET',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const foundDraft = teacherCheckDraft.data.articles.find((a: any) => a.id === draftId);
  assert(!foundDraft, 'Teacher does NOT see unpublished draft article');

  // 8. Admin publishes the article in persistent storage -> GVCN DOES see it
  const updatedPub = guideRepository.updateArticle(draftId, {
    isPublished: true,
  }, 'usr-super-admin');
  assert(Boolean(updatedPub && updatedPub.isPublished === true), 'Admin updated article to isPublished: true');

  // Teacher checks content over HTTP -> published article should now be present
  const teacherCheckPub = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/guide/content',
    method: 'GET',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const foundPub = teacherCheckPub.data.articles.find((a: any) => a.id === draftId);
  assert(!!foundPub && foundPub.title === draftTitle, 'Teacher sees published article after refresh');

  // 9. Admin updates article content & title -> Teacher receives updated content
  const updatedTitle = `${draftTitle} - UPDATED`;
  guideRepository.updateArticle(draftId, {
    title: updatedTitle,
    content: 'Updated content body for GVCN'
  }, 'usr-super-admin');

  const teacherCheckUpdated = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/guide/content',
    method: 'GET',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const foundUpdated = teacherCheckUpdated.data.articles.find((a: any) => a.id === draftId);
  assert(!!foundUpdated && foundUpdated.title === updatedTitle, 'Teacher receives updated article content after admin edit');

  // 10. Admin hides article (isPublished: false) -> Teacher no longer sees it
  guideRepository.updateArticle(draftId, {
    isPublished: false,
  }, 'usr-super-admin');

  const teacherCheckHidden = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/guide/content',
    method: 'GET',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const foundHidden = teacherCheckHidden.data.articles.find((a: any) => a.id === draftId);
  assert(!foundHidden, 'Teacher no longer sees article when Admin unpublishes/hides it');

  // 11. Admin deletes the test article -> Cleanup
  const delSuccess = guideRepository.deleteArticle(draftId, 'usr-super-admin');
  assert(delSuccess === true, 'Admin deleted article in repository');

  // Teacher checks content again -> article is completely gone
  const teacherCheckAfterDel = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/guide/content',
    method: 'GET',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const foundAfterDel = teacherCheckAfterDel.data.articles.find((a: any) => a.id === draftId);
  assert(!foundAfterDel, 'Deleted article is no longer visible to teacher');

  // Clean up teacher session
  try {
    sessionRepository.deleteSession(teacherSession.session.id);
  } catch {}

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log(`========================================\n`);
}

runTests().catch(console.error);
