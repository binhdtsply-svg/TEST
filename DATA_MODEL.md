# MÔ HÌNH DỮ LIỆU (DATA MODEL) — KHÔNG GIAN CHỦ NHIỆM SỐ

## 1. CÁC ENTITY CHÍNH

### 1.1 Tenant (Workspace)
```typescript
interface Tenant {
  id: string; // 'tenant-lan-nguyen'
  name: string; // 'Không Gian Chủ Nhiệm - Cô Mai Lan'
  schoolName: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  plan: 'STANDARD' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'LOCKED' | 'EXPIRED';
  quota: {
    maxClasses: number;
    maxStudentsPerClass: number;
    storageMB: number;
    aiCreditsMonthly: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 1.2 TeacherAccountItem
```typescript
interface TeacherAccountItem {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  phone?: string;
  schoolName: string;
  plan: TenantPlan;
  status: 'ACTIVE' | 'LOCKED';
  activationToken?: string;
  classesCount: number;
  totalStudentsCount: number;
  createdAt: string;
}
```

### 1.3 Student (Học viên)
```typescript
interface Student {
  id: string;
  tenantId?: string;
  classId?: string;
  code: string;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  group: number;
  officerRole?: string;
  status: 'Đang học' | 'Chuyển trường' | 'Nghỉ học';
  studentActivationToken?: string;
  parentActivationToken?: string;
  parent?: {
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
    zaloConnected?: boolean;
  };
  academicSummary?: {
    txAvg: number;
    gkScore: number;
    ckScore: number;
    semesterAvg: number;
    rank: string;
  };
  laurelGarden?: {
    currentTreeLevel: number;
    currentPoints: number;
    treesCompleted: number;
  };
}
```
