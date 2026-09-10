# Đưa Wave 1 chạy thật trên preprod

Kế hoạch thực thi cho lúc sync xong. Làm từ trên xuống, mỗi bước có cách
kiểm chứng riêng — **đừng bỏ qua phần kiểm chứng**, vì lần hỏng trước
(`Custom error: 170`) chính là do tin vào một dòng log thay vì kiểm tra.

Bối cảnh và các bẫy đã gặp: [22-lessons.md](22-lessons.md).
Link và endpoint: [23-references.md](23-references.md).

---

## Trạng thái — **xong toàn bộ**

| Bước | Tình trạng |
|---|---|
| 0 — Deploy | ✅ `5d96aa1c4f2b77afc3603cb0…` (contract viết lại, 09/09) |
| 1 — Đặt biến env | ✅ indexer xác nhận |
| 2 — ~~Đăng ký issuer~~ | ⛔ **bước này không còn tồn tại** — xem dưới |
| 3 — Chạy thử end-to-end | ✅ [13-acceptance.md](13-acceptance.md) |
| 4 — Cập nhật tài liệu | ✅ |
| 5 — Chốt cổng chất lượng | ✅ 299 test, boundaries, build, tsc |
| 6 — Gọi contract thật | ✅ `proofsVerified = 4` — [15-…](15-wave-1-smartcontract-call.md) |

> **Địa chỉ đã đổi.** Contract cũ `89975419…` bị bỏ hoang khi contract được
> viết lại ngày 2026-09-08. Nó vẫn nằm trên chain nhưng có hình dạng khác
> (thừa `issuers` và `registerIssuer`), nên code hiện tại **không nói chuyện
> được với nó** — triệu chứng:
> *"Following operations: proveCredentialPredicate, are undefined or have
> mismatched verifier keys"*. Nếu gặp lỗi đó, kiểm tra
> `NEXT_PUBLIC_CONTRACT_ADDRESS` trước tiên.

Kết quả đo được: [13-acceptance.md](13-acceptance.md).

Chỉ còn việc của chủ dự án: repo public + topic `midnightntwrk`, slide, video.

---

## Bước 0 — Deploy ✅

```
contract  5d96aa1c4f2b77afc3603cb028f142da83ea4b027f1802c0b4560ca11b7ef42b
tx        a9f455ba02b9fa575de1daf2a8e169df0d1a884a7551830fe11ac74e72ff078c
block     2475056  (2026-09-09)
```

Bản thân việc deploy dưới một phút; phần còn lại là sync ví.

**Lần deploy đầu của contract này mất 3 tiếng rồi hỏng** vì
`deploy-contract.mjs` khi đó chưa dùng checkpoint — nó tự mở ví thay vì gọi
`openFundedWallet()`, nên sync lại từ genesis mỗi lần và không lưu tiến độ.
Đã sửa (commit `d21dc64`); giờ ví khôi phục trong khoảng một phút.

Lần deploy trước đó (contract cũ `89975419…`, 29/08) mất 158 phút vì cùng
lý do.

## Bước 1 — Biến môi trường ✅

```bash
NEXT_PUBLIC_PROOF_PROVIDER=midnight
NEXT_PUBLIC_CONTRACT_ADDRESS=5d96aa1c4f2b77afc3603cb028f142da83ea4b027f1802c0b4560ca11b7ef42b
```

`npm run contract:verify` báo *"indexer confirms a contract at this address
(ContractDeploy)"* — bằng chứng độc lập, không phải lời script deploy tự nói.

Điều này quan trọng vì tiến trình deploy chạy bản code **cũ**, chưa có kiểm tra
`TxStatus`. Nó sẽ in `✓ deployed` kể cả khi transaction rơi vào `FailFallible`.

---

## ~~Bước 2 — Đăng ký khoá trường lên chain~~ ⛔ ĐÃ BỎ

**Bước này không còn tồn tại.** `npm run contract:register-issuer` đã bị xoá
cùng circuit `registerIssuer`.

Contract viết lại ngày 2026-09-08 bỏ xác thực chữ ký Schnorr, nên `issuers`
registry không còn ai đọc. Giữ một Map khoá mà không circuit nào kiểm tra sẽ
khiến ledger **trông như** có xác thực trường trong khi không có — nên nó bị
bỏ hẳn.

Hệ quả với người vận hành: **deploy xong là dùng được ngay**, không có bước
đăng ký nào ở giữa.

Hệ quả với bảo mật: **bất kỳ ai cũng tự khai được credential**. Đây là món
nợ **W2.0** của Wave 2 — [40-wave-2-features.md](40-wave-2-features.md). Khi
khôi phục, bước này quay lại cùng registry.

---

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
