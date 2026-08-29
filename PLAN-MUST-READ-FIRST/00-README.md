# EduProof — Kế hoạch tổng thể (ĐỌC FILE NÀY TRƯỚC)

> Thư mục này là **nguồn sự thật duy nhất** về định hướng dự án.
> Bất kỳ agent/người nào tham gia code EduProof đều phải đọc hết thư mục này trước khi
> chạm vào một dòng code.

Cập nhật lần cuối: **2026-08-29**
Trạng thái hiện tại: **Wave 1 — Phase 1, 2, 3 đã xong phần code.
Còn lại là việc của chủ dự án.**

**Đã xong:**
- **Phase 1** — toàn bộ `12-ui-review.md`: claim động, verifier tra cứu,
  student xem proof, UI/UX production-ready
- **Phase 2** — ⛔ **Compact contract compile thành công** (cửa kỹ thuật ĐÃ QUA),
  40 test circuit đã mutation-test, `MidnightProofProvider` chạy circuit thật
- **Phase 3** — Dockerfile, docker-compose, `.env.example`, `vercel.json`,
  README viết lại, DEPLOYMENT.md

**Quyết định 29/08:** Proof Request (G1) **chuyển sang Wave 2** — xem `08-wave2-wave3.md` W2.4.

**Cổng kiểm tra — cả bốn đều pass:**
```
npm run build             13 route, KHÔNG warning, First Load JS 103 kB
npm test                  225 test / 11 file / ~0.7s
npm run check:boundaries  4/4 luật kiến trúc
npx tsc --noEmit          sạch
```

## ⛔ VIỆC CÒN LẠI TRƯỚC KHI NỘP — chủ dự án phải làm

| Việc | Vì sao |
|---|---|
| **Repo để public + gắn topic `midnightntwrk`** | **Thiếu là BỊ LOẠI THẲNG** |
| Chạy `docker build -t eduproof .` một lần rồi `docker image rm eduproof` | Docker daemon không chạy trên máy nên agent chưa kiểm chứng được. Compose config thì đã kiểm rồi |
| Slide deck | 10% rubric |
| Video demo 3–5 phút | cùng 10% đó |
| Commit | Toàn bộ đang nằm ở working tree |

**Có thể làm thêm nếu còn thời gian** (không bắt buộc, xem `06` §4 kế hoạch dự phòng):
deploy contract lên preview network → có `NEXT_PUBLIC_CONTRACT_ADDRESS`, đọc
issuer registry từ chain, nối ví Lace.

⚠️ **Môi trường đã đổi:** giờ làm trên máy Mac
(`/Users/trinhbach/Workspace/working/eduproof/EduProof`), không phải server Linux
`/root/eduproof`. Các lệnh vận hành ở `09-conventions.md` §4 viết cho Linux — dùng
`lsof -ti tcp:3000` thay cho `ss` khi cần kill theo cổng.

---

## Đọc theo thứ tự

| File | Nội dung | Đọc khi nào |
|---|---|---|
| `01-hackathon.md` | Thể lệ Midnight Buildathon, rubric chấm điểm, deadline, điều kiện loại trực tiếp | Trước khi quyết định scope bất kỳ Wave nào |
| `02-product.md` | EduProof là gì, 3 vai trò, mô hình riêng tư, business flow | Trước khi thiết kế tính năng |
| `03-architecture.md` | Kiến trúc, ranh giới module, quy tắc bất di bất dịch | Trước khi viết code |
| `04-current-state.md` | Repo hiện có gì, chạy thế nào, còn nợ gì | Khi bắt đầu một phiên làm việc mới |
| `05-phase1-mock-ui.md` | Kế hoạch chi tiết Phase 1 — **đã xong** | Tham khảo |
| `06-phase2-midnight.md` | Phase 2 — Compact contract — **đã xong phần bắt buộc** | Tham khảo; xem §5.1 kết quả kiểm chứng proof server |
| `07-phase3-deployment.md` | Phase 3 — Docker, env, hướng dẫn — **đã xong phần code** | Xem Definition of Done: còn slide/video/repo public |
| `08-wave2-wave3.md` | Định hướng Wave 2 và Wave 3 | Khi lập kế hoạch Wave sau |
| `09-conventions.md` | Quy ước code, đặt tên, ngôn ngữ, quy trình làm việc | Trước mỗi PR |
| `10-open-questions.md` | Câu hỏi còn treo, cần chủ dự án quyết | Khi bí |
| `11-school-vendor-contract.md` | **School là vendor độc lập** — schema GraphQL như đặc tả tích hợp công khai | Trước khi động vào `mock-school-api/` |
| `12-ui-review.md` | Review UI/UX + kết quả kiểm chứng và test — **đã xong** | Tham khảo |

---

## Tóm tắt trong 10 dòng

1. **EduProof** cho phép sinh viên chứng minh sự thật về hồ sơ học tập (đang học? GPA ≥ 3.5?)
   mà **không tiết lộ giá trị thật**.
2. Dự án dự thi **Midnight Buildathon**, 3 Wave, 27/08/2026 → 27/11/2026.
3. **Wave 1 = MVP**, chia làm 3 Phase: Mock UI → Tích hợp Midnight → Đóng gói deploy.
4. **Cửa kỹ thuật bắt buộc**: phải có ít nhất 1 **Compact contract compile thành công**,
   nếu không **bị loại thẳng**. Việc này thuộc Phase 2 và **không được bỏ**.
5. **Không dùng DB ngoài.** Dữ liệu nằm ở JSON file, localStorage, hoặc query on-chain.
6. **Sẽ deploy Vercel** → phải nhẹ RAM/CPU, không chạy process nền, không tải nặng lúc build.
7. **1 repo duy nhất** chứa FE + BE + contract.
8. Toàn bộ code phải **Apache License 2.0** và repo gắn topic `midnightntwrk`.
9. Claim là **mệnh đề (predicate)**, không bao giờ là giá trị thô. Đây là bất biến kiến trúc.
10. Phase 3 **chỉ chuẩn bị file deploy**, **tuyệt đối không tự deploy** lên bất kỳ đâu.

## Quyết định đã chốt (28/08/2026)

- ~~**Q1 → CÓ:** làm Proof Request ngay Phase 1.~~
  **🔄 Đổi lại 29/08: KHÔNG làm ở Wave 1** — chuyển sang Wave 2 (`08-wave2-wave3.md` W2.4).
- **Q2 → School là VENDOR ĐỘC LẬP.** Không gộp vào Next.js. GraphQL schema trở thành
  **đặc tả tích hợp công khai** cho các trường khác. Xem `11-school-vendor-contract.md`.
- **Q3 → Dùng proof server bên ngoài** (`https://proof-server.preprod.midnight.network`).
  Chỉ chuyển sang local nếu không dùng được — và phải báo trước.
- **Q11 → Phương án B:** route `/api/school/graphql` trong cùng app trên Vercel,
  ghi chú "đang đóng vai hệ thống ngoài". Kèm theo: lõi `lib/school/` dùng chung cho
  hai vỏ, và các việc bù ranh giới ở `11-school-vendor-contract.md` §5.3.

Q12 đã chốt (phương án C — TypeScript chạy qua `--experimental-strip-types`).
Còn treo: **Q4–Q10** — trong đó **Q8 (repo public + topic `midnightntwrk`) là điều kiện
loại trực tiếp**, cần xử lý trước khi nộp.

---

## Ba điều tuyệt đối không được vi phạm

1. **Không để giá trị riêng tư lọt vào `Proof`.** Kiểu `Proof` không được có bất kỳ field nào
   có khả năng chứa GPA thật, tên thật, mã sinh viên thật. Đây là bảo đảm mang tính cấu trúc,
   không phải quy ước.
2. **Không tự deploy.** Phase 3 chỉ viết `Dockerfile`, `docker-compose.yml`, `.env.example`,
   tài liệu. Việc bấm deploy là của chủ dự án. Không được đụng vào service khác trên server này.
3. **Không nhảy Phase.** Phase 1 chưa xong thì không viết code Midnight. Lý do: phiên trước
   đã có agent tự ý viết code Midnight giữa Phase 1, phải xoá đi làm lại.
