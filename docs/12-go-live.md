# Đưa Wave 1 chạy thật trên preprod

Kế hoạch thực thi cho lúc sync xong. Làm từ trên xuống, mỗi bước có cách
kiểm chứng riêng — **đừng bỏ qua phần kiểm chứng**, vì lần hỏng trước
(`Custom error: 170`) chính là do tin vào một dòng log thay vì kiểm tra.

Bối cảnh và các bẫy đã gặp: [22-lessons.md](22-lessons.md).
Link và endpoint: [23-references.md](23-references.md).

---

## Trạng thái

| Bước | Tình trạng |
|---|---|
| 0 — Deploy | ✅ **xong** — `89975419a1a887b6f4d74d91…` |
| 1 — Đặt biến env | ✅ **xong** — indexer đã xác nhận |
| 2 — Đăng ký issuer | ⏳ **đang chạy** (sync ~2.5 giờ) |
| 3 — Chạy thử end-to-end | chờ bước 2 |
| 4 — Cập nhật tài liệu | ✅ xong |
| 5 — Chốt cổng chất lượng | chờ bước 3 |

---

## Bước 0 — Deploy ✅

```
contract  89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729
tx        0039095faf9e17c65fe65e86ffac18a08a8c0a331d9755a9b6bd81ccf6da5cae64
```

Mất 158 phút, gần hết là sync ví. Bản thân việc deploy dưới một phút.

## Bước 1 — Biến môi trường ✅

```bash
NEXT_PUBLIC_PROOF_PROVIDER=midnight
NEXT_PUBLIC_CONTRACT_ADDRESS=89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729
```

`npm run contract:verify` báo *"indexer confirms a contract at this address
(ContractDeploy)"* — bằng chứng độc lập, không phải lời script deploy tự nói.

Điều này quan trọng vì tiến trình deploy chạy bản code **cũ**, chưa có kiểm tra
`TxStatus`. Nó sẽ in `✓ deployed` kể cả khi transaction rơi vào `FailFallible`.

---

## Bước 2 — Đăng ký khoá trường lên chain ⚠️

**Không được bỏ qua.** Contract deploy xong có `issuers` **rỗng**, và hệ quả
không dừng ở hiển thị:

- `proveCredentialPredicate` từ chối mọi proof với *"unknown issuer"*
- Trang verify luôn hiện *Issuer on chain: not registered*

```bash
npm run contract:register-issuer
```

Script gọi circuit `registerIssuer` qua transaction thật, hỏi xác nhận trước
(gõ `register`), và in link explorer của giao dịch.

Khoá lấy từ `circuitPublicKey()` — **cùng khoá** trường dùng để ký, không
truyền tay. Script dừng ngay nếu `SCHOOL_SIGNING_KEY` chưa có trong
`.env.local`: thiếu nó thì một khoá tạm sẽ được sinh ra và ghi lên chain, nơi
không lấy lại được, và mọi proof sau đó đều hỏng vì contract giữ một khoá
không ký gì cả.

**Kiểm chứng — so với baseline đo trước khi đăng ký:**

| Đọc từ chain | Trước | Sau (phải là) |
|---|---|---|
| `issuerCount` | 0 | **1** |
| `issuerRegistered(3226085635)` | `false` | **`true`** |

`3226085635` là `hashToField("hanoi-university")` — cùng giá trị mà app tra
cứu và circuit đọc từ credential, có test khoá
(`tests/issuer-identity.test.ts`).

```bash
npm run contract:verify
```

Trang verify phải hiện *Issuer on chain: **registered***.

Nếu số không đổi: transaction có thể đã vào block nhưng thất bại
(`FailFallible`) — script đã kiểm `TxStatus` nên sẽ báo, hoặc indexer còn trễ
vài block. Đợi rồi đọc lại trước khi kết luận.

---

## Bước 3 — Chạy thử end-to-end

**Đã chạy phần lớn ngày 2026-08-29, trước khi đăng ký issuer.** Còn lại chỉ là
chạy lại sau khi đăng ký để thấy hai giá trị on-chain đổi.

```bash
npm run dev                           # cổng 3000
```

Chỉ một lệnh. `NEXT_PUBLIC_SCHOOL_API=/api/school/graphql` nên nhà trường chạy
ngay trong tiến trình Next qua route nội bộ — `npm run school` (cổng 4000) chỉ
cần khi muốn chứng minh trường là service tách rời thật, ví dụ lúc quay demo.

Proof server phải đang chạy:

```bash
docker ps | grep 6300                 # phải là proof-server:8.1.0
```

### Đã kiểm chứng

Luồng Bob (SV002, GPA 2.91) với hai mệnh đề, một đúng một sai:

```
status is active       → proven
GPA is at least 3.50   → not proven
```

| Kiểm | Kết quả |
|---|---|
| `chain.ts` chạy trong trình duyệt | ✅ trang verify đọc được ledger thật |
| Số on-chain khớp baseline đo bằng Node | ✅ `not registered`, `0` |
| Proof đã lưu (thứ đi kèm link chia sẻ) | ✅ không có `2.91`, `291`, `Bob`, `Tran`, `SV002` |
| `payload` có chứa GPA không | ✅ không |
| `provider` | ✅ `midnight`, không phải mock |
| Lỗi console | ✅ 0 |

**Bẫy khi tự kiểm tra riêng tư:** đừng quét mọi key localStorage chứa chữ
"proof". `eduproof.session.credential` cũng khớp, và nó **được phép** chứa giá
trị thật — đó là credential của sinh viên trên máy của chính họ. Thứ phải sạch
là `eduproof.proofs.v1`.

### Còn phải làm sau khi đăng ký issuer

Chạy lại luồng trên, và hai dòng này phải đổi:

```
Issuer on chain                        not registered  →  registered
Predicates verified by this contract   0               →  tăng khi có proof
```

---

## Bước 4 — Cập nhật tài liệu

Sau khi bốn bước trên xanh:

- [11-wave-1-features.md](11-wave-1-features.md) — bỏ dòng *"Danh bạ issuer dựng
  trong bộ nhớ mỗi phiên, chưa đọc từ chain"* ở mục **Chưa có ở Wave 1**;
  nó đã sai kể từ khi có `lib/midnight/chain.ts`
- [10-wave-1-plan.md](10-wave-1-plan.md) — điền địa chỉ contract và link explorer
- [../README.md](../README.md) — thêm link explorer cho người chấm

---

## Bước 5 — Chốt cổng chất lượng

```bash
npm test && npm run check:boundaries && npm run build && npx tsc --noEmit
```

Cả bốn phải xanh trước khi coi là xong.

---

## Việc của chủ dự án — chặn nộp bài

Không phải việc code, nhưng thiếu là **loại thẳng**:

| # | Việc | Hệ quả nếu thiếu |
|---|---|---|
| 1 | Repo public + topic `midnightntwrk` | loại, không được chấm |
| 2 | Slide deck | mất 10% rubric |
| 3 | Video demo 3–5 phút | cùng 10% đó |

Video nên quay đúng luồng ở Bước 3 — ca Bob trượt mệnh đề là cảnh thuyết phục
nhất, vì nó cho thấy hệ thống trả lời "không" mà vẫn không lộ 2.91.

---

## Nếu deploy hỏng lại

1. Đọc lỗi thật trong log — handler in `cause`, `code`, `data`
2. Tra mã ở [22-lessons.md](22-lessons.md) mục 6 (bảng mã Midnight)
3. Mỗi lần thử lại tốn ~150 phút sync. Trước khi chạy lại, cân nhắc dựng
   đường khôi phục state: `DustWallet(...).restore()` +
   `MidnightWalletProvider.withWallet(...)` — cả hai đều có thật trong SDK,
   chưa được nối vào. Xem [../scripts/dust-checkpoint.mjs](../scripts/dust-checkpoint.mjs).
