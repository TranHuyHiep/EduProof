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

- Đọc danh bạ issuer **từ chain** thay vì dựng trong bộ nhớ
- `ChainProofStore` nằm sau interface `ProofStore` sẵn có → link proof mở được
  trên mọi thiết bị

---

## Câu chuyện khi nộp

> "Chúng tôi làm nó an toàn thật: sở hữu ví, thu hồi, chống replay, ràng buộc ngữ cảnh."
