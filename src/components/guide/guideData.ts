/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GuideStep {
  stepNumber: number;
  title: string;
  instruction: string;
  mockUiType?: 'login_modal' | 'student_table' | 'generic';
  mockUiDetails?: {
    screenName: string;
    calloutText: string;
    highlights: string[];
    annotation: string;
  };
  imagePlaceholderNote?: string;
}

export interface GuideArticle {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  estimatedReadMinutes: number;
  status: 'PUBLISHED' | 'PLANNED';
  updatedAt: string;
  tags: string[];
  
  // Section B Requirements (Only populated for PUBLISHED articles)
  purposeAndTiming?: string;
  requiredPermissions?: string;
  steps?: GuideStep[];
  expectedResult?: string;
  dataPersistenceVerification?: string;
  commonErrorsAndSolutions?: { error: string; solution: string }[];
  securityAndPrivacyNotes?: string[];
}

export interface GuideCategory {
  id: string;
  title: string;
  shortDescription: string;
  iconName: string;
  order: number;
  articleCount?: number;
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: 'getting-started',
    title: 'Bắt đầu sử dụng',
    shortDescription: 'Đăng nhập, tiếp nhận không gian lớp, quản lý phiên và giao diện làm việc của GVCN.',
    iconName: 'Sparkles',
    order: 1
  },
  {
    id: 'class-setup',
    title: 'Thiết lập không gian lớp học',
    shortDescription: 'Cấu hình thông tin trường lớp, niên khóa, môn học GDPT 2018 và giao diện.',
    iconName: 'Settings',
    order: 2
  },
  {
    id: 'student-profiles',
    title: 'Hồ sơ và dữ liệu học viên',
    shortDescription: 'Quản lý danh sách lớp, thông tin liên lạc, phân tổ, ban cán sự và học sinh cần lưu ý.',
    iconName: 'Users',
    order: 3
  },
  {
    id: 'academic-conduct',
    title: 'Học tập, rèn luyện và chuyên cần',
    shortDescription: 'Sổ điểm TT22, thời khóa biểu, báo bài, điểm nề nếp và Cây Nguyệt Quế.',
    iconName: 'BookOpen',
    order: 4
  },
  {
    id: 'homeroom-work',
    title: 'Công việc chủ nhiệm',
    shortDescription: 'Lịch công tác chủ nhiệm, danh sách việc cần làm và trung tâm phê duyệt đơn từ.',
    iconName: 'CalendarDays',
    order: 5
  },
  {
    id: 'surveys-collaboration',
    title: 'Khảo sát và phối hợp giáo dục',
    shortDescription: 'Khảo sát đặc điểm học sinh đầu năm và Nhịp cầu trao đổi riêng tư với phụ huynh.',
    iconName: 'ClipboardList',
    order: 6
  },
  {
    id: 'ai-assistant',
    title: 'Trợ lý AI GVCN',
    shortDescription: 'Ứng dụng AI Trợ lý chủ nhiệm trong soạn kế hoạch tuần, nhận xét học bạ và cấu hình khóa API.',
    iconName: 'Bot',
    order: 7
  },
  {
    id: 'data-security',
    title: 'Lưu dữ liệu, bảo mật và xử lý sự cố',
    shortDescription: 'Kiểm tra lưu trữ đám mây bền vững, bảo vệ mật khẩu, Recovery Code và ứng phó sự cố.',
    iconName: 'ShieldCheck',
    order: 8
  }
];

export const GUIDE_ARTICLES: GuideArticle[] = [
  // =========================================================================
  // BÀI MẪU HOÀN CHỈNH 1: Bắt đầu sử dụng -> Đăng nhập & Quản lý phiên GVCN
  // =========================================================================
  {
    id: 'art-gvcn-login-session',
    categoryId: 'getting-started',
    title: 'Đăng nhập Cổng GVCN bằng Mã truy cập và Quản lý phiên làm việc an toàn',
    summary: 'Quy trình chuẩn từng bước giúp Giáo viên chủ nhiệm đăng nhập chính xác vào Cổng lớp học, phân biệt phân khu và duy trì phiên làm việc an toàn.',
    estimatedReadMinutes: 4,
    status: 'PUBLISHED',
    updatedAt: '2026-10-24',
    tags: ['Đăng nhập', 'Mã truy cập', 'GVCN', 'Bảo mật', 'Bắt đầu'],

    // 1. Mục đích và thời điểm nên sử dụng
    purposeAndTiming: 'Sử dụng khi GVCN bắt đầu phiên làm việc hàng ngày, đăng nhập lần đầu vào đầu năm học mới, hoặc khi chuyển đổi giữa máy tính phòng hội đồng/văn phòng nhà trường sang máy tính cá nhân. Bài viết giúp thầy cô chọn đúng phân khu giáo viên, tránh nhầm lẫn với cổng học viên hay phụ huynh.',

    // 2. Điều kiện hoặc quyền cần có
    requiredPermissions: 'Tài khoản Giáo viên chủ nhiệm hợp lệ đã được quản trị viên trường cấp. Thầy cô cần có: (1) Mã truy cập GVCN (định dạng chuẩn ví dụ: ACT-ML-2025-LHP) hoặc (2) Tài khoản Google có địa chỉ email đã đăng ký trong hồ sơ GVCN của trường.',

    // 3. Các bước thao tác được đánh số theo đúng trình tự thực tế
    steps: [
      {
        stepNumber: 1,
        title: 'Truy cập cổng ứng dụng và mở màn hình Đăng nhập',
        instruction: 'Mở trình duyệt web và truy cập đường dẫn ứng dụng Không Gian Chủ Nhiệm Số tại địa chỉ `/app` hoặc `/dang-nhap`. Nếu chưa có phiên đăng nhập, hệ thống sẽ tự động hiển thị màn hình chọn khu vực.',
        mockUiType: 'login_modal',
        mockUiDetails: {
          screenName: 'Màn hình Đăng nhập Người dùng (/app hoặc /dang-nhap)',
          calloutText: '[Vị trí 1] 3 Phân khu vai trò: GVCN | Học sinh | Phụ huynh',
          highlights: ['Tab "Giáo viên chủ nhiệm" được làm nổi bật với biểu tượng bảng xanh'],
          annotation: 'Luôn kiểm tra thẻ đang chọn là "Giáo viên chủ nhiệm" trước khi nhập mã.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Giao diện UserLoginScreen hiển thị 3 tab chọn vai trò (GVCN - Học sinh - Phụ huynh)'
      },
      {
        stepNumber: 2,
        title: 'Chọn đúng phân khu "Giáo viên chủ nhiệm (GVCN)"',
        instruction: 'Nhấp chuột vào tab "Giáo viên chủ nhiệm" ở phía trên cùng của khung đăng nhập. Giao diện sẽ chuyển sang tông màu xanh - tím chuyên nghiệp với tiêu đề dành riêng cho giáo viên.',
        mockUiType: 'login_modal',
        mockUiDetails: {
          screenName: 'Khung xác thực GVCN',
          calloutText: '[Vị trí 2] Ô nhập "Mã truy cập GVCN" hoặc nút "Đăng nhập với Google"',
          highlights: ['Trường nhập mã tự động chuyển nhãn sang "Mã GVCN"'],
          annotation: 'Nếu chọn nhầm tab Học sinh mà nhập mã GVCN, hệ thống sẽ từ chối để bảo mật.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Trạng thái tab Giáo viên chủ nhiệm đang kích hoạt, hiển thị ô nhập mã GVCN'
      },
      {
        stepNumber: 3,
        title: 'Nhập Mã truy cập GVCN được cấp',
        instruction: 'Điền chính xác mã truy cập giáo viên được nhà trường cấp (ví dụ: `ACT-ML-2025-LHP`). Mã không phân biệt chữ hoa/chữ thường nhưng cần giữ nguyên các dấu gạch ngang phân cách.',
        mockUiType: 'login_modal',
        mockUiDetails: {
          screenName: 'Nhập thông tin xác thực',
          calloutText: '[Vị trí 3] Ô mã truy cập: ví dụ ACT-ML-2025-LHP',
          highlights: ['Kiểm tra không chứa khoảng trắng ở đầu hoặc cuối chuỗi mã'],
          annotation: 'Có thể nhấp biểu tượng con mắt để xem lại chuỗi ký tự đã nhập.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Trường mã truy cập đã điền đầy đủ và nút "Vào không gian lớp" sáng màu'
      },
      {
        stepNumber: 4,
        title: 'Nhập mật khẩu cá nhân (nếu tài khoản đã kích hoạt)',
        instruction: 'Nếu thầy cô đã thiết lập mật khẩu bảo vệ riêng cho mã truy cập ở lần đăng nhập trước, nhập tiếp mật khẩu vào ô "Mật khẩu tài khoản". Nếu là mã đăng nhập lần đầu, có thể bỏ qua bước nhập mật khẩu.',
        mockUiType: 'login_modal',
        mockUiDetails: {
          screenName: 'Xác thực mật khẩu bổ sung (tùy chọn bảo mật)',
          calloutText: '[Vị trí 4] Trường Mật khẩu cá nhân của giáo viên',
          highlights: ['Hiển thị khi mã yêu cầu xác thực 2 lớp mã + mật khẩu'],
          annotation: 'Mật khẩu được băm bảo mật scrypt phía máy chủ, không hiển thị cho bất kỳ ai.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Ô mật khẩu và tùy chọn ghi nhớ đăng nhập 30 ngày'
      },
      {
        stepNumber: 5,
        title: 'Nhấn "Vào không gian lớp" và xác nhận quyền làm việc',
        instruction: 'Bấm nút "Vào không gian lớp". Hệ thống kiểm tra xác thực với máy chủ. Khi hợp lệ, thầy cô được điều hướng ngay đến Bảng điều khiển Tổng quan của lớp chủ nhiệm.',
        mockUiType: 'login_modal',
        mockUiDetails: {
          screenName: 'Chuyển hướng vào không gian lớp',
          calloutText: '[Vị trí 5] Nút bấm hành động chính "Vào không gian lớp"',
          highlights: ['Trạng thái tải ngắn và chuyển tiếp mượt mà vào màn hình chính'],
          annotation: 'Sau khi vào lớp, góc trên bên phải thanh Header sẽ hiển thị tên GVCN và tên lớp.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Màn hình Tổng quan lớp học sau khi đăng nhập thành công với vai trò GVCN'
      }
    ],

    // 6. Kết quả cần thấy sau thao tác
    expectedResult: 'Hệ thống chuyển vào màn hình "Tổng quan" (`/app#overview`). Thanh tiêu đề Header hiển thị đầy đủ: Tên trường, Tên lớp (ví dụ: Lớp 11A1), Họ tên GVCN (ví dụ: Cô Nguyễn Thị Mai Lan) và biểu tượng vai trò "GVCN". Menu bên trái xuất hiện đầy đủ các phân hệ quản lý của giáo viên.',

    // 7. Cách kiểm tra dữ liệu đã lưu
    dataPersistenceVerification: 'Quan sát biểu tượng tròn trạng thái mạng cạnh avatar trên Header: chấm xanh hiển thị "Đã kết nối trực tiếp & đồng bộ Cloud Firestore". Khi F5 làm mới trình duyệt, phiên đăng nhập của thầy cô vẫn được giữ nguyên mà không bị yêu cầu đăng nhập lại.',

    // 8. Lỗi thường gặp và cách xử lý an toàn
    commonErrorsAndSolutions: [
      {
        error: 'Lỗi 403 ROLE_MISMATCH: "Mã đăng nhập này không thuộc khu vực GVCN"',
        solution: 'Thầy cô đã vô tình để tab ở "Học viên" hoặc "Phụ huynh" trước khi nhập mã GVCN. Nhấp lại vào tab "Giáo viên chủ nhiệm" ở phía trên rồi bấm đăng nhập lại.'
      },
      {
        error: 'Lỗi 401 INVALID_CREDENTIAL: "Mã truy cập không hợp lệ hoặc đã bị thay đổi"',
        solution: 'Kiểm tra xem bàn phím có bật gõ tiếng Việt làm dính dấu vào mã không (ví dụ: gõ `ACT-` bị thành `ẮT-`). Kiểm tra ký tự O và số 0, hoặc khoảng trắng ở hai đầu mã.'
      },
      {
        error: 'Lỗi ACCOUNT_LOCKED: "Tài khoản Giáo viên chủ nhiệm đã bị tạm khóa"',
        solution: 'Tài khoản đang bị khóa an toàn bởi Quản trị viên hệ thống. Vui lòng liên hệ Admin phụ trách trường học để được mở khóa mã.'
      }
    ],

    // 9. Lưu ý bảo mật khi xử lý dữ liệu học viên
    securityAndPrivacyNotes: [
      'Tuyệt đối không gửi mã truy cập GVCN vào nhóm Zalo chung của lớp hoặc cung cấp cho Ban cán sự học sinh.',
      'Khi làm việc trên máy tính công cộng, máy tính phòng hội đồng hoặc máy tính dùng chung tại trường, luôn bấm "Đăng xuất khỏi không gian" ở menu góc trên bên phải khi kết thúc buổi làm việc.',
      'Không lưu mật khẩu GVCN trên trình duyệt của máy tính lạ không phải thiết bị cá nhân của thầy cô.'
    ]
  },

  // =========================================================================
  // BÀI MẪU HOÀN CHỈNH 2: Hồ sơ học viên -> Quản lý danh sách & Ban cán sự
  // =========================================================================
  {
    id: 'art-gvcn-roster-management',
    categoryId: 'student-profiles',
    title: 'Quản lý danh sách học sinh, phân tổ và thiết lập Ban cán sự lớp',
    summary: 'Hướng dẫn chi tiết cách duyệt danh sách học viên, lọc theo tổ, cập nhật chức vụ Ban cán sự lớp để tự động cấp quyền điều hành cho cán sự học sinh.',
    estimatedReadMinutes: 5,
    status: 'PUBLISHED',
    updatedAt: '2026-10-24',
    tags: ['Học viên', 'Ban cán sự', 'Tổ học tập', 'Hồ sơ', 'Phân quyền'],

    // 1. Mục đích và thời điểm nên sử dụng
    purposeAndTiming: 'Thực hiện vào đầu năm học khi tiếp nhận danh sách biên chế lớp, sau Đại hội Chi đoàn lớp khi đã bầu xong Ban cán sự (Lớp trưởng, Lớp phó, Bí thư), hoặc khi sắp xếp lại các tổ học tập trong kỳ sinh hoạt chủ nhiệm.',

    // 2. Điều kiện hoặc quyền cần có
    requiredPermissions: 'Quyền Giáo viên chủ nhiệm (`TEACHER`) của lớp tương ứng. Học viên và Phụ huynh không có quyền truy cập vào chức năng chỉnh sửa này.',

    // 3. Các bước thao tác được đánh số theo đúng trình tự thực tế
    steps: [
      {
        stepNumber: 1,
        title: 'Truy cập phân hệ Quản lý Học viên',
        instruction: 'Trên thanh menu bên trái (Left Sidebar), nhấp chọn mục "Quản lý Học viên" (biểu tượng hai người dùng). Giao diện chuyển đến danh sách học viên của lớp.',
        mockUiType: 'student_table',
        mockUiDetails: {
          screenName: 'Phân hệ Quản lý Học viên (#students)',
          calloutText: '[Vị trí 1] Menu trái "Quản lý Học viên" & Thanh công cụ danh sách',
          highlights: ['Hiển thị tổng số học sinh sĩ số lớp (ví dụ: 14 học sinh)'],
          annotation: 'Thầy cô có thể quan sát nhanh sĩ số, danh sách tổ và các huy hiệu chức vụ.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Bảng danh sách học sinh với các cột Họ tên, Mã định danh, Tổ, Ban cán sự và Thao tác'
      },
      {
        stepNumber: 2,
        title: 'Sử dụng bộ lọc Tổ và ô tìm kiếm nhanh học sinh',
        instruction: 'Thầy cô có thể lọc học sinh theo "Tất cả các tổ", "Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4" hoặc gõ tên học sinh vào ô tìm kiếm để định vị nhanh học sinh cần thao tác.',
        mockUiType: 'student_table',
        mockUiDetails: {
          screenName: 'Bộ lọc danh sách học sinh',
          calloutText: '[Vị trí 2] Thanh lọc Tổ 1, Tổ 2, Tổ 3, Tổ 4 và ô tìm kiếm',
          highlights: ['Nút chọn tổ lọc danh sách tức thì không cần tải lại trang'],
          annotation: 'Giúp GVCN dễ dàng rà soát sĩ số từng tổ hoặc tìm kiếm em cần phân công.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Thanh bộ lọc tổ học tập và kết quả lọc danh sách học sinh theo từng nhóm'
      },
      {
        stepNumber: 3,
        title: 'Mở cửa sổ chỉnh sửa thông tin học sinh',
        instruction: 'Tại dòng của học sinh muốn phân công (ví dụ: em Nguyễn Gia Huy), nhấp vào nút "Chỉnh sửa" (biểu tượng chiếc bút màu xanh ở cột Thao tác cuối hàng).',
        mockUiType: 'student_table',
        mockUiDetails: {
          screenName: 'Hành động dòng học sinh',
          calloutText: '[Vị trí 3] Nút biểu tượng cây bút "Chỉnh sửa" ở cột ngoài cùng',
          highlights: ['Mở modal "Chỉnh sửa thông tin học sinh" với đầy đủ các trường thông tin'],
          annotation: 'Chỉ GVCN mới thấy nút chỉnh sửa này; học sinh và phụ huynh chỉ có thể xem.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Nút chỉnh sửa tại dòng học sinh và Modal chỉnh sửa thông tin bật lên'
      },
      {
        stepNumber: 4,
        title: 'Thiết lập Chức vụ Ban cán sự và Phân tổ',
        instruction: 'Trong cửa sổ chỉnh sửa, tìm trường "Chức vụ Ban cán sự" và chọn một trong các chức danh: Lớp trưởng, Lớp phó học tập, Lớp phó lao động, Bí thư chi đoàn, hoặc Tổ trưởng. Tại trường "Tổ sinh hoạt", chọn số tổ (1 đến 4).',
        mockUiType: 'student_table',
        mockUiDetails: {
          screenName: 'Modal Chỉnh sửa học sinh',
          calloutText: '[Vị trí 4] Menu thả xuống chọn chức vụ Ban cán sự & Tổ sinh hoạt',
          highlights: ['Các chức danh chuẩn: Lớp trưởng, Lớp phó, Bí thư, Cán sự bộ môn'],
          annotation: 'Khi chọn chức danh Ban cán sự, tài khoản của học sinh này sẽ tự động nhận quyền Ban cán sự khi đăng nhập.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Danh sách thả xuống các chức danh Ban cán sự lớp trong Modal'
      },
      {
        stepNumber: 5,
        title: 'Lưu thay đổi và xác nhận đồng bộ cơ sở dữ liệu',
        instruction: 'Kiểm tra lại các thông tin đã chỉnh sửa, sau đó nhấp nút "Lưu thay đổi" màu xanh ở góc dưới bên phải của cửa sổ. Hệ thống sẽ ghi nhận và cập nhật ngay vào cơ sở dữ liệu.',
        mockUiType: 'student_table',
        mockUiDetails: {
          screenName: 'Lưu và hoàn tất',
          calloutText: '[Vị trí 5] Nút "Lưu thay đổi" màu xanh ở chân Modal',
          highlights: ['Thông báo lưu thành công màu xanh xuất hiện'],
          annotation: 'Dữ liệu được lưu ngay vào SQLite nội bộ và đẩy đồng bộ lên Cloud Firestore.'
        },
        imagePlaceholderNote: 'Ảnh chụp thực tế: Nút Lưu thay đổi và thông báo cập nhật thành công'
      }
    ],

    // 6. Kết quả cần thấy sau thao tác
    expectedResult: 'Tại dòng của học sinh trên bảng danh sách, huy hiệu màu xanh tím thể hiện chức vụ (ví dụ: [Lớp trưởng]) xuất hiện nổi bật cạnh họ tên. Số thứ tự tổ được cập nhật tương ứng. Khi học sinh đó đăng nhập bằng mã của mình, vai trò được tự động nâng lên thành `CLASS_OFFICER` với quyền hỗ trợ GVCN ghi nhận bài tập và nề nếp.',

    // 7. Cách kiểm tra dữ liệu đã lưu
    dataPersistenceVerification: 'Thầy cô có thể tải lại trang (F5) hoặc chuyển sang phân hệ khác rồi quay lại mục "Quản lý Học viên": chức vụ và tổ của học sinh vẫn hiển thị chính xác. Bản ghi đã được cam kết an toàn trong cơ sở dữ liệu.',

    // 8. Lỗi thường gặp và cách xử lý an toàn
    commonErrorsAndSolutions: [
      {
        error: 'Chức vụ không hiển thị sau khi lưu',
        solution: 'Kiểm tra kết nối mạng của thiết bị. Nếu đang ở chế độ ngoại tuyến tạm thời, hệ thống sẽ lưu vào bộ đệm và đồng bộ ngay khi mạng ổn định lại. Bấm F5 để làm mới.'
      },
      {
        error: 'Học sinh phản ánh đăng nhập vẫn là học sinh thường, chưa thành Ban cán sự',
        solution: 'Yêu cầu học sinh đó đăng xuất khỏi tài khoản của mình và đăng nhập lại bằng mã truy cập học sinh để hệ thống cấp mới phiên làm việc với vai trò CLASS_OFFICER.'
      },
      {
        error: 'Vô tình thay đổi nhầm mã định danh học sinh',
        solution: 'Mã học sinh là khóa định danh duy nhất (ví dụ `hs-01`). Thầy cô không nên thay đổi mã này để tránh làm lệch liên kết điểm số và cây nguyệt quế lịch sử.'
      }
    ],

    // 9. Lưu ý bảo mật khi xử lý dữ liệu học viên
    securityAndPrivacyNotes: [
      'Thông tin cá nhân (số điện thoại phụ huynh, nghề nghiệp, tình trạng sức khỏe) là dữ liệu nhạy cảm được bảo vệ nghiêm ngặt. Hệ thống chỉ cho phép GVCN xem các trường này, không bao giờ lộ sang tài khoản của học sinh khác.',
      'Không xuất danh sách lớp ra file Excel và để trên máy tính công cộng mà không cài đặt mật khẩu bảo vệ.',
      'Chỉ phân quyền Ban cán sự cho đúng các học sinh được tập thể lớp tín nhiệm bầu chọn.'
    ]
  },

  // =========================================================================
  // CÁC BÀI ĐANG HOÀN THIỆN THEO KẾ HOẠCH (LỘ TRÌNH ĐỢT TIẾP THEO)
  // =========================================================================
  {
    id: 'art-class-settings-curriculum',
    categoryId: 'class-setup',
    title: 'Cấu hình thông tin lớp học, niên khóa và phân phối môn học theo GDPT 2018',
    summary: 'Hướng dẫn thiết lập tên lớp, trường học, giáo viên phụ trách và bật/tắt tổ hợp môn học theo chương trình Giáo dục phổ thông 2018.',
    estimatedReadMinutes: 4,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Cài đặt', 'GDPT 2018', 'Môn học', 'Niên khóa']
  },
  {
    id: 'art-class-theme-appearance',
    categoryId: 'class-setup',
    title: 'Tùy biến giao diện lớp học, ảnh bìa lớp và bảng màu nhận diện',
    summary: 'Cách thay đổi ảnh bìa lớp, khẩu hiệu năm học, màu sắc chủ đạo và các liên kết nhanh trên trang chủ.',
    estimatedReadMinutes: 3,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Giao diện', 'Ảnh bìa', 'Chủ đề', 'Khẩu hiệu']
  },
  {
    id: 'art-academic-gradebook-tt22',
    categoryId: 'academic-conduct',
    title: 'Nhập điểm, tính điểm trung bình môn và đánh giá định kỳ theo Thông tư 22',
    summary: 'Quy trình nhập điểm thường xuyên, giữa kỳ, cuối kỳ, xuất nhập bảng điểm từ Excel và công thức xếp loại học lực chuẩn Bộ GD&ĐT.',
    estimatedReadMinutes: 6,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Bảng điểm', 'Thông tư 22', 'Excel', 'Học tập']
  },
  {
    id: 'art-laurel-garden-discipline',
    categoryId: 'academic-conduct',
    title: 'Ghi nhận điểm nề nếp rèn luyện và chăm sóc Cây Nguyệt Quế vinh danh',
    summary: 'Cách cộng điểm gương tốt, trừ điểm vi phạm nề nếp và cơ chế tiến hóa 5 giai đoạn của Cây Nguyệt Quế cá nhân.',
    estimatedReadMinutes: 5,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Rèn luyện', 'Kỷ luật', 'Cây Nguyệt Quế', 'Khen thưởng']
  },
  {
    id: 'art-homeroom-calendar-tasks',
    categoryId: 'homeroom-work',
    title: 'Sử dụng Lịch công tác chủ nhiệm và quản lý công việc cá nhân của GVCN',
    summary: 'Tạo nhắc nhở lịch họp hội đồng, kế hoạch sinh hoạt lớp, tuần cao điểm và quản lý danh sách việc cần làm (To-Do List).',
    estimatedReadMinutes: 4,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Lịch công tác', 'Việc cần làm', 'Kế hoạch', 'Nhắc nhở']
  },
  {
    id: 'art-approval-center-management',
    categoryId: 'homeroom-work',
    title: 'Trung tâm phê duyệt: Xử lý đơn nghỉ học, bài đăng và đề xuất đính chính',
    summary: 'Hướng dẫn GVCN duyệt nhanh các đề xuất của ban cán sự, đơn xin nghỉ của phụ huynh và bài viết trước khi xuất hiện trên Bảng tin lớp.',
    estimatedReadMinutes: 4,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Phê duyệt', 'Đơn từ', 'Bài đăng', 'Ban cán sự']
  },
  {
    id: 'art-surveys-creation-management',
    categoryId: 'surveys-collaboration',
    title: 'Tạo phiếu khảo sát đặc điểm học sinh đầu năm và khảo sát chuyên đề',
    summary: 'Cách sử dụng mẫu khảo sát trực tuyến, nhập câu hỏi từ Word/Google Forms và đồng bộ câu trả lời tự động vào hồ sơ học sinh.',
    estimatedReadMinutes: 5,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Khảo sát', 'Đầu năm', 'Phiếu thu thập', 'Google Forms']
  },
  {
    id: 'art-parent-bridge-communication',
    categoryId: 'surveys-collaboration',
    title: 'Sử dụng Nhịp cầu Phụ huynh: Trao đổi riêng tư 1-1 và gửi thông báo chung',
    summary: 'Kênh kết nối chính thống giữa GVCN và phụ huynh: nhắn tin trao đổi học tập riêng từng gia đình và gửi thông báo họp PH có xác nhận.',
    estimatedReadMinutes: 4,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Phụ huynh', 'Trao đổi', 'Thông báo họp', 'Nhịp cầu']
  },
  {
    id: 'art-ai-homeroom-assistant-usage',
    categoryId: 'ai-assistant',
    title: 'Khai thác AI Trợ lý GVCN trong soạn thảo nhận xét học bạ và kế hoạch tuần',
    summary: 'Cách sử dụng AI Trợ lý chủ nhiệm để viết nhận xét học sinh theo phong cách nhân văn, gợi ý chủ đề sinh hoạt lớp và cấu hình khóa API.',
    estimatedReadMinutes: 5,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['AI', 'Trợ lý GVCN', 'Nhận xét', 'Sinh hoạt lớp']
  },
  {
    id: 'art-data-backup-and-troubleshooting',
    categoryId: 'data-security',
    title: 'Kiểm tra sao lưu dữ liệu, bảo mật tài khoản và xử lý sự cố thường gặp',
    summary: 'Cơ chế lưu trữ đa tầng (SQLite + Cloud Firestore), cách sao lưu dữ liệu lớp và giải pháp khi học sinh quên mã truy cập.',
    estimatedReadMinutes: 5,
    status: 'PLANNED',
    updatedAt: '2026-10-24',
    tags: ['Sao lưu', 'Bảo mật', 'Sự cố', 'Khôi phục']
  }
];
