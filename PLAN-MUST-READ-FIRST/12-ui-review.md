# 12 — Review UI/UX và kế hoạch hoàn thiện Phase 1

> Viết sau khi chụp và xem tận mắt toàn bộ 9 màn hình ở 1440px và 375px (28/08/2026).
> Mục tiêu: đưa Phase 1 tới mức **ready for production** — sau đó chỉ còn tích hợp
> blockchain (Phase 2) và đóng gói deploy (Phase 3).

---

## 1. Đánh giá khách quan hiện trạng

### Đang tốt, giữ nguyên

| Màn hình | Vì sao tốt |
|---|---|
| `/verify/[id]` | Khối **"Withheld from this page"** là màn hình mạnh nhất dự án — nó nói đúng giá trị sản phẩm bằng hình ảnh, không bằng lời quảng cáo |
| Landing, khối so sánh | Hai cột "Sharing a transcript" vs "With EduProof" giải thích vấn đề trong 5 giây |
| Bảng màu | Xanh `#2557e5` trên nền `#f6f8fc` — sạch, đúng hướng fintech, không phải crypto |
| Kiến trúc | Provider pattern, ranh giới school/proof rõ ràng |

### Đang yếu

#### 🔴 V1 — Claim chưa dynamic (comment #2 của chủ dự án, **chưa làm**)
Hiện là 5 thẻ cố định. "My GPA is at least" + 3 nút `2.5 / 3.0 / 3.5`.
- Không chọn được **phép so sánh** — GPA chỉ có `>=`
- Không có phủ định — không nói được "status **is not** suspended"
- Không thêm/xoá được dòng claim
- Thêm thuộc tính mới phải sửa 5 chỗ trong code

#### 🔴 V2 — Verifier không có chỗ dán link (comment #3, **chưa làm**)
Chỉ có `/verify/[proofId]`. Không có `/verify`. Nav trỏ tới `/verify/demo` — một proof
không tồn tại. Verifier nhận được link thì mở được, nhưng nhận được **mã proof** thì bó tay.

#### 🔴 V3 — Student không xem lại được proof của mình (comment #4, **chưa làm**)
Tạo proof xong, rời trang là mất dấu. Không có `/student/proofs`.

#### 🟠 V4 — Câu claim bị cụt
Chưa tick thì hiện "I am at least in year", "My degree is", "My major is" — câu treo
lơ lửng, thiếu vế sau. Đọc như lỗi.

#### 🟠 V5 — Bảng mobile cắt mất cột
Ở 375px, `/school` chỉ thấy `STUDENT ID` và `NAME`; Major/Year/GPA/Status bị cắt.
Có `overflow-x-auto` nhưng người dùng mobile không biết là cuộn ngang được.

#### 🟠 V6 — Ngày hiển thị thô
`2027-06-30T00:00:00.000Z` trên trang verify. Nên là `30 June 2027`.

#### 🟠 V7 — Landing còn "Student sign in"
Đã chuyển sang kết nối ví từ lâu, chữ chưa đổi. Nút phụ ở card cũng ghi "Sign in".

#### 🟡 V8 — Thiếu "verify another proof"
Xem xong một proof là ngõ cụt.

#### 🟡 V9 — Steps stepper còn ghi "Sign in"
Bước 1 tên là "Sign in", thực tế là kết nối ví.

---

## 2. Vấn đề thẩm mỹ: "trông như AI làm"

Đây là nhận xét đúng và đáng xử lý. Cụ thể nó đến từ đâu:

| Dấu hiệu | Hiện trạng | Vì sao đọc ra "AI" |
|---|---|---|
| **Emoji làm icon** | 🔒 🏛 ✓ ⚠ ⌕ | Dấu hiệu rõ nhất. Sản phẩm thật dùng bộ icon nhất quán |
| **Thẻ trắng xếp dọc** | Mọi trang đều là `panel` bo 14px, viền xám, xếp dọc, cách đều | Bố cục mặc định. Không có nhịp điệu, không có phân cấp thị giác |
| **Mọi thứ căn giữa** | Landing, verify, login đều căn giữa toàn bộ | An toàn tới mức vô danh |
| **Chữ đều một cỡ** | Gần như toàn `text-sm` xám `slate-600` | Không có điểm nhấn, mắt không biết nhìn đâu trước |
| **Không có chi tiết riêng** | Không có gì để nhớ sau khi đóng tab | Thiếu "chất" |

### Hướng xử lý — có chất nhưng vẫn nhã nhặn

**Không** làm: gradient tím, glow, glassmorphism, animation nảy, dark mode crypto,
minh hoạ 3D. Những thứ đó vừa sai tông fintech vừa lại là một kiểu "AI" khác.

**Nên** làm — bốn thứ rẻ, hiệu quả cao:

1. **Bỏ hết emoji, thay bằng bộ icon SVG nhất quán**
   Dùng một bộ (Lucide/Heroicons) hoặc tự vẽ 8–10 icon inline. Đây là thay đổi
   **đơn lẻ có tác động lớn nhất** tới cảm giác "thật".

2. **Một chi tiết ký tự riêng — con dấu/tem xác thực**
   Trang verify hiện là một dấu ✓ tròn xanh nhạt. Thay bằng **con dấu kiểu niêm phong
   văn bằng** — vòng tròn viền mảnh, chữ chạy quanh, số hiệu proof ở giữa. Gợi đúng
   ngôn ngữ của bằng cấp và công chứng, không phải của ví tiền số.
   Đây là thứ người xem sẽ nhớ.

3. **Phân cấp chữ rõ hơn**
   Hiện gần như một cỡ. Cần: số liệu lớn và đậm, nhãn nhỏ viết hoa thưa chữ,
   nội dung phụ nhạt hơn hẳn. Mắt phải biết nhìn đâu trước.

4. **Phá thế "mọi thứ là thẻ trắng xếp dọc"**
   - Trang verify: kết quả nằm trên **nền có màu** (xanh lá nhạt khi hợp lệ,
     đỏ nhạt khi không) thay vì thẻ trắng
   - Trang claim: builder là **một khối liền** có nền hơi khác, không phải 5 thẻ rời
   - Landing: bỏ căn giữa toàn bộ, cho hero lệch trái với khoảng thở rộng hơn

5. **Chữ nghĩa bớt "sản phẩm SaaS"**
   "Choose what to prove" → giữ, tốt. Nhưng "Every claim below was proven against a
   credential from a verified issuer" thì dài và máy móc. Viết ngắn, người hơn.

---

## 3. Kế hoạch thực hiện

Thứ tự theo phụ thuộc. Ước lượng tổng: **4–5 ngày**.

### Bước 1 — Nền tảng (0.5 ngày)  ✅ XONG (28/08)

- [x] **A2** `lib/proof/store/` bất đồng bộ (`types.ts`, `local-store.ts`, `index.ts`)
      Đúng 2 call site như dự đoán. Thêm `Proof.owner` để `listBySubject` tra được —
      `subject` là handle mờ đổi mỗi lần nên không dùng làm khoá tra được.
      `owner` là **device-local, không lộ cho verifier** (đã kiểm chứng).
- [x] `lib/format.ts` — `formatDate`, `formatDateTime`, `formatRelative`, `isExpired`,
      `shortenMiddle` (sửa V6 — còn phải gắn vào UI ở bước 4)
- [x] `components/icons.tsx` — 15 icon SVG inline, kế thừa `currentColor` và cỡ chữ

### Bước 2 — Claim động (1.5 ngày) 🔴 lõi  ✅ XONG (28/08)

- [x] `types/index.ts` — `AttributeSpec`, `AttributeKind`, `ClaimOperator` đủ 6 phép.
      Bỏ hẳn `ClaimType` — không còn union cứng nào
- [x] `lib/proof/attributes.ts` — registry 5 thuộc tính, mỗi entry mang `slot` trỏ
      thẳng vào `SLOT` của `lib/school/canonical.ts`. **Đây là ràng buộc proving,
      không phải chi tiết hiển thị** — Wave 2 circuit nhận `(slot, operator, operand)`
- [x] `lib/proof/claims.ts` — viết lại hoàn toàn: `sentenceOf` (ngôi thứ nhất, cho
      sinh viên), `labelOf` (ngôi thứ ba, cho verifier), đánh giá theo `kind`,
      thêm `contradictions()` bắt mâu thuẫn khoảng số
- [x] `lib/proof/presets.ts` — 3 preset kèm `context` mô tả tình huống thật
- [x] `app/student/create-proof/page.tsx` — builder ba dropdown, thêm/xoá dòng,
      hai cột "sẽ thấy / giữ riêng", cảnh báo claim fail
- [x] Sửa V4 — câu luôn đầy đủ vì sinh từ registry

**Kiểm chứng trên trình duyệt:**
```
1. mặc định        : student status is active | GPA is at least 3.50
2. status is not   : student status is not active | GPA is at least 3.50
   cảnh báo fail   : có (Alice đang active)
3. gpa is lower    : ... | GPA is lower than 3.50
4. thêm dòng       : ... | academic year is at least 3
5. đổi sang degree : ... | degree is a Bachelor's
   operator enum   : is, is not          ← lọc đúng theo kind
6. xoá dòng        : GPA is lower than 3.50 | degree is a Bachelor's
7. preset intern   : degree is a Bachelor's | field of study is CS | academic year is at least 3
no JS errors
```
Riêng tư sau khi đổi engine: `372` / `3.72` / `SV001` / `Alice` / `addr_demo`
đều **không** xuất hiện ở proof đã lưu lẫn trang verify. Build pass.

### Bước 3 — Hai màn hình còn thiếu (1 ngày)

- [ ] `app/verify/page.tsx` (V2) — ô dán **cả ID lẫn URL đầy đủ**, tự tách lấy ID;
      báo lỗi rõ: không tìm thấy / hết hạn / sai định dạng; lịch sử tra cứu gần đây
- [ ] Sửa nav: `/verify/demo` → `/verify`
- [ ] `app/student/proofs/page.tsx` (V3) — dùng `proofStore.listBySubject(wallet)`;
      mỗi dòng: claim, thời gian, hạn, trạng thái; hành động copy link / mở / thu hồi (mock);
      badge "Wave 2: query trực tiếp on-chain"
- [ ] Nút "Verify another" trên trang kết quả (V8)

### Bước 4 — Chất riêng cho UI (1 ngày)

- [ ] Con dấu xác thực trên `/verify/[id]` — thay dấu ✓ tròn
- [ ] Trang verify: kết quả trên nền màu, không phải thẻ trắng
- [ ] Thang chữ rõ phân cấp (số lớn, nhãn hoa nhỏ, phụ nhạt)
- [ ] Landing: hero lệch trái, đổi "Student sign in" → "Connect wallet" (V7)
- [ ] Stepper: "Sign in" → "Connect" (V9)
- [ ] Bảng `/school` responsive thật ở 375px (V5): mobile chuyển sang danh sách thẻ,
      không phải bảng cuộn ngang
- [ ] Rà lại toàn bộ chữ nghĩa, cắt câu máy móc

### Bước 5 — Proof Request (1 ngày) — G1 đã duyệt

- [ ] `lib/proof/request.ts` — encode/decode base64url
- [ ] `app/verify/request/page.tsx` — verifier dựng yêu cầu (dùng lại builder ở bước 2)
- [ ] `app/student/respond/page.tsx` — màn hình consent, hiện rõ **sẽ lộ gì / giấu gì**
- [ ] Badge cảnh báo: Wave 1 request **chưa ký**, danh tính verifier **chưa xác minh**

### Bước 6 — Test (0.5 ngày)

- [ ] Vitest
- [ ] `tests/claims.test.ts` — ma trận thuộc tính × operator × biên
- [ ] `tests/privacy.test.ts` — proof không chứa giá trị riêng tư
- [ ] `tests/store.test.ts` — hợp đồng `ProofStore`
- [ ] `tests/school-*.test.ts` — chuyển 4 script kiểm chứng khối E từ scratchpad vào
- [ ] `npm test`

---

## 4. Cố ý KHÔNG làm (tránh over-engineer)

| Thứ | Vì sao bỏ |
|---|---|
| Dark mode | Nhân đôi chi phí kiểm thử. Một chế độ sáng chỉn chu giá trị hơn |
| Animation phức tạp | Sai tông. Chỉ giữ transition 150ms cho hover/focus |
| Thư viện component (shadcn, MUI) | `components/ui.tsx` đang đủ dùng. Thêm vào là phình bundle trên Vercel |
| Đa ngôn ngữ | Wave 3 |
| Claim lồng nhau OR/AND | Wave 2. Wave 1 chỉ AND |
| State management (Redux/Zustand) | Không có state phức tạp. `useState` là đủ |
| Skeleton cho mọi thứ | Chỉ những chỗ tải thật sự chậm |
| Storybook | Không đủ component để đáng |

---

## 5. Định nghĩa "ready for production" cho Phase 1

- [ ] Ba comment của chủ dự án (claim động, verifier tra cứu, student xem proof) **đã làm**
- [ ] Không còn emoji làm icon
- [ ] Không còn ngày ISO thô, không còn câu cụt
- [ ] Mobile 375px dùng được ở **mọi** trang
- [ ] Mọi thao tác async có trạng thái loading và lỗi
- [ ] Mọi danh sách có trạng thái rỗng
- [ ] `npm run build` + `npm test` + `npm run check:boundaries` đều pass
- [ ] Chạy được bằng **một lệnh** (`npm run dev`)
- [ ] Không có lỗi JS ở bất kỳ trang nào
- [ ] Kiểm chứng riêng tư runtime vẫn sạch
