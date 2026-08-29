# Wave 1 — Kế hoạch và trạng thái

**File này trả lời đúng một câu hỏi: bây giờ phải làm gì tiếp theo.**

Cập nhật: 2026-08-29

---

## Việc tiếp theo

| # | Việc | Ai làm | Chặn nộp bài? |
|---|---|---|---|
| 1 | **Repo để public + gắn topic `midnightntwrk`** | chủ dự án | **CÓ — thiếu là loại thẳng** |
| 2 | Slide deck | chủ dự án | 10% rubric |
| 3 | Video demo 3–5 phút | chủ dự án | cùng 10% đó |
| 4 | Commit toàn bộ working tree | ai cũng được | không |

**Đang chạy nền:** deploy contract lên preprod. Xem [Trạng thái deploy](#trạng-thái-deploy).

Không còn việc code nào bắt buộc cho Wave 1.

---

## Đã xong

| Phase | Nội dung | Kiểm chứng |
|---|---|---|
| 1 — Mock UI | 3 vai trò, claim động, link chia sẻ | 10 trang + 1 API route |
| 2 — Midnight | Circuit Compact, chữ ký thật, ràng buộc chủ sở hữu | 40 test circuit, đã mutation-test |
| 3 — Đóng gói | Docker, Vercel, tài liệu | image 338 MB chạy được, healthcheck xanh |

Cổng kiểm tra — chạy `npm test && npm run check:boundaries && npm run build`:

```
npm test                  231 test / 12 file
npm run check:boundaries  4/4 luật kiến trúc
npm run build             13 route, không warning
npx tsc --noEmit          sạch
```

**Cửa kỹ thuật của Buildathon đã qua:** phải có ít nhất một Compact contract
compile thành công, nếu không bị loại thẳng.

---

## Trạng thái deploy

Contract build cho **ledger 8** (toolchain 0.31.1) vì preprod chạy ledger 8.

```
npm run contract:build    biên dịch, đã pin 0.31.1
npm run wallet:register-dust   đăng ký NIGHT sinh DUST (nếu chưa)
npm run contract:deploy   deploy, hỏi xác nhận trước khi ghi lên chain
```

Sau khi deploy xong, đặt địa chỉ vào `.env.local`:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=<địa chỉ>
```

Trong khi biến này rỗng, phần xác minh on-chain tự nói là chưa có, thay vì hiện
một dấu tick vô nghĩa.

**Nút thắt đã biết:** dust wallet sync từ genesis (~1.46 triệu index, khoảng
90 phút). Fee balancer tiêu từ view local nên phải đợi sync xong, dù trên chain
đã có DUST. Script deploy tự đợi và in tiến độ. Chi tiết: [lessons.md](lessons.md).

---

## Kiến trúc — cái không được phá

### 1. Không để giá trị riêng tư lọt vào `Proof`

Kiểu `Proof` không được có field nào chứa được GPA thật, tên thật, mã sinh viên
thật. Đây là bảo đảm **cấu trúc**, không phải quy ước.

Giữ bằng `tests/privacy.test.ts` — nếu xoá hết test khác thì giữ lại test này.

### 2. School là vendor độc lập

`lib/school/**` và `app/api/school/**` **không được** import `lib/proof/`.
Nếu trường với tay vào được hệ thống proof thì sự tách bạch chỉ là hư cấu.

Giữ bằng máy, không bằng lời hứa:

```bash
npm run check:boundaries
```

Chi tiết: [school-vendor-contract.md](school-vendor-contract.md).

### 3. Một điểm hoán đổi provider duy nhất

```ts
// lib/proof/index.ts
export const proofProvider: ProofProvider =
  providerName() === "midnight" ? new MidnightProofProvider() : new MockProofProvider();
```

Không component nào biết đang dùng cái nào. Có test khẳng định hai provider sinh
ra `Proof` cùng bộ field.

### 4. Claim là mệnh đề, không phải giá trị

Không bao giờ đưa giá trị thô vào claim, kể cả khi tiện.

Chi tiết kiến trúc: [architecture.md](architecture.md).

---

## Quyết định đã chốt

| Quyết định | Lý do |
|---|---|
| School là vendor độc lập, schema GraphQL là đặc tả công khai | Trường khác tự tích hợp được |
| Proof Request **hoãn sang Wave 2** | Chỉ trọn vẹn khi request được ký và verifier có danh tính — cả hai thuộc Wave 2 |
| Không dùng DB ngoài | Dữ liệu ở JSON file, localStorage, hoặc on-chain |
| Proof server hosted cho việc chứng minh trong trình duyệt | Nộp transaction thì bắt buộc local qua Docker (yêu cầu của Midnight) |
| Contract build cho ledger 8, không phải ledger 9 | Preprod chạy ledger 8; ledger 9 chưa deploy ở đâu cả |
| Schnorr verify viết tay | `jubjubSchnorrVerify` là builtin của language 0.26, không có trên 0.23 |
| TypeScript chạy qua `--experimental-strip-types` | Không cần build step riêng |

---

## Luật làm việc

1. **Không tự ý deploy hay đụng vào thứ ngoài phạm vi project.** Hỏi trước, mỗi lần.
2. **Không nhảy Phase.** Một phiên trước đã có agent tự viết code Midnight giữa
   Phase 1, phải xoá đi làm lại.
3. **Đọc [lessons.md](lessons.md) trước khi động vào phần Midnight.** Ba cái bẫy
   ở đó đều đã làm mất nhiều giờ.

Quy ước code, vận hành, thẩm mỹ UI: [conventions.md](conventions.md).
