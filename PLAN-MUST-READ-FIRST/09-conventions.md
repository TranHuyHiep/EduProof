# 09 — Quy ước và quy trình làm việc

## 1. Ngôn ngữ

| Nơi | Ngôn ngữ |
|---|---|
| Trao đổi với chủ dự án | **Tiếng Việt** |
| Kế hoạch, câu hỏi, báo cáo | **Tiếng Việt** |
| Tài liệu trong `PLAN-MUST-READ-FIRST/` | **Tiếng Việt** |
| Chữ hiển thị trên UI | **Tiếng Anh** (đối tượng quốc tế, giám khảo đọc tiếng Anh) |
| Comment trong code | **Tiếng Anh** |
| Tên biến, tên hàm | **Tiếng Anh** |
| README, slide, video | **Tiếng Anh** (bài nộp) |
| `business.md` | Tiếng Việt (nội bộ) |

## 2. Quy tắc code

- **Comment giải thích *vì sao*, không phải *cái gì*.** Code đã nói cái gì rồi.
- Khớp mật độ comment và cách đặt tên của code xung quanh.
- Không thêm dependency nếu chưa thật cần — mọi package đều là chi phí trên Vercel.
- TypeScript strict. Không `any`.
- Không logic nghiệp vụ trong React component.
- Không dùng `console.log` trong code giao nộp.

## 3. Quy trình

### Trước khi code

1. Đọc `PLAN-MUST-READ-FIRST/`
2. Xác nhận đang ở **đúng Phase** — không nhảy trước
3. **Lập kế hoạch trước, chỉ code khi chủ dự án đồng ý.** Đây là yêu cầu tường minh.
4. Nghi ngờ chỗ nào → hỏi. Ghi câu hỏi vào `10-open-questions.md`

### Trước khi xoá bất kỳ file nào

```bash
git log --oneline -- <path>
```

Nếu file đã nằm trong commit → **là công việc có chủ đích, không phải rác**.
(Đã từng xoá nhầm `lib/wallet.ts`, `lib/school-api.ts`, `mock-school-api/` vì bỏ qua bước này.)

### Trước khi commit

```bash
npm run build   # phải pass — nhớ kill dev server trước
npm test        # phải pass (sau khi có test ở Phase 1 khối H)
```

## 4. Vận hành server

### Chạy dev
```bash
cd /root/eduproof
npm run dev                  # local
npm run dev -- -H 0.0.0.0    # cho truy cập từ ngoài
```

### Kill dev server — theo cổng, KHÔNG theo pattern tên
```bash
kill $(ss -lptn 'sport = :3000' | grep -oP 'pid=\K[0-9]+')
```
⚠️ **Không dùng `pkill -f "next dev"`** — pattern khớp cả process của chính agent (exit 144).

### Build
```bash
kill $(ss -lptn 'sport = :3000' | grep -oP 'pid=\K[0-9]+')
rm -rf .next
npm run build
```
⚠️ **Không build khi dev server đang chạy** — dùng chung `.next`, gây `MODULE_NOT_FOUND` và lỗi 500.

### Playwright
```js
executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'
```
(package là 1.49.1, mong đợi `chromium-1148`, nhưng chỉ có `chromium-1234`)

## 5. Kỷ luật Git

- Branch hiện tại: `feature/bach`. Branch chính: `main`.
- **Chỉ commit/push khi được yêu cầu.**
- Commit message kết thúc bằng:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```
- Không commit `.env.local`, `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`

## 6. Ranh giới với agent khác

Từng xảy ra: nhiều phiên agent chạy song song cùng ghi vào repo này, gây xung đột và
code lạc scope.

- Trước khi làm, kiểm tra có tiến trình khác đang ghi vào repo không
- **Không tự kill phiên khác của người dùng** — đó là quyết định của họ, chỉ báo lên
- Nếu thấy code lạc scope, **hỏi trước khi xoá**

## 7. Cái gì KHÔNG BAO GIỜ được vi phạm

1. Không có giá trị riêng tư nào trong kiểu `Proof`
2. Không tự deploy ở Phase 3
3. Không đụng service khác trên server này
4. Không viết code Midnight khi còn ở Phase 1
5. Không dùng DB ngoài ở Wave 1
