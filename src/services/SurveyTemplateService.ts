/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SurveyTemplate,
  SurveySection,
  SurveyQuestion,
  SurveyQuestionType,
  SurveyTemplateStatus
} from '../types';
import { tenantService } from './TenantService';
import { classService } from './ClassService';
import { authService } from './AuthService';
import { safeLocalStorageSet, safeLocalStorageGet } from '../utils/storageUtils';

import { inAppNotificationService } from './InAppNotificationService';
import { surveyRepositoryClient } from './SurveyRepositoryClient';

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const createDefaultGrade12Template = (tenantId: string, schoolYear: string): SurveyTemplate => ({
  id: `template-grade12-default-v1`,
  tenantId,
  classId: 'class-12a1',
  schoolYear,
  title: 'Phiếu Khảo sát Toàn diện Đầu năm Lớp 12',
  description: 'Khảo sát thông tin học sinh, điều kiện học tập, định hướng thi tốt nghiệp THPT, nghề nghiệp và kỳ vọng năm học mới.',
  surveyType: 'GRADE12_START_YEAR',
  version: 1,
  status: 'PUBLISHED',
  targetAudience: ['STUDENT'],
  scope: 'CLASS',
  creatorRole: 'TEACHER',
  createdAt: '2025-09-01T00:00:00.000Z',
  updatedAt: '2025-09-01T00:00:00.000Z',
  publishedAt: '2025-09-01T00:00:00.000Z',
  createdBy: 'GVCN Mai Lan',
  publishedBy: 'GVCN Mai Lan',
  source: 'MANUAL',
  sections: [
    {
      id: 'sec-1',
      title: '1. Thông tin cá nhân & Gia đình',
      description: 'Cập nhật thông tin liên lạc và người thân khi cần hỗ trợ khẩn cấp.',
      order: 1,
      questions: [
        {
          id: 'q-contact-phone',
          key: 'contact.phone',
          title: 'Số điện thoại cá nhân học sinh (hoặc Zalo thường dùng):',
          type: 'SHORT_TEXT',
          required: false,
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-contact-emerg-name',
          key: 'contact.emergencyContactName',
          title: 'Họ và tên người liên hệ khẩn cấp (Bố/Mẹ/Người giám hộ):',
          type: 'SHORT_TEXT',
          required: true,
          order: 2,
          visibility: 'NORMAL'
        },
        {
          id: 'q-contact-emerg-rel',
          key: 'contact.emergencyContactRelationship',
          title: 'Mối quan hệ với học sinh:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Bố', 'Mẹ', 'Ông/Bà', 'Anh/Chị', 'Người giám hộ hợp pháp', 'Khác'],
          allowOther: true,
          order: 3,
          visibility: 'NORMAL'
        },
        {
          id: 'q-contact-emerg-phone',
          key: 'contact.emergencyContactPhone',
          title: 'Số điện thoại người liên hệ khẩn cấp:',
          type: 'SHORT_TEXT',
          required: true,
          order: 4,
          visibility: 'NORMAL'
        },
        {
          id: 'q-contact-living',
          key: 'contact.livingWith',
          title: 'Hiện tại em đang sinh sống cùng ai?',
          type: 'MULTI_CHOICE',
          required: false,
          options: ['Bố mẹ', 'Chỉ ở với Bố', 'Chỉ ở với Mẹ', 'Ở cùng Ông Bà', 'Ở trọ / Ký túc xá', 'Ở cùng người thân khác', 'Khác'],
          allowOther: true,
          order: 5,
          visibility: 'NORMAL'
        }
      ]
    },
    {
      id: 'sec-2',
      title: '2. Điều kiện & Hoàn cảnh học tập',
      description: 'Giúp GVCN hiểu rõ môi trường và trang thiết bị học tập tại nhà.',
      order: 2,
      questions: [
        {
          id: 'q-family-conditions',
          key: 'familyAndLearningConditions.learningConditions',
          title: 'Điều kiện học tập tại nhà của em:',
          type: 'MULTI_CHOICE',
          required: false,
          options: [
            'Có góc học tập riêng yên tĩnh',
            'Có máy tính/laptop kết nối mạng tốt',
            'Có điện thoại thông minh phục vụ học tập',
            'Không gian học chung với người khác',
            'Thiếu thiết bị học tập trực tuyến',
            'Khác'
          ],
          allowOther: true,
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-family-support',
          key: 'familyAndLearningConditions.familyWorkSupportLevel',
          title: 'Mức độ hỗ trợ / thời gian dành cho việc học năm lớp 12:',
          type: 'SINGLE_CHOICE',
          required: false,
          options: [
            'Rất thuận lợi, chỉ tập trung học',
            'Thuận lợi, thỉnh thoảng phụ giúp việc nhà',
            'Khá bận, phải phụ giúp công việc gia đình nhiều',
            'Gặp nhiều áp lực về thời gian tự học'
          ],
          order: 2,
          visibility: 'NORMAL'
        }
      ]
    },
    {
      id: 'sec-3',
      title: '3. Tự đánh giá Năng lực Học tập',
      description: 'Nhận diện thế mạnh và các môn cần cải thiện trong năm lớp 12.',
      order: 3,
      questions: [
        {
          id: 'q-acad-strong',
          key: 'academicSelfAssessment.strongSubjects',
          title: 'Những môn học em tự tin nhất hoặc có kết quả tốt nhất:',
          type: 'MULTI_CHOICE',
          required: false,
          options: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Tin học', 'GD Kinh tế & Pháp luật', 'Khác'],
          allowOther: true,
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-acad-support',
          key: 'academicSelfAssessment.supportSubjects',
          title: 'Những môn học em cảm thấy còn yếu, cần thầy cô hỗ trợ nhiều hơn:',
          type: 'MULTI_CHOICE',
          required: false,
          options: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Tin học', 'GD Kinh tế & Pháp luật', 'Khác'],
          allowOther: true,
          order: 2,
          visibility: 'NORMAL'
        },
        {
          id: 'q-acad-diff',
          key: 'academicSelfAssessment.difficulties',
          title: 'Khó khăn chính em thường gặp phải trong học tập:',
          type: 'MULTI_CHOICE',
          required: false,
          options: [
            'Khó tập trung khi tự học',
            'Quản lý thời gian và sắp xếp lịch ôn thi',
            'Hổng kiến thức nền tảng các lớp dưới',
            'Áp lực thi cử và kỳ vọng gia đình',
            'Thiếu phương pháp học tập hiệu quả',
            'Khác'
          ],
          allowOther: true,
          order: 3,
          visibility: 'NORMAL'
        }
      ]
    },
    {
      id: 'sec-4',
      title: '4. Dự định Thi Tốt nghiệp THPT & Hướng nghiệp',
      description: 'Dự kiến môn thi tự chọn và ngành nghề mục tiêu sau khi tốt nghiệp.',
      order: 4,
      questions: [
        {
          id: 'q-grad-sub1',
          key: 'graduationPlan.electiveSubject1',
          title: 'Môn thi tự chọn 1 dự kiến:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Tin học', 'Công nghệ', 'Tiếng Anh', 'Chưa xác định'],
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-grad-sub2',
          key: 'graduationPlan.electiveSubject2',
          title: 'Môn thi tự chọn 2 dự kiến:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Tin học', 'Công nghệ', 'Tiếng Anh', 'Chưa xác định'],
          order: 2,
          visibility: 'NORMAL'
        },
        {
          id: 'q-career-plan',
          key: 'careerOrientation.postHighSchoolPlan',
          title: 'Dự định chính sau khi tốt nghiệp THPT:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Thi Đại học công lập', 'Thi Đại học tư thục / Quốc tế', 'Học Cao đẳng / Trung cấp nghề', 'Du học', 'Đi làm ngay', 'Khác'],
          allowOther: true,
          order: 3,
          visibility: 'NORMAL'
        },
        {
          id: 'q-career-target',
          key: 'careerOrientation.targetCareerAndSchool',
          title: 'Ngành nghề / Trường ĐH-CĐ mơ ước của em:',
          type: 'SHORT_TEXT',
          required: false,
          order: 4,
          visibility: 'NORMAL'
        }
      ]
    },
    {
      id: 'sec-5',
      title: '5. Năng lực Số, Ứng dụng AI & Nguyện vọng Lớp',
      description: 'Kỹ năng công nghệ, thói quen học tập với AI và đề xuất ban cán sự.',
      order: 5,
      questions: [
        {
          id: 'q-ai-habit',
          key: 'talentsAndDigitalSkills.aiVerificationHabit',
          title: 'Thói quen khi sử dụng AI (ChatGPT, Gemini) trong học tập:',
          type: 'SINGLE_CHOICE',
          required: false,
          options: [
            'Luôn kiểm tra lại đối chiếu với SGK và thầy cô',
            'Chỉ dùng để tìm ý tưởng và gợi ý cách giải',
            'Thỉnh thoảng dùng trực tiếp không kiểm chứng',
            'Chưa từng dùng AI'
          ],
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-lead-pos',
          key: 'leadershipProposal.desiredPosition',
          title: 'Nguyện vọng tham gia Ban Cán sự Lớp hoặc Tổ trưởng:',
          type: 'SINGLE_CHOICE',
          required: false,
          options: [
            'Lớp trưởng',
            'Lớp phó Học tập',
            'Lớp phó Phong trào / Văn thể mỹ',
            'Lớp phó Đời sống / Lao động',
            'Tổ trưởng / Tổ phó',
            'Tổ Kỹ thuật & CNTT',
            'Chỉ muốn là thành viên tích cực',
            'Khác'
          ],
          allowOther: true,
          order: 2,
          visibility: 'NORMAL'
        },
        {
          id: 'q-expect-class',
          key: 'classAndTeacherExpectations.classExpectations',
          title: 'Mong muốn đối với tập thể lớp năm học 12:',
          type: 'MULTI_CHOICE',
          required: false,
          options: [
            'Lớp đoàn kết, giúp đỡ nhau cùng tiến bộ',
            'Tạo môi trường học tập sôi nổi, không khí vui vẻ',
            'Hạn chế ồn ào trong giờ tự học',
            'Nhiều hoạt động ngoại khóa / kỷ niệm đáng nhớ',
            'Khác'
          ],
          allowOther: true,
          order: 3,
          visibility: 'NORMAL'
        },
        {
          id: 'q-expect-teacher',
          key: 'classAndTeacherExpectations.teacherExpectations',
          title: 'Mong muốn đối với Giáo viên Chủ nhiệm:',
          type: 'MULTI_CHOICE',
          required: false,
          options: [
            'Lắng nghe, thấu hiểu tâm lý học sinh',
            'Tư vấn nhiệt tình về định hướng tương lai và thi cử',
            'Công bằng, nghiêm minh nhưng bao dung',
            'Tổ chức nhiều buổi sinh hoạt lớp bổ ích',
            'Khác'
          ],
          allowOther: true,
          order: 4,
          visibility: 'TEACHER_ONLY'
        }
      ]
    }
  ]
});

export const createDefaultConductEvaluationTemplate = (tenantId: string, schoolYear: string): SurveyTemplate => ({
  id: `template-conduct-hk1`,
  tenantId,
  classId: 'class-12a1',
  schoolYear,
  title: 'Tự đánh giá kết quả rèn luyện - Học kỳ I',
  description: 'Khảo sát học viên tự đánh giá và xếp loại kết quả rèn luyện học kỳ I để làm cơ sở cho phiên họp đánh giá định kỳ của lớp.',
  surveyType: 'CUSTOM',
  version: 1,
  status: 'PUBLISHED',
  targetAudience: ['STUDENT'],
  scope: 'CLASS',
  creatorRole: 'TEACHER',
  createdAt: '2025-12-15T00:00:00.000Z',
  updatedAt: '2025-12-15T00:00:00.000Z',
  publishedAt: '2025-12-15T00:00:00.000Z',
  createdBy: 'GVCN Mai Lan',
  publishedBy: 'GVCN Mai Lan',
  source: 'MANUAL',
  sections: [
    {
      id: 'sec-conduct-self-eval',
      title: 'Tự đánh giá kết quả rèn luyện',
      description: 'Học sinh căn cứ vào các quy định và kết quả thực hiện nề nếp trong học kỳ để tự đánh giá.',
      order: 1,
      questions: [
        {
          id: 'q-conduct-self-grade',
          key: 'conductSelfEvaluation.grade',
          title: 'Học viên tự đánh giá xếp loại rèn luyện của mình:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'],
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-conduct-note',
          key: 'conductSelfEvaluation.note',
          title: 'Minh chứng, thành tích hoặc lý do tự nhận mức xếp loại:',
          type: 'LONG_TEXT',
          required: false,
          description: 'VD: Chấp hành tốt nội quy, đi học chuyên cần, tích cực tham gia phong trào...',
          order: 2,
          visibility: 'NORMAL'
        },
        {
          id: 'q-conduct-commitment',
          key: 'conductSelfEvaluation.commitment',
          title: 'Phương hướng, mục tiêu rèn luyện trong thời gian tới:',
          type: 'SHORT_TEXT',
          required: false,
          description: 'VD: Khắc phục việc đi học muộn, cố gắng đạt 100 điểm nề nếp...',
          order: 3,
          visibility: 'NORMAL'
        }
      ]
    }
  ]
});

export const createDefaultParentPartnershipTemplate = (tenantId: string, schoolYear: string): SurveyTemplate => ({
  id: 'template-parent-partnership-v1',
  tenantId,
  classId: 'class-12a1',
  schoolYear,
  title: 'Khảo sát Mức độ Phối hợp giữa Gia đình & Nhà trường',
  description: 'Khảo sát định kỳ lấy ý kiến Phụ huynh học sinh về công tác chủ nhiệm, tình hình học tập và sự đồng hành giáo dục giữa gia đình và nhà trường.',
  surveyType: 'PARENT_PARTNERSHIP',
  version: 1,
  status: 'PUBLISHED',
  targetAudience: ['PARENT'],
  scope: 'SYSTEM',
  creatorRole: 'SUPER_ADMIN',
  createdAt: '2025-09-01T00:00:00.000Z',
  updatedAt: '2025-09-01T00:00:00.000Z',
  publishedAt: '2025-09-01T00:00:00.000Z',
  createdBy: 'Ban Giám hiệu & Ban Quản trị Hệ thống',
  publishedBy: 'Ban Quản trị Hệ thống',
  source: 'SYSTEM_DEFAULT',
  sections: [
    {
      id: 'sec-parent-1',
      title: '1. Thông tin phụ huynh & Thời gian đồng hành cùng con',
      description: 'Cập nhật tình hình trao đổi thông tin và thời gian biểu của gia đình.',
      order: 1,
      questions: [
        {
          id: 'q-parent-contact-pref',
          key: 'parentInfo.contactPreference',
          title: 'Kênh liên lạc chính phụ huynh mong muốn trao đổi cùng GVCN:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Zalo cá nhân / Nhóm lớp', 'Gọi điện thoại trực tiếp', 'Sổ liên lạc điện tử / Ứng dụng', 'Gặp mặt trực tiếp tại trường'],
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-parent-daily-study-time',
          key: 'parentInfo.dailyStudyTime',
          title: 'Thời gian con tự học ở nhà mỗi buổi tối (theo quan sát của phụ huynh):',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Dưới 1 tiếng', 'Từ 1 - 2 tiếng', 'Từ 2 - 3 tiếng', 'Trên 3 tiếng'],
          order: 2,
          visibility: 'NORMAL'
        }
      ]
    },
    {
      id: 'sec-parent-2',
      title: '2. Đánh giá chất lượng phối hợp thông tin & Hoạt động giáo dục',
      description: 'Ý kiến đóng góp về hiệu quả thông tin nề nếp, kết quả học tập và phong trào.',
      order: 2,
      questions: [
        {
          id: 'q-parent-info-timeliness',
          key: 'partnership.infoTimeliness',
          title: 'Mức độ kịp thời, rõ ràng của các thông báo từ GVCN và Nhà trường:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Rất kịp thời và minh bạch', 'Khá kịp thời', 'Bình thường', 'Cần thông báo sớm hơn'],
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-parent-satisfaction',
          key: 'partnership.satisfactionLevel',
          title: 'Mức độ hài lòng chung về sự quan tâm, đồng hành của GVCN đối với học sinh:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Rất hài lòng', 'Hài lòng', 'Bình thường', 'Chưa hài lòng'],
          order: 2,
          visibility: 'NORMAL'
        },
        {
          id: 'q-parent-feedback',
          key: 'partnership.feedback',
          title: 'Ý kiến đóng góp hoặc nguyện vọng gia đình gửi tới GVCN và Nhà trường:',
          type: 'LONG_TEXT',
          required: false,
          description: 'Mọi chia sẻ của quý phụ huynh là cơ sở để GVCN hỗ trợ con em đạt kết quả tốt nhất.',
          order: 3,
          visibility: 'NORMAL'
        }
      ]
    }
  ]
});

export const createDefaultTeacherDigitalTemplate = (tenantId: string, schoolYear: string): SurveyTemplate => ({
  id: 'template-teacher-digital-v1',
  tenantId,
  classId: 'class-12a1',
  schoolYear,
  title: 'Khảo sát Nhu cầu Chuyển đổi số & Công tác Chủ nhiệm Lớp',
  description: 'Khảo sát ý kiến GVCN nhằm nâng cao hiệu quả công tác chủ nhiệm, áp dụng công nghệ số và hỗ trợ học sinh toàn diện.',
  surveyType: 'TEACHER_SURVEY',
  version: 1,
  status: 'PUBLISHED',
  targetAudience: ['TEACHER'],
  scope: 'SYSTEM',
  creatorRole: 'SUPER_ADMIN',
  createdAt: '2025-09-01T00:00:00.000Z',
  updatedAt: '2025-09-01T00:00:00.000Z',
  publishedAt: '2025-09-01T00:00:00.000Z',
  createdBy: 'Ban Quản trị Hệ thống',
  publishedBy: 'Ban Quản trị Hệ thống',
  source: 'SYSTEM_DEFAULT',
  sections: [
    {
      id: 'sec-teacher-1',
      title: '1. Thực trạng ứng dụng công nghệ trong quản lý chủ nhiệm',
      description: 'Đánh giá mức độ thuận tiện khi sử dụng các tính năng quản lý lớp trực tuyến.',
      order: 1,
      questions: [
        {
          id: 'q-teacher-tech-usage',
          key: 'teacherTech.frequency',
          title: 'Tần suất thầy/cô sử dụng công cụ số để điểm danh và theo dõi nề nếp lớp:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: ['Hàng ngày', 'Nhiều lần trong tuần', 'Thỉnh thoảng', 'Hiếm khi'],
          order: 1,
          visibility: 'NORMAL'
        },
        {
          id: 'q-teacher-biggest-painpoint',
          key: 'teacherTech.painPoint',
          title: 'Khó khăn lớn nhất trong công tác chủ nhiệm hiện nay của thầy/cô:',
          type: 'SINGLE_CHOICE',
          required: true,
          options: [
            'Tổng hợp và xử lý số liệu học sinh tốn thời gian',
            'Kết nối và thông tin hai chiều với phụ huynh chưa kịp thời',
            'Theo dõi sự tiến bộ và phân hóa học sinh còn thủ công',
            'Khác'
          ],
          allowOther: true,
          order: 2,
          visibility: 'NORMAL'
        },
        {
          id: 'q-teacher-proposal',
          key: 'teacherTech.proposals',
          title: 'Đề xuất nâng cấp tính năng hoặc hỗ trợ từ Ban Giám hiệu:',
          type: 'LONG_TEXT',
          required: false,
          order: 3,
          visibility: 'NORMAL'
        }
      ]
    }
  ]
});

class SurveyTemplateService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private templates: SurveyTemplate[] = [];
  private listeners: Set<() => void> = new Set();
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.notify();
      }
    });

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('kgcns_survey_templates_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'TEMPLATES_UPDATED' && event.data?.tenantId === this.activeTenantId) {
            this.loadFromStorage(this.activeTenantId);
            this.notify(false);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported for templates', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        const expectedKey = tenantService.getTenantStorageKey('survey_templates', this.activeTenantId);
        if (e.key === expectedKey) {
          this.loadFromStorage(this.activeTenantId);
          this.notify(false);
        }
      });
    }
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    const storageKey = tenantService.getTenantStorageKey('survey_templates', tId);
    const currentYear = classService.getSettings().academicYear || '2025 - 2026';
    const defaultTemplate = createDefaultGrade12Template(tId, currentYear);
    const conductTemplate = createDefaultConductEvaluationTemplate(tId, currentYear);
    const parentTemplate = createDefaultParentPartnershipTemplate(tId, currentYear);
    const teacherTemplate = createDefaultTeacherDigitalTemplate(tId, currentYear);

    try {
      const saved = safeLocalStorageGet(storageKey);
      if (saved !== null && saved !== undefined) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normalize existing templates to ensure audience, scope, and creatorRole are accurately assigned
          const normalized = parsed.map(t => {
            let creatorRole = t.creatorRole;
            let scope = t.scope;
            if (!creatorRole) {
              if (
                t.createdBy?.includes('GVCN') ||
                t.createdBy?.includes('Mai Lan') ||
                t.createdBy?.includes('Giáo viên') ||
                t.id === 'template-grade12-default-v1' ||
                t.id === 'template-conduct-hk1' ||
                t.classId === 'class-12a1'
              ) {
                creatorRole = 'TEACHER';
              } else if (
                t.createdBy?.includes('Admin') ||
                t.createdBy?.includes('Ban Quản trị') ||
                t.createdBy?.includes('Ban Giám hiệu') ||
                t.id === 'template-parent-partnership-v1' ||
                t.id === 'template-teacher-digital-v1'
              ) {
                creatorRole = 'SUPER_ADMIN';
              } else {
                creatorRole = 'TEACHER';
              }
            }
            if (!scope) {
              scope = creatorRole === 'SUPER_ADMIN' ? 'SYSTEM' : 'CLASS';
            }
            return {
              ...t,
              scope,
              creatorRole,
              targetAudience: t.targetAudience && Array.isArray(t.targetAudience) && t.targetAudience.length > 0
                ? t.targetAudience
                : ['STUDENT']
            };
          });

          this.templates = normalized;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load survey templates', e);
    }

    // Seed default templates only if completely uninitialized (saved === null)
    this.templates = [defaultTemplate, conductTemplate, parentTemplate, teacherTemplate];
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      const storageKey = tenantService.getTenantStorageKey('survey_templates', this.activeTenantId);
      safeLocalStorageSet(storageKey, JSON.stringify(this.templates));
      this.notify(true);
    } catch (e) {
      console.warn('Failed to save survey templates', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(broadcast: boolean = true) {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in SurveyTemplateService listener', err);
      }
    });

    if (broadcast && this.channel) {
      try {
        this.channel.postMessage({
          type: 'TEMPLATES_UPDATED',
          tenantId: this.activeTenantId,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn('Failed to broadcast template update', e);
      }
    }
  }

  public getAll(): SurveyTemplate[] {
    return [...this.templates];
  }

  public getAllTemplates(): SurveyTemplate[] {
    return this.getAll();
  }

  public getTemplatesBySchoolYear(schoolYear?: string): SurveyTemplate[] {
    if (!schoolYear) return this.getAll();
    return this.templates.filter((t) => !t.schoolYear || t.schoolYear === schoolYear);
  }

  /**
   * Get surveys assigned to GVCN (Teacher) to complete
   */
  public getAssignedSurveysForTeacher(schoolYear?: string): SurveyTemplate[] {
    const list = this.getTemplatesBySchoolYear(schoolYear);
    return list.filter(t => 
      t.status === 'PUBLISHED' && 
      Array.isArray(t.targetAudience) && 
      t.targetAudience.includes('TEACHER')
    );
  }

  /**
   * Get surveys intended for Parents
   */
  public getParentSurveys(schoolYear?: string): SurveyTemplate[] {
    const list = this.getTemplatesBySchoolYear(schoolYear);
    return list.filter(t => 
      t.status === 'PUBLISHED' && 
      Array.isArray(t.targetAudience) && 
      t.targetAudience.includes('PARENT')
    );
  }

  /**
   * Get surveys intended for Students
   */
  public getStudentSurveys(schoolYear?: string): SurveyTemplate[] {
    const list = this.getTemplatesBySchoolYear(schoolYear);
    return list.filter(t => 
      t.status === 'PUBLISHED' && 
      Array.isArray(t.targetAudience) && 
      t.targetAudience.includes('STUDENT')
    );
  }

  /**
   * Get templates for a specific role or context
   */
  public getTemplatesForRole(role: string, schoolYear?: string): SurveyTemplate[] {
    const list = this.getTemplatesBySchoolYear(schoolYear);
    if (role === 'SUPER_ADMIN') {
      return list;
    }
    if (role === 'PARENT') {
      return this.getParentSurveys(schoolYear);
    }
    if (role === 'STUDENT' || role === 'CLASS_OFFICER') {
      return this.getStudentSurveys(schoolYear);
    }
    if (role === 'TEACHER') {
      // Teachers manage class surveys + see their assigned surveys
      return list.filter(t => 
        (Array.isArray(t.targetAudience) && t.targetAudience.includes('TEACHER')) ||
        t.scope !== 'SYSTEM' ||
        t.creatorRole === 'TEACHER'
      );
    }
    return list;
  }

  public getById(id: string): SurveyTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  public getTemplateById(id: string): SurveyTemplate | undefined {
    return this.getById(id);
  }

  public getPublishedTemplate(surveyType: string = 'GRADE12_START_YEAR', schoolYear?: string): SurveyTemplate | undefined {
    const year = schoolYear || classService.getSettings().academicYear || '2025 - 2026';
    // Find published template matching type and year, or just type
    const found = this.templates.find(
      (t) => t.status === 'PUBLISHED' && t.surveyType === surveyType && (!t.schoolYear || t.schoolYear === year)
    );
    if (found) return found;

    // Fallback to any published template of that type
    return this.templates.find((t) => t.status === 'PUBLISHED' && t.surveyType === surveyType);
  }

  /**
   * Helper to determine whether a template is created by Admin / System
   */
  public isSystemOrAdminTemplate(template?: SurveyTemplate | null): boolean {
    if (!template) return false;
    // Explicit creatorRole takes highest priority
    if (template.creatorRole === 'TEACHER' || template.scope === 'CLASS') {
      return false;
    }
    if (template.creatorRole === 'SUPER_ADMIN' || template.scope === 'SYSTEM') {
      return true;
    }
    // Check createdBy string as fallback
    if (
      template.createdBy &&
      (template.createdBy.includes('Admin') ||
        template.createdBy.includes('Ban Quản trị') ||
        template.createdBy.includes('Ban Giám hiệu'))
    ) {
      return true;
    }
    return false;
  }

  /**
   * Check if a user with a given role has permission to edit/delete/manage a template
   */
  public canUserManageTemplate(userRole: string, template?: SurveyTemplate | null): boolean {
    if (!template) return false;
    if (userRole === 'SUPER_ADMIN') return true;
    return !this.isSystemOrAdminTemplate(template);
  }

  /**
   * Create a new custom template in DRAFT status
   */
  public createTemplate(data: Partial<SurveyTemplate>): SurveyTemplate {
    const currentUser = authService.getCurrentUser();
    const classSettings = classService.getSettings();
    const schoolYear = data.schoolYear || classSettings.academicYear || '2025 - 2026';
    const now = new Date().toISOString();

    if (currentUser.role !== 'SUPER_ADMIN' && (data.scope === 'SYSTEM' || data.creatorRole === 'SUPER_ADMIN')) {
      throw new Error('FORBIDDEN_SCOPE: Chỉ Quản trị viên hệ thống mới có thể tạo khảo sát cấp hệ thống.');
    }

    const newTemplate: SurveyTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: this.activeTenantId,
      classId: data.classId || classSettings.id || 'class-12a1',
      schoolYear,
      title: data.title || 'Biểu mẫu khảo sát mới',
      description: data.description || '',
      surveyType: data.surveyType || 'CUSTOM',
      version: 1,
      status: 'DRAFT',
      sections: data.sections || [],
      targetAudience: data.targetAudience || ['STUDENT'],
      scope: data.scope || (currentUser.role === 'SUPER_ADMIN' ? 'SYSTEM' : 'CLASS'),
      creatorRole: data.creatorRole || (currentUser.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'TEACHER'),
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.name || 'Ban Quản trị Hệ thống',
      source: data.source || 'MANUAL'
    };

    this.templates.unshift(newTemplate);
    this.saveToStorage();
    return newTemplate;
  }

  /**
   * Update an existing draft template
   */
  public updateDraftTemplate(id: string, patch: Partial<SurveyTemplate>): SurveyTemplate {
    const targetIndex = this.templates.findIndex((t) => t.id === id);
    if (targetIndex === -1) {
      throw new Error('TEMPLATE_NOT_FOUND: Không tìm thấy biểu mẫu khảo sát.');
    }

    const current = this.templates[targetIndex];
    const currentUser = authService.getCurrentUser();
    if (currentUser.role !== 'SUPER_ADMIN' && this.isSystemOrAdminTemplate(current)) {
      throw new Error('FORBIDDEN_ADMIN_SURVEY: Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN không có quyền chỉnh sửa cấu trúc biểu mẫu.');
    }

    if (current.status !== 'DRAFT') {
      throw new Error('IMMUTABLE_TEMPLATE: Không thể chỉnh sửa trực tiếp biểu mẫu đã xuất bản hoặc đã lưu trữ. Vui lòng tạo phiên bản mới.');
    }

    const updated: SurveyTemplate = {
      ...current,
      ...patch,
      id: current.id,
      tenantId: current.tenantId,
      version: current.version,
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    };

    this.templates[targetIndex] = updated;
    this.saveToStorage();
    return updated;
  }

  /**
   * Create a new draft version from an existing PUBLISHED template
   */
  public createVersionDraft(publishedTemplateId: string): SurveyTemplate {
    const source = this.templates.find((t) => t.id === publishedTemplateId);
    if (!source) {
      throw new Error('SOURCE_TEMPLATE_NOT_FOUND: Không tìm thấy biểu mẫu nguồn.');
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser.role !== 'SUPER_ADMIN' && this.isSystemOrAdminTemplate(source)) {
      throw new Error('FORBIDDEN_ADMIN_SURVEY: Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN không có quyền tạo phiên bản sửa đổi.');
    }

    const now = new Date().toISOString();

    // Determine highest version for this surveyType / title
    const existingVersions = this.templates
      .filter((t) => t.surveyType === source.surveyType)
      .map((t) => t.version);
    const maxVersion = Math.max(...existingVersions, source.version);
    const nextVersion = maxVersion + 1;

    // Deep copy sections with fresh ids if needed or keep keys
    const clonedSections: SurveySection[] = JSON.parse(JSON.stringify(source.sections || []));

    const draftVersion: SurveyTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: this.activeTenantId,
      classId: source.classId,
      schoolYear: source.schoolYear,
      title: source.title,
      description: source.description,
      surveyType: source.surveyType,
      version: nextVersion,
      status: 'DRAFT',
      sections: clonedSections,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.name || 'Giáo viên',
      source: source.source || 'MANUAL'
    };

    this.templates.unshift(draftVersion);
    this.saveToStorage();
    return draftVersion;
  }

  /**
   * Duplicate a template into a fresh DRAFT
   */
  public duplicateTemplate(templateId: string): SurveyTemplate {
    const source = this.templates.find((t) => t.id === templateId);
    if (!source) {
      throw new Error('SOURCE_TEMPLATE_NOT_FOUND: Không tìm thấy biểu mẫu nguồn.');
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser.role !== 'SUPER_ADMIN' && this.isSystemOrAdminTemplate(source)) {
      throw new Error('FORBIDDEN_ADMIN_SURVEY: Không thể nhân bản khảo sát cấp hệ thống của Quản trị viên.');
    }

    const now = new Date().toISOString();

    const clonedSections: SurveySection[] = JSON.parse(JSON.stringify(source.sections || []));

    const duplicate: SurveyTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: this.activeTenantId,
      classId: source.classId,
      schoolYear: source.schoolYear,
      title: `${source.title} (Bản sao)`,
      description: source.description,
      surveyType: source.surveyType === 'GRADE12_START_YEAR' ? 'CUSTOM' : source.surveyType,
      version: 1,
      status: 'DRAFT',
      sections: clonedSections,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.name || 'Giáo viên',
      source: source.source || 'MANUAL'
    };

    this.templates.unshift(duplicate);
    this.saveToStorage();
    return duplicate;
  }

  /**
   * Rename an existing survey template in place without modifying its ID, version, or responses
   */
  public renameTemplate(templateId: string, newTitle: string): SurveyTemplate {
    const trimmed = (newTitle || '').trim();
    if (!trimmed) {
      throw new Error('INVALID_TITLE: Tên bài khảo sát không được để trống.');
    }

    const targetIndex = this.templates.findIndex((t) => t.id === templateId);
    if (targetIndex === -1) {
      throw new Error('TEMPLATE_NOT_FOUND: Không tìm thấy bài khảo sát cần đổi tên.');
    }

    const current = this.templates[targetIndex];
    const currentUser = authService.getCurrentUser();
    if (currentUser.role !== 'SUPER_ADMIN' && this.isSystemOrAdminTemplate(current)) {
      throw new Error('FORBIDDEN_ADMIN_SURVEY: Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN không có quyền đổi tên.');
    }

    const now = new Date().toISOString();
    const updated: SurveyTemplate = {
      ...current,
      title: trimmed,
      updatedAt: now
    };

    this.templates[targetIndex] = updated;
    this.saveToStorage();

    // Async sync to server
    surveyRepositoryClient.renameTemplate(templateId, trimmed).catch((err) => {
      console.warn('[SurveyTemplateService] Server rename notice:', err);
    });

    return updated;
  }

  /**
   * Delete or archive a survey template according to data protection rules:
   * - 0 responses -> Hard delete (allowed for DRAFT, ARCHIVED, or unresponded surveys)
   * - Has responses -> Archive to protect history and student response integrity
   */
  public deleteOrArchiveSurvey(
    templateId: string,
    hasResponses: boolean = false
  ): { action: 'DELETED' | 'ARCHIVED'; message: string; template?: SurveyTemplate } {
    const target = this.templates.find((t) => t.id === templateId);
    if (!target) {
      throw new Error('TEMPLATE_NOT_FOUND: Không tìm thấy bài khảo sát.');
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser.role !== 'SUPER_ADMIN' && this.isSystemOrAdminTemplate(target)) {
      throw new Error('FORBIDDEN_ADMIN_SURVEY: Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN không có quyền xóa hoặc lưu trữ.');
    }

    // Safety rule: If no responses exist, allow hard delete
    if (!hasResponses) {
      this.templates = this.templates.filter((t) => t.id !== templateId);
      this.saveToStorage();

      surveyRepositoryClient.deleteTemplate(templateId).catch((err) => {
        console.warn('[SurveyTemplateService] Server delete notice:', err);
      });

      return {
        action: 'DELETED',
        message: `Đã xóa bài khảo sát "${target.title}" thành công.`
      };
    }

    // Otherwise, archive to preserve response data and historical records
    const archived = this.archiveTemplate(templateId);
    return {
      action: 'ARCHIVED',
      message: `Bài khảo sát "${target.title}" đã được chuyển sang trạng thái Lưu trữ để bảo toàn dữ liệu phản hồi của học sinh.`,
      template: archived
    };
  }

  /**
   * Delete a template with 0 responses
   */
  public deleteDraft(templateId: string): void {
    const target = this.templates.find((t) => t.id === templateId);
    if (!target) return;

    const currentUser = authService.getCurrentUser();
    if (currentUser.role !== 'SUPER_ADMIN' && this.isSystemOrAdminTemplate(target)) {
      throw new Error('FORBIDDEN_ADMIN_SURVEY: Khảo sát này do Ban Quản trị Hệ thống tạo. GVCN không có quyền xóa.');
    }

    this.templates = this.templates.filter((t) => t.id !== templateId);
    this.saveToStorage();

    surveyRepositoryClient.deleteTemplate(templateId).catch((err) => {
      console.warn('[SurveyTemplateService] Server delete draft notice:', err);
    });
  }

  /**
   * Validate a template before publishing
   */
  public validateTemplate(template: SurveyTemplate): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!template.title || template.title.trim() === '') {
      errors.push('Tên biểu mẫu khảo sát không được để trống.');
    }

    if (!template.sections || template.sections.length === 0) {
      errors.push('Biểu mẫu phải có ít nhất 1 phần khảo sát.');
    }

    const seenKeys = new Set<string>();
    let totalQuestions = 0;

    (template.sections || []).forEach((section, sIdx) => {
      if (!section.title || section.title.trim() === '') {
        errors.push(`Phần số ${sIdx + 1} chưa có tiêu đề.`);
      }

      (section.questions || []).forEach((q, qIdx) => {
        totalQuestions++;
        const qLabel = `[Phần ${sIdx + 1}, Câu ${qIdx + 1}] "${q.title || 'Chưa đặt tên'}"`;

        if (!q.title || q.title.trim() === '') {
          errors.push(`${qLabel}: Nội dung câu hỏi không được để trống.`);
        }

        if (q.needsReview) {
          errors.push(`${qLabel}: Câu hỏi còn đánh dấu Cần kiểm tra (${q.reviewReason || 'Chưa rõ loại câu hỏi'}).`);
        }

        if (q.key) {
          if (seenKeys.has(q.key)) {
            errors.push(`${qLabel}: Khóa định danh (${q.key}) bị trùng lặp.`);
          }
          seenKeys.add(q.key);
        }

        // Choice validation
        if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE' || q.type === 'DROPDOWN') {
          const opts = q.options || [];
          if (opts.length === 0 && !q.allowOther) {
            errors.push(`${qLabel}: Câu hỏi trắc nghiệm phải có ít nhất một lựa chọn trả lời.`);
          }
          if (q.type === 'MULTI_CHOICE' && q.maxSelections) {
            if (q.maxSelections <= 0) {
              errors.push(`${qLabel}: Số lựa chọn tối đa phải lớn hơn 0.`);
            }
            if (q.maxSelections > opts.length + (q.allowOther ? 1 : 0)) {
              warnings.push(`${qLabel}: Số lựa chọn tối đa (${q.maxSelections}) lớn hơn tổng số lựa chọn có sẵn.`);
            }
          }
        }

        // Grid validation
        if (q.type === 'GRID') {
          if (!q.gridRows || q.gridRows.length === 0) {
            errors.push(`${qLabel}: Bảng đánh giá phải có ít nhất một hàng.`);
          }
          if (!q.gridColumns || q.gridColumns.length === 0) {
            errors.push(`${qLabel}: Bảng đánh giá phải có ít nhất một cột đánh giá.`);
          }
        }
      });
    });

    if (totalQuestions === 0) {
      errors.push('Biểu mẫu phải có ít nhất 1 câu hỏi.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Publish a template and broadcast in-app notification to all students
   */
  public publishTemplate(templateId: string): SurveyTemplate {
    const target = this.templates.find((t) => t.id === templateId);
    if (!target) {
      throw new Error('TEMPLATE_NOT_FOUND: Không tìm thấy biểu mẫu cần xuất bản.');
    }

    const validation = this.validateTemplate(target);
    if (!validation.valid) {
      throw new Error(`VALIDATION_FAILED: ${validation.errors.join(' ')}`);
    }

    const currentUser = authService.getCurrentUser();
    const now = new Date().toISOString();

    // Archive only older versions of the same template title/family if they exist
    this.templates = this.templates.map((t) => {
      if (t.id !== templateId && t.title === target.title && t.surveyType === target.surveyType && t.status === 'PUBLISHED') {
        return {
          ...t,
          status: 'ARCHIVED',
          updatedAt: now
        };
      }
      if (t.id === templateId) {
        return {
          ...t,
          status: 'PUBLISHED',
          publishedAt: now,
          publishedBy: currentUser.name || 'Giáo viên',
          updatedAt: now
        };
      }
      return t;
    });

    this.saveToStorage();
    const published = this.templates.find((t) => t.id === templateId)!;

    // Send real-time notification to targeted audiences
    try {
      inAppNotificationService.notifySurveyPublished(
        {
          id: published.id,
          title: published.title,
          description: published.description,
          surveyType: published.surveyType,
          targetAudience: published.targetAudience,
          scope: published.scope
        },
        currentUser
      );
    } catch (err) {
      console.warn('Failed to send survey published notification:', err);
    }

    return published;
  }

  /**
   * Archive an active or published template
   */
  public archiveTemplate(templateId: string): SurveyTemplate {
    const target = this.templates.find((t) => t.id === templateId);
    if (!target) {
      throw new Error('TEMPLATE_NOT_FOUND: Không tìm thấy biểu mẫu.');
    }

    const now = new Date().toISOString();
    this.templates = this.templates.map((t) => {
      if (t.id === templateId) {
        return {
          ...t,
          status: 'ARCHIVED',
          updatedAt: now
        };
      }
      return t;
    });

    this.saveToStorage();
    return this.templates.find((t) => t.id === templateId)!;
  }
}

export const surveyTemplateService = new SurveyTemplateService();
