# 07 — Wave 1 / Phase 3: Đóng gói triển khai

**Mục tiêu:** Chuẩn bị đầy đủ file và tài liệu để **người khác** deploy được.

## ⛔ LUẬT TUYỆT ĐỐI

> **KHÔNG ĐƯỢC TỰ DEPLOY.**
> **KHÔNG ĐƯỢC ĐỘNG VÀO SERVICE KHÁC TRÊN SERVER NÀY.**

Phase này **chỉ tạo file và viết tài liệu**. Việc bấm deploy là quyết định của chủ dự án.
Không chạy `vercel deploy`, không `docker compose up -d` ở chế độ chạy dài,
không sửa nginx/systemd/firewall, không kill process không phải của mình.

Được phép: `docker build` để kiểm tra Dockerfile hợp lệ, rồi dọn sạch image.

**Ước lượng:** 2–3 ngày.

---

## 1. File cần tạo

### 1.1 Docker

- [ ] `Dockerfile` — Next.js multi-stage build
  - stage `deps` → `builder` → `runner`
  - `output: "standalone"` trong `next.config.ts` (image nhỏ hơn nhiều)
  - chạy bằng user non-root
  - `.dockerignore`

- [ ] `docker-compose.yml` — toàn bộ stack local:
  ```
  services:
    app            Next.js, cổng 3000
    proof-server   midnightntwrk/proof-server:8.0.3, cổng 6300
  ```
  - Có healthcheck
  - Không `restart: always` trong bản mặc định (tránh chiếm tài nguyên server ngoài ý muốn)

- [ ] `docker-compose.dev.yml` — bản dev có hot reload (tuỳ chọn)

### 1.2 Môi trường

- [ ] `.env.example` với **mọi** biến, kèm chú thích:
  ```
  # Nhà cung cấp proof: "mock" | "midnight"
  NEXT_PUBLIC_PROOF_PROVIDER=mock

  # Midnight preview network
  NEXT_PUBLIC_MIDNIGHT_RPC=https://rpc.preview.midnight.network
  NEXT_PUBLIC_MIDNIGHT_INDEXER=https://indexer.preview.midnight.network/api/v3/graphql
  NEXT_PUBLIC_PROOF_SERVER=http://localhost:6300
  NEXT_PUBLIC_CONTRACT_ADDRESS=

  # Khoá ký của trường (Ed25519, base64).
  # BẮT BUỘC đặt cố định — serverless không giữ state giữa các lần gọi,
  # nếu sinh ngẫu nhiên thì chữ ký cũ sẽ không verify được.
  SCHOOL_SIGNING_KEY=
  ```
- [ ] Xác nhận `.env.local` nằm trong `.gitignore` (✅ đã có)
- [ ] Tài liệu ghi rõ biến nào bắt buộc, biến nào tuỳ chọn

### 1.3 Vercel

- [ ] `vercel.json` nếu cần cấu hình riêng
- [ ] Ghi rõ **giới hạn free tier** và cách dự án tránh vượt
- [ ] Ghi rõ tính năng nào **không chạy** trên Vercel (proof server) và vì sao

---

## 2. Tài liệu cần viết

### 2.1 README.md — viết lại toàn bộ (ảnh hưởng trực tiếp rubric 40%)

Cấu trúc bắt buộc:

1. EduProof là gì (3 câu) + ảnh chụp màn hình
2. Vấn đề đang giải quyết
3. **Tích hợp Midnight** — bảng dual-ledger, thiết kế circuit, quản lý private state
4. Kiến trúc — sơ đồ + ranh giới module
5. Bắt đầu nhanh — chế độ mock (`npm i && npm run dev`, chạy trong 60 giây)
6. Chạy đầy đủ — chế độ Midnight + Docker + proof server
7. **Hướng dẫn giám khảo test** — kịch bản có sẵn, tài khoản demo
8. Chạy test
9. Contract — chỗ nào, compile thế nào, test thế nào
10. Roadmap — Wave 2 và Wave 3
11. License (Apache 2.0) + ghi nhận hệ sinh thái Midnight

> Mục 7 quan trọng bất thường: giám khảo có hàng chục bài. Bài nào test được trong
> 2 phút sẽ được chấm kỹ hơn bài phải loay hoay setup.

### 2.2 DEPLOYMENT.md

- Deploy Vercel từng bước
- Deploy Docker từng bước
- Chạy proof server
- Xử lý sự cố thường gặp
- Nêu rõ: **kho lưu trữ ở đâu, và chưa có DB nào**

### 2.3 CONTRIBUTING.md (tuỳ chọn)

Nếu có, phải trỏ về `PLAN-MUST-READ-FIRST/`.

---

## 3. Deliverable bài nộp (không phải code — nhưng bắt buộc)

- [ ] **Slide deck** — 10% rubric
  - Vấn đề → Giải pháp → Demo → Kiến trúc → Midnight → Roadmap → Đội ngũ
  - Bảng dual-ledger phải có mặt
- [ ] **Video demo** — 10% rubric, cùng hạng mục
  - 3–5 phút
  - Chạy đủ luồng end-to-end
  - Chỉ rõ chỗ nào riêng tư được bảo toàn (bảng "verifier KHÔNG thấy gì")
  - Cho thấy contract compile
- [ ] **Mô tả tiến độ Wave 1**
- [ ] **Repo gắn topic `midnightntwrk`** ⛔ thiếu là bị loại
- [ ] Repo để **public**
- [ ] Xác nhận LICENSE Apache 2.0 (✅ đã có)

---

## Definition of Done cho Phase 3

- [ ] `docker build` thành công (rồi dọn image)
- [ ] `docker-compose config` hợp lệ
- [ ] `.env.example` liệt kê đủ biến
- [ ] README hoàn chỉnh, người lạ đọc là chạy được
- [ ] DEPLOYMENT.md hoàn chỉnh
- [ ] Slide xong
- [ ] Video xong
- [ ] Repo public + gắn topic
- [ ] **Chưa deploy gì cả** — đúng như yêu cầu
