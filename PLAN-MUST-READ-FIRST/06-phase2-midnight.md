# 06 — Wave 1 / Phase 2: Tích hợp Midnight

**Mục tiêu:** Chạy local ổn định **và** tương tác ổn định với **preview network** của Midnight.

**Đây là Phase quyết định sống còn.** Không có Compact contract compile được → **bị loại**,
mọi công sức Phase 1 thành 0 điểm. Rubric cũng dành **40%** cho phần này.

**Ước lượng:** 6–8 ngày.

**Tài liệu:** https://docs.midnight.network/

---

## 0. Điều kiện tiên quyết

- [ ] Phase 1 đã đạt Definition of Done
- [ ] `unzip` đã cài (nếu không, lệnh cài toolchain báo
      "Failed to spawn artifact extraction command")
- [ ] Docker chạy được (cho proof server)
- [ ] Compact compiler `0.34.0` — đã kiểm chứng hoạt động ở phiên trước

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

### Bước 1 — Dựng lại toolchain
- [ ] Cài Compact compiler `0.34.0`
- [ ] `contracts/` với `compact.toml`
- [ ] Script build ra `contracts/build/` (artifact **được commit**, xem §5 Vercel)
- [ ] Khôi phục contract cũ để tham khảo: `git checkout f03532c -- contracts/`
      (chỉ tham khảo — thiết kế mới theo §1.2)

### Bước 2 — Contract
- [ ] Viết `EduProof.compact` theo thiết kế §1.2
- [ ] Circuit `registerIssuer` — trường đăng ký public key lên public ledger
- [ ] Circuit `proveCredentialPredicate` — circuit chính
- [ ] Compile thành công ⛔ **cửa kỹ thuật**
- [ ] Cam kết compile artifact vào repo

### Bước 3 — Test contract (15% rubric)
- [ ] `contracts/tests/` — simulator chạy circuit
- [ ] Case đạt: GPA 3.72 với `gpa >= 350` → true
- [ ] Case không đạt: GPA 2.91 với `gpa >= 350` → false
- [ ] Case xấu: chữ ký sai → circuit **từ chối**
- [ ] Case xấu: sai `studentSk` → circuit **từ chối**
- [ ] Toàn bộ operator × toàn bộ thuộc tính

### Bước 4 — MidnightProofProvider
- [ ] `lib/proof/midnight-provider.ts` cài `ProofProvider` (interface **không đổi**)
- [ ] Sinh proof **client-side** (xem `03-architecture.md` §6)
- [ ] Kết nối proof server local `localhost:6300`
- [ ] Đổi **một dòng** trong `lib/proof/index.ts`
- [ ] Giữ mock provider, chọn qua env → demo vẫn chạy khi không có proof server

### Bước 5 — Kết nối preview network
- RPC: `https://rpc.preview.midnight.network` (đã kiểm chứng, trả "Midnight Preview")
- Indexer: `https://indexer.preview.midnight.network/api/v3/graphql`
- Proof server: **ưu tiên dùng của bên ngoài** (xem §5.1)
- [ ] Deploy contract lên preview
- [ ] Ghi lại địa chỉ contract vào `.env.example`
- [ ] Trường đăng ký issuer key lên chain
- [ ] Verifier đọc issuer key **từ chain**, không từ file JSON

### Bước 6 — Xác thực ví (Lace)
- [ ] Thay demo fallback bằng ví Midnight thật
- [ ] Giữ demo fallback sau một cờ env → giám khảo không có ví vẫn test được
- [ ] ⚠️ **Chứng minh quyền sở hữu ví bằng chữ ký là việc của Wave 2**, không phải ở đây.
      Phase này chỉ cần *kết nối* + lấy địa chỉ

### Bước 7 — Truy vấn on-chain
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

Ghi kết quả kiểm chứng vào file này khi có.

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

- [ ] ⛔ Compact contract **compile thành công**
- [ ] Test contract pass, có cả case xấu
- [ ] Sinh + xác thực proof chạy được với ZK thật ở local
- [ ] Contract đã deploy lên preview network, có địa chỉ ghi lại
- [ ] Giao dịch với preview network ổn định (chạy lặp lại nhiều lần không hỏng)
- [ ] UI không đổi hình dạng khi đổi provider (interface giữ nguyên)
- [ ] README có mục kiến trúc Midnight + bảng dual-ledger
