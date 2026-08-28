# 08 — Định hướng Wave 2 và Wave 3

Thể lệ chấm theo **tiến bộ giữa các Wave**, và mỗi lần nộp lại phải nêu rõ
*"đã thay đổi gì so với Wave trước"*. Vì vậy việc **để dành** tính năng cho Wave sau
là chiến lược đúng, không phải sự lười biếng.

Wave 1 xây nền. Wave 2 làm cho nó **an toàn thật**. Wave 3 làm cho nó **triển khai được thật**.

---

## Wave 2 — 27/09 → 17/10/2026 (US$4,000)

Chủ đề: **Bảo mật và tính đúng đắn**

### W2.1 Xác thực quyền sở hữu ví ⭐ trọng tâm
Wave 1 chỉ *kết nối* ví. Wave 2 **chứng minh quyền sở hữu**:
- Ký challenge để chứng minh nắm private key
- Ràng buộc credential vào ví, không phải vào thiết bị
- Ngăn kịch bản trộm credential rồi dùng lại

### W2.2 Thu hồi (Revocation)
- Trường thu hồi credential (sinh viên bị đình chỉ, thôi học)
- Sinh viên thu hồi proof đã chia sẻ
- Cây accumulator / merkle trên public ledger
- Verifier kiểm tra trạng thái thu hồi tại thời điểm xác thực

### W2.3 Logic claim phong phú
- **OR** và nhóm lồng nhau (Wave 1 chỉ có AND)
- Predicate trên khoảng: `3.0 <= gpa <= 3.5`
- Predicate theo thời gian: "tốt nghiệp trong 2 năm gần đây"

### W2.4 Proof Request ⭐ (chuyển từ Wave 1 sang, 29/08/2026)

Wave 1 **không** làm tính năng này — chủ dự án chuyển sang đây vì nó chỉ trọn vẹn
khi request được ký và danh tính verifier được xác minh, cả hai đều thuộc Wave 2.

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
- `types/index.ts`: `ProofRequest { requestId, requester, claims: ClaimRequest[], createdAt, expiresAt }`
- `lib/proof/request.ts`: encode/decode base64url, có validate
- `app/verify/request/page.tsx` — verifier dựng yêu cầu (dùng lại builder claim ở Phase 1 khối B)
- `app/student/respond/page.tsx` — màn hình consent, hai cột **sẽ lộ gì / giữ riêng gì**
- Luồng từ chối, và xử lý khi yêu cầu hết hạn

Phần chỉ Wave 2 mới làm được — chính là lý do hoãn:
- **Định dạng request có ký** — Wave 1 request trần, ai cũng giả được
- **Verifier đăng ký danh tính** — sinh viên thấy **ai** đang hỏi, và có được xác minh không
- Ràng buộc proof vào đúng verifier đã hỏi (xem W2.5)

### W2.5 Chống replay và ràng buộc ngữ cảnh
- Nonce trong proof
- Ràng buộc proof vào một verifier cụ thể → không dùng lại cho nơi khác được
- Kiểm soát hạn dùng ở tầng contract

### W2.6 Nhiều issuer
- Nhiều trường
- Xoay khoá issuer
- Chuỗi tin cậy giữa các issuer

---

## Wave 3 — 27/10 → 16/11/2026 (US$5,000)

Chủ đề: **Sẵn sàng sản xuất và hệ sinh thái**

### W3.1 API cho verifier
- REST/GraphQL để hệ thống bên ngoài tự động xác thực
- SDK/thư viện client
- Webhook khi proof được xuất trình
- Đây là con đường tiếp cận thị trường thực sự (rubric Business Viability)

### W3.2 Cổng tích hợp cho trường
- Trường tự upload dữ liệu sinh viên (CSV / kết nối SIS)
- Cấp credential hàng loạt
- Bảng theo dõi credential đã cấp

### W3.3 Tương thích chuẩn
- Ánh xạ sang W3C Verifiable Credentials
- Định danh DID
- Liên thông với hệ sinh thái credential khác

### W3.4 Trải nghiệm sản xuất
- Ứng dụng di động / PWA
- Khôi phục credential khi mất thiết bị
- Đa ngôn ngữ (tiếng Việt + tiếng Anh)
- Kiểm tra khả năng tiếp cận (a11y)

### W3.5 Vững chắc về kỹ thuật
- Kiểm toán bảo mật circuit
- Đo và tối ưu hiệu năng chứng minh
- Kiểm thử tải
- Giám sát và cảnh báo

### W3.6 Chứng minh có người dùng thật
Rubric ghi: *"Include evidence of testing, validation, traction, or real use cases when available."*
- Thử nghiệm với một trường thật (dù chỉ một lớp)
- Thư quan tâm từ nhà tuyển dụng / bên cấp học bổng
- Số liệu sử dụng

---

## Chiến lược kể chuyện qua ba Wave

| Wave | Câu chuyện nộp bài |
|---|---|
| 1 | "Chúng tôi chứng minh ý tưởng khả thi: một circuit tổng quát chứng minh mệnh đề bất kỳ về credential học tập mà không lộ dữ liệu." |
| 2 | "Chúng tôi làm nó an toàn thật: sở hữu ví, thu hồi, chống replay, ràng buộc ngữ cảnh." |
| 3 | "Chúng tôi làm nó dùng được thật: API tích hợp, cổng cho trường, tương thích chuẩn, người dùng thật." |

Mỗi Wave đều là **tiến bộ có thực**, không phải đánh bóng lại thứ cũ — đúng thứ thể lệ đòi.
