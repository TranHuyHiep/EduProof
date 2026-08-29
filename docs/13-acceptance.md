# Biên bản nghiệm thu Wave 1

Kết quả chạy thử toàn bộ trên UI sau khi contract đã deploy và issuer đã đăng ký.
Ngày 2026-08-30. Mọi con số dưới đây là **đo được**, không phải mô tả.

Cách làm lại: [12-go-live.md](12-go-live.md).

---

## On chain

```
contract   89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729
deploy tx  0x0039095faf9e17c65fe65e86ffac18a08a8c0a331d9755a9b6bd81ccf6da5cae64
issuer tx  0x006bf9b9994604eca4045e32498161e48a19cb07839392c4fb42df8fcb08d36e9a
```

- [Contract](https://preprod.midnightexplorer.com/contracts/0x89975419a1a887b6f4d74d91e4c857ff3256c966f2c4fb77775e4524f8a0b729)
- [Giao dịch deploy](https://preprod.midnightexplorer.com/transactions/0x0039095faf9e17c65fe65e86ffac18a08a8c0a331d9755a9b6bd81ccf6da5cae64)
- [Giao dịch đăng ký issuer](https://preprod.midnightexplorer.com/transactions/0x006bf9b9994604eca4045e32498161e48a19cb07839392c4fb42df8fcb08d36e9a)

Ledger đọc qua `lib/midnight/chain.ts`, so với baseline đo **trước** khi đăng ký:

| | Trước | Sau |
|---|---|---|
| `issuerCount` | 0 | **1** |
| `issuerRegistered(3226085635)` | `false` | **`true`** |
| `proofsVerified` | 0 | 0 |

`proofsVerified` vẫn 0 là **đúng thiết kế**: proof chạy local qua proof server,
verify chỉ **đọc** chain chứ không ghi. Muốn nó tăng thì mỗi proof phải là một
transaction — tốn DUST và chậm vài giây mỗi lần. Đó là lựa chọn của Wave 2.

Kiểm chứng độc lập bất cứ lúc nào:

```bash
npm run contract:verify
```

---

## Đã chạy thử trên UI

| Tính năng | Kết quả |
|---|---|
| Registry `/school` | 10 sinh viên, giá trị thật — góc nhìn nhà trường |
| Kết nối ví | khoá demo, chạy được không cần extension |
| Lấy credential | Alice SV001, GPA 3.72 hiện trên máy sinh viên |
| Preset mệnh đề | *Scholarship application* nạp 2 mệnh đề |
| Đổi thuộc tính mệnh đề | operator tự đặt lại về giá trị hợp lệ |
| Sinh proof | `pf_00625d96ef77`, provider `midnight` (circuit thật) |
| Trang verify | **2 of 2 proven** |
| **Issuer on chain** | **`registered`** |
| Link explorer | trỏ đúng contract |
| Dán mã proof ở `/verify` | chuyển đúng trang |
| Mã không tồn tại | *"No proof found"*, kèm giải thích proof lưu trên thiết bị |
| Danh sách proof | hiển thị đúng |
| Lỗi console | 0 (xem ghi chú bên dưới) |

### Ca trượt — phần quan trọng nhất

Bob (SV002, GPA 2.91) với hai mệnh đề, một đúng một sai:

```
student status is active   → proven
GPA is at least 3.50       → not proven
```

Kiểm tra proof đã lưu — thứ thật sự đi kèm link chia sẻ:

```
wholeProofLeaks: []      không có 2.91, 291, Bob, Tran, SV002 ở bất kỳ đâu
payloadHasGpa:   false   kể cả trong payload
```

**Proof thất bại không thu hẹp giá trị bị giấu.** Verifier biết Bob không đạt
3.5, không biết là 2.91 hay 3.4 hay 0.5.

Với Alice thì cũng không lộ `3.72`, `372`, `Alice`, `Nguyen`, `SV001`.

---

## Cổng chất lượng

```
npm test                  251 test / 16 file
npm run check:boundaries  4/4 luật kiến trúc
npm run build             13 route, không warning
npx tsc --noEmit          sạch
```

---

## Hai cảnh báo giả trong lúc test — ghi lại để khỏi lặp

**1. `291` và `SV002` trong localStorage.** Chúng nằm ở
`eduproof.session.credential` — credential của sinh viên trên máy của chính họ,
hoàn toàn hợp lệ. Bộ lọc ban đầu quét mọi key chứa chữ `proof`, mà key đó cũng
khớp. Thứ phải sạch là **`eduproof.proofs.v1`**.

**2. `TypeError: Cannot read properties of undefined` ở `operatorPhrase`.**
Do gán `select.value` trực tiếp bằng JS, tạo trạng thái mà UI không tạo được.
Thao tác bằng chuột thật thì `update()` gọi `defaultClaim()` dựng lại cả
operator lẫn giá trị. Stack trace kết thúc bằng `UtilityScript.evaluate` — dấu
vết script tiêm, không phải tương tác người dùng.

Cả hai đều là lỗi của **phép đo**, không phải của sản phẩm.

---

## Còn thiếu để nộp bài

Không phải việc code. Thiếu là **bị loại thẳng**:

| # | Việc | Hệ quả nếu thiếu |
|---|---|---|
| 1 | Repo public + topic `midnightntwrk` | loại, không được chấm |
| 2 | Slide deck | mất 10% rubric |
| 3 | Video demo 3–5 phút | cùng 10% đó |

Video nên quay đúng luồng ở bảng trên. Cảnh thuyết phục nhất là **ca Bob** —
hệ thống trả lời "không" mà vẫn không lộ 2.91.
