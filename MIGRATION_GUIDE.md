# HƯỚNG DẪN MIGRATION & NÂNG CẤP SCHEMA (ZERO DATA LOSS)

## 1. NGUYÊN TẮC NÂNG CẤP
- **Idempotency**: Mọi script migration phải có khả năng chạy lại nhiều lần mà không tạo trùng lặp hoặc làm hỏng dữ liệu.
- **Tương thích ngược**: Khi thêm thuộc tính mới vào Schema (ví dụ `studentActivationToken`, `parentActivationToken`, `tenantId`), hệ thống sẽ tự động gán giá trị mặc định nếu chưa tồn tại.
- **Snapshot Backup Trước Migration**: Trước mỗi phiên nâng cấp lớn, luôn xuất bản snapshot dự phòng qua chức năng `exportFullPlatformSnapshot()`.

## 2. QUY TRÌNH THỰC HIỆN MIGRATION
1. Đăng nhập với vai trò **SUPER_ADMIN**.
2. Truy cập tab **Quản lý Phiên bản & Migration** trên Bảng điều khiển.
3. Bấm **"Chạy Nâng Cấp Schema (Idempotent)"**.
4. Hệ thống sẽ quét toàn bộ danh sách Tenants, bổ sung các trường schema mới nhất và ghi nhận lịch sử vào bảng Migration Log.
