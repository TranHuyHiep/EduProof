# 15 — Gọi smart contract thật từ trình duyệt

**Trạng thái: đã xong, có bằng chứng on-chain.** File này ghi kết quả đo
được, không phải kế hoạch. Bản kế hoạch cũ nằm trong lịch sử git.

Cập nhật: 2026-09-10

---

## 1. Kết quả

W2.1b — *"gửi proof như transaction thật"* — vốn xếp cho Wave 2, đã hoàn
thành **trong Wave 1**. Sinh viên bấm "Generate & publish on chain", ví Lace
hiện popup ký, và transaction lên Preprod.

| | |
|---|---|
| Contract | `5d96aa1c4f2b77afc3603cb028f142da83ea4b027f1802c0b4560ca11b7ef42b` |
| Deploy | block 2475056 · 2026-09-09 |
| Transaction gần nhất | `a1abe8092f7dbc2fdf180a1604c469328034ba33a3a98fc582debc6cf62fba76` · block 2489013 |
| **`proofsVerified`** | **7** (2026-09-10, tăng theo mỗi publish) |

Con số này đọc thẳng từ indexer, không qua UI của app, và **tăng mỗi lần**
có người bấm publish — nên kiểm chứng lại trước khi trích dẫn ở đâu đó. Câu hỏi *"đếm được bao
nhiêu proof đã xác minh trên chain?"* — trước đây phải trả lời "không đếm
được gì" — giờ có câu trả lời kiểm chứng độc lập được.

Cách tự kiểm chứng:

```bash
npm run contract:verify
```

hoặc đọc thẳng `contractAction(address:…).state` từ indexer rồi
`ledger(...).proofsVerified`.

---

## 2. Cái giá phải trả: mất xác thực issuer

Contract được **viết lại từ đầu** theo khuôn
[calculator](https://docs.midnight.network/examples/contracts/calculator)
(quyết định của chủ dự án, 2026-09-08), và bản viết lại **bỏ xác thực chữ ký
Schnorr của trường**.

Hệ quả, nói thẳng:

> **Bất kỳ ai cũng tự khai được credential.** Sinh viên bịa vector GPA 400
> thì circuit vẫn chứng minh "GPA ≥ 3.5". Proof đúng về **toán** và vẫn giấu
> **giá trị** — nhưng không nói gì về **nguồn gốc**.

Điều này được ghi thành **một test đang pass** —
`contracts/tests/circuit.test.ts`, mục *"what this circuit does NOT prove"* —
để tính chất đã mất nằm trong bộ test chứ không chỉ trong comment, và để
ngày nào khôi phục chữ ký thì test đó đỏ lên nhắc.

Kéo theo:

- `issuers` registry bị bỏ (không circuit nào đọc nó nữa)
- `registerIssuer` không còn, `npm run contract:register-issuer` đã xoá
- `issuerBadge()` **không còn đường nào** trả `proven` — trang verify chỉ hiện
  "Listed by this app", đúng mức tin cậy thật

Contract cũ `89975419…` thành bỏ hoang, `proofsVerified` của nó không di trú.

| | Contract cũ | Contract mới |
|---|---|---|
| Circuits | `registerIssuer`, `proveCredentialPredicate` | `proveCredentialPredicate` |
| Ledger | `issuers`, `proofsVerified` | `proofsVerified` |
| Xác thực issuer | Schnorr trên JubJub | **không có** |

---

## 3. Bảy lớp bẫy đã gỡ trên đường trình duyệt

Đường Node.js chạy được từ lâu; đường trình duyệt không có tiền lệ chính
thức (`example-counter` chỉ có CLI ví headless). Mỗi lớp chỉ lộ ra sau khi
gỡ xong lớp trước:

1. `watchForDeployTxData` / `queryDeployContractState` bị stub — `findDeployedContract` gọi cả hai trước `callTx`
2. Hai class `ContractState` từ hai WASM build khác nhau → `instanceof` trượt
3. `setNetworkId()` chưa gọi trong trình duyệt
4. Hai bản `onchain-runtime-v3` trùng trong `node_modules` → `expected instance of StateValue`; sửa bằng `npm dedupe`
5. Khoá issuer trên chain lệch khoá trường đang ký → `bad issuer signature`
6. Private state nạp `studentSk: 0n` thay vì secret thật → `not the credential holder`
7. Hạ tầng: proof server không với tới được từ trình duyệt

Chi tiết từng lớp, kèm cách chẩn đoán: [22-lessons.md](22-lessons.md) mục
9–12.

**Bài học chung**: mỗi giả thuyết hoặc sửa được bug, hoặc biến nó thành một
lỗi **có tên** — để lớp sau lộ ra. Lớp làm chậm nhất là một khối `catch`
trong UI vứt lỗi đi rồi lặng lẽ chuyển trang.

---

## 4. Hạ tầng: phải tự host proof server

Hosted proof server của Midnight **không chịu được request proof thật**. Đo
2026-09-10:

```
POST /prove  body rỗng   -> 400  (có access-control-allow-origin)
POST /prove  body 300KB  -> 403  (KHÔNG có header CORS, server: awselb/2.0)
```

403 đến từ AWS ELB của Midnight, và xảy ra cả khi không gửi `Origin` — tức
rate limit theo IP, **không phải CORS**. Nhưng vì response 403 không kèm
header CORS nên trình duyệt báo *"No 'Access-Control-Allow-Origin' header"*,
một thông báo gây hiểu nhầm hoàn toàn.

Cách chữa đang dùng: Caddy chắn TLS trước proof server local, `sslip.io` thay
cho tên miền. Chi tiết và cách kiểm chứng:
[32-deployment.md](32-deployment.md).

⚠️ Proof server **nhìn thấy witness**. Bản tự host đang mở ra internet không
xác thực — chấp nhận được cho demo dữ liệu giả, nên tắt sau Buildathon.

---

## 5. Còn nợ

- **Xác thực issuer** — chờ `jubjubSchnorrVerify` (language 0.26 / toolchain
  0.34.0, ledger 9). Preprod đang ledger 8. Xem [40-wave-2-features.md](40-wave-2-features.md).
- **Docs còn nhắc Schnorr**: `11-wave-1-features.md`, `12-go-live.md`,
  `30-school-vendor-contract.md`.
- `lib/midnight/schnorr.ts` **giữ lại có chủ ý** — `lib/school/**` là vendor
  độc lập, schema GraphQL của nó là đặc tả công khai, và trường vẫn ký
  credential. EduProof chỉ thôi *nhìn* chữ ký đó.
