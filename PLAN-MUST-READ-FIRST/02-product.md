# 02 — Sản phẩm: EduProof là gì

## 1. Vấn đề

Hôm nay, để chứng minh một sự thật nhỏ về hồ sơ học tập, sinh viên phải nộp **toàn bộ** hồ sơ.

- Xin giảm giá phần mềm cho sinh viên → phải gửi ảnh thẻ sinh viên có **tên, mã SV, ảnh, ngày sinh**.
  Bên bán chỉ cần biết **"người này đang là sinh viên"**.
- Xin học bổng yêu cầu GPA ≥ 3.5 → phải nộp **bảng điểm đầy đủ**, lộ điểm từng môn.
  Bên xét chỉ cần biết **"GPA ≥ 3.5: đúng/sai"**.
- Nhà tuyển dụng cần xác nhận bằng cấp → nhận **bản scan bằng**, hoặc phải gọi điện về trường.

Ba hệ quả:
- **Lộ dữ liệu thừa** — bên xác thực nắm dữ liệu họ không cần, và phải chịu trách nhiệm lưu trữ nó.
- **Không xác thực được** — ảnh chụp thẻ dễ chỉnh sửa; bên xác thực không có cách nào biết trường
  có thật sự cấp hay không.
- **Chậm** — xác minh thủ công qua email/điện thoại về phòng đào tạo.

## 2. Giải pháp

EduProof cho phép sinh viên tạo **bằng chứng zero-knowledge** cho một **mệnh đề** về hồ sơ của mình,
rồi chia sẻ đường link. Bên xác thực mở link, thấy:

- Mệnh đề là gì (`GPA ≥ 3.5`)
- Kết quả đúng hay sai
- Trường nào đã cấp dữ liệu gốc, và chữ ký của trường có hợp lệ không
- **Không thấy** GPA thật, tên, mã sinh viên

## 3. Ba vai trò

| Vai | Làm gì | Thấy gì | Route |
|---|---|---|---|
| **School (Issuer)** | Cấp credential đã ký cho sinh viên | Hồ sơ sinh viên của trường mình | `/school` |
| **Student (Holder)** | Giữ credential, chọn mệnh đề, tạo proof, chia sẻ link | Hồ sơ của mình, danh sách proof đã tạo | `/student/*` |
| **Verifier** | Dán link/ID proof, xác thực | Mệnh đề + kết quả + chữ ký trường. **Không thấy dữ liệu thô** | `/verify/*` |

Đây chính là mô hình **Issuer – Holder – Verifier** chuẩn của Verifiable Credentials.
EduProof thêm vào tầng ZK: Holder chứng minh mệnh đề mà không đưa credential cho Verifier.

## 4. Business flow

```
  SCHOOL                    STUDENT                        VERIFIER
    │                          │                               │
    │  1. ký credential        │                               │
    ├─────────────────────────►│                               │
    │   (Ed25519, chỉ nằm      │                               │
    │    trong máy sinh viên)  │                               │
    │                          │                               │
    │                          │ 2. chọn mệnh đề               │
    │                          │    "GPA ≥ 3.5"                │
    │                          │    "status is active"         │
    │                          │                               │
    │                          │ 3. sinh proof                 │
    │                          │    (Phase 1: mock             │
    │                          │     Phase 2: ZK circuit)      │
    │                          │                               │
    │                          │ 4. chia sẻ link               │
    │                          ├──────────────────────────────►│
    │                          │                               │
    │                          │              5. xác thực      │
    │                          │◄──────────────────────────────┤
    │                          │   thấy: mệnh đề + đúng/sai    │
    │                          │   + trường cấp + chữ ký       │
    │                          │   KHÔNG thấy: giá trị thật    │
```

## 5. Mô hình riêng tư — bất biến của dự án

### Claim là mệnh đề, không phải giá trị

Mọi claim đều có dạng:

```
<mệnh đề>  <phép so sánh>  <giá trị>
   GPA          ≥              3.5
  status       is           active
  degree     is not         PhD
```

Kết quả duy nhất rời khỏi máy sinh viên là **một boolean**. `3.72` không bao giờ xuất hiện.

### Bảo đảm mang tính cấu trúc

Kiểu `Proof` **không có field nào có khả năng chứa giá trị riêng tư**. Không phải là
"ta nhớ đừng điền vào" — mà là **không có chỗ để điền**. Kiểm chứng bằng cách đọc
`types/index.ts`: các field là `proofId`, `provider`, `issuer`, `subject` (handle mờ),
`claims` (mệnh đề + boolean), `withheldAttributes` (chỉ **tên** thuộc tính bị giấu),
thời gian, `payload` (dữ liệu proof mờ).

### Ba tính chất bảo mật cần chứng minh (Phase 2, trong circuit)

1. **Ownership** — người tạo proof đúng là chủ credential
   → ràng buộc bằng `persistentHash(studentSecret) == subject`
2. **Issuer authenticity** — credential do trường thật ký
   → `jubjubSchnorrVerify` trong circuit
3. **Selective disclosure** — chỉ boolean của mệnh đề lọt ra
   → so sánh chạy trên private witness, chỉ output boolean

Phiên khảo sát trước đã xác nhận **cả ba đều làm được trong một circuit duy nhất**.

## 6. Vì sao riêng tư là điều kiện cần, không phải tính năng thêm

Nếu bỏ tầng riêng tư đi, EduProof chỉ còn là một trang xác thực bằng cấp thông thường —
và bên xác thực vẫn phải nhận, lưu, chịu trách nhiệm về dữ liệu cá nhân của sinh viên.
Chính **việc bên xác thực không bao giờ chạm vào dữ liệu gốc** mới là giá trị của sản phẩm.
Đây là điều cần nói rõ ở slide và video (rubric: "Explain how privacy meaningfully shapes
the product or technical design").

## 7. Use case cụ thể

| Bối cảnh | Mệnh đề | Bên xác thực tránh được gì |
|---|---|---|
| Giảm giá sinh viên (JetBrains, Figma, Spotify) | `status is active` | Lưu ảnh thẻ sinh viên |
| Xét học bổng | `GPA ≥ 3.5` AND `status is active` | Nhận bảng điểm chi tiết |
| Tuyển dụng sàng lọc | `degree is Bachelor` AND `major is Computer Science` | Gọi điện xác minh về trường |
| Visa du học | `status is active` AND `academicYear ≥ 3` | Giữ hồ sơ học tập của người nước ngoài |
| Câu lạc bộ / hội sinh viên | `status is active` | Biết danh tính người tham gia |

## 8. Ngoài phạm vi Wave 1

Ghi rõ để tránh scope creep:

- Xác thực quyền sở hữu ví bằng chữ ký (Wave 2)
- Đăng ký trường thật lên registry on-chain (Wave 2)
- Thu hồi (revocation) credential (Wave 2/3)
- Nhiều trường, nhiều issuer key, xoay khoá (Wave 3)
- API cho verifier tích hợp máy-với-máy (Wave 3)
- Ứng dụng di động
- Thanh toán / kinh tế token
