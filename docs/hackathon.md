# 01 — Midnight Buildathon: thông tin cuộc thi

Nguồn: trang chương trình trên AKINDO. Bản ràng buộc pháp lý là **Official Rules PDF**;
file này chỉ là bản tóm tắt phục vụ lập kế hoạch.

---

## 1. Bản chất chương trình

Không phải hackathon một phát ăn ngay. Đây là chương trình **3 Wave nối tiếp nhau** trong 3 tháng,
chấm theo **tiến độ và sự cải tiến qua từng Wave**. Cùng một dự án được nộp lại nhiều Wave,
miễn là mỗi lần nộp chứng minh được **tiến bộ mới có thực** trong Wave đó.

> Hệ quả cho ta: **không dồn hết tính năng vào Wave 1**. Cố tình để dành phần
> "thịt" cho Wave 2 và Wave 3 là đúng luật chơi và có lợi về điểm.

---

## 2. Lịch và tiền thưởng

| Wave | Build | Chấm | Quỹ grant |
|---|---|---|---|
| Wave 1 | 27/08/2026 – 16/09/2026 | 16/09 – 27/09/2026 | US$3,500 |
| Wave 2 | 27/09/2026 – 17/10/2026 | 17/10 – 27/10/2026 | US$4,000 |
| Wave 3 | 27/10/2026 – 16/11/2026 | 16/11 – 27/11/2026 | US$5,000 |

- Hôm nay **28/08/2026** → **còn ~19 ngày** tới hạn Wave 1 (16/09/2026).
- Chỉ bản nộp **trước deadline** mới được tính cho Wave đó.
- Grant chia **theo tỷ lệ điểm** giữa các bài hợp lệ, không phải winner-takes-all.
  → Bài hợp lệ, điểm khá cũng có tiền. **Ưu tiên số một là không bị loại.**

---

## 3. ⛔ Technical Gate — điều kiện loại trực tiếp

Bài nộp **bị loại thẳng, không được chấm** nếu thiếu bất kỳ điều nào:

- [x] Có **ít nhất 1 Compact contract compile thành công** — `contracts/src/eduproof.compact`
- [x] Có **chức năng liên quan Midnight thực sự có ý nghĩa** — circuit quyết định kết quả mệnh đề, không phải trang trí
- [x] **Không** là bản fork/copy/sửa hời hợt
- [ ] Repo GitHub **public** và gắn **topic `midnightntwrk`** ← **việc của chủ dự án**
- [ ] Có **slide deck** ← **việc của chủ dự án**
- [ ] Có **demo video / video pitch** ← **việc của chủ dự án**
- [x] Code liên quan Midnight ở **Apache License 2.0** — `LICENSE` + `package.json`

Ba ô còn trống ở trên là toàn bộ thứ đang chặn bài nộp. Xem
[wave-1-plan.md](wave-1-plan.md).

> Cửa kỹ thuật là lý do phần Midnight không được phép cắt: một UI đẹp long lanh
> mà không có Compact contract = 0 điểm.

---

## 4. Rubric chấm điểm

| Tiêu chí | Trọng số | Họ tìm gì | Ta đáp ứng ở đâu |
|---|---|---|---|
| **Engineering & Implementation** | **40%** | Compact contract compile được; có **quản lý private state**; hiểu **mô hình dual-ledger** của Midnight; repo tổ chức tốt; README rõ; gắn topic; ghi nhận hệ sinh thái | Phase 2 |
| **Quality Assurance & Reliability** | **15%** | Có **file simulation/test**; test **pass**; sản phẩm chạy ổn định ở thao tác cơ bản | Phase 1 (test logic claim) + Phase 2 (test circuit) |
| **Product & Vision** | **15%** | Ý tưởng mạnh; gắn với năng lực lõi của Midnight; scope và roadmap **thực tế** | `../business.md` + `08-wave2-wave3.md` |
| **User Experience & Design** | **15%** | Frontend trực quan, hoạt động đúng kỳ vọng, **nối được với contract** thành luồng end-to-end | Phase 1 + Phase 2 |
| **Communication** | **10%** | Video và slide rõ ràng, có cấu trúc | Cuối Wave 1 |
| **Business Development & Viability** | **5%** | Hiểu đối tượng người dùng, tiềm năng thị trường, lộ trình tiếp cận | `business.md` (đã có) |

### Đọc rubric ra hành động

- **40% nằm ở engineering** → phần Compact contract là phần đáng đầu tư nhất.
  Cụ thể ba từ khoá phải thể hiện được: **compile**, **private state**, **dual-ledger**.
- **15% QA nhưng gần như free** → chỉ cần có thư mục `tests/` chạy pass. Nhiều đội bỏ qua.
  **Không được bỏ.** Đây là điểm rẻ nhất trong rubric.
- **UX 15% có điều kiện "connects to the contract"** → UI mock đẹp mà không nối contract
  chỉ ăn được một phần. Phase 2 phải nối thật.
- **Communication 10%** → slide + video là **deliverable bắt buộc**, phải chừa thời gian,
  không phải việc làm nốt lúc 3h sáng deadline.

---

## 5. Yêu cầu bài nộp (checklist nộp Wave 1)

- [ ] Link repo GitHub public
- [ ] README rõ: dự án là gì, cách setup, kiến trúc, **tích hợp Midnight**, cách giám khảo test
- [ ] Slide deck (pitch)
- [ ] Demo / video pitch
- [ ] Mô tả tiến độ đã làm trong Wave này
- [ ] (Từ Wave 2 trở đi) Nêu rõ **đã thay đổi gì so với Wave trước**
- [ ] Topic `midnightntwrk` trên repo
- [ ] LICENSE Apache 2.0 (✅ repo đã có `LICENSE`)

---

## 6. Ràng buộc khác

- Đội tối đa **5 người**, mỗi người tự đăng ký trên AKINDO.
- ≥18 tuổi; loại trừ các quốc gia bị cấm vận (xem Official Rules).
- Được dùng thư viện/codebase có sẵn, nhưng **phần Midnight phải là mới hoặc mở rộng đáng kể
  trong Wave đó**.
- Có thể bị mời **present/interview trực tiếp** → nên chuẩn bị sẵn khả năng demo live.

---

## 7. Midnight Build Club

Đội được giám khảo chọn sẽ vào **Midnight Build Club** — 8 tuần đào tạo part-time,
cuối chương trình được pitch cho nhà đầu tư và có cơ hội vào Midnight Accelerator.
Đây là phần thưởng đáng giá hơn tiền grant. → Thêm một lý do để đầu tư vào
**Product & Vision** và **Business Viability**, không chỉ code.

---

## 8. Ràng buộc riêng của chủ dự án (không phải từ BTC)

Ghi ở đây vì chúng có hiệu lực ngang thể lệ đối với dự án này:

1. **1 repo duy nhất** chứa FE, BE và phần tương tác blockchain.
2. **Không dùng DB ngoài.** Dữ liệu ở file JSON, local storage, hoặc query on-chain.
3. **Sẽ deploy Vercel free tier** → không được ăn nhiều RAM/CPU:
   - không process nền chạy dài
   - không tính toán nặng ở server-side render
   - build phải nhẹ
   - cẩn thận với thư viện Midnight WASM ở phía server (xem `deployment.md`)
4. **Không tự ý deploy hay đụng vào thứ ngoài phạm vi project** — hỏi chủ dự án trước, mỗi lần.
