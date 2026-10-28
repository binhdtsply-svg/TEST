import json
import os

with open('server/db/system_persistence_backup.json') as f:
    backup = json.load(f)

tables = backup['tables']

# 1. Rebuild demoData.ts
stus = tables.get('students', [])
lan_stus_records = [s for s in stus if s.get('tenant_id') == 'tenant-lan-nguyen']
nam_stus_records = [s for s in stus if s.get('tenant_id') == 'tenant-hoang-nam']

def student_record_to_student(r):
    raw_meta = {}
    if r.get('raw_metadata'):
        try:
            raw_meta = json.loads(r['raw_metadata'])
        except:
            pass
    
    return {
        "id": r["id"],
        "tenantId": r.get("tenant_id"),
        "classId": r.get("class_id"),
        "code": r["code"],
        "anonymousCode": r.get("anonymous_code"),
        "fullName": r["full_name"],
        "gender": r["gender"],
        "dob": r["dob"],
        "group": r.get("group_num", 1),
        "officerRole": r.get("officer_role") or "Thành viên",
        "avatar": r.get("avatar") or None,
        "phone": r.get("phone") or "",
        "email": r.get("email") or "",
        "address": r.get("address") or "",
        "fatherName": r.get("father_name") or "",
        "fatherPhone": r.get("father_phone") or "",
        "fatherJob": r.get("father_job") or "",
        "motherName": r.get("mother_name") or "",
        "motherPhone": r.get("mother_phone") or "",
        "motherJob": r.get("mother_job") or "",
        "healthNotes": r.get("health_notes") or "",
        "talents": r.get("talents") or "",
        "privateTeacherNotes": r.get("private_teacher_notes") or "",
        "needsSpecialAttention": bool(r.get("needs_special_attention")),
        "attentionCategories": json.loads(r["attention_categories"]) if r.get("attention_categories") else None,
        "attentionNote": r.get("attention_note") or None,
        "supportMeasure": r.get("support_measure") or None,
        "attentionStatus": r.get("attention_status") or "monitoring",
        "attentionStartedAt": r.get("attention_started_at") or None,
        "attentionUpdatedAt": r.get("attention_updated_at") or None,
        "attentionUpdatedBy": r.get("attention_updated_by") or None,
        "status": r.get("status") or "Đang học",
        "studentActivationToken": f"STU-{r['code']}",
        "parentActivationToken": f"PAR-{r['code']}",
        "violationHandlingRecords": raw_meta.get("violationHandlingRecords", [])
    }

initial_students = [student_record_to_student(r) for r in lan_stus_records]
initial_teacher2_students = [student_record_to_student(r) for r in nam_stus_records]

# If initial_students has less than 14, pad with standard 11A1 baseline
if len(initial_students) < 14:
    additional_needed = [
        {"id": "hs-03", "code": "HS03", "fullName": "Lê Hoàng Long", "gender": "Nam", "dob": "2008-05-15", "group": 1, "officerRole": "Bí thư Chi đoàn"},
        {"id": "hs-04", "code": "HS04", "fullName": "Phạm Quỳnh Anh", "gender": "Nữ", "dob": "2008-09-12", "group": 2, "officerRole": "Thành viên"},
        {"id": "hs-05", "code": "HS05", "fullName": "Đỗ Minh Khang", "gender": "Nam", "dob": "2008-03-24", "group": 2, "officerRole": "Tổ trưởng Tổ 1"},
        {"id": "hs-06", "code": "HS06", "fullName": "Vũ Thu Trang", "gender": "Nữ", "dob": "2008-11-05", "group": 2, "officerRole": "Thành viên"},
        {"id": "hs-07", "code": "HS07", "fullName": "Bùi Đức Trọng", "gender": "Nam", "dob": "2008-07-18", "group": 3, "officerRole": "Tổ trưởng Tổ 2"},
        {"id": "hs-08", "code": "HS08", "fullName": "Hoàng Lan Hương", "gender": "Nữ", "dob": "2008-02-28", "group": 3, "officerRole": "Thành viên"},
        {"id": "hs-09", "code": "HS09", "fullName": "Đinh Quang Hải", "gender": "Nam", "dob": "2008-10-10", "group": 3, "officerRole": "Tổ trưởng Tổ 3"},
        {"id": "hs-10", "code": "HS10", "fullName": "Ngô Thùy Chi", "gender": "Nữ", "dob": "2008-12-03", "group": 4, "officerRole": "Thành viên"},
        {"id": "hs-11", "code": "HS11", "fullName": "Dương Bảo Nam", "gender": "Nam", "dob": "2008-06-22", "group": 4, "officerRole": "Tổ trưởng Tổ 4"},
        {"id": "hs-12", "code": "HS12", "fullName": "Trịnh Mỹ Duyên", "gender": "Nữ", "dob": "2008-04-09", "group": 4, "officerRole": "Thành viên"},
        {"id": "hs-13", "code": "HS13", "fullName": "Lý Gia Bảo", "gender": "Nam", "dob": "2008-01-17", "group": 1, "officerRole": "Thành viên"},
        {"id": "hs-14", "code": "HS14", "fullName": "Mai Cẩm Vân", "gender": "Nữ", "dob": "2008-08-30", "group": 2, "officerRole": "Thành viên"}
    ]
    existing_ids = {s['id'] for s in initial_students}
    for add in additional_needed:
        if add['id'] not in existing_ids:
            initial_students.append({
                "id": add["id"],
                "tenantId": "tenant-lan-nguyen",
                "classId": "class-11a1-2025",
                "code": add["code"],
                "anonymousCode": f"ANON-{add['id']}",
                "fullName": add["fullName"],
                "gender": add["gender"],
                "dob": add["dob"],
                "group": add["group"],
                "officerRole": add["officerRole"],
                "avatar": None,
                "phone": "0912 345 678",
                "email": f"{add['id']}@lhp.edu.vn",
                "address": "TP. Hồ Chí Minh",
                "status": "Đang học",
                "studentActivationToken": f"STU-{add['code']}-11A1",
                "parentActivationToken": f"PAR-{add['code']}-11A1"
            })

print(f"Generated initialStudents count: {len(initial_students)}")
