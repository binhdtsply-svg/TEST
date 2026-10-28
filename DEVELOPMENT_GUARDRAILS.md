# DEVELOPMENT GUARDRAILS — KHÔNG GIAN CHỦ NHIỆM SỐ

## 1. NGUYÊN TẮC BẤT BIẾN (CORE TENETS)
1. **MỘT NỀN TẢNG – NHIỀU KHÔNG GIAN ĐỘC LẬP**:
   - Kiến trúc multi-tenant phân lập hoàn toàn dữ liệu giữa các GVCN theo `tenantId`.
   - Mỗi GVCN là chủ sở hữu (Owner) của một Không gian riêng biệt, toàn quyền tạo lớp và cấu hình.
2. **MỘT LẦN NHẬP – NHIỀU LẦN SỬ DỤNG**:
   - Dữ liệu học sinh được nhập một lần (hồ sơ, phụ huynh, đoàn đội, thông tin liên lạc) và dùng chung cho Điểm danh, Điểm rèn luyện, Cây Nguyệt Quế, Bảng điểm TT22, Nhịp cầu Phụ huynh và Thi tốt nghiệp THPT.
3. **NÂNG CẤP KHÔNG MẤT DỮ LIỆU (ZERO DATA LOSS)**:
   - TUYỆT ĐỐI KHÔNG reset database hoặc schema khi triển khai tính năng mới.
   - Mọi migration phải là idempotent (chạy nhiều lần vẫn an toàn), hỗ trợ schema versioning và snapshot backup.
4. **BẢO VỆ TÍNH RIÊNG TƯ TUYỆT ĐỐI**:
   - SUPER ADMIN mặc định KHÔNG truy cập nội dung riêng tư của học viên hoặc phụ huynh.
   - Chỉ được kích hoạt quyền can thiệp hỗ trợ kỹ thuật (Break-glass access) khi có lý do chính đáng và bắt buộc lưu vết Audit Trail bất biến.

## 2. QUY CHUẨN CODE & STATE
- Không hard-code danh sách học sinh, môn học, lớp học.
- Mọi entity phải đính kèm metadata: `{ tenantId, classId, createdBy, createdAt, updatedAt }`.
- Sử dụng singleton services với observer subscription pattern để đồng bộ state thời gian thực.
- Kiểm tra quyền ở cả tầng UI (Component Rendering) và tầng Service/Logic (`permissionService.can(...)`).
