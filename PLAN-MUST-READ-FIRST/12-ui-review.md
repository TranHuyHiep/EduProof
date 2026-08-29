# 12 — Review UI/UX và kế hoạch hoàn thiện Phase 1

> Viết sau khi chụp và xem tận mắt toàn bộ 9 màn hình ở 1440px và 375px (28/08/2026).
> Mục tiêu: đưa Phase 1 tới mức **ready for production** — sau đó chỉ còn tích hợp
> blockchain (Phase 2) và đóng gói deploy (Phase 3).
>
> **Cập nhật 29/08/2026** — review lại toàn bộ trên máy Mac. Bước 1–4 **đã xong**
> (bản trước chưa tick bước 3–4 dù code đã có). Phát hiện và sửa 3 lỗi, xem §6.
> **Bước 5 (Proof Request) đã chuyển sang Wave 2** theo quyết định của chủ dự án.
> Còn lại của Phase 1: **bước 6 (test)**.

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

### Bước 3 — Hai màn hình còn thiếu (1 ngày)  ✅ XONG

- [x] `app/verify/page.tsx` (V2) — ô dán **cả ID lẫn URL đầy đủ**, tự tách lấy ID
      (`lib/proof/lookup.ts`); báo lỗi rõ theo từng loại; lịch sử tra cứu gần đây
      lưu localStorage phía verifier
- [x] Sửa nav: nav giờ trỏ `/verify`, không còn `/verify/demo`
- [x] `app/student/proofs/page.tsx` (V3) — `proofStore.listBySubject(wallet)`;
      mỗi dòng: claim, thời gian tương đối, hạn, badge trạng thái; copy link /
      mở / thu hồi; ghi chú Wave 2 query on-chain
- [x] Nút "Check another proof" trên cả trang kết quả lẫn trang không tìm thấy (V8)

### Bước 4 — Chất riêng cho UI (1 ngày)  ✅ XONG

- [x] Con dấu xác thực `components/seal.tsx` trên `/verify/[id]` — thay dấu ✓ tròn,
      số hiệu proof chạy quanh vành như dấu công chứng
- [x] Trang verify: tiêu đề đổi màu theo kết quả, khối withheld tách bằng rule
- [x] Thang chữ rõ phân cấp (`title`, `eyebrow`, `ink-soft`, `ink-faint`)
- [x] Landing: hero lệch trái, "Connect wallet" (V7)
- [x] Stepper: "Connect" (V9)
- [x] Bảng `/school` ở 375px chuyển sang danh sách thẻ (`md:hidden`), đủ mọi cột (V5)
- [x] Bỏ hết emoji, thay bằng `components/icons.tsx`
- [x] Rà lại chữ nghĩa

**Kiểm chứng lại trên máy Mac (29/08):** xem §6.

### ~~Bước 5 — Proof Request~~ → **CHUYỂN SANG WAVE 2** (29/08)

Chủ dự án quyết định không làm ở Wave 1. Tính năng chỉ trọn vẹn khi request được
ký và danh tính verifier được xác minh — đều là việc Wave 2.
Thiết kế giữ ở `08-wave2-wave3.md` **W2.4**.

### Bước 6 — Test (0.5 ngày)  ✅ XONG (29/08)

- [x] Vitest (`vitest.config.mts`, alias `@/` khớp tsconfig), `npm test`
- [x] `tests/claims.test.ts` — ma trận thuộc tính × operator × biên
- [x] `tests/privacy.test.ts` — proof không chứa giá trị riêng tư
- [x] `tests/store.test.ts` — hợp đồng `ProofStore`
- [x] `tests/school.test.ts` — thay 4 script kiểm chứng khối E
- [x] `tests/format.test.ts`, `tests/lookup.test.ts`

**138 test, 6 file, chạy trong ~0.2 giây.** Chi tiết ở §7.

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

- [x] Ba comment của chủ dự án (claim động, verifier tra cứu, student xem proof) **đã làm**
- [x] Không còn emoji làm icon
- [x] Không còn ngày ISO thô, không còn câu cụt
- [x] Mobile 375px dùng được ở **mọi** trang
- [x] Mọi thao tác async có trạng thái loading và lỗi
- [x] Mọi danh sách có trạng thái rỗng
- [x] `npm run build` + `npm test` + `npm run check:boundaries` **đều pass**
- [x] Chạy được bằng **một lệnh** (`npm run dev`)
- [x] Không có lỗi JS ở bất kỳ trang nào
- [x] Kiểm chứng riêng tư runtime vẫn sạch

---

## 6. Kiểm chứng lại toàn bộ trên máy Mac (29/08/2026)

Môi trường đã đổi: từ server Linux `/root/eduproof` sang máy Mac local
(`/Users/trinhbach/Workspace/working/eduproof/EduProof`), Node **v22.21.1**
(vẫn hỗ trợ `--experimental-strip-types`, nên `npm run school` chạy nguyên trạng).

### 6.1 Đã chạy thật

| Phép kiểm | Kết quả |
|---|---|
| `npm run build` | pass, **13 route**, không warning, First Load JS 102 kB |
| `npm run check:boundaries` | pass cả 4 luật |
| Hai vỏ school API | `/api/school/graphql` và `:4000/graphql` đều trả đúng |
| Luồng end-to-end | connect ví → nhận credential → dựng claim → sinh proof → `/student/proofs` → dán URL vào `/verify` → xác thực |
| Tràn ngang 375px + 1440px | **10/10 route sạch** sau khi sửa (xem 6.2) |
| Lỗi JS | không có trên mọi route |
| Riêng tư ở runtime | `372` / `3.72` / `SV001` / `Alice` / `Computer Science` **không** xuất hiện ở proof đã lưu lẫn trang verify |

### 6.2 Ba lỗi phát hiện và đã sửa trong phiên này

| # | Lỗi | Mức | Sửa |
|---|---|---|---|
| **M1** | `/student/create-proof` **tràn ngang ở 375px** — hàng nút gợi ý GPA (`2.50/3.00/3.50/3.80`) rộng 440px trong khung 360px | 🔴 vi phạm DoD "mobile dùng được ở mọi trang" | `flex` → `flex flex-wrap` |
| **M2** | Ô nhập số **xoá trắng là nhảy về 0** — `Number("")` là `0`, claim âm thầm thành "GPA is at least 0.00". Người dùng chỉ cần xoá để gõ lại là dính | 🔴 sai dữ liệu, không chỉ là UI | `NumberValue` giữ **draft text** khi đang gõ, chỉ commit khi parse ra số hợp lệ, kẹp trong `[min,max]` |
| **M3** | `<input type="number">` **render theo locale của máy**, không theo `lang` của trang. Máy này `AppleLocale=en_VN` → hiện `3,5` thay vì `3.50`. Giám khảo ở châu Âu/VN sẽ thấy dấu phẩy | 🟠 sai hình thức trước giám khảo | đổi sang `type="text"` + `inputMode="decimal"`, hiển thị qua `valueLabel()` nên luôn dấu chấm |

Thêm: **thiếu favicon** → mọi trang 404 `/favicon.ico`. Đã thêm `app/icon.svg`
(con dấu, cùng ngôn ngữ hình ảnh với `components/seal.tsx`).

Và `.gitignore` thêm `.playwright-mcp/` — thư mục Playwright ghi ảnh chụp vào
repo, làm file watcher của `next dev` recompile liên tục và bắn 500 giả.
Đây **không** phải lỗi ứng dụng, nhưng đủ để đánh lừa người review sau.

### 6.3 Còn nợ của Phase 1

- ~~Bước 5 — Proof Request (G1)~~ → **đã chuyển sang Wave 2** (29/08), xem W2.4
- **Bước 6 — Test** → **đã làm 29/08**, xem §7

Ngoài ra một điểm cần biết (chưa phải lỗi hôm nay): chưa có `.env.local` nên
`SCHOOL_SIGNING_KEY` trống → `lib/school/keys.ts` sinh khoá tạm và cảnh báo.
`issuerPublicKey` chạy thật vì thế **lệch** với `data/schools.json`. Mock provider
không kiểm chữ ký nên demo vẫn chạy, nhưng tới Phase 2 thì đây là lỗi chặn.
Cần chạy `npm run school:genkey` và điền `.env.local` trước khi vào Phase 2.

---

## 7. Test — bước 6 (29/08/2026)

> Con số dưới đây là trạng thái **khi kết thúc Phase 1**. Sau Phase 2 đã lên
> **227 test / 11 file** — thêm test circuit, encoding, chữ ký issuer, và
> provider Midnight. Xem `00-README.md`.

`npm test` → **138 test / 6 file / ~0.2 giây**. Runner: **Vitest** (đúng khuyến nghị
khối H — nhẹ, không thêm gánh nặng build; `vitest` là devDependency nên **không lọt
vào bundle client**, First Load JS vẫn 102 kB).

### 7.1 Nội dung

| File | Test | Bảo vệ điều gì |
|---|---|---|
| `tests/privacy.test.ts` | 16 | **Quan trọng nhất.** Proof không chứa giá trị riêng tư — cả khi claim đúng lẫn khi claim sai; subject handle mờ và đổi mỗi lần; `owner` không lọt sang verifier; `Proof` đúng bộ field đã chốt |
| `tests/claims.test.ts` | 59 | Ma trận thuộc tính × operator × biên. Mọi operator mà registry quảng cáo đều chạy được. Câu sinh ra không bao giờ cụt (V4) |
| `tests/store.test.ts` | 29 | Hợp đồng `ProofStore` — viết theo **interface**, không theo class, để Wave 2 cắm `ChainProofStore` vào là biết ngay có đúng hợp đồng không |
| `tests/school.test.ts` | 20 | Hợp đồng tích hợp GraphQL: khoá phục vụ **khớp** `data/schools.json`, chữ ký verify được, sửa GPA là chữ ký hỏng, JCS độc lập thứ tự khoá, slot layout khớp registry |
| `tests/format.test.ts` | 14 | Không còn ISO thô (V6) |
| `tests/lookup.test.ts` | 11 | Verifier dán ID hay URL đều nhận (V2) |

### 7.2 Đã kiểm tra là test **thật sự bắt được lỗi**

Test pass mà không bao giờ fail được thì vô dụng. Đã thử phá code (mutation) rồi khôi phục:

| Phá gì | Kết quả |
|---|---|
| `>=` thành `>` trong `compare()` | **2 test fail** ✅ |
| Thêm field rò GPA thật vào `Proof` | **5–6 test fail** ✅ (đúng loại lỗi test này sinh ra để chặn) |
| Đảo thứ tự `newestFirst` | **2 test fail** ✅ |

Toàn bộ đã khôi phục nguyên trạng, `git status` sạch ở `lib/`.

### 7.3 Một cái bẫy đã xử lý

Bản đầu quét chuỗi tìm `"372"` trên **toàn bộ** proof, gồm cả `proofId` / `subject` /
`payload` — vốn là hex ngẫu nhiên. Một chuỗi 3 chữ số trùng ngẫu nhiên trong ~90 ký tự
hex khá thường xuyên → suite **flaky ~1/6 lần chạy**. Đã tách `scannableFieldsOf()`
loại bỏ các field ngẫu nhiên; tính mờ của chúng kiểm bằng **hình dạng** (regex) riêng.
Sau khi sửa: **12/12 lần chạy liên tiếp pass**, và vẫn bắt được rò rỉ thật.

### 7.4 Khoá ký đã cấu hình (29/08)

`.env.local` đã tạo (nằm trong `.gitignore`, **không commit**), `SCHOOL_SIGNING_KEY`
sinh bằng `npm run school:genkey`, public key tương ứng đã cập nhật vào
`data/schools.json`. Kiểm chứng:

```
served issuerPublicKey == data/schools.json     ✓
signature verifies against published key        ✓
tampered GPA rejected                           ✓
ephemeral-key warning                           không còn
```

→ **Lỗi P2** trong `11-school-vendor-contract.md` đã đóng. Đây là điều kiện tiên quyết
của Phase 2 (verifier đọc khoá từ registry/on-chain, không từ credential).
