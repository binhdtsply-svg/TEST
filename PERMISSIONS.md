# HỆ THỐNG PHÂN QUYỀN (RBAC) — KHÔNG GIAN CHỦ NHIỆM SỐ

## 1. MA TRẬN 5 VAI TRÒ CHÍNH

| Hành động / Tính năng | SUPER_ADMIN | TEACHER (GVCN) | CLASS_OFFICER | STUDENT | PARENT |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Quản trị nền tảng SaaS** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Cấp tài khoản GVCN** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Bật/Tắt Feature Flags** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tạo Lớp & Cấu hình Môn học** | ❌ (Chỉ xem khi Break-glass) | ✅ | ❌ | ❌ | ❌ |
| **Nhập / Sửa / Xóa Học sinh** | ❌ (Chỉ xem khi Break-glass) | ✅ | ❌ | ❌ | ❌ |
| **Nhập Điểm TT22 & Hạnh kiểm** | ❌ (Chỉ xem khi Break-glass) | ✅ | ❌ | ❌ | ❌ |
| **Cộng / Trừ Điểm Rèn luyện** | ❌ (Chỉ xem khi Break-glass) | ✅ | ✅ (Khi được cấp quyền) | ❌ | ❌ |
| **Duyệt Đề xuất Học sinh** | ❌ (Chỉ xem khi Break-glass) | ✅ | ❌ | ❌ | ❌ |
| **Đăng Báo bài / Lịch kiểm tra** | ❌ (Chỉ xem khi Break-glass) | ✅ | ✅ (Khi được cấp quyền) | ❌ | ❌ |
| **Xem Kết quả & Cây Nguyệt quế**| ❌ (Chỉ xem khi Break-glass) | ✅ (Toàn lớp) | ✅ (Toàn lớp/Cá nhân) | ✅ (Cá nhân) | ✅ (Con em mình)|
| **Nhịp cầu Phụ huynh (Sổ liên lạc)** | ❌ (Chỉ xem khi Break-glass) | ✅ (Tất cả) | ❌ | ❌ | ✅ (Con em mình)|

## 2. NGUYÊN TẮC BẢO VỆ DỮ LIỆU RIÊNG TƯ
- **Zero Default Access for Super Admin**: Super Admin có toàn quyền về hạ tầng kỹ thuật và quản lý tài khoản, nhưng không được can thiệp vào hồ sơ giáo dục nội bộ của học sinh/phụ huynh.
- **Break-Glass Support**: Khi phát sinh yêu cầu hỗ trợ từ GVCN, Super Admin phải nhập lý do nghiệp vụ rõ ràng để kích hoạt chế độ can thiệp tạm thời. Toàn bộ hành động được ghi vết bất biến vào Audit Log.
