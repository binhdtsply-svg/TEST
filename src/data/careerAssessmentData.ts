/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MBTIQuestion, MBTIResult, WorkValuesResult, WorkValuesQuestion } from '../types';

export const MBTI_QUESTIONS: MBTIQuestion[] = [
  {
    id: 1,
    dimension: 'EI',
    dimensionName: 'Xu hướng Năng lượng (Hướng ngoại E vs Hướng nội I)',
    text: 'Khi tham gia một buổi sinh hoạt tập thể hoặc câu lạc bộ mới:',
    optionA: { text: 'Chủ động làm quen nhiều bạn mới và cảm thấy tràn đầy năng lượng khi trò chuyện.', trait: 'E', value: 'E' },
    optionB: { text: 'Thích quan sát trước, chỉ trò chuyện sâu với một vài người quen thuộc để giữ năng lượng.', trait: 'I', value: 'I' }
  },
  {
    id: 2,
    dimension: 'EI',
    dimensionName: 'Xu hướng Năng lượng (Hướng ngoại E vs Hướng nội I)',
    text: 'Sau một tuần học tập căng thẳng, cách bạn nạp lại năng lượng hiệu quả nhất là:',
    optionA: { text: 'Đi chơi, tụ tập bạn bè xem phim hoặc tham gia các hoạt động sôi động ngoài trời.', trait: 'E', value: 'E' },
    optionB: { text: 'Ở một mình trong phòng đọc sách, nghe nhạc, chơi game hoặc suy ngẫm yên tĩnh.', trait: 'I', value: 'I' }
  },
  {
    id: 3,
    dimension: 'EI',
    dimensionName: 'Xu hướng Năng lượng (Hướng ngoại E vs Hướng nội I)',
    text: 'Trong giờ thảo luận nhóm trên lớp:',
    optionA: { text: 'Thường vừa nghĩ vừa nói, hào hứng phát biểu ý kiến ngay khi nảy ra ý tưởng.', trait: 'E', value: 'E' },
    optionB: { text: 'Thường suy nghĩ thấu đáo và sắp xếp câu chữ trong đầu trước khi cất lời.', trait: 'I', value: 'I' }
  },
  {
    id: 4,
    dimension: 'SN',
    dimensionName: 'Thu nhận Thông tin (Thực tế S vs Trực giác N)',
    text: 'Khi tiếp nhận một bài học hoặc dự án nghiên cứu mới:',
    optionA: { text: 'Chú trọng vào các chi tiết cụ thể, số liệu thực tế, các ví dụ rõ ràng và ứng dụng thực tiễn.', trait: 'S', value: 'S' },
    optionB: { text: 'Chú trọng vào bức tranh toàn cảnh, các ý tưởng lớn, mối liên hệ trừu tượng và khả năng tương lai.', trait: 'N', value: 'N' }
  },
  {
    id: 5,
    dimension: 'SN',
    dimensionName: 'Thu nhận Thông tin (Thực tế S vs Trực giác N)',
    text: 'Bạn đánh giá cao phong cách làm việc nào hơn:',
    optionA: { text: 'Thực tế, bám sát các phương pháp đã được chứng minh hiệu quả qua thời gian.', trait: 'S', value: 'S' },
    optionB: { text: 'Đổi mới sáng tạo, thử nghiệm những phương pháp hoàn toàn mới mẻ chưa ai từng làm.', trait: 'N', value: 'N' }
  },
  {
    id: 6,
    dimension: 'SN',
    dimensionName: 'Thu nhận Thông tin (Thực tế S vs Trực giác N)',
    text: 'Khi miêu tả một sự kiện bạn vừa chứng kiến:',
    optionA: { text: 'Kể chính xác những gì thực sự đã xảy ra theo đúng trình tự thời gian và chi tiết cụ thể.', trait: 'S', value: 'S' },
    optionB: { text: 'Nhấn mạnh vào ý nghĩa, cảm nhận và những thông điệp ẩn sau sự kiện đó.', trait: 'N', value: 'N' }
  },
  {
    id: 7,
    dimension: 'TF',
    dimensionName: 'Ra Quyết định (Lý trí T vs Cảm xúc F)',
    text: 'Khi đưa ra quyết định giải quyết một vụ việc tranh cãi:',
    optionA: { text: 'Dựa trên sự công bằng, nguyên tắc đúng sai khách quan và phân tích logic không thiên vị.', trait: 'T', value: 'T' },
    optionB: { text: 'Dựa trên sự thấu cảm, cảm xúc của những người liên quan và giữ gìn hòa khí mối quan hệ.', trait: 'F', value: 'F' }
  },
  {
    id: 8,
    dimension: 'TF',
    dimensionName: 'Ra Quyết định (Lý trí T vs Cảm xúc F)',
    text: 'Khi góp ý cho bạn bè về một bài thuyết trình còn thiếu sót:',
    optionA: { text: 'Chỉ rõ thẳng thắn các lỗi sai logic và điểm yếu để bạn sửa chữa nhanh chóng.', trait: 'T', value: 'T' },
    optionB: { text: 'Khen ngợi nỗ lực trước rồi khéo léo góp ý nhẹ nhàng để không làm bạn tổn thương.', trait: 'F', value: 'F' }
  },
  {
    id: 9,
    dimension: 'TF',
    dimensionName: 'Ra Quyết định (Lý trí T vs Cảm xúc F)',
    text: 'Điều gì mang lại cho bạn cảm giác thỏa mãn hơn:',
    optionA: { text: 'Tìm ra giải pháp logic giải quyết triệt để một vấn đề hóc búa.', trait: 'T', value: 'T' },
    optionB: { text: 'Giúp đỡ được một người đang gặp khó khăn và cảm nhận được sự ấm áp, gắn kết.', trait: 'F', value: 'F' }
  },
  {
    id: 10,
    dimension: 'JP',
    dimensionName: 'Phong cách Sống (Nguyên tắc J vs Linh hoạt P)',
    text: 'Khi chuẩn bị cho một chuyến tham quan dã ngoại hoặc kỳ thi học kỳ:',
    optionA: { text: 'Lập kế hoạch chi tiết, có danh sách việc cần làm (to-do list) và thời gian biểu cụ thể từ sớm.', trait: 'J', value: 'J' },
    optionB: { text: 'Để mọi việc diễn ra tự nhiên, tùy cơ ứng biến linh hoạt theo hoàn cảnh thực tế phát sinh.', trait: 'P', value: 'P' }
  },
  {
    id: 11,
    dimension: 'JP',
    dimensionName: 'Phong cách Sống (Nguyên tắc J vs Linh hoạt P)',
    text: 'Cách bạn tiếp cận bài tập lớn có hạn nộp dài hạn:',
    optionA: { text: 'Chia nhỏ bài tập thành từng phần và hoàn thành từng mốc trước thời hạn để không bị dồn việc.', trait: 'J', value: 'J' },
    optionB: { text: 'Chờ đến gần sát hạn nộp mới tập trung cao độ vì áp lực thời gian tạo nhiều cảm hứng sáng tạo hơn.', trait: 'P', value: 'P' }
  },
  {
    id: 12,
    dimension: 'JP',
    dimensionName: 'Phong cách Sống (Nguyên tắc J vs Linh hoạt P)',
    text: 'Không gian góc học tập và sinh hoạt của bạn thường:',
    optionA: { text: 'Gọn gàng, mọi đồ đạc để đúng vị trí quy định để khi cần tìm là thấy ngay.', trait: 'J', value: 'J' },
    optionB: { text: 'Có thể hơi lộn xộn theo cách riêng nhưng bạn vẫn biết mọi thứ ở đâu trong tầm tay.', trait: 'P', value: 'P' }
  }
];

export function calculateMBTIResult(
  answers: Record<number, 'A' | 'B'>,
  studentId?: string
): MBTIResult {
  let eCount = 0, iCount = 0;
  let sCount = 0, nCount = 0;
  let tCount = 0, fCount = 0;
  let jCount = 0, pCount = 0;

  MBTI_QUESTIONS.forEach(q => {
    const choice = answers[q.id];
    if (choice === 'A') {
      const trait = q.optionA.trait;
      if (trait === 'E') eCount++;
      if (trait === 'S') sCount++;
      if (trait === 'T') tCount++;
      if (trait === 'J') jCount++;
    } else if (choice === 'B') {
      const trait = q.optionB.trait;
      if (trait === 'I') iCount++;
      if (trait === 'N') nCount++;
      if (trait === 'F') fCount++;
      if (trait === 'P') pCount++;
    }
  });

  const eRatio = Math.round((eCount / Math.max(1, eCount + iCount)) * 100);
  const iRatio = 100 - eRatio;
  const sRatio = Math.round((sCount / Math.max(1, sCount + nCount)) * 100);
  const nRatio = 100 - sRatio;
  const tRatio = Math.round((tCount / Math.max(1, tCount + fCount)) * 100);
  const fRatio = 100 - tRatio;
  const jRatio = Math.round((jCount / Math.max(1, jCount + pCount)) * 100);
  const pRatio = 100 - jRatio;

  const letter1 = eCount >= iCount ? 'E' : 'I';
  const letter2 = sCount >= nCount ? 'S' : 'N';
  const letter3 = tCount >= fCount ? 'T' : 'F';
  const letter4 = jCount >= pCount ? 'J' : 'P';
  const code = `${letter1}${letter2}${letter3}${letter4}`;

  return {
    id: `mbti-${Date.now()}`,
    studentId: studentId || '',
    code,
    title: `Nhóm tính cách ${code}`,
    description: 'Tư duy logic sắc bén, độc lập, có tầm nhìn xa và chiến lược rõ ràng cho tương lai.',
    strengths: ['Tư duy phản biện', 'Tự chủ cao', 'Chiến lược dài hạn'],
    learningWorkEnvironments: ['Môi trường chuyên nghiệp, sáng tạo, đề cao tư duy logic và sự chủ động.'],
    recommendedCareers: ['Kỹ sư Phần mềm', 'Chuyên gia Trí tuệ Nhân tạo', 'Nhà Nghiên cứu Chiến lược', 'Kiến trúc sư Hệ thống'],
    recommendedMajors: ['Khoa học Máy tính', 'Kinh tế Quốc tế', 'Kỹ thuật Công nghệ', 'Tâm lý học Ứng dụng'],
    notesForGrowth: ['Cân bằng giữa tư duy cá nhân và lắng nghe phản hồi từ tập thể để phát triển toàn diện.'],
    dimensionScores: {
      E: eRatio, I: iRatio,
      S: sRatio, N: nRatio,
      T: tRatio, F: fRatio,
      J: jRatio, P: pRatio
    },
    percentages: {
      EI: { dominant: letter1 as any, percent: letter1 === 'E' ? eRatio : iRatio },
      SN: { dominant: letter2 as any, percent: letter2 === 'S' ? sRatio : nRatio },
      TF: { dominant: letter3 as any, percent: letter3 === 'T' ? tRatio : fRatio },
      JP: { dominant: letter4 as any, percent: letter4 === 'J' ? jRatio : pRatio }
    },
    testedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}

export const WORK_VALUES_QUESTIONS: WorkValuesQuestion[] = [
  { id: 1, category: 'ACHIEVEMENT', categoryName: 'Thành tựu & Năng lực', text: 'Công việc cho phép tôi phát huy tối đa sở trường và cảm nhận được sự tiến bộ rõ rệt mỗi ngày.' },
  { id: 2, category: 'ACHIEVEMENT', categoryName: 'Thành tựu & Năng lực', text: 'Được nhìn thấy kết quả cụ thể, hữu hình từ những nỗ lực làm việc chăm chỉ của bản thân.' },
  { id: 3, category: 'AUTONOMY', categoryName: 'Tự chủ & Độc lập', text: 'Có quyền tự do sắp xếp thời gian biểu và tự quyết định phương pháp thực hiện nhiệm vụ.' },
  { id: 4, category: 'AUTONOMY', categoryName: 'Tự chủ & Độc lập', text: 'Được tự do sáng tạo, thử nghiệm các giải pháp mới mà không phải xin phép quá nhiều cấp trung gian.' },
  { id: 5, category: 'GROWTH', categoryName: 'Sự công nhận & Danh tiếng', text: 'Được xã hội và đồng nghiệp tôn trọng, ngưỡng mộ vì vị thế và tầm ảnh hưởng của công việc.' },
  { id: 6, category: 'GROWTH', categoryName: 'Sự công nhận & Danh tiếng', text: 'Có cơ hội thăng tiến rõ ràng lên các vị trí lãnh đạo và đạt mức thu nhập cao hàng đầu.' },
  { id: 7, category: 'CONTRIBUTION', categoryName: 'Mối quan hệ & Đồng nghiệp', text: 'Làm việc trong một tập thể thân thiện, đoàn kết, nơi mọi người giúp đỡ và đối xử chân thành với nhau.' },
  { id: 8, category: 'CONTRIBUTION', categoryName: 'Mối quan hệ & Đồng nghiệp', text: 'Công việc đóng góp trực tiếp cho sự phát triển của cộng đồng và giúp đỡ những hoàn cảnh khó khăn.' },
  { id: 9, category: 'STABILITY', categoryName: 'Môi trường & Hỗ trợ', text: 'Công ty có chính sách đãi ngộ tốt, trang bị cơ sở vật chất hiện đại và ban lãnh đạo công tâm.' },
  { id: 10, category: 'STABILITY', categoryName: 'Môi trường & Hỗ trợ', text: 'Được đào tạo bài bản, có người hướng dẫn (mentor) tận tâm chỉ dạy trong quá trình làm việc.' },
  { id: 11, category: 'STABILITY', categoryName: 'Điều kiện làm việc & Cân bằng', text: 'Có sự cân bằng lành mạnh giữa công việc và đời sống cá nhân, ít phải làm thêm giờ (OT).' },
  { id: 12, category: 'STABILITY', categoryName: 'Điều kiện làm việc & Cân bằng', text: 'Công việc ổn định lâu dài, ít rủi ro sa thải và có chế độ bảo hiểm y tế, phúc lợi toàn diện.' }
];

export function calculateWorkValuesResult(
  answers: Record<number, number>,
  studentId?: string
): WorkValuesResult {
  const scores: Record<string, number> = {
    'Thành tựu & Năng lực': 0,
    'Tự chủ & Độc lập': 0,
    'Sự công nhận & Danh tiếng': 0,
    'Mối quan hệ & Đồng nghiệp': 0,
    'Môi trường & Hỗ trợ': 0,
    'Điều kiện làm việc & Cân bằng': 0
  };

  WORK_VALUES_QUESTIONS.forEach(q => {
    const s = answers[q.id] || 3;
    const cat = q.categoryName || 'Thành tựu & Năng lực';
    scores[cat] = (scores[cat] || 0) + s;
  });

  const topValues = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, score]) => ({
    key,
    name: key,
    score,
    maxScore: 10,
    description: `Ưu tiên cao giá trị ${key}`
  }));

  return {
    id: `wv-${Date.now()}`,
    studentId: studentId || '',
    scores,
    topValues,
    recommendedWorkStyles: ['Độc lập', 'Sáng tạo', 'Tự chủ'],
    recommendedCareers: ['Kỹ sư Công nghệ', 'Chuyên viên Tài chính', 'Chuyên gia Đào tạo & Phát triển', 'Quản lý Dự án'],
    recommendedMajors: ['Khoa học Máy tính', 'Kinh doanh Quốc tế'],
    disclaimer: 'Kết quả mang tính tham khảo hướng nghiệp theo thang đo O*NET Work Values.',
    testedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}
