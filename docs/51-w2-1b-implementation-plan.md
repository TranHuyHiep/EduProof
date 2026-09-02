# W2.1b — Sinh viên tự gọi smart contract

**Trạng thái: code xong, chưa test trên preprod thật (cần ví Lace thật có
DUST). `npm test && npm run check:boundaries && npm run build` đều xanh.**

Quyết định đã chốt trước khi code (2026-09-01): tên nút **"Publish on
chain"**, ví test dùng lại **ví issuer đã đăng ký** (không tạo ví mới),
code ngay không chờ W2.1.

---

## 1. Mục tiêu

Khi sinh viên bấm "Publish on chain" trên trang proof, app gọi thật circuit
`proveCredentialPredicate` qua một transaction ký bằng ví Lace của sinh viên
— không qua seed Node.js, không qua service trung gian của EduProof.

```
Sinh viên bấm "Publish on chain"
  → app kết nối lại ví Lace thật (session cũ chỉ nhớ địa chỉ, không nhớ API)
  → dựng unproven transaction gọi proveCredentialPredicate
  → gửi cho proof server (hosted, có sẵn) để sinh proof
  → gửi cho Lace để CÂN BẰNG PHÍ + KÝ (balanceUnsealedTransaction)
  → Lace submit thẳng lên chain (Lace tự làm relayer)
  → app poll trạng thái qua indexer, hiển thị kết quả
```

---

## 2. Phát hiện quan trọng đã đổi hướng thiết kế

### 2a. Interface Lace ↔ midnight-js-contracts — khớp đúng như dự đoán

`WalletConnectedAPI.balanceUnsealedTransaction`/`submitTransaction` và
`WalletProvider.balanceTx`/`MidnightProvider.submitTx` đều thao tác trên
cùng class `Transaction<S,P,B>` (từ `@midnight-ntwrk/ledger-v8`), chỉ khác
biểu diễn (binary vs hex string). Cầu nối là `.serialize()`/`.deserialize()`.
Một điểm phải tra kỹ: `deserialize`'s marker args (`markerS`/`markerP`/`markerB`)
là **string literal** (`'signature'`, `'proof'`, `'binding'`), không phải
object instance — nhưng TypeScript không tự suy luận đúng generic từ string
literal, nên `Transaction.deserialize<...>(...)` phải truyền type argument
tường minh (xem `lib/midnight/lace-provider.ts`).

`submitTransaction()` trả `void` — không có `txId` trực tiếp. Lấy `txId` từ
`tx.identifiers()` sau khi có `FinalizedTransaction` (cả `Transaction` lẫn
`TransactionId = string` đều xác nhận qua type declaration).

### 2b. Phát hiện MỚI, không có trong bản kế hoạch gốc: 3 provider không chạy được trong browser như script Node.js

`scripts/register-issuer.mjs` dựng providers bằng
`indexerPublicDataProvider`, `NodeZkConfigProvider`,
`levelPrivateStateProvider` — cả ba viết cho Node.js. Khảo sát thực tế
(2026-09-01) phát hiện:

- **`indexerPublicDataProvider` vỡ khi bundle cho browser** — lý do đã ghi
  sẵn trong `lib/midnight/chain.ts` (`'WebSocket' is not exported from
  'isomorphic-ws'`), phát hiện từ lúc build trang verify ở Wave 1.
- **`NodeZkConfigProvider` đọc file bằng `fs`** — `next.config.ts` đã tự
  stub `fs: false` ở client bundle, nên provider này im lặng trả rỗng thay
  vì lỗi rõ ràng, đúng kiểu bẫy "load được, vỡ lúc submit" mà
  `22-lessons.md` cảnh báo.

**Hướng đã chọn (không phải phương án B "service trung gian" trong docs/40):
tự viết 3 provider chạy thẳng trong browser**, dùng lại đúng endpoint/kỹ
thuật `chain.ts` đã dùng thành công (GraphQL qua `fetch`, không WebSocket):

| File mới | Thay cho | Cách làm |
|---|---|---|
| `lib/midnight/browser-providers.ts` | `indexerPublicDataProvider` | `fetch` thẳng tới indexer GraphQL — chỉ implement 3 method `callTx` thực sự gọi (`queryZSwapAndContractState`, `watchForTxData`, `queryContractState`), truy vết trong `node_modules/@midnight-ntwrk/midnight-js-contracts` để xác nhận, các method còn lại (deploy-only, subscription-only) throw rõ ràng nếu bị gọi nhầm |
| `lib/midnight/browser-zk-config.ts` | `NodeZkConfigProvider` | `fetch` từ route mới `app/api/circuit-assets/[...path]/route.ts` — route đó chạy server-side (có `fs` thật), phục vụ đúng layout file `keys/<id>.prover`/`.verifier`, `zkir/<id>.bzkir` mà `NodeZkConfigProvider`'s source dùng |
| `lib/midnight/browser-private-state.ts` | `levelPrivateStateProvider` | in-memory `Map`, không cần persist — `studentSk` thật đã được `lib/midnight/prover.ts`'s `studentSecretKey()` giữ ở localStorage riêng rồi, private state provider ở đây chỉ cần sống qua một lần gọi `callTx` |

Route `app/api/circuit-assets` được đặt ngoài `lib/school`/`app/api/school`
— không phạm luật ranh giới vendor, `check:boundaries` xác nhận xanh.

`httpClientProofProvider` (sinh proof qua HTTP) không cần viết lại — đã
browser-safe sẵn (chỉ phụ thuộc `cross-fetch`).

### 2c. `FinalizedTxData` cần đủ field, không chỉ status/txId

`register-issuer.mjs` chỉ đọc `result.public.status`/`.txId`, nhưng
`TransactionContextImpl[Submit]` (trong `midnight-js-contracts`) spread
toàn bộ `finalizedTxData` (kết quả `watchForTxData`) vào `result.public` —
nghĩa là bất kỳ field nào của `FinalizedTxData` (`tx`, `blockHash`,
`blockHeight`, `fees`, `unshielded`, …) đều phải có giá trị thật, không
phải placeholder — nếu không, một caller đọc `result.public.tx` sau này sẽ
âm thầm nhận giá trị sai. `browser-providers.ts`'s `watchForTxData` giải mã
`raw` transaction hex thật từ indexer (`RegularTransaction.raw`) thay vì bỏ
qua field này.

---

## 3. Code đã viết

### 3.1 `lib/midnight/lace-provider.ts`

`laceWalletProvider(api: WalletConnectedAPI): Promise<WalletProvider &
MidnightProvider>` — bọc một `WalletConnectedAPI` đã kết nối. Địa chỉ
(`getShieldedAddresses()`) fetch một lần, đầu hàm, vì
`getCoinPublicKey`/`getEncryptionPublicKey` là **đồng bộ** trong
`WalletProvider` interface — không thể fetch lười bên trong.

### 3.2 `lib/midnight/browser-providers.ts`, `browser-zk-config.ts`, `browser-private-state.ts`

Ba provider browser-safe, xem mục 2b.

### 3.3 `app/api/circuit-assets/[...path]/route.ts`

Route Next.js phục vụ file nhị phân đã biên dịch (`contracts/build/eduproof`)
qua HTTP, đọc bằng `fs` server-side. Validate path segment chặt (allow-list
thư mục con + đuôi file), vì route này đọc file theo tên lấy từ URL.

### 3.4 `lib/midnight/prover.ts` (sửa file có sẵn)

`ProvingSession` có thêm `callArgs(slot, op, operand): CircuitCallArgs` bên
cạnh `evaluate()` hiện có — trả đúng args circuit cần (`schoolIdHash`,
`subject`, `slot`, `op`, `operand`, `credential`, `signature`) từ cùng
closure đã fetch credential/issuer key, để không phải gọi lại trường một
lần nữa cho publish. Không phải giá trị riêng tư mới: `credential` vector
và `signature` đã là chính xác những gì circuit call mang theo dưới dạng
private argument; không có gì trong `CircuitCallArgs` bị ghi vào `Proof`.

### 3.5 `lib/proof/midnight-provider.ts` — `publishProof()`

Thêm bên cạnh `generateProof()` hiện có (không sửa, đó vẫn là preview local
miễn phí). Chữ ký:

```ts
async publishProof(
  student: Student,
  proof: Proof,
  claimIndex: number,
  walletApi: WalletConnectedAPI,
): Promise<{ txId: string }>
```

Publish theo từng claim (`claimIndex` vào `proof.claims`) — một lần gọi
circuit ứng với một transaction, khớp cách UI hiển thị nút publish theo
từng dòng statement. Dựng đúng bộ 6 provider (`publicDataProvider`,
`proofProvider`, `zkConfigProvider`, `privateStateProvider`,
`walletProvider`, `midnightProvider`) rồi gọi
`findDeployedContract(...).callTx.proveCredentialPredicate(...)` — cùng
pattern `scripts/register-issuer.mjs` dùng, khác ở nguồn provider (browser-safe
thay vì Node.js).

Không đụng `proofStore`/`Proof` object — publish là hành động trên một proof
đã tồn tại, không tạo proof mới.

### 3.6 UI — `app/student/proof/[proofId]/page.tsx`

Section "Publish on chain" mới, chỉ hiện khi `providerName() === "midnight"`
— một dòng mỗi claim, nút riêng biệt (không sửa `ClaimLine` dùng chung ở
nơi khác). Trạng thái: `idle` → `connecting` (kết nối lại ví — session cũ
chỉ nhớ *địa chỉ*, không nhớ `WalletConnectedAPI` object, nên phải connect
lại ngay lúc bấm) → `building` → `waiting-wallet` (gộp ký + chờ block, vì
`publishProof()` await toàn bộ chuỗi như một lời gọi, không có bước quan
sát được ở giữa) → `done` (link tới explorer) hoặc `error` (thông báo theo
mã lỗi đã biết).

Không dùng ví demo fallback: nếu không có extension Lace nào cài,
báo lỗi rõ ràng thay vì âm thầm dùng `connectWallet()`'s demo key (ví demo
không có `balanceUnsealedTransaction`/`submitTransaction`).

### 3.7 Xử lý lỗi

`errorMessage()` trong trang proof parse `"Custom error:? (\d+)"` từ message
lỗi, map theo bảng đã biết ở `22-lessons.md` mục 6 (170 sync, 173 thiếu
DUST, 174 lỗi dựng transaction) — lỗi khác hiện nguyên message gốc.

### 3.8 Test

- `npm test` — 262 test pass (không có test mới riêng cho publishProof —
  cần ví Lace thật + DUST thật để test end-to-end, không mock được phần
  cốt lõi mà không làm test vô nghĩa; xem mục 4)
- `npm run check:boundaries` — 4/4 xanh
- `npm run build` — production build sạch, xác nhận toàn bộ chuỗi provider
  mới (bao gồm cả import động WASM) qua được webpack mà không vỡ bundle —
  đây là bài kiểm tra quan trọng nhất, vì đúng loại lỗi mục 2b nhắm tới
  tránh
- Kiểm tra thủ công qua Playwright (2026-09-01): tạo proof thật (circuit
  thật chạy qua Simulator), mở trang proof, thấy đúng section "Publish on
  chain", bấm nút → báo lỗi "No Midnight wallet extension found" đúng như
  kỳ vọng (máy test không có Lace cài) — không crash, không lỗi console

---

## 4. Chưa làm — cần ví Lace thật + DUST để tiếp

- Test thủ công trên preprod thật với ví issuer đã đăng ký (đã có DUST,
  đã sync) — xác nhận `proofsVerified` tăng đúng 1, transaction lên
  explorer, và toàn bộ path lỗi (170/173) tái hiện đúng khi cố ý test sai
- `tests/midnight-provider.test.ts` mở rộng với mock `WalletConnectedAPI` —
  chưa viết, vì phần quan trọng nhất (`findDeployedContract`'s tương tác
  với provider thật) không mock được ý nghĩa mà không kiểm tra chính hành
  vi cần kiểm tra

## 5. Việc rõ ràng KHÔNG làm

- Không sửa `contracts/src/eduproof.compact` — circuit không đổi
- Không xây relayer/paymaster — sinh viên tự trả phí bằng DUST của mình
- Không bắt buộc mọi proof phải publish — preview cục bộ (Wave 1) vẫn là
  đường mặc định
