# Dh한국 V10.3 — Modular Foundation

## Cấu trúc mới

```text
js/
├── v9-features.js
├── v10-features.js
└── features/
    ├── continue-learning.js
    ├── global-search.js
    ├── study-reminder.js
    └── data-health.js
```

## Mục tiêu

- Giảm kích thước và trách nhiệm của `app.js`.
- Mỗi tính năng có file riêng để dễ sửa và kiểm tra.
- Giữ nguyên dữ liệu và hành vi của V10.2.
- Tạo nền tảng để tách tiếp Quiz, OCR, SRS và Backup ở các bản sau.

## Quy ước

Các module dùng `window.DhAppContext` để truy cập phần lõi hiện tại.
Cách này giúp tách module an toàn mà không phải viết lại toàn bộ ứng dụng trong một lần.
