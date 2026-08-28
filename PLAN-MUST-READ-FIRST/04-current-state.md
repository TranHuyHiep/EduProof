# 04 — Hiện trạng repo (cập nhật 2026-08-29)

> ⚠️ **File này viết cho server Linux `/root/eduproof`.** Từ 29/08 dự án làm trên
> **máy Mac** `/Users/trinhbach/Workspace/working/eduproof/EduProof`.
> Phần §1 và §3 bên dưới đã lỗi thời — trạng thái đúng nhất nằm ở
> **`12-ui-review.md` §6–§7** và `00-README.md`.
>
> **Tóm tắt 29/08:** Phase 1 **đã xong**. `npm run build` + `npm test` (138 test)
> + `npm run check:boundaries` đều pass. Việc tiếp theo: **Phase 2**.

## 1. Cây thư mục

```
/root/eduproof/
├── LICENSE                    Apache 2.0 ✅
├── README.md                  cần viết lại cho bài nộp
├── business.md                tài liệu nghiệp vụ tiếng Việt, 11 mục ✅
├── PLAN-MUST-READ-FIRST/      ← thư mục này
│
├── app/
│   ├── page.tsx                       landing
│   ├── layout.tsx  globals.css
│   ├── school/page.tsx                danh sách sinh viên + cấp credential
│   ├── student/
│   │   ├── login/page.tsx             kết nối ví
│   │   ├── select-school/page.tsx     chọn trường
│   │   ├── credentials/page.tsx       xem credential
│   │   ├── create-proof/page.tsx      chọn claim + sinh proof
│   │   └── proof/[proofId]/page.tsx   proof vừa tạo + link chia sẻ
│   └── verify/[proofId]/page.tsx      trang xác thực
│
├── components/ui.tsx          primitive dùng chung
├── data/
│   ├── schools.json           1 trường: hanoi-university
│   └── students.json          10 sinh viên
├── lib/
│   ├── data.ts                chỉ dữ liệu trường
│   ├── school-api.ts          client gọi API trường
│   ├── session.ts             ví + credential trong localStorage
│   ├── use-student.ts         hook
│   ├── wallet.ts              CIP-30 + demo fallback
│   └── proof/
│       ├── index.ts           điểm hoán đổi provider
│       ├── types.ts           interface ProofProvider
│       ├── claims.ts          CLAIM_CATALOG + đánh giá  ← sẽ viết lại ở Phase 1
│       ├── mock-provider.ts   MockProofProvider
│       └── store.ts           localStorage, ĐỒNG BỘ    ← sẽ viết lại thành async
├── mock-school-api/server.mjs Node HTTP server :4000, ký Ed25519
├── types/index.ts             domain model
└── public/circuits/*.verifier ⚠️ RÁC — sót từ session cũ, phải xoá
```

## 2. Đang chạy được

- 9 route, `next build` pass
- Luồng end-to-end đã kiểm chứng qua Playwright trên IP công khai:
  `/school` → connect wallet → cấp credential → chọn claim → sinh proof
  (`pf_a6fce6019a53`) → `/verify/[id]` báo "Proof valid". **Không có lỗi JS.**
- Bảo đảm riêng tư đã kiểm chứng **ở runtime**: serialize proof của Bob rồi tìm
  `2.91`, `SV002`, tên, năm học — **không có giá trị nào xuất hiện**.
- 10/10 case pass/fail của claim cho kết quả đúng.

## 3. Đang chạy trên máy này

| Cổng | Process | Lệnh |
|---|---|---|
| 3000 | `next dev -H 0.0.0.0` | `npm run dev -- -H 0.0.0.0` |
| 4000 | mock school API | `ALLOWED_ORIGIN=http://75.119.138.128:3000 node mock-school-api/server.mjs` |

Truy cập: `http://75.119.138.128:3000`

⚠️ Đây là **dev server**, không phải bản production, và **đang phơi ra Internet không bảo vệ**.

## 4. Nợ kỹ thuật đã biết

| # | Vấn đề | Ảnh hưởng | Xử ở |
|---|---|---|---|
| ~~N1~~ | ~~`public/circuits/*.verifier` là rác~~ | — | ✅ **Xong** (khối A1) |
| ~~N2~~ | ~~`@midnight-ntwrk/compact-runtime` thừa~~ | — | ✅ **Xong** (khối A1); Phase 2 thêm lại |
| ~~N3~~ | ~~`store.ts` đồng bộ~~ | — | ✅ **Xong** — `lib/proof/store/` async, có test hợp đồng |
| ~~N4~~ | ~~`mock-school-api` là process riêng~~ | — | ✅ **Xong** — hai vỏ, lõi chung `lib/school/` |
| ~~N5~~ | ~~`CLAIM_CATALOG` cứng~~ | — | ✅ **Xong** — registry `lib/proof/attributes.ts` |
| ~~N6~~ | ~~Không có test nào~~ | — | ✅ **Xong 29/08** — 138 test, xem `12-ui-review.md` §7 |
| N7 | README chưa đạt chuẩn bài nộp | Ảnh hưởng Engineering 40% | Cuối Wave 1 |
| ~~N8~~ | ~~`.env.local` hard-code IP~~ | — | ✅ **Xong** — dùng đường dẫn tương đối |
| N9 | Repo chưa gắn topic `midnightntwrk` | **Loại trực tiếp** | Trước khi nộp |

## 5. Lỗi UI đã phát hiện qua Playwright — ✅ **ĐÃ SỬA HẾT** (29/08)

| # | Lỗi | Trạng thái |
|---|---|---|
| E1 | Trang credentials hiện tên sinh viên thay vì địa chỉ ví | ✅ |
| E2 | Ngày hiện dạng thô ISO | ✅ `lib/format.ts`, có test |
| E3 | Bảng `/school` mobile cắt cột | ✅ mobile chuyển sang danh sách thẻ |
| E4 | Claim chưa tick hiển thị câu cụt | ✅ câu sinh từ registry, có test |
| E5 | Trang verify thiếu nút "xác thực proof khác" | ✅ |
| E6 | Landing còn "Student sign in" | ✅ |

Thêm ba lỗi phát hiện ngày 29/08 (tràn ngang 375px, ô số nhảy về 0, input theo locale)
— đã sửa, chi tiết ở `12-ui-review.md` §6.2.

## 6. Kết quả khảo sát Midnight (đã kiểm chứng thật, giữ cho Phase 2)

Phiên trước đã cài và chạy thật toolchain. Những phát hiện này **đã được xác minh**,
không phải suy đoán:

- **Phiên bản:** compiler `0.34.0`, language `0.26.0`, runtime `0.19.0`
- Compile ra khoá ZK thật trong **~17 giây**
- Circuit chạy được với private witness, và **từ chối đúng** khi vi phạm ràng buộc
- Chữ ký: `jubjubSchnorrVerify<n>(Vector<n, Field>, JubjubSchnorrSignature, JubjubPoint)`
  → phải **canonicalize credential thành vector field element**, không ký JSON
- `jubjubSchnorrVerifyingKey` **không dùng được trong circuit** → ràng buộc quyền sở hữu
  bằng preimage commitment: `persistentHash(studentSk) == subject`
- Runtime API: `createConstructorContext` (không phải `constructorContext`),
  và `initialState` là **async**
- **Preview network đã kiểm tra kết nối được:**
  - RPC `https://rpc.preview.midnight.network` → trả về "Midnight Preview"
  - Indexer `https://indexer.preview.midnight.network/api/v3/graphql`
  - Proof server Docker `midnightntwrk/proof-server:8.0.3`, chạy local cổng `6300`
- Cần `unzip` trên máy, nếu không lệnh cài toolchain báo
  "Failed to spawn artifact extraction command"

### Contract cũ khôi phục được

Commit `f03532c` từng có `contracts/` với 6 circuit: `proveActiveStatus`,
`proveGpaThreshold`, `proveAcademicYear`, `proveAttributeEquals`,
`proveScholarshipEligibility`, `registerIssuer`. Đã xoá theo yêu cầu (đúng scope Phase 1).

Khôi phục khi vào Phase 2:

```bash
git checkout f03532c -- contracts/
```

> Lưu ý: thiết kế contract ở Phase 2 sẽ **khác** — 6 circuit riêng lẻ là hướng sai;
> hướng đúng là **một circuit tổng quát** nhận predicate. Xem `06-phase2-midnight.md`.

## 7. Bài học vận hành (đừng lặp lại)

- **Không chạy `next build` khi `next dev` đang sống** — hai bên dùng chung `.next`,
  gây `MODULE_NOT_FOUND` và lỗi 500. Muốn build thì kill dev server, `rm -rf .next` trước.
- **Không dùng `pkill -f "next dev"`** — pattern khớp cả process của chính agent, tự sát
  (exit 144). Kill theo cổng:
  `ss -lptn 'sport = :3000' | grep -oP 'pid=\K[0-9]+'`
- **Playwright** phải chỉ đích danh:
  `executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'`
- **Kiểm tra git trước khi xoá file.** Đã từng xoá nhầm `lib/wallet.ts`, `lib/school-api.ts`,
  `mock-school-api/` vì tưởng là code rác của session khác — thực ra đã nằm trong commit
  `f03532c`. Luôn `git log --oneline -- <path>` trước khi xoá.
