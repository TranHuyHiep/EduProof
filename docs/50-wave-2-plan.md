# Wave 2 — Kế hoạch thực thi

**27/09 → 17/10/2026 · 3 tuần · 2 người (Bách, Hiệp)**

File này trả lời: làm gì trước, ai làm, xong khi nào biết. Mục tiêu và lý do
kỹ thuật đầy đủ đã có ở [40-wave-2-features.md](40-wave-2-features.md) —
không lặp lại ở đây.

**Phạm vi đã chốt:** chỉ **W2.1** (xác thực quyền sở hữu ví) và **W2.1b**
(gửi proof như transaction thật). Không đụng W2.2–W2.7 trong Wave 2 này —
để dành, đúng chiến lược "tiến bộ từng Wave" thể lệ đòi hỏi. Nếu còn dư thời
gian ở tuần 3, ứng viên dự phòng duy nhất là **W2.7** (`ChainProofStore`),
vì nó nhỏ và không phụ thuộc gì vào hai mục chính.

---

## Vì sao đúng hai mục này, không phải mục khác

- Cả hai đụng trực tiếp vào chỗ rubric Engineering (40%) hay hỏi nhất:
  *"ví có thật sự chứng minh được quyền sở hữu không?"* và *"contract có
  thật sự được dùng, hay chỉ đứng đó?"*
- W2.4 (Proof Request) kéo theo W2.5 (chống replay) và một phần W2.1 —
  gộp ba việc thành một luồng lớn, rủi ro trễ cao hơn nhiều so với lợi ích
  thêm được trong 3 tuần.
- W2.1b có rủi ro kỹ thuật cao nhất đã ghi trong docs (adapter Lace ↔
  `midnight-js-contracts` chưa có tiền lệ) — bắt buộc phải nằm trong phạm vi
  đã chốt, không phải việc "làm thêm nếu rảnh", vì đây là chỗ dễ vỡ nhất và
  cần nhiều thời gian debug nhất.

---

## Tuần 1 (27/09 – 03/10): khảo sát rủi ro, không code tính năng

Việc quan trọng nhất tuần này là **xác nhận W2.1b khả thi trước khi cam kết
lịch trình còn lại**. Nếu adapter Lace ↔ `midnight-js-contracts` không làm
được trong thời gian hợp lý, cả kế hoạch 3 tuần phải điều chỉnh ngay từ đầu,
không phải ở tuần 3.

| # | Việc | Ai | Ra được gì |
|---|---|---|---|
| 1 | Đọc `example-bboard` và mọi ví dụ Midnight chính thức khác xem đã có ai nối ví injected (Lace) với `midnight-js-contracts`'s `callTx` chưa | Hiệp | Có/không có tiền lệ — quyết định hướng đi |
| 2 | Nếu có tiền lệ: chép lại pattern, note khác biệt với repo này | Hiệp | Bản nháp adapter |
| 3 | Nếu không có tiền lệ: dựng thử nghiệm nhỏ nhất có thể — gọi `balanceSealedTransaction` từ Lace thật, xem kiểu dữ liệu trả về khớp `FinalizedTransaction` tới đâu | Hiệp | Biết chính xác cần convert gì |
| 4 | Song song: bắt đầu `signData` challenge cho W2.1 — không phụ thuộc kết quả việc 1-3 | Bách | Circuit + witness cho ownership challenge |
| 5 | Cuối tuần: quyết định go/no-go cho W2.1b bản đầy đủ, hoặc chuyển sang phương án dự phòng (service Node.js nội bộ submit hộ — đã ghi trong docs như phương án B) | Cả hai | Quyết định ghi vào docs, không giữ trong đầu |

**Cổng ra khỏi tuần 1:** biết rõ W2.1b đi theo đường nào (adapter trình
duyệt thật, hay service trung gian) — không bắt đầu tuần 2 khi còn mơ hồ
điểm này.

---

## Tuần 2 (04/10 – 10/10): code chính

### W2.1 — Xác thực quyền sở hữu ví (Bách)

1. Circuit: witness mới cho việc kiểm tra chữ ký ví trên challenge (không
   phải `studentSecretKey()` hiện có — đó là ownership *credential*, đây là
   ownership *ví*, hai lớp riêng theo đúng phân biệt đã ghi trong
   `40-wave-2-features.md` mục W2.1b)
2. `lib/wallet.ts`: thêm hàm ký challenge qua `WalletConnectedAPI.signData()`
   (đã có sẵn trong `dapp-connector-api`, xem preview đã đọc lúc lập kế
   hoạch W2.1b)
3. Ràng buộc credential vào địa chỉ ví thay vì chỉ thiết bị — sửa
   `lib/session.ts` để lưu theo ví, không phải chỉ localStorage đơn thuần
4. Test: credential ký ở ví A không dùng được khi kết nối ví B

### W2.1b — Gửi proof như transaction thật (Hiệp)

Theo hướng đã chốt ở cổng ra tuần 1. Việc cụ thể đã liệt kê đủ trong
`40-wave-2-features.md` mục "Việc cần làm" — không lặp lại ở đây, chỉ thêm
mốc thời gian:

- Ngày 1-3: dựng đường gọi `callTx.proveCredentialPredicate` qua ví thật
  (hoặc qua service trung gian nếu tuần 1 kết luận vậy)
- Ngày 4-5: UI xác nhận trước khi gửi + trạng thái "đang chờ block"
- Ngày 6-7: xử lý lỗi (Custom error 170 và họ hàng của nó — xem
  `22-lessons.md` mục 6), giữ Simulator làm preview miễn phí

**Rủi ro đã biết trước:** nếu adapter vỡ giữa tuần 2, không có thời gian
tuần 3 để làm cả W2.1. Vì vậy W2.1b đứng riêng ở Hiệp, W2.1 đứng riêng ở
Bách — hỏng một cái không kéo cái kia theo.

---

## Tuần 3 (11/10 – 17/10): tích hợp, test, đóng gói

| # | Việc | Ai |
|---|---|---|
| 1 | Nối W2.1 (ownership) và W2.1b (transaction) vào cùng luồng UI thật | Cả hai |
| 2 | `npm test && npm run check:boundaries && npm run build` — không có ngoại lệ | Cả hai |
| 3 | Nếu còn dư ≥ 2 ngày: W2.7 (`ChainProofStore`) — việc dự phòng duy nhất | Người rảnh trước |
| 4 | Cập nhật `docs/40-wave-2-features.md` — đánh dấu xong, ghi số liệu đo được (giống mẫu `13-acceptance.md` của Wave 1) | Người viết docs |
| 5 | Slide + video cập nhật, nêu rõ "đã thay đổi gì so với Wave 1" — thể lệ bắt buộc | Chủ dự án |
| 6 | Deploy lại contract nếu circuit đổi (W2.1 witness mới) — **hỏi trước, một lần, đúng luật `10-wave-1-plan.md`** | Hiệp |

**Không bắt đầu việc #3 (W2.7) nếu việc #1-2 chưa xanh.** Đây là cám dỗ hay
gặp nhất — code thêm tính năng dự phòng trong khi luồng chính chưa tích hợp
xong.

---

## Tín hiệu cảnh báo sớm — dừng lại và báo ngay nếu gặp

- Hết tuần 1 mà chưa xác nhận được adapter Lace khả thi hay không → cả kế
  hoạch cần đàm phán lại phạm vi trước khi đi tiếp, không âm thầm kéo dài.
- `Custom error 170` (dust spend proof) xuất hiện ở transaction sinh viên
  gửi — đây là bẫy đã tốn nhiều giờ ở Wave 1 khi deploy, có khả năng lặp
  lại ở phía sinh viên. Đừng đoán, tra thẳng `22-lessons.md` mục 6.
- Circuit đổi (thêm witness cho W2.1) → bắt buộc build lại + deploy lại,
  tốn một lần chờ ví sync như Wave 1. Tính vào lịch, đừng để dồn cuối tuần 3.

---

## Việc rõ ràng KHÔNG làm trong Wave 2 này

Ghi thẳng ra để không ai vô tình động vào giữa chừng:

- W2.2 (revocation), W2.3 (claim logic OR/range), W2.4 (Proof Request),
  W2.5 (chống replay đầy đủ — chỉ phần tối thiểu W2.1b cần thì làm),
  W2.6 (nhiều issuer)
- Tất cả các mục trên đã có mô tả sẵn ở `40-wave-2-features.md`, sẵn sàng
  cho Wave 3 hoặc Wave 2 nếu phạm vi được mở lại giữa chừng — nhưng đó là
  quyết định phải hỏi lại chủ dự án, không tự suy diễn từ kế hoạch này.
