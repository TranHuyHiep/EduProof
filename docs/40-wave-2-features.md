# Wave 2 — Tính năng

**27/09 → 17/10/2026 · US$4,000**

Chủ đề: **Bảo mật và tính đúng đắn.** Wave 1 dựng nền; Wave 2 làm cho nó an toàn thật.

> Thể lệ chấm theo **tiến bộ giữa các Wave**, và mỗi lần nộp phải nêu rõ *"đã
> thay đổi gì so với Wave trước"*. Nên **để dành** tính năng cho Wave sau là
> chiến lược đúng, không phải lười.

---

## W2.1 Xác thực quyền sở hữu ví ⭐ trọng tâm

Wave 1 mới chỉ *kết nối* ví. Wave 2 **chứng minh quyền sở hữu**:

- Ký challenge để chứng minh nắm private key
- Ràng buộc credential vào **ví**, không phải vào thiết bị
- Chặn kịch bản trộm credential rồi dùng lại

## W2.1b Gửi proof như transaction thật ⭐

Không phụ thuộc vào W2.1 (ownership-challenge). Đây là hai lớp độc lập:
ownership credential đã được circuit tự chứng minh qua
`witness studentSecretKey()`, không liên quan gì tới ví nào ký giao dịch. Ví ở
đây chỉ đóng vai trò người trả phí và ký transaction gọi circuit — giống cách
`scripts/register-issuer.mjs` dùng ví để trả phí đăng ký issuer.

Wave 1 chạy `proveCredentialPredicate` qua `Simulator` cục bộ
([lib/midnight/local-runner.ts](../lib/midnight/local-runner.ts)) — verdict là
thật, nhưng không rời trình duyệt. Circuit đã có side-effect trên ledger
(`proofsVerified.increment(1)`), nghĩa là nó vốn được viết để gọi qua
transaction — cái thiếu chỉ là hạ tầng phía app, không phải circuit.

```
Wave 1: proveCredentialPredicate chạy trong Simulator, kết quả ở lại máy
Wave 2: proveCredentialPredicate chạy qua callTx thật, kết quả + counter lên chain
```

### Vì sao làm

`proofsVerified` trên contract đã deploy hiện **mãi mãi = 0** — có deploy, có
đăng ký issuer, nhưng chưa ai thật sự "dùng" contract theo nghĩa gửi
transaction. Một verifier nghi ngờ có thể hỏi thẳng: *"đếm được bao nhiêu proof
đã xác minh?"* — câu trả lời trung thực của Wave 1 là "không đếm được gì trên
chain, chỉ đếm được ở localStorage của từng máy". Đây là khoảng trống rubric
Engineering (40%) dễ bị hỏi tới.

### Quyết định: self-custody, không tài trợ phí

Sinh viên tự giữ ví, tự có DUST — không dựng relayer/paymaster trả phí thay.

**Lý do chọn hướng này thay vì tài trợ phí:**
- Đúng tinh thần phi tập trung mà sản phẩm đang bán: EduProof không đứng giữa
  giữ chìa khoá hay giữ tiền hộ ai.
- Tránh bài toán chống abuse của paymaster (ai cũng gửi miễn phí được → tốn
  ngân sách project, cần rate-limit/captcha/whitelist mới lại một tầng phức
  tạp không nằm trong phạm vi Wave 2).
- `lib/wallet.ts` đã có khung kết nối ví Lace thật từ Wave 1 — tận dụng cùng
  một kết nối cho việc ký + trả phí, không xây hạ tầng riêng.

**Đánh đổi phải nói thẳng, không giấu:** sinh viên phải cài ví, có DUST đã
đăng ký sinh (xem bẫy #2 trong [22-lessons.md](22-lessons.md)), và mỗi proof
giờ tốn phí thật + chờ block — nặng hơn hẳn Wave 1 (không cần gì ngoài trình
duyệt). Đây là đánh đổi bảo mật/minh bạch đổi lấy UX, chọn có ý thức chứ không
phải mặc định.

### Rủi ro kỹ thuật chưa gỡ — khảo sát trước khi cam kết thời gian

Đã soát code lúc lập kế hoạch: `midnight-js-contracts`'s `WalletProvider`
cần `balanceTx(tx: UnboundTransaction)` — kiểu **ledger binary**
(`Transaction<SignatureEnabled, Proof, PreBinding>`). Lace (qua
`@midnight-ntwrk/dapp-connector-api`'s `WalletConnectedAPI`) chỉ expose
`balanceSealedTransaction(tx: string)` — nhận **chuỗi đã serialize**. Hai
interface không khớp trực tiếp: cần viết một adapter chuyển đổi giữa hai
dạng, và tại thời điểm viết mục này **chưa tìm thấy ví dụ chính thức** nào
của Midnight nối một ví injected (Lace) với `midnight-js-contracts`'s
`callTx` chạy trong trình duyệt — mọi chỗ dùng `callTx` trong repo hiện tại
(`scripts/register-issuer.mjs`, `scripts/deploy-contract.mjs`) chạy ở Node.js
qua `testkit-js`'s `MidnightWalletProvider`, không phải qua ví trình duyệt.

**Trước khi bắt tay viết:** tìm ví dụ chính thức (`example-bboard` hoặc
tương đương — xem [23-references.md](23-references.md)) xác nhận đã có ai
làm việc này chưa. Nếu chưa có tiền lệ, đây là rủi ro cỡ các bẫy trong
[22-lessons.md](22-lessons.md) — có thể tốn nhiều giờ debug lỗi âm thầm
(SDK "load được, chỉ vỡ lúc submit" là mẫu hình đã lặp lại nhiều lần trong
dự án này). Cân nhắc phương án dự phòng (ví dụ: submit qua một service
Node.js nội bộ thay vì trực tiếp từ trình duyệt) nếu adapter không khả thi
trong thời gian của Wave 2.

### Việc cần làm

- `lib/proof/midnight-provider.ts`: thêm đường gọi `callTx.proveCredentialPredicate`
  qua `findDeployedContract`, với `walletProvider`/`midnightProvider` là một
  adapter bọc quanh ví Lace đã kết nối (xem rủi ro ở trên trước khi ước lượng
  thời gian)
- UI: màn hình xác nhận trước khi gửi — hiển thị phí ước tính, trạng thái
  "đang chờ block" thay vì verdict tức thời như Wave 1
  - Đây là điểm khác biệt UX lớn nhất so với Wave 1: **không còn tức thời**
- Giữ nguyên đường Simulator cục bộ làm **fallback/preview** — sinh viên xem
  trước verdict (không tốn phí) trước khi quyết định có gửi transaction không
- `docs/22-lessons.md` mục 6 (`Custom error 170`, dust spend proof) áp dụng
  y hệt ở đây — sinh viên cũng có thể dính lỗi ví chưa sync đủ, cần thông báo
  rõ ràng thay vì lỗi khó hiểu
- Test: `proofsVerified` tăng đúng 1 sau một lần gửi thành công qua devnet/preprod
  test wallet, không tăng khi circuit từ chối (`FailFallible` không được tính
  là verified)

### Không tự động chuyển toàn bộ luồng sang on-chain

Đường Simulator cục bộ (Wave 1) **không bị xoá** — nó trở thành bước "xem trước
miễn phí" trước khi cam kết một transaction thật. Sinh viên tạo claim, thấy
verdict ngay (giống Wave 1), rồi tự chọn có "công bố lên chain" hay không.
Việc buộc mọi proof phải là transaction sẽ loại bỏ khả năng thử nhiều mệnh đề
rẻ tiền mà Wave 1 đang có — đánh đổi đó không đáng.

## W2.2 Thu hồi (revocation)

- Trường thu hồi credential (sinh viên bị đình chỉ, thôi học)
- Sinh viên thu hồi proof đã chia sẻ
- Cây accumulator / merkle trên public ledger
- Verifier kiểm tra trạng thái thu hồi tại thời điểm xác thực

## W2.3 Logic claim phong phú hơn

- **OR** và nhóm lồng nhau (Wave 1 chỉ có AND)
- Predicate trên khoảng: `3.0 <= gpa <= 3.5`
- Predicate theo thời gian: *"tốt nghiệp trong 2 năm gần đây"*

## W2.4 Proof Request ⭐

Chuyển từ Wave 1 sang, chốt ngày 29/08/2026. Lý do hoãn nằm ở cuối mục này.

Luồng: verifier nêu yêu cầu → sinh viên xem màn hình consent → chấp thuận hoặc từ chối.

```
Verifier ở /verify/request tạo yêu cầu:
    "cần: status is active AND gpa >= 3.0"
        → sinh link  /student/respond?req=<mã base64url>

Sinh viên mở link:
    → thấy CHÍNH XÁC điều được hỏi, và ai hỏi
    → thấy trước mình sẽ để lộ gì (và không để lộ gì)
    → Chấp thuận  hoặc  Từ chối
    → nếu chấp thuận: sinh proof đúng yêu cầu, trả link về
```

Việc cần làm:

- `types/index.ts`: `ProofRequest { requestId, requester, claims, createdAt, expiresAt }`
- `lib/proof/request.ts`: encode/decode base64url, có validate
- `app/verify/request/page.tsx` — verifier dựng yêu cầu, dùng lại claim builder
- `app/student/respond/page.tsx` — màn hình consent, hai cột **sẽ lộ gì / giữ riêng gì**
- Luồng từ chối, và xử lý khi yêu cầu hết hạn

**Vì sao không làm ở Wave 1** — ba thứ này chỉ Wave 2 mới có:

- **Request có chữ ký.** Ở Wave 1 request là dữ liệu trần, ai cũng giả được.
- **Verifier đăng ký danh tính.** Sinh viên phải thấy **ai** đang hỏi, và người
  đó có được xác minh không.
- **Ràng buộc proof vào đúng verifier đã hỏi** (xem W2.5).

Làm sớm mà thiếu ba thứ đó thì màn hình consent chỉ là trang trí.

## W2.5 Chống replay và ràng buộc ngữ cảnh

- Nonce trong proof
- Ràng buộc proof vào một verifier cụ thể → không mang đi dùng chỗ khác được
- Kiểm soát hạn dùng ở tầng contract

## W2.6 Nhiều issuer

- Nhiều trường cùng tham gia
- Xoay khoá issuer
- Chuỗi tin cậy giữa các issuer

## W2.7 Nối tiếp phần còn dở của Wave 1

- ~~Đọc danh bạ issuer từ chain~~ — đã xong trong Wave 1
  ([lib/midnight/chain.ts](../lib/midnight/chain.ts)), sớm hơn kế hoạch
- `ChainProofStore` nằm sau interface `ProofStore` sẵn có → link proof mở được
  trên mọi thiết bị

---

## Câu chuyện khi nộp

> "Chúng tôi làm nó an toàn thật: sở hữu ví, gửi proof như transaction thật,
> thu hồi, chống replay, ràng buộc ngữ cảnh."
