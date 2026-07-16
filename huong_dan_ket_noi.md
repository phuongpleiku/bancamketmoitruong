# Hướng Dẫn Chi Tiết Kết Nối Form Cam Kết Với Google Sheet, Xuất PDF & Tra Cứu

Tài liệu này hướng dẫn bạn từng bước cách tạo Google Sheet, nhúng mã Apps Script để làm database nhận dữ liệu, lưu biên bản PDF ký tên vào thư mục Drive chỉ định (`1OCXSHASG_ijIW2qKyJzvMCKs90t0yASb`) và sử dụng tính năng tra cứu thông tin cam kết đã ký bằng số điện thoại.

---

## Bước 1: Tạo Google Sheet mới
1. Truy cập vào [Google Sheets (Trang tính)](https://sheets.google.com) và đăng nhập tài khoản Google của bạn.
2. Tạo một trang tính trống mới.
3. Đổi tên trang tính thành: **"Danh Sách Cam Kết Môi Trường Du Lịch"**.
4. Ở thanh sheet phía dưới, đổi tên sheet hiện tại từ **"Trang tính 1"** (hoặc "Sheet1") thành **"CamKet"** *(Lưu ý: Tên sheet bắt buộc phải viết hoa đúng chữ "CamKet" viết liền không dấu)*.

---

## Bước 2: Nhúng mã Google Apps Script
1. Trên thanh công cụ của Google Sheet, chọn **Tiện ích mở rộng** (Extensions) -> **Apps Script**.
2. Một cửa sổ lập trình mới hiện ra. Bạn hãy xóa toàn bộ mã mặc định hiện có trong file `Mã.gs` (hoặc `Code.gs`).
3. Mở file [google_script.js](file:///g:/My%20Drive/1.%20C%C3%B4ng%20vi%E1%BB%87c/2026/0.%20AI%20AI%20AI/CamKetDuLich/google_script.js) trong thư mục dự án, copy toàn bộ nội dung trong đó và dán vào Apps Script.
4. Nhấp vào biểu tượng **Lưu** (hình đĩa mềm) hoặc ấn tổ hợp phím `Ctrl + S`.

---

## Bước 3: Xuất bản và Triển khai làm Web App (Ứng dụng Web)
Để trang web HTML có thể gửi dữ liệu và tra cứu từ Google Sheet này, chúng ta cần biến đoạn script trên thành một cổng API công cộng:

1. Click vào nút **Triển khai** (Deploy) ở góc trên bên phải -> Chọn **Triển khai mới** (New deployment).
2. Nhấp vào biểu tượng bánh răng cài đặt ở dòng "Chọn loại cấu hình" -> Chọn **Ứng dụng web** (Web app).
3. Điền các thông số cấu hình như sau:
   - **Mô tả (Description):** *Form Cam Ket Du Lich Pleiku*
   - **Thực thi dưới dạng (Execute as):** Chọn **Tôi (Địa chỉ email của bạn)**.
   - **Ai có quyền truy cập (Who has access):** Chọn **Bất kỳ ai (Anyone)**.
4. Nhấn nút **Triển khai** (Deploy).

*(Nếu đây là lần đầu tiên làm, bạn hãy tham khảo "Bước 4" bên dưới để cấp quyền Drive/Sheet cho tài khoản).*

---

## Bước 4: Cấp quyền cho ứng dụng (Authorization)
Lần đầu tiên triển khai, Google sẽ yêu cầu xác nhận bảo mật quyền hạn truy cập Google Drive và Google Sheet của bạn:

1. Một hộp thoại hiện ra, nhấn vào **Ủy quyền truy cập** (Authorize access).
2. Chọn tài khoản Google hiện tại của bạn.
3. Khi màn hình cảnh báo "Google chưa xác minh ứng dụng này" xuất hiện:
   - Nhấp vào chữ **Nâng cao** (Advanced) ở bên trái.
   - Nhấp tiếp vào liên kết **Đi tới dự án không có tên (không an toàn)** hoặc **Go to Untitled project (unsafe)** ở phía dưới cùng.
4. Xem danh sách các quyền (đặc biệt là quyền chỉnh sửa tệp trên Google Drive để lưu PDF) và nhấn **Cho phép** (Allow).

---

## Bước 5: Lấy URL và kết nối với biểu mẫu frontend
1. Sau khi cấp quyền thành công, Google sẽ hiển thị thông tin cấu hình triển khai.
2. Tìm dòng **URL ứng dụng web (Web app URL)** và nhấn **Sao chép** (Copy) đường link này (Link có định dạng `https://script.google.com/macros/s/.../exec`).
3. Mở file [script.js](file:///g:/My%20Drive/1.%20C%C3%B4ng%20vi%E1%BB%87c/2026/0.%20AI%20AI%20AI/CamKetDuLich/script.js) trong thư mục dự án bằng công cụ chỉnh sửa văn bản.
4. Tìm ngay dòng số 3 đầu tiên của file:
   ```javascript
   const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
5. Thay thế `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` bằng link Web App bạn vừa copy ở trên. Ví dụ:
   ```javascript
   const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxxxxxx-xxxxxx/exec';
   ```
6. **Lưu file** `script.js` lại.

---

## 📢 LƯU Ý QUAN TRỌNG: Cập nhật mã nguồn khi đã triển khai trước đó
Nếu trước đây bạn đã triển khai Web App một lần, và nay bạn copy-paste mã nguồn mới có tích hợp tính năng **Tra cứu**, bạn **bắt buộc** phải tạo một phiên bản triển khai mới thì Google mới áp dụng đoạn code tìm kiếm mới:

1. Trong giao diện Apps Script, bấm nút **Triển khai** (Deploy) -> chọn **Quản lý các bản triển khai** (Manage deployments).
2. Chọn bản triển khai Web App hiện tại của bạn ở danh sách bên trái.
3. Bấm vào biểu tượng **Bút chì** (Edit) ở góc trên bên phải.
4. Tại dòng **Phiên bản** (Version), chọn **Phiên bản mới** (New version).
5. Bấm nút **Triển khai** (Deploy) ở phía dưới.
*Lưu ý: Link Web App URL sẽ giữ nguyên, bạn không cần phải thay đổi lại trong `script.js` nếu làm đúng cách quản lý bản triển khai này.*

---

## 🔍 Hướng dẫn sử dụng Tính năng Tra cứu & Tải lại cam kết
Sau khi tích hợp, giao diện Web sẽ có thêm thanh Menu chuyển đổi ở trên cùng:
1. **Đăng ký cam kết mới**: Form đăng ký gồm 3 bước gửi dữ liệu như bình thường.
2. **Tra cứu & Tải lại cam kết**:
   - Cơ sở kinh doanh nhập **Số điện thoại** đại diện họ đã dùng để đăng ký biểu mẫu trước đó.
   - Nhấn nút **Tra cứu**.
   - Hệ thống sẽ gửi yêu cầu tìm kiếm đến Google Sheet:
     - Nếu không tìm thấy: Hiển thị thông báo "Không tìm thấy dữ liệu" và khuyên họ kiểm tra lại số điện thoại hoặc tạo cam kết mới.
     - Nếu tìm thấy: Hiển thị toàn bộ thông tin cơ sở (Tên cơ sở, Loại hình, Người đại diện, Địa chỉ, Ngày ký cam kết) kèm theo nút bấm **Tải Bản Cam Kết (PDF)**.
     - Khi nhấn nút này, trình duyệt sẽ tự động mở và tải xuống bản cam kết PDF chính thức đã được lưu trữ trong Google Drive Folder trước đó (Bảo đảm chữ ký và dấu mốc thời gian hoàn toàn chính xác với thời điểm ký).
