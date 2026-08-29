# 09 — Quy ước và quy trình làm việc

## 1. Ngôn ngữ

| Nơi | Ngôn ngữ |
|---|---|
| Trao đổi với chủ dự án | **Tiếng Việt** |
| Kế hoạch, câu hỏi, báo cáo | **Tiếng Việt** |
| Tài liệu trong `docs/` | **Tiếng Việt** |
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

1. Đọc `docs/`
2. Xác nhận đang ở **đúng Phase** — không nhảy trước
3. **Lập kế hoạch trước, chỉ code khi chủ dự án đồng ý.** Đây là yêu cầu tường minh.
4. Nghi ngờ chỗ nào → hỏi chủ dự án, đừng tự đoán

### Trước khi xoá bất kỳ file nào

```bash
git log --oneline -- <path>
```

Nếu file đã nằm trong commit → **là công việc có chủ đích, không phải rác**.
(Đã từng xoá nhầm `lib/wallet.ts`, `lib/school-api.ts`, `mock-school-api/` vì bỏ qua bước này.)

### Trước khi commit

```bash
npm test                  # 234 test, ~0.8s — chạy trước vì nhanh nhất
npm run check:boundaries  # 4 luật ranh giới kiến trúc
npx tsc --noEmit          # phải sạch
npm run build             # phải pass — nhớ kill dev server trước
```

## 4. Vận hành server

### Chạy dev
```bash
cd /Users/trinhbach/Workspace/working/eduproof/EduProof   # máy Mac hiện tại
npm run dev                  # local, chế độ mock (mặc định)
npm run dev -- -H 0.0.0.0    # cho truy cập từ ngoài

# Chạy với circuit thật:
NEXT_PUBLIC_PROOF_PROVIDER=midnight npm run dev

# Build lại contract (cần Compact toolchain 0.31.1 — ledger 8, xem lessons.md):
npm run contract:build
```

⚠️ Cần `.env.local` (xem `.env.example`). Thiếu `SCHOOL_SIGNING_KEY` thì trường sinh
khoá tạm mỗi lần khởi động — app vẫn chạy nhưng chữ ký không khớp `data/schools.json`.

### Kill dev server — theo cổng, KHÔNG theo pattern tên
```bash
kill $(lsof -ti tcp:3000)                                  # macOS (máy hiện tại)
kill $(ss -lptn 'sport = :3000' | grep -oP 'pid=\K[0-9]+')  # Linux
```
⚠️ **Không dùng `pkill -f "next dev"`** — pattern khớp cả process của chính agent (exit 144).

### Build
```bash
kill $(lsof -ti tcp:3000)   # macOS; Linux xem lệnh ss ở trên
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

## 7. Thẩm mỹ giao diện

Rút ra từ đợt review UI cuối Phase 1. Vấn đề khi đó: giao diện "trông như AI làm".
Nguyên nhân cụ thể, và cách tránh lặp lại:

| Dấu hiệu | Vì sao đọc ra "AI" |
|---|---|
| Emoji làm icon | Dấu hiệu rõ nhất. Sản phẩm thật dùng bộ icon nhất quán |
| Thẻ trắng bo góc xếp dọc, cách đều | Bố cục mặc định, không có phân cấp thị giác |
| Mọi thứ căn giữa | An toàn tới mức vô danh |
| Chữ đều một cỡ, một màu xám | Mắt không biết nhìn đâu trước |

**Không** làm: gradient tím, glow, glassmorphism, animation nảy, minh hoạ 3D.
Vừa sai tông fintech, vừa lại là một kiểu "AI" khác.

**Nên** làm:

1. Icon SVG nhất quán, không emoji — thay đổi đơn lẻ có tác động lớn nhất.
2. Một chi tiết ký tự riêng. Ở đây là **con dấu niêm phong văn bằng** trên trang
   verify: vòng tròn viền mảnh, chữ chạy quanh, số hiệu proof ở giữa. Ngôn ngữ
   của bằng cấp và công chứng, không phải của ví tiền số.
3. Phân cấp chữ rõ: số liệu lớn và đậm, nhãn nhỏ viết hoa thưa chữ, phụ thì nhạt hẳn.
4. Phá thế "mọi thứ là thẻ trắng": kết quả verify nằm trên nền có màu, claim
   builder là một khối liền, landing lệch trái thay vì căn giữa.

---

## 8. Cái gì KHÔNG BAO GIỜ được vi phạm

1. Không có giá trị riêng tư nào trong kiểu `Proof`
2. Không tự deploy khi chưa được cho phép — hỏi trước, mỗi lần
3. Không đụng service khác trên server này
4. Không nhảy Phase — làm xong phần đang dở rồi mới sang phần sau
5. Không dùng DB ngoài ở Wave 1
