# 06 — Wave 1 / Phase 2: Tích hợp Midnight

**Mục tiêu:** Chạy local ổn định **và** tương tác ổn định với **preview network** của Midnight.

**Đây là Phase quyết định sống còn.** Không có Compact contract compile được → **bị loại**,
mọi công sức Phase 1 thành 0 điểm. Rubric cũng dành **40%** cho phần này.

**Ước lượng:** 6–8 ngày.

**Tài liệu:** https://docs.midnight.network/

---

## 0. Điều kiện tiên quyết

- [x] Phase 1 đã đạt Definition of Done
- [x] `unzip` đã cài
- [x] Docker chạy được (Docker 29.6.2) — **không cần dùng**, xem §5.1
- [x] Compact compiler `0.34.0` — đã cài trên máy Mac (29/08)

---

## 1. Thiết kế contract

### 1.1 Bài học: đừng làm một circuit cho mỗi claim

Contract cũ ở commit `f03532c` có 6 circuit riêng (`proveActiveStatus`, `proveGpaThreshold`, …).
**Hướng này sai** — mâu thuẫn với hệ thống claim động ở Phase 1: mỗi thuộc tính mới lại
phải thêm circuit mới, compile lại, deploy lại.

### 1.2 Hướng đúng: một circuit tổng quát nhận predicate

```
circuit proveCredentialPredicate(
  // ── public input ──
  issuerPk:      JubjubPoint,     // public key của trường, lấy từ registry on-chain
  subject:       Field,           // commitment quyền sở hữu
  attributeId:   Field,           // thuộc tính nào (khớp registry ở Phase 1)
  operatorCode:  Field,           // phép so sánh nào
  operand:       Field,           // giá trị so sánh

  // ── private witness ──
  credential:    Vector<N, Field>, // credential đã canonicalize
  signature:     JubjubSchnorrSignature,
  studentSk:     Field
) -> Boolean
```

Trong circuit, kiểm ba việc:

1. **Issuer authenticity** — `jubjubSchnorrVerify<N>(credential, signature, issuerPk)`
2. **Ownership** — `persistentHash(studentSk) == subject`
3. **Predicate** — lấy `credential[attributeId]`, áp `operatorCode` với `operand`,
   trả về boolean

Chỉ **boolean** là public output. Giá trị thuộc tính không bao giờ rời witness.

> Phiên khảo sát trước đã xác nhận **cả ba tính chất làm được trong một circuit**.

### 1.3 Ràng buộc API đã kiểm chứng

| Vấn đề | Thực tế |
|---|---|
| Chữ ký | `jubjubSchnorrVerify<n>(Vector<n, Field>, JubjubSchnorrSignature, JubjubPoint)` |
| Ký JSON | **Không được.** Phải canonicalize credential thành vector field element |
| `jubjubSchnorrVerifyingKey` | **Không dùng được trong circuit** |
| Ràng buộc quyền sở hữu | Dùng `persistentHash(studentSk) == subject` |
| Constructor context | `createConstructorContext` (KHÔNG phải `constructorContext`) |
| `initialState` | Là **async** |

### 1.4 Canonicalize credential

Cần một hàm **dùng chung giữa TypeScript và Compact**, biến credential thành `Vector<N, Field>`:

```
slot 0: schoolId hash
slot 1: subject commitment
slot 2: status      (mã hoá enum → số)
slot 3: gpa         (×100 để thành số nguyên: 3.72 → 372)
slot 4: academicYear
slot 5: degree      (mã enum)
slot 6: major       (mã enum)
slot 7: expiresAt   (unix timestamp)
```

`attributeId` chính là **chỉ số slot**. Registry ở Phase 1 phải ánh xạ 1-1 vào bảng này.

⚠️ Số thực không tồn tại trong circuit. GPA phải là **số nguyên đã nhân hệ số**.
Việc này phải nhất quán ở cả ba nơi: API trường ký, TypeScript, và circuit.

---

## 2. Dual-ledger

| Dữ liệu | Nơi lưu | Ai thấy |
|---|---|---|
| Registry trường + issuer public key | Public ledger | Mọi người |
| Commitment proof đã phát hành | Public ledger | Mọi người |
| Credential đã ký (GPA, tên, mã SV) | Private state (browser) | Chỉ sinh viên |
| Khoá bí mật sinh viên | Private state | Chỉ sinh viên |
| Kết quả predicate | Public output | Verifier |

Contract phải có **quản lý private state thật** (`witness` + private state provider),
không chỉ là circuit thuần — rubric ghi rõ *"includes private-state management"*.

---

## 3. Các bước triển khai

### Bước 1 — Dựng lại toolchain ✅
- [x] Cài Compact compiler `0.34.0`
- [x] `contracts/src/` + `contracts/tests/`. **Không cần `compact.toml`** —
      compiler nhận thẳng `compact compile <src> <out>`
- [x] `npm run contract:build` → `contracts/build/` (artifact **được commit**)
- [x] Đã đọc contract cũ ở `f03532c` để tham khảo; thiết kế mới theo §1.2

### Bước 2 — Contract ✅
- [x] `contracts/src/eduproof.compact` theo thiết kế §1.2 — **một** circuit tổng quát
- [x] Circuit `registerIssuer` — ledger `issuers: Map<Field, JubjubPoint>`
- [x] Circuit `proveCredentialPredicate` — circuit chính
- [x] ⛔ **Compile thành công** — cửa kỹ thuật ĐÃ QUA (compile đầy đủ ~5s,
      sinh prover + verifier key cho cả 2 circuit)
- [x] Artifact đã commit (`contracts/build/`, 788K)
- [x] **Private state thật**: `witness studentSecretKey(): Field` → generated type
      có `Witnesses<PS>` + `WitnessContext`, đúng yêu cầu rubric

### Bước 3 — Test contract (15% rubric) ✅ — 40 test
- [x] `contracts/tests/simulator.ts` — chạy circuit qua Compact runtime
- [x] Case đạt / không đạt trên GPA
- [x] Case xấu: chữ ký sai, credential bị sửa, tự ký lại → **từ chối**
- [x] Case xấu: sai `studentSk`, credential của người khác → **từ chối**
- [x] Case xấu: issuer chưa đăng ký, issuer slot bị đổi → **từ chối**
- [x] Toàn bộ 6 operator × toàn bộ slot

> **Kiểm chứng test có thật sự bắt lỗi** (mutation testing, 29/08). Bốn đột biến
> vào contract, mỗi lần compile lại rồi chạy test, sau đó khôi phục nguyên trạng:
>
> | Đột biến | Test đỏ |
> |---|---|
> | Bỏ `assert` chữ ký issuer | 6 |
> | Bỏ `assert` quyền sở hữu | 2 |
> | `>=` thành `>` | 2 |
> | `selectSlot` luôn trả slot 0 | 13 |
>
> Khôi phục xong: `diff` xác nhận source y hệt, 40/40 xanh lại.

### Bước 4 — MidnightProofProvider ✅
- [x] `lib/proof/midnight-provider.ts` cài `ProofProvider` — interface **không đổi**
- [x] Chạy **client-side**: runtime WASM nạp qua dynamic import
- [x] **Không cần** proof server local — CORS mở, xem §5.1
- [x] `lib/proof/index.ts` chọn provider qua `NEXT_PUBLIC_PROOF_PROVIDER`
- [x] Mock vẫn là **mặc định** → `npm i && npm run dev` chạy được ngay, không cần toolchain

Kèm theo, các mảnh phải có để provider chạy thật:
- [x] `lib/school/circuit-vector.ts` — canonical field vector (thuộc về **trường**,
      là một phần đặc tả tích hợp công khai)
- [x] `lib/school/keys.ts` — thêm khoá ký **JubJub Schnorr**, dẫn xuất từ
      `SCHOOL_SIGNING_KEY` nên trường vẫn chỉ giữ **một** bí mật
- [x] Schema GraphQL mở rộng **cộng thêm, không phá vỡ**: `circuitPublicKey`,
      `circuitSignature`, `circuitVector`, tham số `subjectCommitment`
- [x] `lib/midnight/encoding.ts` — mã operator khớp enum trong contract
- [x] `lib/midnight/local-runner.ts` — chạy circuit trong browser

### Bước 5 — Kết nối preview network ⚠️ CHƯA LÀM
- RPC: `https://rpc.preview.midnight.network` (đã kiểm chứng, trả "Midnight Preview")
- Indexer: `https://indexer.preview.midnight.network/api/v3/graphql`
- Proof server: **ưu tiên dùng của bên ngoài** (xem §5.1)
- [ ] Deploy contract lên preview
- [ ] Ghi lại địa chỉ contract vào `.env.example`
- [ ] Trường đăng ký issuer key lên chain
- [ ] Verifier đọc issuer key **từ chain**, không từ file JSON

### Bước 6 — Xác thực ví (Lace) ⚠️ CHƯA LÀM
- [ ] Thay demo fallback bằng ví Midnight thật
- [ ] Giữ demo fallback sau một cờ env → giám khảo không có ví vẫn test được
- [ ] ⚠️ **Chứng minh quyền sở hữu ví bằng chữ ký là việc của Wave 2**, không phải ở đây.
      Phase này chỉ cần *kết nối* + lấy địa chỉ

### Bước 7 — Truy vấn on-chain ⚠️ CHƯA LÀM
- [ ] Danh sách proof của sinh viên: query từ chain, thay cho localStorage
      (chính là `ChainProofStore` cắm vào interface `ProofStore` ở Phase 1)
- [ ] Verifier tra proof theo commitment on-chain

---

## 4. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Circuit không compile do giới hạn ngôn ngữ | 🔴 Cao | Compile sớm và thường xuyên; giữ contract tối thiểu compile được làm bản dự phòng |
| Preview network sập/đổi API | 🟠 TB | Demo local phải tự đứng được; quay video khi network còn ổn |
| Chứng minh ZK quá chậm trên browser | 🟠 TB | Đo sớm; giảm số slot vector nếu cần |
| Vector `N` cố định giới hạn thuộc tính | 🟡 Thấp | Chọn `N` dư (16 slot) ngay từ đầu |
| Hết thời gian trước 16/09 | 🔴 Cao | Phase 2 phải xong trước **12/09**, chừa 4 ngày cho Phase 3 + slide + video |

### Kế hoạch dự phòng (nếu Phase 2 sa lầy)

Ưu tiên theo thứ tự, cắt từ dưới lên:
1. Contract compile được + test pass ← **không bao giờ cắt** (cửa kỹ thuật)
2. Sinh + xác thực proof chạy local
3. Deploy lên preview network
4. Truy vấn on-chain
5. Ví thật

---

## 5. Proof server và ràng buộc Vercel

### 5.1 Proof server: dùng của bên ngoài trước (Q3 đã chốt)

> **Quyết định:** thử `https://proof-server.preprod.midnight.network` trước.
> Chỉ khi không dùng được mới báo chủ dự án để chuyển sang chạy local.

Nếu dùng được, đây là **thắng lớn**: bản demo trên Vercel chạy **ZK thật**, giám khảo
không phải cài Docker gì cả. Ăn trọn tiêu chí *"connects to the contract as part of a
functional end-to-end experience"* mà không bắt ai setup.

**Phải kiểm chứng SỚM** — ngay đầu Phase 2, trước khi viết provider. Bốn điều cần xác nhận:

- [ ] **Endpoint có sống không** — gọi thử, xem đúng giao thức proof server
- [ ] **CORS** — browser gọi trực tiếp được không? Nếu server không trả CORS header
      thì client-side gọi thẳng sẽ bị chặn (→ xem 5.2)
- [ ] **Có khớp phiên bản không** — proof server phải khớp với compiler `0.34.0` /
      runtime `0.19.0`. Lệch phiên bản là hỏng
- [ ] **Giới hạn tần suất / độ trễ** — đo thời gian sinh proof thực tế

### ✅ KẾT QUẢ KIỂM CHỨNG (29/08/2026) — dùng được, không cần proxy

| Điều cần xác nhận | Kết quả |
|---|---|
| Endpoint có sống không | ✅ `GET /health` → `200 {"status":"ok"}`, ~0.7s |
| **CORS** | ✅ **Mở hoàn toàn.** Preflight trả `access-control-allow-origin` phản chiếu đúng Origin gửi lên, `allow-methods` gồm mọi method. Browser gọi thẳng được → **KHÔNG cần proxy** |
| Khớp phiên bản | ✅ proof server `8.1.0`; compiler `0.34.0` → language `0.26.0`, runtime `0.19.0`, ledger `9.1.0.0-rc.3` |
| Độ trễ | Health ~0.7s. Chưa đo thời gian sinh proof thật (chưa deploy contract) |

Ngoài ra: RPC `https://rpc.preview.midnight.network` trả `"Midnight Preview"` — sống.

> **Hệ quả quan trọng cho quyền riêng tư:** vì CORS mở, ta **không phải** viết proxy.
> Đây là điều tốt: proxy của ta sẽ nhìn thấy witness, đúng thứ mà thiết kế từ chối
> (xem §5.2 hướng 1). Đánh đổi còn lại — bản thân proof server **có** thấy witness —
> vẫn phải nói rõ trong README và slide.

### 5.2 Nếu bị chặn CORS

Đây là rủi ro dễ xảy ra nhất. Ba hướng, theo thứ tự ưu tiên:

1. **Route proxy mỏng trong Next.js** — `app/api/proof-server/[...path]/route.ts` chỉ
   chuyển tiếp request. ⚠️ Phải kiểm tra kỹ: proxy **không được** thấy witness riêng tư.
   Nếu giao thức proof server yêu cầu gửi witness lên, thì proxy sẽ nhìn thấy nó —
   **phá vỡ lời hứa riêng tư**. Trong trường hợp đó, **không dùng hướng này**.
2. **Proof server local** — quay về Docker `midnightntwrk/proof-server:8.0.3` cổng `6300`
3. **Chế độ kép** — Vercel chạy mock, hướng dẫn chạy local để thấy ZK thật

> Điểm cần suy nghĩ kỹ: proof server **có** nhìn thấy witness trong mô hình Midnight.
> Vì vậy dùng proof server của bên thứ ba là **đánh đổi về tin cậy**, phải nói rõ
> trong README và slide. Đây thực ra là điểm cộng nếu trình bày đúng — nó cho thấy ta
> **hiểu** ranh giới tin cậy chứ không chỉ ghép thư viện. Bản triển khai thật thì
> proof server nên chạy phía người dùng.

### 5.3 Ràng buộc Vercel

| Nguy cơ | Cách xử |
|---|---|
| WASM Midnight quá nặng cho serverless | Sinh proof **client-side**, không server-side |
| Compile contract lúc build vượt hạn mức | **Commit sẵn artifact**, không compile lúc build |
| Proof server không chạy được trên Vercel | Dùng endpoint ngoài (5.1), hoặc local (5.2) |
| Bundle client phình to | Dynamic import thư viện Midnight, chỉ nạp ở trang tạo proof |
| Proxy proof server tốn băng thông/thời gian hàm | Chỉ dùng khi buộc phải; đặt timeout |

---

## Definition of Done cho Phase 2

- [x] ⛔ Compact contract **compile thành công** — cửa kỹ thuật đã qua
- [x] Test contract pass, có cả case xấu — 40 test, đã mutation-test
- [x] Sinh + xác thực proof chạy được với **circuit thật** ở local
- [ ] Contract đã deploy lên preview network, có địa chỉ ghi lại
- [ ] Giao dịch với preview network ổn định
- [x] UI không đổi hình dạng khi đổi provider (interface giữ nguyên)
- [x] README có mục kiến trúc Midnight + bảng dual-ledger

### ⚠️ Ranh giới trung thực: cái gì thật, cái gì chưa

Phải nói đúng chỗ này trong README, slide và video — nói quá là tự bắn vào chân
khi giám khảo kiểm tra.

**Thật:**
- Contract compile được, có prover/verifier key, artifact commit trong repo
- Circuit chạy thật khi `NEXT_PUBLIC_PROOF_PROVIDER=midnight`: kết quả mỗi claim
  là **verdict của circuit**, và circuit **từ chối chạy** nếu chữ ký trường sai
  hoặc người gọi không giữ bí mật sau subject commitment
- Trường ký thật bằng JubJub Schnorr trên field vector
- Giá trị riêng tư nằm trong witness, không bao giờ vào `Proof`

**Chưa:**
- Chưa deploy contract lên preview network → chưa có `NEXT_PUBLIC_CONTRACT_ADDRESS`
- Chưa gửi transaction, chưa sinh ZK proof qua proof server ngoài (mới chỉ kiểm
  chứng endpoint sống + CORS mở)
- Issuer registry đang dựng trong bộ nhớ mỗi phiên, chưa đọc từ chain
- Chưa nối ví Lace thật

Các việc chưa làm đều nằm ở mục 2–5 của **kế hoạch dự phòng** §4 — tức là những
thứ được phép cắt. Mục 1 (*"Contract compile được + test pass — không bao giờ cắt"*)
**đã đạt**.
