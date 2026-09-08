# 15 — Đưa gọi smart contract thật vào Wave 1

**Trạng thái: kế hoạch, chưa thực thi.** File này chỉ mô tả việc cần làm và
thứ tự làm. Không bước nào ở đây đã được chạy — mọi thao tác chạm ví, DUST,
hay gửi transaction thật sẽ hỏi xác nhận riêng, từng lần, đúng luật ở
[10-wave-1-plan.md](10-wave-1-plan.md) và `CLAUDE.md`.

---

## 1. Quyết định

Chuyển **W2.1b — gửi proof như transaction thật** từ Wave 2
([40-wave-2-features.md](40-wave-2-features.md), [50-wave-2-plan.md](50-wave-2-plan.md))
sang **Wave 1**.

Lý do đổi: phần code cho việc này **đã viết xong** trên nhánh
`feature/smartcontract` (xem [51-w2-1b-implementation-plan.md](51-w2-1b-implementation-plan.md)),
sớm hơn lịch gốc. Giữ nó "code xong nhưng dán nhãn Wave 2 chưa dùng" bỏ phí một
minh chứng mạnh cho rubric Engineering (40%) — câu hỏi giám khảo dễ hỏi nhất là
*"contract có thật sự được dùng hay chỉ đứng đó?"*, và `proofsVerified` mãi
mãi = 0 hiện là câu trả lời yếu nhất của bài nộp.

**Việc không đổi:** phạm vi kỹ thuật của Wave 2 nói chung
(W2.1 ownership-ví, W2.2–W2.7) **không di chuyển**. Chỉ riêng W2.1b lên Wave 1.
W2.1 (ký challenge chứng minh sở hữu ví) vẫn ở Wave 2 — hai việc độc lập, đã
ghi rõ trong `40-wave-2-features.md`.

---

## 2. Trạng thái code thật — đã kiểm tra lại hôm nay (2026-09-05)

Đã đọc lại `docs/51-w2-1b-implementation-plan.md` và đối chiếu trực tiếp với
code trên nhánh hiện tại (`feature/smartcontract`):

| Thành phần | File | Có thật trong code? |
|---|---|---|
| Adapter ví Lace ↔ `midnight-js-contracts` | `lib/midnight/lace-provider.ts` | ✅ |
| 3 provider chạy trong browser | `lib/midnight/browser-providers.ts`, `browser-zk-config.ts`, `browser-private-state.ts` | ✅ |
| Route phục vụ circuit assets qua HTTP | `app/api/circuit-assets/[...path]/route.ts` | ✅ |
| `callArgs()` trên `ProvingSession` | `lib/midnight/prover.ts` | ✅ |
| `publishProof()` | `lib/proof/midnight-provider.ts` | ✅ |
| UI "Publish on chain" theo từng claim | `app/student/proof/[proofId]/page.tsx` | ✅ |
| Map lỗi Custom error 170/173/174 | cùng file trên | ✅ |

Cổng chất lượng chạy lại hôm nay:

```
npm test                  262/262 pass
npm run check:boundaries  4/4 xanh
```

**Chưa làm — đúng như docs/51 mục 4 đã ghi:**

- Chưa test thật trên preprod với ví Lace có DUST. Lần kiểm tra gần nhất
  (Playwright, 2026-09-01) chỉ xác nhận: không có extension Lace → báo lỗi rõ
  ràng "No Midnight wallet extension found", không crash. Đây **không phải**
  bằng chứng transaction thật chạy được.
- Chưa có test tự động cho `publishProof()` end-to-end (lý do đã ghi trong
  docs/51: phần cốt lõi cần ví thật + DUST thật, không mock có ý nghĩa được).
- `proofsVerified` trên contract đã deploy vẫn đang đo là **0** — đây chính là
  con số việc này cần thay đổi để chứng minh xong.

Kết luận: **không cần viết code mới** để "đưa việc này vào Wave 1" — việc cần
làm là **chạy thử thật** và **cập nhật tài liệu** để công nhận nó là một phần
của Wave 1, không phải Wave 2 nữa.

---

## 3. Việc cần làm, theo thứ tự

### Bước A — Chuẩn bị (không chạm chain)

- [ ] Review lại code `publishProof()`, `lace-provider.ts`, ba browser
      provider — đọc lại một lượt xem có gì lệch so với mô tả trong docs/51
      sau các commit gần đây (logo, school-api, wallet.ts đổi 111 dòng).
- [ ] Xác nhận ví issuer đã đăng ký (dùng lại theo quyết định đã chốt trong
      docs/51) hiện còn DUST đã sync đủ hay không — đọc qua
      `npm run contract:verify`, không cần gửi transaction.

### Bước B — Test thật trên preprod ⚠️ chạm chain, cần hỏi xác nhận riêng

- [ ] Kết nối ví Lace thật (extension), có DUST đã đăng ký sinh.
- [ ] Bấm "Publish on chain" cho một claim thật trên UI, theo dõi:
  - Transaction có lên explorer không.
  - `proofsVerified` tăng đúng 1 sau một lần gửi thành công.
  - `proofsVerified` **không** tăng khi circuit từ chối (`FailFallible`
    không được tính là verified).
- [ ] Cố ý test một path lỗi đã biết (ví dụ ví chưa sync đủ DUST) để xác nhận
      map lỗi 170/173 hiển thị đúng thông báo, không phải message thô.
- [ ] Ghi lại số liệu đo được (transaction hash, link explorer, giá trị
      `proofsVerified` trước/sau) — theo đúng khuôn mẫu
      [13-acceptance.md](13-acceptance.md).

**Đây là bước duy nhất chạm ví/DUST/transaction thật. Sẽ hỏi xác nhận ngay
trước khi chạy, không tự tiến hành.**

### Bước C — Cập nhật tài liệu (sau khi Bước B xanh)

- [ ] `10-wave-1-plan.md` — thêm dòng "gọi contract qua transaction thật" vào
      bảng "Đã xong", cập nhật `proofsVerified` từ 0 sang số đo được.
- [ ] `11-wave-1-features.md` — mục "Chưa có ở Wave 1" hiện ghi *"Proof không
      tự nộp lên chain... Gửi proof như transaction thật cũng là Wave 2, mục
      W2.1b"* — xoá hoặc sửa lại dòng này, vì nó sẽ sai sau Bước B.
- [ ] `13-acceptance.md` — thêm một mục nghiệm thu mới cho luồng publish,
      cùng khuôn với luồng Bob/Alice đã có.
- [ ] `40-wave-2-features.md` — xoá mục W2.1b khỏi phạm vi Wave 2, ghi chú
      "đã chuyển sang Wave 1, xem 15-wave-1-smartcontract-call.md".
- [ ] `50-wave-2-plan.md` — Wave 2 giờ chỉ còn **W2.1** (ownership-ví). Cập
      nhật lịch 3 tuần cho phù hợp — bớt hẳn phần rủi ro adapter Lace (đã gỡ
      xong ở Wave 1), tuần 1 không còn cần "khảo sát rủi ro W2.1b".
- [ ] `README.md` (gốc) — thêm dòng nói rõ contract được gọi qua transaction
      thật từ phía sinh viên, không chỉ đọc chain.
- [ ] `docs/README.md` — không cần sửa cấu trúc số, chỉ thêm dòng trỏ tới file
      này trong bảng "1x — Wave 1".

### Bước D — Cổng chất lượng cuối

```bash
npm test && npm run check:boundaries && npm run build && npx tsc --noEmit
```

Phải xanh cả bốn trước khi coi việc này là xong.

---

## 4. Rủi ro cần lường trước

- **DUST sync lại từ đầu.** Nếu ví issuer đã lâu không dùng, có thể phải chờ
  sync lại — xem bẫy #2, #6, #7 trong [22-lessons.md](22-lessons.md). Không
  đặt lịch chặt cho Bước B vì lý do này.
- **Adapter Lace chưa có tiền lệ chính thức** (ghi rõ trong docs/51 §2b) —
  code đã tự viết 3 provider thay thế, đã qua build/bundle, nhưng **chưa qua
  một transaction thật nào**. Có khả năng lộ lỗi mới giống mẫu hình
  "load được, chỉ vỡ lúc submit" đã lặp lại nhiều lần trong dự án.
- **Circuit không đổi** — Bước B không cần build lại hay deploy lại contract.
  Nếu Bước B lộ ra cần sửa circuit thì đó là thay đổi phạm vi mới, phải hỏi
  lại trước khi tiếp tục.

---

## 5. Việc rõ ràng KHÔNG làm trong lần này

- Không động vào W2.1 (ownership-ví qua signData challenge) — vẫn ở Wave 2.
- Không động vào W2.2–W2.7.
- Không tự ý deploy lại hay đăng ký lại issuer — ví và contract hiện tại
  (đã deploy, đã đăng ký) dùng nguyên, không tạo mới.
