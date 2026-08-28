# 05 — Wave 1 / Phase 1: Mock UI + backend logic off-chain

**Mục tiêu:** Sản phẩm gần như hoàn chỉnh, tính năng đầy đủ, sẵn sàng test —
**trừ** phần tương tác blockchain (để Phase 2).

**Luật cứng của Phase này:** ❌ Không viết code Midnight. ❌ Không viết Compact contract.
❌ Không import thư viện `@midnight-ntwrk/*`.

**Ước lượng:** 5–7 ngày làm việc.

---

> ⚠️ **Kế hoạch thực thi chi tiết đã chuyển sang `12-ui-review.md`** (28/08), viết sau
> khi review tận mắt toàn bộ UI. File này giữ lại phần thiết kế và lý do; file 12 là
> thứ tự làm việc thực tế.

## Tổng quan các khối công việc

| Khối | Nội dung | Ưu tiên | Phụ thuộc |
|---|---|---|---|
| **A** | Dọn dẹp + tầng lưu trữ async | 🔴 P0 | — |
| **B** | Hệ thống claim động | 🔴 P0 | A |
| **C** | Trang tra cứu của Verifier | 🔴 P0 | A |
| **D** | Danh sách proof của Student | 🔴 P0 | A |
| **E** | Nâng School API thành GraphQL thật (vendor độc lập) | 🔴 P0 | — |
| **G1** | **Proof Request** — verifier nêu yêu cầu, sinh viên đồng ý | 🔴 P0 | B, C |
| **F** | Sửa lỗi UI + hoàn thiện UX | 🟠 P1 | B, C, D |
| **G** | Tính năng bổ sung đã duyệt | 🟠 P1 | B |
| **H** | Test | 🟠 P1 | B |
| **I** | Chốt design system | 🟡 P2 | F |

> **Đã chốt (28/08):** Q1 = có làm Proof Request (nâng lên P0).
> Q2 = school là **vendor độc lập expose GraphQL**, xem `11-school-vendor-contract.md`.
> Q3 = dùng proof server bên ngoài `https://proof-server.preprod.midnight.network`.

---

## Khối A — Dọn dẹp + tầng lưu trữ async

### A1. Dọn rác  ✅ XONG (28/08)

- [x] Xoá `public/circuits/` (rác từ session cũ, gây hiểu nhầm là đã có ZK)
- [x] Gỡ `@midnight-ntwrk/compact-runtime` khỏi `package.json` (Phase 2 thêm lại)
- [x] Bỏ IP hard-code trong `.env.local`, thay bằng đường dẫn tương đối sau khi làm khối E
- [x] Tạo `.env.example` (`.env.local` phải nằm trong `.gitignore`)

### A2. Tầng lưu trữ bất đồng bộ

Tạo `lib/proof/store/`:

```ts
// types.ts
export interface ProofStore {
  save(proof: Proof): Promise<void>;
  read(proofId: string): Promise<Proof | null>;
  listBySubject(subject: string): Promise<Proof[]>;
}
```

- `local-store.ts` — `LocalStorageProofStore`, bọc localStorage trong Promise
- `index.ts` — `export const proofStore: ProofStore = new LocalStorageProofStore();`
- Xoá `lib/proof/store.ts` cũ, sửa 2 call site trong `mock-provider.ts`

**Vì sao làm ngay:** đổi bây giờ tốn 2 call site; đổi sau khi có Postgres/on-chain
sẽ phải sửa lan khắp nơi. Xem `03-architecture.md` §4.

---

## Khối B — Hệ thống claim động 🔴 quan trọng nhất

Yêu cầu của chủ dự án: claim phải theo cấu trúc `<mệnh đề> <phép so sánh> <giá trị>`,
và *"có thể làm tốt hơn cả ví dụ tao đưa"*. Dưới đây là đề xuất đi xa hơn.

### B1. Vấn đề của thiết kế hiện tại

`CLAIM_CATALOG` hiện là danh sách **câu chữ cứng** với operator **cố định**:

```ts
{ type: "gpa_threshold", operator: ">=", title: "My GPA is at least", ... }
```

Ba hạn chế:
1. Sinh viên **không chọn được operator** — GPA chỉ có `>=`, không có `<=` hay `==`
2. Không có phủ định — không nói được "status **is not** suspended"
3. Thêm thuộc tính mới phải sửa **5 chỗ**: type union, catalog, `labelOf`,
   `evaluateClaim`, và UI

### B2. Thiết kế đề xuất: **Attribute Registry**

Thay catalog cứng bằng **registry mô tả thuộc tính**. Thêm thuộc tính mới = thêm **một entry**.

```ts
type AttributeKind = "enum" | "number" | "date";

interface AttributeSpec {
  id: PrivateAttribute;           // "gpa"
  kind: AttributeKind;            // "number"
  subject: string;                // "My GPA"        ← <mệnh đề>
  operators: ClaimOperator[];     // các phép so sánh HỢP LỆ cho kiểu này
  domain?: Array<{ value: string; label: string }>;  // với enum
  range?: { min: number; max: number; step: number }; // với number
  unit?: string;
}
```

Ví dụ:

```ts
{
  id: "gpa", kind: "number", subject: "My GPA",
  operators: [">=", ">", "<=", "<", "=="],
  range: { min: 0, max: 4, step: 0.1 },
}
{
  id: "status", kind: "enum", subject: "My student status",
  operators: ["==", "!="],
  domain: [
    { value: "active",    label: "active" },
    { value: "graduated", label: "graduated" },
    { value: "suspended", label: "suspended" },
  ],
}
{
  id: "degree", kind: "enum", subject: "My degree",
  operators: ["==", "!="],
  domain: [
    { value: "Bachelor", label: "a Bachelor's" },
    { value: "Master",   label: "a Master's" },
    { value: "PhD",      label: "a PhD" },
  ],
}
```

### B3. Operator

```ts
type ClaimOperator = "==" | "!=" | ">=" | ">" | "<=" | "<";
```

Mỗi operator có **hai cách đọc**, tuỳ kiểu thuộc tính:

| Operator | Với enum | Với number |
|---|---|---|
| `==` | "is" | "is exactly" |
| `!=` | "is not" | "is not" |
| `>=` | — | "is at least" |
| `>` | — | "is higher than" |
| `<=` | — | "is at most" |
| `<` | — | "is lower than" |

→ Câu tiếng Anh sinh **tự động**: `subject` + từ nối của operator + nhãn giá trị.

```
My GPA is at least 3.5
My student status is not suspended
My degree is a Bachelor's
I am in academic year 3 or above
```

### B4. Ưu điểm so với thiết kế cũ

| | Cũ | Mới |
|---|---|---|
| Thêm thuộc tính | sửa 5 chỗ | thêm 1 entry registry |
| Chọn operator | không | có, giới hạn theo kiểu |
| Phủ định | không | có (`!=`) |
| Câu tiếng Anh | viết tay từng loại | sinh tự động |
| Ánh xạ sang circuit | thủ công | 1 predicate ↔ 1 lời gọi circuit |

**Điểm quan trọng cho Phase 2:** registry này ánh xạ **thẳng** sang một circuit Compact
tổng quát nhận `(attributeId, operatorCode, operand)`. Đây là lý do kỹ thuật chính để
làm claim động — không chỉ là tiện cho UI.

### B5. Composition — kết hợp nhiều claim

- Một proof chứa **nhiều claim**, nối bằng **AND** (Wave 1)
- UI: thêm/xoá từng dòng claim
- Chống trùng: cùng một `attribute` + `operator` không thêm hai lần
- Cảnh báo mâu thuẫn (VD: `gpa >= 3.5` và `gpa < 3.0`)
- OR / nhóm lồng nhau → **Wave 2** (ghi rõ trong roadmap)

### B6. UI builder claim

```
┌─────────────────────────────────────────────────────────────┐
│  What do you want to prove?                                 │
│                                                             │
│  ┌────────────────┬──────────────┬──────────────┐    ┌───┐ │
│  │ My GPA       ▾ │ is at least ▾│ 3.5        ▾ │    │ ✕ │ │
│  └────────────────┴──────────────┴──────────────┘    └───┘ │
│  ┌────────────────┬──────────────┬──────────────┐    ┌───┐ │
│  │ My status    ▾ │ is          ▾│ active     ▾ │    │ ✕ │ │
│  └────────────────┴──────────────┴──────────────┘    └───┘ │
│                                                             │
│  + Add another claim                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  The verifier will see:                                     │
│    ✓ My GPA is at least 3.5                                 │
│    ✓ My student status is active                            │
│  They will NOT see: your GPA, name, or student ID           │
│                                                             │
│  Quick presets:  [Student discount] [Scholarship] [Hiring]   │
│                                                             │
│                                    [ Generate proof ]        │
└─────────────────────────────────────────────────────────────┘
```

- Dropdown thứ hai (operator) **lọc theo kiểu** của thuộc tính đã chọn
- Ô giá trị đổi widget theo kiểu: enum → select, number → slider + input
- Preview cập nhật tức thời
- Cảnh báo khi claim **sẽ fail** với hồ sơ hiện tại (sinh viên nên biết trước khi tạo)

### B7. Việc cần làm

- [ ] `types/index.ts`: thêm `AttributeSpec`, `AttributeKind`, mở rộng `ClaimOperator`
- [ ] `lib/proof/attributes.ts`: registry (file mới)
- [ ] `lib/proof/claims.ts`: viết lại — `statementOf`, `labelOf` sinh tự động, `evaluateClaim`
      chạy theo kiểu chứ không theo `type`
- [ ] `lib/proof/presets.ts`: preset dựng sẵn
- [ ] `app/student/create-proof/page.tsx`: builder mới
- [ ] Bỏ `ClaimType` union nếu registry đã thay thế được hoàn toàn

---

## Khối C — Trang tra cứu của Verifier

Hiện chỉ có `/verify/[proofId]`. Verifier **không có chỗ dán link/ID**.

- [ ] `app/verify/page.tsx` — ô nhập, nhận **cả hai** dạng:
      - ID thuần: `pf_a6fce6019a53`
      - URL đầy đủ: `https://.../verify/pf_a6fce6019a53`
      → parse ra ID rồi điều hướng
- [ ] Báo lỗi rõ ràng: không tìm thấy / hết hạn / sai định dạng
- [ ] Lịch sử xác thực gần đây (localStorage, phía verifier)
- [ ] Nút "Verify another proof" ở trang kết quả (lỗi E5)
- [ ] Thêm `/verify` vào navigation chính

---

## Khối D — Danh sách proof của Student

- [ ] `app/student/proofs/page.tsx` — dùng `proofStore.listBySubject(walletAddress)`
- [ ] Mỗi dòng: các claim, thời gian tạo, hạn dùng, trạng thái (còn hạn / hết hạn)
- [ ] Hành động: sao chép link, mở trang proof, thu hồi (mock — Wave 2 làm thật)
- [ ] Badge ghi rõ: *"Wave 2: danh sách này sẽ được query trực tiếp từ on-chain"*
- [ ] Trạng thái rỗng có hướng dẫn tạo proof đầu tiên

---

## Khối E — Nâng School API thành GraphQL thật

> ⚠️ Khối này **đã đổi hoàn toàn** so với bản kế hoạch đầu, sau khi chốt Q2.
> **Nội dung đầy đủ ở `11-school-vendor-contract.md`.** Đây chỉ là tóm tắt.

School **không phải mock cho tiện** — nó là **vendor độc lập có hệ thống riêng**.
Dự án build một trường mẫu expose GraphQL; trường khác muốn dùng EduProof cũng phải
expose GraphQL **theo đúng schema này**. Vì vậy `mock-school-api/` là **đặc tả tích hợp**,
phải thiết kế và viết tài liệu như API công khai.

Bốn lỗi trong bản hiện tại phải sửa (chi tiết ở file 11):

| | Lỗi | Vì sao chặn |
|---|---|---|
| **P1** | Không phải GraphQL thật — `resolve()` dò regex tên field | Không thể bảo trường khác làm theo một thứ không phải GraphQL |
| **P2** | Khoá issuer **sinh lại mỗi lần restart**, public key đi kèm credential | Verifier chẳng xác thực được gì; Phase 2 lấy key từ chain sẽ vỡ |
| **P3** | `registrar` trả toàn bộ hồ sơ, chạy trong browser, không auth | Là endpoint rò rỉ hàng loạt nếu công khai |
| **P4** | GPA là `Float` | Circuit không có số thực → sẽ phải đổi schema công khai ở Phase 2 |

Việc: **E1–E16**, xem `11-school-vendor-contract.md` §5–§7.

**Triển khai (Q11 đã chốt = B):** school API sống ở **hai vỏ**, dùng chung **một lõi**:

```
lib/school/                      ← lõi duy nhất: schema, resolver, ký
   ├── mock-school-api/server.mjs        vỏ Node, cổng 4000 — local/Docker
   └── app/api/school/graphql/route.ts   vỏ Next.js — bản Vercel
```

⚠️ **Luật cứng:** `app/api/school/**` **không được import bất cứ thứ gì từ `lib/proof/`**.
Trường không biết gì về hệ thống proof. Ranh giới mờ ở tầng triển khai thì chấp nhận được;
mờ ở tầng phụ thuộc code thì không.

Kèm theo là các việc bù ranh giới (banner UI, comment, sơ đồ trong README) — §5.3.

---

## Khối G1 — Proof Request (đã duyệt) 🔴 P0

Verifier nêu yêu cầu, sinh viên xem rồi quyết định — giống màn hình consent của OAuth.

```
Verifier ở /verify/request tạo yêu cầu:
    "cần: status is active AND gpa >= 3.0"
        → sinh link  /student/respond?req=<mã base64url>

Sinh viên mở link:
    → thấy CHÍNH XÁC điều được hỏi, và ai hỏi
    → thấy trước mình sẽ để lộ gì (và không để lộ gì)
    → Đồng ý  hoặc  Từ chối
    → nếu đồng ý: sinh proof đúng yêu cầu, trả link về
```

### Vì sao đáng P0
- Là luồng **thật** ngoài đời — verifier mới là bên nêu yêu cầu, không phải sinh viên đoán
- Thể hiện **selective disclosure** rõ hơn hẳn: sinh viên **thấy trước** rồi mới đồng ý
- Không cần blockchain — mã request encode thẳng trong URL
- Ăn điểm cả UX (15%) lẫn Product/Vision (15%)

### Việc cần làm
- [ ] `types/index.ts`: `ProofRequest { requestId, requester, claims: ClaimRequest[], createdAt, expiresAt }`
- [ ] `lib/proof/request.ts`: encode/decode base64url, có validate
- [ ] `app/verify/request/page.tsx` — verifier dựng yêu cầu (dùng lại UI builder claim ở khối B)
- [ ] `app/student/respond/page.tsx` — màn hình consent
- [ ] Màn hình consent phải hiện **cả hai cột**: sẽ tiết lộ gì / sẽ giấu gì (dùng lại G2)
- [ ] Luồng từ chối: sinh viên nói không, có thông báo tử tế
- [ ] Xử lý khi yêu cầu hết hạn
- [ ] ⚠️ Wave 1: request **chưa được ký**, và danh tính verifier **chưa xác minh**.
      Phải hiện badge cảnh báo rõ. Wave 2 làm thật (xem `08-wave2-wave3.md` W2.4)

---

## Khối F — Sửa lỗi UI + hoàn thiện UX

Từ đợt review Playwright:

- [ ] E1 — trang credentials hiện địa chỉ ví, không phải tên sinh viên
- [ ] E2 — format ngày `30 June 2027`, không phải ISO thô
- [ ] E3 — bảng `/school` responsive trên mobile
- [ ] E4 — claim chưa tick không được hiển thị câu cụt
- [ ] E5 — nút "Verify another proof"
- [ ] E6 — landing đổi "Student sign in" → "Connect wallet"

Thêm:

- [ ] Trạng thái loading khi sinh proof (hiện có `delay(1400)` — nên có progress thật)
- [ ] Trạng thái lỗi cho mọi thao tác async
- [ ] Trạng thái rỗng cho mọi danh sách
- [ ] Đánh dấu rõ ràng mọi chỗ còn là **mock** (badge "Mock" / "Wave 2")

---

## Khối G — Tính năng bổ sung

> G1 đã được duyệt và tách thành khối riêng ở trên (P0).
> Các mục dưới đây vẫn là đề xuất — **chờ duyệt trước khi code**.

### G2. Bảng "điều verifier KHÔNG thấy"

Trên trang verify, hiện rõ danh sách thuộc tính **đã bị giấu**:

```
✓ Verified              ✗ Not disclosed
  GPA is at least 3.5     Exact GPA
  Status is active        Name
                          Student ID
                          Academic year
```

Rẻ tiền mà làm nổi bật giá trị lõi của sản phẩm. Rất ăn ảnh khi quay video demo.

### G3. Proof có hạn sử dụng do sinh viên chọn

Cho chọn 24h / 7 ngày / 30 ngày. Hiện đang cứng. Củng cố thông điệp
"sinh viên kiểm soát dữ liệu của mình".

### G4. Trang giải thích "Cái này hoạt động thế nào"

Một trang tĩnh giải thích ZK bằng ngôn ngữ thường + sơ đồ dual-ledger.
Phục vụ trực tiếp tiêu chí "Explain how privacy meaningfully shapes the product".

### G5. Kịch bản demo có sẵn

Nút "Chạy thử kịch bản" nạp sẵn Alice (GPA 3.72, đạt) hoặc Bob (GPA 2.91, không đạt).
Giúp giám khảo test trong 30 giây. Rất đáng giá khi có hàng chục bài phải chấm.

### G6. Toggle "chế độ Verifier"

Cho phép xem cùng một proof dưới **góc nhìn verifier** ngay trong app sinh viên
— thấy được chính xác điều mình sắp để lộ, trước khi chia sẻ.

> **Khuyến nghị:** làm **G2, G5** ở Phase 1 (giá trị cao, chi phí thấp).
> G2 còn được dùng lại làm màn hình consent của G1, nên gần như miễn phí.
> G3, G4, G6 nếu còn thời gian.

---

## Khối H — Test (15% rubric, rẻ nhất)

- [ ] Chọn runner: **Vitest** (nhẹ, hợp Vercel, không thêm gánh nặng build)
- [ ] `tests/claims.test.ts` — ma trận đánh giá predicate:
      mọi thuộc tính × mọi operator hợp lệ × case biên
- [ ] `tests/privacy.test.ts` — **test then chốt**: serialize proof và khẳng định
      không chứa giá trị riêng tư nào. Test này bảo vệ tính chất cốt lõi của sản phẩm
- [ ] `tests/store.test.ts` — hợp đồng của `ProofStore`
- [ ] `npm test` trong `package.json`
- [ ] README ghi rõ cách chạy test

---

## Khối I — Design system

Chủ dự án yêu cầu *"đơn giản, hài hoà"*. Chốt lại:

- [ ] Bảng màu token hoá (không rải hex khắp component)
- [ ] Thang khoảng cách nhất quán
- [ ] Thang chữ (tối đa 4 cỡ)
- [ ] Trạng thái tương tác đồng nhất cho mọi nút
- [ ] Dark mode nếu rẻ (Tailwind 4 làm dễ)
- [ ] Phong cách: **fintech/SaaS tin cậy** — KHÔNG phải dashboard crypto.
      Không gradient tím, không hiệu ứng glow, không chữ monospace trừ khi hiển thị ID

---

## Definition of Done cho Phase 1

- [ ] `npm run build` pass, không warning
- [ ] `npm test` pass
- [ ] School API là **GraphQL thật**, có schema, có introspection, khoá issuer cố định
- [ ] `SCHOOL-INTEGRATION.md` đủ để một trường khác tự cài đặt endpoint tương thích
- [ ] Đủ **luồng sinh viên chủ động**: chọn trường → connect ví → nhận credential →
      dựng claim động → sinh proof → xem danh sách proof → verifier tra cứu → xác thực
- [ ] Đủ **luồng verifier chủ động** (G1): verifier tạo yêu cầu → sinh viên xem consent →
      đồng ý → proof trả về → xác thực
- [ ] Không còn import `@midnight-ntwrk/*`
- [ ] Không còn IP hard-code
- [ ] Kiểm chứng riêng tư ở runtime vẫn pass
- [ ] Review Playwright: không lỗi JS, không lỗi bố cục ở 375px và 1440px
- [ ] README cập nhật hiện trạng
