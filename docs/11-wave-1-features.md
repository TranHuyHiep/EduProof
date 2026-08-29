# Wave 1 — Tính năng

**Trạng thái: đã xong.** Đây là mô tả cái đang chạy, không phải kế hoạch.
Kiến trúc và các quyết định đứng sau: [10-wave-1-plan.md](10-wave-1-plan.md).

---

## Ba vai trò

| Vai | Đường dẫn | Làm được gì |
|---|---|---|
| Sinh viên | `/student/*` | Đăng nhập, xem credential, tạo proof, chia sẻ link |
| Bên xác minh | `/verify`, `/verify/[proofId]` | Mở link hoặc dán mã proof, xem kết quả |
| Nhà trường | `/school` | Xem hồ sơ trường, khoá công khai, credential đã cấp |

## Luồng sinh viên

```
/student/login            đăng nhập bằng mã SV (SV001…SV010)
/student/select-school    chọn trường
/student/credentials      xem credential trường đã ký
/student/create-proof     dựng mệnh đề → sinh proof
/student/proofs           danh sách proof đã tạo
/student/proof/[id]       chi tiết một proof + link chia sẻ
```

## Mệnh đề dựng được

Claim là **mệnh đề**, không bao giờ là giá trị thô. Đây là bất biến kiến trúc.

| Thuộc tính | Phép so sánh | Ví dụ |
|---|---|---|
| `status` | is / is not | *status is active* |
| `gpa` | ≥ > ≤ < = ≠ | *GPA is at least 3.50* |
| `academicYear` | ≥ > ≤ < = ≠ | *is in year 3 or above* |
| `degree` | is / is not | *degree is Bachelor* |
| `major` | is / is not | *major is Computer Science* |

Nối nhiều mệnh đề bằng **AND**. (OR và nhóm lồng nhau: Wave 2.)

## Zero-knowledge — chạy thật

Một circuit Compact **duy nhất**, mệnh đề là tham số:

```
proveCredentialPredicate(
    schoolIdHash, subject, slot, op, operand,   // công khai: mệnh đề
    credential, signature                        // riêng tư: bằng chứng
) -> Boolean
```

Circuit từ chối trả lời nếu thiếu một trong ba:

1. **Chữ ký nhà trường hợp lệ** — Schnorr trên JubJub, đối chiếu khoá trên ledger.
2. **Người gọi đúng là chủ credential** — biết bí mật đứng sau subject commitment.
   Không có bước này, credential rò rỉ dùng được cho người khác.
3. **Credential tự khai đúng chủ và đúng trường** — slot 0 và slot 1 khớp với
   mệnh đề đang xét, nên không tráo được sau khi ký.

Chỉ giá trị Boolean đi ra.

**Đổi giữa mock và circuit thật bằng một biến môi trường:**

```bash
NEXT_PUBLIC_PROOF_PROVIDER=midnight npm run dev
```

Mặc định là `mock` để người chấm clone về chạy được ngay, không cần toolchain,
ví, hay Docker.

## Nhà trường ký hai lần

Cùng một sự thật, hai dạng, vì circuit không có bộ phân tích JSON:

- **Ed25519 trên JSON chuẩn hoá (RFC 8785)** — cho bên tích hợp thông thường.
- **JubJub Schnorr trên vector 16 trường** — cho circuit.

Cả hai dẫn xuất từ **một** secret, nên trường vẫn chỉ quản một khoá.

GPA lưu ×100 (3.72 → 372) vì circuit không có số thực.

Đặc tả đầy đủ: [31-school-integration.md](31-school-integration.md).

## Chạy thật trên chain

Contract đã deploy lên preprod:

```
89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729
```

[Xem trên explorer](https://preprod.midnightexplorer.com/contracts/0x89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729)

Lúc xác minh một proof, trang verify **đọc ledger của contract** thay vì tự
khẳng định:

| Đọc được | Nghĩa là |
|---|---|
| `issuers` | khoá trường nằm trong registry on-chain, không phải file JSON của app |
| `proofsVerified` | số mệnh đề contract đã kiểm — khác 0 nghĩa là contract được dùng thật |

Chỉ số liệu **tổng hợp**, không có gì theo từng proof. Thêm một chỉ mục hay
nullifier là hai proof của cùng một người liên kết được — có test khoá điều đó
(`tests/on-chain-state.test.ts`), và test đã được kiểm chứng bằng cách cố tình
thêm một trường vào để xem nó đỏ.

Chain không với tới được thì proof **vẫn hợp lệ**, và trang nói rõ nửa công
khai đang không đọc được. Kết luận là của circuit, không phụ thuộc indexer.

Kiểm chứng độc lập:

```bash
npm run contract:verify
```

---

## Riêng tư — cái không lộ

Điều quan trọng nhất là **proof thất bại cũng không lộ gì**. Nếu GPA của Bob là
2.91 và mệnh đề là *GPA ≥ 3.5*, kết quả là `false` — không phải "2.91 < 3.5".

Có test giữ đúng điều này (`tests/privacy.test.ts`), và kiểu `Proof` không có
field nào chứa được giá trị thật.

## Dữ liệu mẫu

10 sinh viên, cố ý gồm cả trường hợp đạt và không đạt:

| Mã | Tình huống |
|---|---|
| `SV001` | Alice — đang học, GPA 3.72, năm 3 |
| `SV002` | Bob — GPA 2.91, **trượt** mệnh đề GPA ≥ 3.5 |
| `SV003` | Charlie — **đã tốt nghiệp**, trượt mệnh đề *status is active* |

## Chưa có ở Wave 1

- Link proof chỉ mở được trên thiết bị đã tạo (chưa có server store).
- Chưa kết nối ví Lace.
- Proof không tự nộp lên chain: circuit chạy local, còn chain thì **đọc**,
  không ghi, lúc xác minh.
- Chưa có xác thực nhân viên phòng đào tạo — endpoint trả về đúng thứ EduProof
  sinh ra để bảo vệ. Ghi rõ ở đây thay vì lặng lẽ bỏ qua.
