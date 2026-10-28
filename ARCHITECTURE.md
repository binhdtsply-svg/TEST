# KIẾN TRÚC HỆ THỐNG — KHÔNG GIAN CHỦ NHIỆM SỐ (MULTI-TENANT SAAS)

## 1. TỔNG QUAN KIẾN TRÚC
Nền tảng "Không Gian Chủ Nhiệm Số" được xây dựng theo mô hình **Multi-Tenant SaaS** với kiến trúc phân lớp rõ ràng:

```
+-------------------------------------------------------------------------+
|                  SUPER ADMIN / PLATFORM OWNER CONSOLE                   |
| (Quản lý GVCN, Cấp tài khoản, Feature Flags, Schema Version, Audit Log) |
+-------------------------------------------------------------------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
+-----------------------------+             +-----------------------------+
|    WORKSPACE 1 (TENANT A)   |             |    WORKSPACE 2 (TENANT B)   |
|   Cô Mai Lan - THPT LHP     |             |   Thầy Nam - THPT Nguyễn Huệ|
| +-------------------------+ |             | +-------------------------+ |
| | Lớp 11A1, 11A2...       | |             | | Lớp 12A2, 12A3...       | |
| | Học sinh, Phụ huynh     | |             | | Học sinh, Phụ huynh     | |
| | Điểm TT22, Cây Nguyệt Quế| |             | | Điểm TT22, Cây Nguyệt Quế| |
| +-------------------------+ |             | +-------------------------+ |
+-----------------------------+             +-----------------------------+
```

## 2. CÁC TẦNG DỊCH VỤ CHÍNH (SERVICE LAYER)
1. **TenantService (`TenantManager`)**:
   - Quản lý vòng đời workspace, hạn ngạch (quota: lớp, học sinh, dung lượng, AI credits).
   - Phân lập key lưu trữ theo format: `kgcns_tenant_{tenantId}_{entity}`.
2. **PermissionService (`PermissionManager`)**:
   - Kiểm soát phân quyền tập trung cho 5 vai trò: `SUPER_ADMIN`, `TEACHER`, `CLASS_OFFICER`, `STUDENT`, `PARENT`.
   - Cơ chế bảo vệ quyền riêng tư và Audit Trail khi truy cập Break-glass.
3. **MigrationService (`MigrationManager`)**:
   - Schema versioning tự động (Version 1 -> Version 2...).
   - Feature flags toàn hệ thống (`aiAssistant`, `googleSync`, `zaloIntegration`, `hollandTest`, `graduationEstimator`...).
   - Xuất / Nhập snapshot an toàn.
4. **ClassService, StudentService, SubmissionService, AuditLogService**:
   - Xử lý nghiệp vụ chuyên biệt theo từng lớp và không gian chủ nhiệm.
