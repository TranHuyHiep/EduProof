# Wave 3 — Tính năng

**27/10 → 16/11/2026 · US$5,000**

Chủ đề: **Sẵn sàng sản xuất và hệ sinh thái.** Wave 2 làm nó an toàn; Wave 3 làm
nó triển khai được thật.

---

## W3.1 API cho verifier

- REST/GraphQL để hệ thống bên ngoài tự động xác thực
- SDK / thư viện client
- Webhook khi proof được xuất trình

Đây là con đường tiếp cận thị trường thực sự — chấm vào rubric Business Viability.

## W3.2 Cổng tích hợp cho trường

- Trường tự upload dữ liệu sinh viên (CSV hoặc kết nối SIS)
- Cấp credential hàng loạt
- Bảng theo dõi credential đã cấp

Dựng trên schema v1 đã công bố ở Wave 1 — xem [school-integration.md](school-integration.md).

## W3.3 Tương thích chuẩn

- Ánh xạ sang W3C Verifiable Credentials
- Định danh DID
- Liên thông với hệ sinh thái credential khác

## W3.4 Trải nghiệm sản xuất

- Ứng dụng di động / PWA
- Khôi phục credential khi mất thiết bị
- Đa ngôn ngữ (tiếng Việt + tiếng Anh)
- Kiểm tra khả năng tiếp cận (a11y)

## W3.5 Vững chắc về kỹ thuật

- Kiểm toán bảo mật circuit
- Đo và tối ưu hiệu năng chứng minh
- Kiểm thử tải
- Giám sát và cảnh báo

## W3.6 Chứng minh có người dùng thật

Rubric ghi rõ: *"Include evidence of testing, validation, traction, or real use
cases when available."*

- Thử nghiệm với một trường thật, dù chỉ một lớp
- Thư quan tâm từ nhà tuyển dụng hoặc bên cấp học bổng
- Số liệu sử dụng

---

## Câu chuyện khi nộp

> "Chúng tôi làm nó dùng được thật: API tích hợp, cổng cho trường, tương thích
> chuẩn, người dùng thật."

---

## Ba Wave nhìn tổng thể

| Wave | Câu chuyện |
|---|---|
| 1 | "Ý tưởng khả thi: một circuit tổng quát chứng minh mệnh đề bất kỳ về credential học tập mà không lộ dữ liệu." |
| 2 | "An toàn thật: sở hữu ví, thu hồi, chống replay, ràng buộc ngữ cảnh." |
| 3 | "Dùng được thật: API tích hợp, cổng cho trường, tương thích chuẩn, người dùng thật." |

Mỗi Wave là **tiến bộ có thực**, không phải đánh bóng lại thứ cũ — đúng thứ thể lệ đòi.
