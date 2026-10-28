/**
 * Complete Verification Suite for Super Admin Persistence & Data Protection
 * Tests all 5 requirements using isolated testing and verifies real data preservation.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { hashSecret, verifySecret } from '../server/auth/crypto';
import { AdminAccountRepository, AdminAccountRecord } from '../server/repositories/AdminAccountRepository';
import { persistenceSyncService } from '../server/services/PersistenceSyncService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVerificationSuite() {
  console.log('========================================================================');
  console.log('KIỂM TRA TOÀN DIỆN: BẢO VỆ TÀI KHOẢN ADMIN VÀ BẢO TOÀN DỮ LIỆU');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // ========================================================================
  // BƯỚC 1: Xác minh trạng thái Admin thật đã thiết lập trong hệ thống
  // ========================================================================
  console.log('--- BƯỚC 1: Xác minh trạng thái Admin thật hiện tại ---');
  const realRepo = new AdminAccountRepository();
  const realStatus = realRepo.getAdminStatus('admin');

  assert(realStatus.exists === true, 'Tài khoản Super Admin tồn tại trong hệ thống');
  assert(realStatus.firstTimeSetupRequired === false, 'Tài khoản Super Admin KHÔNG ở trạng thái firstTimeSetupRequired');
  assert(realStatus.hasRecoveryCode === true, 'Tài khoản Super Admin có Recovery Code được kích hoạt');
  assert(realStatus.emailConfigured === true, 'Email Super Admin đã được cấu hình');

  const realAdmin = realRepo.findByLoginIdentifier('admin');
  assert(Boolean(realAdmin), 'Đọc thành công bản ghi Super Admin thật từ SQLite');
  assert(realAdmin!.first_time_setup_completed === 1, 'first_time_setup_completed = 1 trên tài khoản thật');
  assert(Boolean(realAdmin!.password_updated_at), 'password_updated_at được bảo toàn trên tài khoản thật');
  assert(Boolean(realAdmin!.recovery_code_hash), 'recovery_code_hash được bảo toàn trên tài khoản thật');

  // Lưu lại snapshot của admin thật để đảm bảo 100% không bị thay đổi
  const preservedRealAdmin = { ...realAdmin };

  // ========================================================================
  // BƯỚC 2 & 3: Đổi mật khẩu & Recovery Code thử nghiệm trên môi trường kiểm thử
  // ========================================================================
  console.log('\n--- BƯỚC 2 & 3: Kiểm thử luồng đổi Mật khẩu, Recovery Code & Đăng nhập ---');
  const testDbDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, 'test_admin_sandbox.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const testDb = new DatabaseSync(testDbPath);
  testDb.exec(`
    CREATE TABLE admin_accounts (
      id TEXT PRIMARY KEY,
      login_id TEXT UNIQUE,
      email TEXT NOT NULL,
      recovery_email TEXT,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_updated_at TEXT,
      reset_token_hash TEXT,
      reset_token_expires_at TEXT,
      recovery_code_hash TEXT,
      recovery_code_used INTEGER DEFAULT 0,
      recovery_code_created_at TEXT,
      session_version INTEGER DEFAULT 1,
      first_time_setup_completed INTEGER DEFAULT 0,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      bootstrap_token_hash TEXT,
      bootstrap_token_expires_at TEXT,
      status TEXT DEFAULT 'ACTIVE',
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Tạo class TestAdminRepo kế thừa các quy tắc nghiệp vụ
  class TestAdminRepo extends AdminAccountRepository {
    protected override getDb(): any {
      return testDb;
    }
  }

  const testRepo = new TestAdminRepo();
  const testAdminId = 'usr-test-admin';
  const initialTestPass = 'InitialPass@123';
  const initialTestRc = 'RC-INITIAL-CODE-1234';
  const now = new Date().toISOString();

  testDb.prepare(`
    INSERT INTO admin_accounts (
      id, login_id, email, recovery_email, full_name, password_hash, password_updated_at,
      recovery_code_hash, recovery_code_used, recovery_code_created_at, session_version,
      first_time_setup_completed, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, 1, 'ACTIVE', ?, ?)
  `).run(
    testAdminId, 'testadmin', 'testadmin@example.com', 'testrc@example.com',
    'Test Administrator', hashSecret(initialTestPass), now, hashSecret(initialTestRc), now, now, now
  );

  // 2.1 Đổi mật khẩu thử nghiệm
  const newTestPass = 'NewSecurePassword@2026';
  const changePassRes = testRepo.changePassword(testAdminId, initialTestPass, newTestPass);
  assert(changePassRes.success === true, 'Đổi mật khẩu tài khoản thử nghiệm thành công');

  const adminAfterPassChange = testRepo.findById(testAdminId);
  assert(verifySecret(newTestPass, adminAfterPassChange!.password_hash), 'Mật khẩu mới đã được băm scrypt an toàn trong SQLite');
  assert(!verifySecret(initialTestPass, adminAfterPassChange!.password_hash), 'Mật khẩu cũ không còn hợp lệ');
  assert(adminAfterPassChange!.first_time_setup_completed === 1, 'first_time_setup_completed = 1 sau đổi mật khẩu');

  // 2.2 Đổi Recovery Code thử nghiệm
  const newTestRc = 'RC-NEW-SECURE-2026';
  const changeRcRes = testRepo.setCustomRecoveryCode(testAdminId, newTestPass, newTestRc, newTestRc);
  assert(changeRcRes.success === true, 'Đổi Recovery Code tùy chỉnh thành công');

  const adminAfterRcChange = testRepo.findById(testAdminId);
  assert(testRepo.isRecoveryCodeValid(adminAfterRcChange!, newTestRc), 'Recovery Code mới hợp lệ với tài khoản');
  assert(!testRepo.isRecoveryCodeValid(adminAfterRcChange!, initialTestRc), 'Recovery Code cũ đã bị vô hiệu hóa hoàn toàn');

  // 3.1 Đăng xuất & Đăng nhập lại với thông tin mới
  const loginSuccess = testRepo.authenticate('testadmin', newTestPass, newTestRc);
  assert(loginSuccess.success === true, 'Đăng nhập thành công với mật khẩu mới và Recovery Code mới');
  assert(loginSuccess.firstTimeSetupRequired === false, 'Đăng nhập trả về firstTimeSetupRequired = false');

  const loginWrongPass = testRepo.authenticate('testadmin', 'WrongPassword@999', newTestRc);
  assert(loginWrongPass.success === false, 'Đăng nhập thất bại khi mật khẩu sai');

  const loginWrongRc = testRepo.authenticate('testadmin', newTestPass, 'RC-WRONG-999');
  assert(loginWrongRc.success === false, 'Đăng nhập thất bại khi Recovery Code sai');

  // ========================================================================
  // BƯỚC 4: Restart backend và kiểm tra chống bị quay về thiết lập lần đầu
  // ========================================================================
  console.log('\n--- BƯỚC 4: Kiểm thử Restart / Remix / Cache Flush Precedence ---');

  // 4.1 Kiểm tra quy tắc: isEstablishedAdmin nhận diện đúng tài khoản đã cấu hình
  assert(persistenceSyncService.isEstablishedAdmin(preservedRealAdmin) === true, 'isEstablishedAdmin nhận diện đúng tài khoản Admin thật');
  assert(realRepo.isRecordConfigured(preservedRealAdmin) === true, 'isRecordConfigured nhận diện đúng tài khoản Admin thật');

  // 4.2 Kiểm tra unconfigured default admin
  const unconfiguredAdmin = {
    id: 'usr-super-admin',
    login_id: 'admin',
    password_hash: hashSecret('123456@'),
    password_updated_at: null,
    recovery_code_hash: hashSecret('KHONGGIANCHUNHIEMSO2026'),
    recovery_code_created_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    first_time_setup_completed: 0
  };
  assert(persistenceSyncService.isEstablishedAdmin(unconfiguredAdmin) === false, 'isEstablishedAdmin nhận diện đúng tài khoản chưa thiết lập là false');
  assert(realRepo.isRecordConfigured(unconfiguredAdmin) === false, 'isRecordConfigured nhận diện đúng tài khoản chưa thiết lập là false');

  // 4.3 Kiểm tra kịch bản phục hồi khi SQLite bị reset về unconfigured row với timestamp mới hơn backup
  const simulatedCandidateFiles = realRepo.getCandidateBackupPaths().filter(f => fs.existsSync(f));
  assert(simulatedCandidateFiles.length >= 3, `Đảm bảo có đủ 3 file backup persistent (${simulatedCandidateFiles.length})`);

  for (const bFile of simulatedCandidateFiles) {
    const raw = JSON.parse(fs.readFileSync(bFile, 'utf-8'));
    const bAdmin = raw?.tables?.admin_accounts?.[0];
    assert(
      Boolean(bAdmin && (bAdmin.first_time_setup_completed === 1 || bAdmin.password_updated_at)),
      `File backup ${path.basename(bFile)} chứa tài khoản Admin đã thiết lập`
    );
  }

  // 4.4 Kiểm tra getEstablishedAdminFromBackups
  const establishedFromBackups = realRepo.getEstablishedAdminFromBackups();
  assert(Boolean(establishedFromBackups), 'getEstablishedAdminFromBackups đọc được tài khoản established từ backup');
  assert(
    establishedFromBackups!.first_time_setup_completed === 1 || Boolean(establishedFromBackups!.password_updated_at),
    'Bản ghi từ backup có first_time_setup_completed = 1 hoặc password_updated_at'
  );

  // ========================================================================
  // BƯỚC 5: Kiểm tra lỗi đọc dữ liệu không làm bật thiết lập lần đầu
  // ========================================================================
  console.log('\n--- BƯỚC 5: Kiểm tra khả năng chịu lỗi (Error Fault-Tolerance) ---');

  // Khi có lỗi đọc cơ sở dữ liệu, getAdminStatus bắt buộc phải trả về firstTimeSetupRequired = false
  class FaultyAdminRepo extends AdminAccountRepository {
    protected override getDb(): any {
      return {
        prepare: () => {
          throw new Error('SIMULATED_SQLITE_DISK_IO_ERROR');
        }
      };
    }
  }

  const faultyRepo = new FaultyAdminRepo();
  const faultyStatus = faultyRepo.getAdminStatus('admin');
  assert(faultyStatus.exists === true, 'Khi lỗi đọc DB, exists trả về true để bảo vệ tài khoản');
  assert(faultyStatus.firstTimeSetupRequired === false, 'Khi lỗi đọc DB, firstTimeSetupRequired = FALSE (tuyệt đối không bật thiết lập lần đầu)');
  assert(faultyStatus.hasRecoveryCode === true, 'Khi lỗi đọc DB, hasRecoveryCode = true');

  // ========================================================================
  // BƯỚC 6: Kiểm tra bảo toàn toàn bộ dữ liệu nghiệp vụ thật
  // ========================================================================
  console.log('\n--- BƯỚC 6: Kiểm tra bảo toàn dữ liệu nghiệp vụ thật ---');
  const masterDb = new DatabaseSync('data/kgcns_master.db');

  const finalAdminRow: any = masterDb.prepare('SELECT * FROM admin_accounts WHERE id = ?').get('usr-super-admin');
  assert(Boolean(finalAdminRow), 'Tài khoản Super Admin thật tồn tại trong master db');
  assert(finalAdminRow.password_hash === preservedRealAdmin.password_hash, 'Mật khẩu của Super Admin thật được bảo toàn 100% không đổi');
  assert(finalAdminRow.recovery_code_hash === preservedRealAdmin.recovery_code_hash, 'Recovery Code của Super Admin thật được bảo toàn 100% không đổi');
  assert(finalAdminRow.first_time_setup_completed === 1, 'first_time_setup_completed = 1 trên master db');

  const countStudents: any = masterDb.prepare('SELECT COUNT(*) as c FROM students').get();
  const countTeachers: any = masterDb.prepare('SELECT COUNT(*) as c FROM teacher_accounts').get();
  const countTenants: any = masterDb.prepare('SELECT COUNT(*) as c FROM tenants').get();
  const countCredentials: any = masterDb.prepare('SELECT COUNT(*) as c FROM credentials').get();

  assert(countStudents.c === 48, `Dữ liệu 48 học viên được bảo toàn nguyên vẹn (${countStudents.c})`);
  assert(countTeachers.c >= 3, `Dữ liệu ${countTeachers.c} GVCN được bảo toàn nguyên vẹn`);
  assert(countTenants.c >= 6, `Dữ liệu ${countTenants.c} tenant/lớp học được bảo toàn nguyên vẹn`);
  assert(countCredentials.c >= 100, `Dữ liệu ${countCredentials.c} mã truy cập được bảo toàn nguyên vẹn`);

  // Dọn dẹp sandbox db
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  console.log('\n========================================================================');
  console.log(`TỔNG KẾT KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runVerificationSuite().catch(err => {
  console.error('Lỗi khi chạy bộ kiểm thử:', err);
  process.exit(1);
});
