# 10 — Câu hỏi còn treo

Cần chủ dự án quyết. Ghi câu trả lời thẳng vào file này khi đã chốt.

---

## 🔴 Q1 — Có làm "Proof Request" (đề xuất G1) ở Phase 1 không?

Xem `05-phase1-mock-ui.md` khối G1.

Verifier tạo yêu cầu (`cần: status is active AND gpa >= 3.0`) → ra một link →
sinh viên mở, thấy chính xác điều được hỏi, đồng ý hoặc từ chối → sinh proof đúng yêu cầu.

- **Ủng hộ:** đây là luồng thật ngoài đời (giống màn hình consent của OAuth); thể hiện
  selective disclosure rõ hơn hẳn; ăn điểm UX và Product/Vision; **không cần blockchain**
- **Phản đối:** thêm ~1–1.5 ngày; thêm 2 route; có thể để dành cho Wave 2

**Khuyến nghị: LÀM.** Đây là thứ nâng dự án từ "demo ZK" lên "sản phẩm có thật".

**✅ Trả lời (28/08): CÓ LÀM.**
→ Nâng lên **P0**, thành khối riêng `G1` trong `05-phase1-mock-ui.md`.

**🔄 ĐỔI LẠI (29/08): KHÔNG làm ở Wave 1 — chuyển sang Wave 2.**

> "Proof Request là verifier gửi request và student chỉ approve đúng không,
> cái này chuyển sang wave 2 nhé"

Lý do: tính năng chỉ trọn vẹn khi **request được ký** và **danh tính verifier
được xác minh** — cả hai đều là việc của Wave 2. Bản Wave 1 chưa ký sẽ phải dán
badge cảnh báo khắp nơi mà vẫn nửa vời.
→ Thiết kế chuyển nguyên sang `08-wave2-wave3.md` **W2.4**.
→ Thời gian tiết kiệm dồn cho Phase 2 (40%, cửa tử) và test (15%).

---

## 🔴 Q2 — Bỏ hẳn `mock-school-api/server.mjs` hay giữ song song?

Xem `05-phase1-mock-ui.md` khối E.

Phải có Next.js API route để deploy Vercel. Còn server rời cổng 4000 thì sao?

- **A. Xoá hẳn** — đơn giản, một process
- **B. Giữ, đánh dấu chỉ dùng local** — thể hiện đúng ranh giới "trường là hệ thống riêng biệt",
  demo được kịch bản trường thật sự tách rời
- **C. Giữ nhưng chuyển vào `examples/`**

**Khuyến nghị: B.** Việc trường là một hệ thống độc lập là **điểm kiến trúc đúng**,
và đáng để giám khảo nhìn thấy. Chỉ cần mặc định dùng API route.

**✅ Trả lời (28/08): GIỮ, và đi xa hơn lựa chọn B.**

> "School sẽ là vendor độc lập, có hệ thống riêng của họ. Ở dự án này tao build mock school
> expose GraphQL cho student query. Sau này các school khác sử dụng hệ thống cũng sẽ cần
> expose GraphQL và schema."

Nghĩa là school API **không phải mock cho tiện** — nó là **đặc tả tích hợp công khai**.
→ Toàn bộ nội dung chuyển sang file riêng: **`11-school-vendor-contract.md`**.
→ Khối E trong Phase 1 **đã viết lại**: không gộp vào Next.js, mà nâng thành GraphQL thật.
→ Phát sinh 4 lỗi phải sửa (P1–P4) và 1 câu hỏi mới (**Q11**).

---

## ✅ Q3 — Bản Vercel chạy chế độ nào? — **ĐÃ XONG (29/08)**

> **Kết quả kiểm chứng: proof server ngoài DÙNG ĐƯỢC, CORS mở hoàn toàn.**
> Không cần proxy → không có nguy cơ phá vỡ lời hứa riêng tư. Chi tiết số liệu
> ở `06-phase2-midnight.md` §5.1.
>
> **Đã cài theo phương án C**: `NEXT_PUBLIC_PROOF_PROVIDER` chọn `mock` (mặc
> định) hoặc `midnight`. Vào là dùng được ngay, ai muốn ZK thật thì bật cờ.
> Banner trên đầu trang tự đổi chữ theo chế độ đang chạy, nên không nói quá.
>
> Đánh đổi tin cậy (proof server **nhìn thấy witness**) đã ghi rõ trong README
> mục "The trust boundary we did not paper over" và trong `DEPLOYMENT.md`.

<details><summary>Bối cảnh và các phương án đã cân nhắc</summary>


Xem `06-phase2-midnight.md` §5.

Proof server không chạy được trên Vercel. Vậy bản public trên Vercel:

- **A. Chỉ chế độ mock** — ai cũng vào thử ngay được, nhưng không phải ZK thật
- **B. Chế độ Midnight, yêu cầu người xem tự chạy proof server local** — thật, nhưng
  giám khảo phải setup
- **C. Cả hai, có công tắc chuyển trong UI** ⭐

**Khuyến nghị: C.** Vào là dùng được ngay (mock), ai muốn xác minh thật thì bật
chế độ Midnight kèm hướng dẫn. Đáp ứng cả tiêu chí "trực quan" lẫn "nối được với contract".

**✅ Trả lời (28/08): Dùng proof server của bên ngoài.**

> "Có thể dùng proof server của bên khác, ví dụ https://proof-server.preprod.midnight.network.
> Nếu vẫn không được mới báo lại tao để chạy proof server local."

→ Chi tiết ở `06-phase2-midnight.md` §5.1–5.2.
→ Nếu chạy được: bản Vercel chạy **ZK thật**, giám khảo không cần cài gì. Thắng lớn.
→ **Phải kiểm chứng ngay đầu Phase 2**, trước khi viết provider. Bốn thứ cần xác nhận:
  endpoint sống, **CORS**, khớp phiên bản compiler `0.34.0`/runtime `0.19.0`, độ trễ.
→ Rủi ro lớn nhất là **CORS**. Nếu bị chặn, hướng proxy qua Next.js **có thể phá vỡ
  lời hứa riêng tư** (proxy sẽ nhìn thấy witness). Nếu rơi vào tình huống đó, tao sẽ
  báo lại chứ không tự ý làm.
→ Lưu ý cần nói rõ trong README/slide: proof server **nhìn thấy witness**, nên dùng
  server bên thứ ba là một **đánh đổi tin cậy**. Trình bày đúng thì đây là điểm cộng.

</details>

---

## 🟠 Q4 — Bao nhiêu trường trong dữ liệu demo?

Hiện có **1** (`hanoi-university`), 10 sinh viên.

Thêm 2–3 trường sẽ làm nổi bật vế "issuer nào ký?" và chuẩn bị cho multi-issuer ở Wave 2.
Chi phí gần như bằng 0 (chỉ là JSON).

**Khuyến nghị: thêm 2 trường nữa.**

**Trả lời:**

---

## 🟠 Q5 — Có làm dark mode không?

Tailwind 4 làm việc này khá rẻ. Nhưng là chi phí kiểm thử tăng gấp đôi cho mọi màn hình.

**Khuyến nghị: KHÔNG ở Wave 1.** Ưu tiên một chế độ sáng thật chỉn chu.

**Trả lời:**

---

## 🟠 Q6 — Đội gồm những ai?

Thể lệ cho tối đa 5 người, **mỗi người phải tự đăng ký trên AKINDO**.
Cần biết để ghi vào slide và phần thông tin đội.

**Trả lời:**

---

## 🟡 Q7 — Đã đăng ký AKINDO và vào Discord Midnight chưa?

- Đăng ký AKINDO: bắt buộc để nộp bài
- Discord chính thức: nơi hỗ trợ trực tiếp từ đội Midnight suốt chương trình,
  hữu ích khi Phase 2 gặp lỗi compiler
- Kickoff workshop: giải thích giám khảo tìm gì

**Trả lời:**

---

## 🟡 Q8 — Repo GitHub public đã có chưa?

Cần: public, topic `midnightntwrk`, LICENSE Apache 2.0 (✅ đã có file).
Hiện repo mới ở local, branch `feature/bach`.

**Trả lời:**

---

## 🟡 Q9 — Ai quay video demo và làm slide?

10% rubric. Cần chừa ít nhất 2 ngày. Ai làm, làm bằng gì?

**Trả lời:**

---

## 🔴 Q11 — Trường mẫu chạy ở đâu trên bản demo Vercel? *(phát sinh từ Q2)*

Xem `11-school-vendor-contract.md` §5.

School API là **vendor bên ngoài** nên **không nên** ở trên Vercel cùng app — đúng bản chất.
Nhưng bản demo phải trỏ tới một endpoint trường **đang chạy ở đâu đó**.

- **A. Deploy trường mẫu thành một Vercel project RIÊNG** ⭐
  Hai project, hai domain → ranh giới tổ chức hiện ra đúng như thật.
  Chi phí ~0 (free tier cho nhiều project).
- **B. Route `/api/school/graphql` trong cùng app**, ghi chú "đang đóng vai hệ thống ngoài"
  → một project, nhưng ranh giới bị mờ, mâu thuẫn với chính điều muốn chứng minh
- **C. Demo Vercel dùng credential nạp sẵn**; muốn thấy luồng trường đầy đủ thì chạy Docker local

**Khuyến nghị: A.** Giữ nguyên câu chuyện kiến trúc, và gần như miễn phí.
Còn cho phép chỉ vào hai URL khác nhau khi quay video — minh hoạ rất rõ.

**✅ Trả lời (28/08): CHỌN B** — route `/api/school/graphql` trong cùng app,
có ghi chú "đang đóng vai hệ thống ngoài".

Chủ dự án đã nhìn thấy điểm trừ (ranh giới bị mờ) và vẫn chọn B. Quyết định đã chốt.

→ Chi tiết triển khai ở `11-school-vendor-contract.md` §5.
→ Phát sinh: school API giờ sống ở **hai nơi** (process riêng + route Vercel).
  Phải tách lõi dùng chung để hai bản không lệch nhau — xem §5.2.
→ Phải bù lại chỗ "ranh giới mờ" bằng tài liệu và cách trình bày — xem §5.3.

---

## 🟠 Q12 — `lib/school/` viết bằng TypeScript hay ESM thuần? *(phát sinh từ Q11)*

Xem `11-school-vendor-contract.md` §7.1. Câu này **chặn E2**.

Lõi school dùng chung phải chạy được ở **cả** Node thuần (server rời, không bundler)
lẫn Next.js route.

- **A. TypeScript + `npm run school:build`** ⭐ — type safety ở chỗ quan trọng nhất
  (canonical hoá + ký), đổi lại mất tính "không build step" của server mẫu
- **B. ESM thuần `.mjs`** — không build step, nhưng mất type đúng chỗ sai một byte là hỏng chữ ký
- **C. TypeScript + `tsx` / `node --experimental-strip-types`** — được cả hai, phụ thuộc phiên bản Node

**Khuyến nghị: A** (hoặc C nếu Node đủ mới).

Có thể để tao tự quyết khi code nếu mày không có ý kiến riêng.

**✅ Trả lời (28/08): chủ dự án giao lại — đã chọn C.**

Node trên máy là **v22.23.1**, hỗ trợ `--experimental-strip-types`, nên server rời
chạy thẳng TypeScript: **được type safety mà không cần build step**.

Đánh đổi duy nhất: import nội bộ trong `lib/school/` phải ghi đuôi `.ts`
(Node ESM đòi hỏi), và tsconfig phải bật `allowImportingTsExtensions`.
Đã kiểm chứng chạy được ở cả hai vỏ.

---

## 🟡 Q10 — Server `75.119.138.128` có phải môi trường demo lâu dài không?

Hiện đang chạy `next dev` phơi ra Internet, không có bảo vệ.

- Nếu là môi trường demo lâu dài → nên chạy production build + reverse proxy
- Nếu chỉ để test tạm → nên tắt khi không dùng

**Trả lời:**
