# HƯỚNG DẪN TRIỂN KHAI (DEPLOYMENT GUIDE) — KHÔNG GIAN CHỦ NHIỆM SỐ

## 1. MÔI TRƯỜNG CHẠY ỨNG DỤNG
- **Frontend / Fullstack**: React 18+ với Vite, Tailwind CSS, Lucide Icons, TypeScript.
- **Port phục vụ**: Port 3000 (0.0.0.0:3000).

## 2. BUILD VÀ TRIỂN KHAI
```bash
# Cài đặt thư viện phụ thuộc
npm install

# Kiểm tra cú pháp và kiểu dữ liệu
npm run lint

# Build bản sản phẩm tối ưu
npm run build
```

## 3. CHECKLIST SẴN SÀNG VẬN HÀNH
- [x] Multi-tenant isolation theo `tenantId`.
- [x] 5 vai trò phân quyền hoàn chỉnh (SUPER_ADMIN, TEACHER, CLASS_OFFICER, STUDENT, PARENT).
- [x] Super Admin Console quản trị hạ tầng, cấp tài khoản và kiểm soát Feature Flags.
- [x] Setup Wizard 8 bước tạo lớp học nhanh chóng.
- [x] Đồng bộ đầy đủ Quy chế Đánh giá Học sinh THPT theo Thông tư 22/2021/TT-BGDĐT.
- [x] Dự toán Điểm Tốt nghiệp THPT chuẩn phương án 2025.
- [x] Cơ chế Backup & Restore Snapshot toàn bộ nền tảng.
