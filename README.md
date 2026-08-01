# Korean Master Pro — GitHub Ready

Ứng dụng PWA học tiếng Hàn, tối ưu cho iPhone.

## Tính năng hiện có

- Dashboard và nhiều bài học
- Flashcard lật, vuốt trái/phải, phát âm
- Thêm, sửa, xóa và chuyển từ giữa các bài
- Checklist, từ khó, yêu thích
- Ôn các từ chưa check
- Thống kê theo bài
- Dark mode
- Sao lưu định dạng `.kmdata`
- Nhập được cả backup JSON cũ và `.kmdata` mới
- Dữ liệu học lưu trong IndexedDB trên Safari

## Đưa lên GitHub

1. Tạo repository mới trên GitHub, ví dụ `korean-master-pro`.
2. Giải nén ZIP này.
3. Trong repository, chọn **Add file → Upload files**.
4. Tải toàn bộ file và thư mục bên trong lên, bao gồm `.github`.
5. Commit vào nhánh `main`.

## Kết nối Vercel

1. Vào Vercel → **Add New Project**.
2. Chọn repository `korean-master-pro`.
3. Framework Preset: **Other**.
4. Build Command: để trống.
5. Output Directory: để trống.
6. Bấm **Deploy**.

Sau này mỗi lần cập nhật file trên GitHub, Vercel tự deploy phiên bản mới.

## Không mất dữ liệu

Trước khi đổi link hoặc thử phiên bản mới:

1. Mở app cũ.
2. Bấm 💾 → **Xuất dữ liệu**.
3. App tải file `.kmdata`.
4. Mở app mới → 💾 → **Nhập dữ liệu**.
5. Chọn file `.kmdata`.

File `.kmdata` chứa bài học, từ vựng, trạng thái check, từ khó, yêu thích và một số cài đặt.
