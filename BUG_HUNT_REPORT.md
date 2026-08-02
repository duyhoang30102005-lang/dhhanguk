# Dh한국 V10.0.1 — Bug Hunt

## Đã sửa

1. **Ngày học bị lệch trước 07:00 tại Việt Nam**
   - Nguyên nhân: dùng ngày UTC qua `toISOString()`.
   - Đã chuyển Daily Goal, Daily Challenge và thống kê sang ngày địa phương.

2. **Streak tăng sai sau khi nghỉ nhiều ngày**
   - Trước đây chỉ cần mở vào một ngày khác là streak tăng.
   - Nay chỉ tăng khi hai ngày liên tiếp; nếu bỏ ngày sẽ quay về 1.

3. **Có thể lỗi khi chưa có bài học hoặc danh sách từ trống**
   - Thêm kiểm tra cho Mở tất cả từ, nút trước/sau, phát âm, yêu thích, từ khó và đánh dấu.

4. **Có thể lỗi khi bài học đã bị xóa nhưng giao diện vẫn giữ ID cũ**
   - `openLesson`, tìm kiếm, lưu và cập nhật thẻ giờ xử lý an toàn.

5. **Quiz phụ thuộc cứng vào module V10**
   - Thêm kiểm tra để app không trắng màn hình nếu module tải chậm hoặc thiếu.

6. **Tên file backup**
   - Đổi thành `DhHanguk_Backup_YYYY-MM-DD.kmdata`.

7. **Service Worker**
   - Tăng phiên bản cache để trình duyệt nhận bản sửa ngay.

## Đã kiểm tra
- Cú pháp JavaScript của `app.js`
- Cú pháp JavaScript của Service Worker
- Cú pháp hai module V9/V10
- JSON: manifest, cards, lessons
- Tất cả ID được JavaScript sử dụng đều tồn tại trong HTML
