# EduProof — Tài liệu nghiệp vụ

**Prove what matters. Keep the rest private.**
*Chứng minh điều cần thiết. Giữ kín phần còn lại.*

> Tài liệu này mô tả **bài toán nghiệp vụ, giá trị và mô hình vận hành**.
> Phần kiến trúc, cách chạy và cách demo nằm ở [README.md](README.md).

---

## 1. Vấn đề

Sinh viên thường phải nộp **toàn bộ** hồ sơ học tập trong khi bên xác minh
chỉ cần biết **một sự thật duy nhất**.

Ví dụ điển hình — quỹ học bổng chỉ cần biết "GPA có đạt 3.5 không?", nhưng
sinh viên phải nộp bảng điểm đầy đủ:

| Bên xác minh thực sự cần | Sinh viên buộc phải tiết lộ |
|---|---|
| GPA ≥ 3.5? (đúng/sai) | GPA chính xác: 3.72 |
| | Họ tên, mã số sinh viên |
| | Toàn bộ điểm từng môn |
| | Lịch sử học tập, ngành, khoá |

### Hệ quả

**Với sinh viên** — mất quyền kiểm soát dữ liệu cá nhân. Bảng điểm một khi đã
gửi đi thì không thu hồi được, và có thể bị chia sẻ tiếp cho bên thứ ba.

**Với bên xác minh** — nhận và lưu trữ nhiều dữ liệu nhạy cảm hơn mức cần
thiết, kéo theo nghĩa vụ bảo vệ dữ liệu và rủi ro rò rỉ không đáng có.

**Với nhà trường** — tốn nhân lực xác minh thủ công qua email/công văn,
thời gian phản hồi tính bằng ngày.

---

## 2. Giải pháp

EduProof cho phép sinh viên tạo **bằng chứng về một mệnh đề**, thay vì
gửi đi dữ liệu gốc.

```
Dữ liệu riêng tư:      GPA = 3.72
Mệnh đề cần chứng minh: GPA >= 3.5
Bên xác minh nhận:      ✓ ĐÚNG

Bên xác minh KHÔNG nhận: 3.72 · mã số SV · họ tên · bảng điểm
```

Điểm cốt lõi: bằng chứng mang theo **kết quả của phép so sánh**, không mang
theo giá trị được đem ra so sánh.

---

## 3. Ba vai trò

### 3.1. Nhà trường — bên cấp phát

Nắm giữ dữ liệu học tập gốc và đóng vai trò tổ chức phát hành credential.
Ký credential bằng khoá riêng của trường, nhờ đó bên xác minh tin được
nguồn gốc mà không cần liên hệ lại nhà trường.

### 3.2. Sinh viên — bên kiểm soát

Là người **quyết định tiết lộ điều gì**. Sinh viên chọn từng mệnh đề muốn
chứng minh, tạo bằng chứng và chia sẻ qua đường link. Dữ liệu học tập không
rời khỏi thiết bị của sinh viên.

### 3.3. Bên xác minh — bên tiêu thụ

Nhà tuyển dụng, quỹ học bổng, trường đối tác, ngân hàng… Mở link, thấy ngay
kết quả các mệnh đề và đơn vị cấp phát. Không cần đăng nhập, không cần tích hợp.

---

## 4. Luồng nghiệp vụ

```
Nhà trường                Sinh viên                    Bên xác minh
    │                         │                              │
    │  dữ liệu học tập        │                              │
    ├────────────────────────>│                              │
    │  credential đã ký       │                              │
    ├────────────────────────>│                              │
    │                         │ chọn mệnh đề cần chứng minh  │
    │                         │ tạo bằng chứng               │
    │                         │                              │
    │                         │  chia sẻ link xác minh       │
    │                         ├─────────────────────────────>│
    │                         │                              │ xác minh
    │                         │                              │ → chỉ thấy
    │                         │                              │   kết quả
```

Ranh giới quan trọng: **dữ liệu gốc dừng lại ở sinh viên**. Từ sinh viên
sang bên xác minh chỉ có kết quả đúng/sai của các mệnh đề đã chọn.

---

## 5. Các mệnh đề hỗ trợ

| Mệnh đề | Dạng biểu diễn | Tình huống sử dụng |
|---|---|---|
| Đang là sinh viên | `student_status == active` | Vé xe buýt, giảm giá phần mềm, thị thực |
| Ngưỡng GPA | `gpa >= 3.5` | Học bổng, tuyển dụng, học lên cao |
| Ngưỡng năm học | `academic_year >= 3` | Thực tập, chương trình trao đổi |
| Bậc học | `degree == Bachelor` | Yêu cầu bằng cấp khi tuyển dụng |
| Ngành học | `major == Computer Science` | Vị trí đòi hỏi đúng chuyên ngành |

Mỗi mệnh đề là một **phép so sánh có kết quả đúng/sai**, không phải một
trường dữ liệu được bóc ra.

Sinh viên có thể kết hợp nhiều mệnh đề trong cùng một bằng chứng — ví dụ
"đang là sinh viên **và** GPA ≥ 3.5" — mà vẫn không tiết lộ giá trị nào.

---

## 6. Mô hình riêng tư

| Dữ liệu | Riêng tư | Công khai |
|---|---|---|
| GPA chính xác | ✅ | |
| Mã số sinh viên | ✅ | |
| Họ tên | ✅ | |
| Bảng điểm chi tiết | ✅ | |
| Năm học chính xác | ✅ | |
| Mệnh đề đã chọn (vd: `gpa >= 3.5`) | | ✅ |
| Kết quả đúng/sai của mệnh đề | | ✅ |
| Tên đơn vị cấp phát | | ✅ |
| Hiệu lực credential | | ✅ |

**Nguyên tắc:** bên xác minh chỉ nhận đúng những mệnh đề sinh viên chủ động
chọn. Mệnh đề không được chọn thì bên xác minh **không biết là nó tồn tại**.

### Tính trung thực

Bằng chứng phản ánh trung thực cả trường hợp **không đạt**. Nếu GPA là 2.91
và mệnh đề là `gpa >= 3.5`, bên xác minh thấy "không thoả mãn" — nhưng vẫn
không biết con số 2.91. Sinh viên không thể tạo bằng chứng sai sự thật.

---

## 7. Giá trị mang lại

**Sinh viên** — kiểm soát dữ liệu ở mức từng mệnh đề; ứng tuyển nhiều nơi mà
không phát tán bảng điểm; đường link chia sẻ được ngay.

**Bên xác minh** — có kết quả tức thì thay vì chờ nhà trường phản hồi; giảm
lượng dữ liệu nhạy cảm phải lưu trữ và bảo vệ; không cần tích hợp hệ thống.

**Nhà trường** — giảm tải xác minh thủ công; nâng vị thế thành đơn vị cấp
phát credential đáng tin cậy.

---

## 8. Tình huống áp dụng

| Tình huống | Mệnh đề cần chứng minh |
|---|---|
| Đăng ký học bổng | đang học · GPA ≥ 3.5 |
| Ưu đãi sinh viên | đang là sinh viên |
| Ứng tuyển thực tập | năm học ≥ 3 · ngành = CNTT |
| Nộp hồ sơ cao học | bậc học = Cử nhân · GPA ≥ 3.0 |
| Chương trình trao đổi | đang học · năm học ≥ 2 |
| Xác minh bằng cấp khi tuyển dụng | bậc học = Cử nhân · ngành |

---

## 9. Phạm vi hiện tại

**Đã có — và là thật, không phải mô phỏng:**

- Đầy đủ luồng 3 vai trò, 5 loại mệnh đề, link xác minh chia sẻ được, dữ liệu
  10 sinh viên gồm cả tình huống đạt và không đạt.
- **Mạch zero-knowledge chạy thật.** Một circuit Compact duy nhất nhận mệnh đề
  làm tham số. Kết quả mỗi mệnh đề là phán quyết của circuit, không phải của
  code JavaScript.
- **Nhà trường ký thật**, hai lần trên cùng một sự thật: Ed25519 trên JSON
  chuẩn hoá cho bên tích hợp thông thường, và JubJub Schnorr trên vector 16
  trường cho circuit.
- **Ràng buộc chủ sở hữu.** Circuit từ chối trả lời nếu người gọi không biết bí
  mật đứng sau subject commitment — credential rò rỉ không dùng được cho người khác.

**Chưa có:** lưu trữ bằng chứng phía máy chủ (link chỉ mở được trên thiết bị đã
tạo) · xác thực nhân viên phòng đào tạo · thu hồi credential · nhiều trường.

Ranh giới giữa cái gì thật và cái gì chưa: xem [README.md](README.md).

---

## 10. Hướng phát triển

**Wave 2.** Đọc danh bạ nhà trường từ chain thay vì từ file · lưu bằng chứng
phía máy chủ để chia sẻ liên thiết bị · kết nối ví Lace · **Proof Request**:
bên xác minh hỏi, sinh viên duyệt.

**Wave 3.** Cổng tích hợp cho các trường dựa trên schema v1 · thu hồi
credential · tiết lộ chọn lọc trên nhiều nguồn cấp cùng lúc.

---

## 11. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Credential** | Hồ sơ học tập đã được nhà trường ký, xác nhận tính xác thực |
| **Claim / Mệnh đề** | Một phát biểu có thể kiểm chứng, vd: `gpa >= 3.5` |
| **Proof / Bằng chứng** | Kết quả các mệnh đề, chia sẻ được, không chứa dữ liệu gốc |
| **Issuer / Bên cấp phát** | Nhà trường — đơn vị ký credential |
| **Verifier / Bên xác minh** | Bên nhận và kiểm tra bằng chứng |
| **Selective disclosure** | Chỉ tiết lộ đúng phần thông tin đã chọn |
