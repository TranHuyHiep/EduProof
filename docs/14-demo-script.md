# 14 — Kịch bản demo (~60 giây)

Đọc trong khi thao tác trên UI, theo đúng thứ tự trang thật. Mỗi đoạn tính khoảng
8–10 giây khi đọc bình thường.

---

## 1. Trang chủ (5s)

**VI:** Edu Proof cho phép sinh viên chứng minh một sự thật về hồ sơ học tập —
như đang theo học, hay GPA đạt một ngưỡng — mà không tiết lộ toàn bộ bảng điểm.

**EN:** Edu Proof lets a student prove one fact about their academic record —
like being enrolled, or a GPA threshold — without disclosing the transcript
behind it.

---

## 2. Kết nối ví — `/student/login` (8s)

**VI:** Sinh viên bắt đầu bằng việc kết nối ví. Ví là danh tính duy nhất
EduProof biết đến — không tên, không email.

**EN:** The student starts by connecting a wallet. The wallet is the only
identity EduProof knows them by — no name, no email.

---

## 3. Chọn trường và lấy hồ sơ (8s)

**VI:** Tiếp theo, chọn đúng trường đang giữ hồ sơ của mình, rồi lấy về một
credential đã được trường ký — dữ liệu này chỉ nằm trên máy của sinh viên,
EduProof không hề lưu giữ.

**EN:** Next, the student picks the institution holding their record, and
collects a credential the school has signed — it lives only on their device;
EduProof never stores it.

---

## 4. Dựng mệnh đề — `/student/create-proof` (12s)

**VI:** Đây là phần cốt lõi: xây dựng một mệnh đề, không phải khai ra giá trị.
Ví dụ "GPA đạt tối thiểu 3.5" — sinh viên chọn từ các preset có sẵn như học
bổng, hay tự thêm mệnh đề riêng. Giao diện cho thấy rõ: bên xác minh sẽ thấy
gì, và điều gì luôn được giữ kín.

**EN:** This is the core of the product: building a statement, not disclosing
a value. For example "GPA is at least 3.5" — the student picks from presets
like a scholarship application, or adds a custom statement. The interface
shows exactly what the verifier will see, and what always stays private.

---

## 5. Sinh proof bằng circuit thật (10s)

**VI:** Khi bấm "Generate proof", một circuit zero-knowledge thật trên
Midnight sẽ chạy — kiểm tra chữ ký của trường, xác nhận sinh viên đúng là chủ
sở hữu credential, rồi đánh giá mệnh đề. Chỉ kết quả đúng/sai được xuất ra.

**EN:** Clicking "Generate proof" runs a real zero-knowledge circuit on
Midnight — it verifies the school's signature, confirms the student owns the
credential, then evaluates the statement. Only the true/false outcome comes
out.

---

## 6. Trang xác minh — `/verify/[proofId]` (12s)

**VI:** Đây là những gì bên xác minh nhìn thấy: một con dấu chứng thực,
mệnh đề đã được chứng minh, và danh sách rõ ràng những gì **không** bị tiết
lộ — GPA thật, tên, mã số sinh viên. Huy hiệu "Registered on chain" xác nhận
trường đã đăng ký thật trên hợp đồng thông minh Midnight, không phải lời tự
nhận của ứng dụng.

**EN:** This is what the verifier sees: a certificate seal, the statements
proven, and a clear list of what is **never** disclosed — the real GPA, name,
student ID. The "Registered on chain" badge confirms the institution is
genuinely registered on the Midnight smart contract — not something the app
claims about itself.

---

## 7. Kiểm tra độc lập — `/verify` (5s)

**VI:** Bất kỳ ai cũng có thể dán lại mã proof này để kiểm tra lại bất cứ lúc
nào — không cần tài khoản, không lưu gì lại.

**EN:** Anyone can paste this proof reference back in to check it again — no
account needed, nothing stored.

---

## Ghi chú khi quay

- Nhấn mạnh **ca thất bại** nếu có thời gian: một mệnh đề không đạt (vd GPA
  dưới ngưỡng) vẫn không tiết lộ giá trị thật — đây là điểm thuyết phục nhất
  của kiến trúc riêng tư.
- Contract đã deploy thật trên Midnight Preprod — nói rõ điều này khi lướt
  qua phần "On the preprod chain" ở cuối trang verify.
- Tổng thời lượng các đoạn trên: ~60 giây đọc liên tục. Cắt bớt mục 3 hoặc 7
  nếu cần rút ngắn.
