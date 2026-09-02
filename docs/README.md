# Tài liệu EduProof

**Đang vội thì đọc [10-wave-1-plan.md](10-wave-1-plan.md)** — nó nói việc tiếp
theo phải làm là gì.

Số đánh theo **nhóm**, mỗi nhóm một chục. Khoảng trống giữa các số là cố ý:
thêm file mới không phải đánh số lại cả thư mục.

---

## 0x — Luật chơi

Đọc trước tiên, vì nó định hình mọi quyết định còn lại.

| # | File | Nói về |
|---|---|---|
| 01 | [01-hackathon.md](01-hackathon.md) | Thể lệ, rubric, deadline, **điều kiện bị loại thẳng** |

## 1x — Wave 1: đang làm

| # | File | Nói về |
|---|---|---|
| 10 | [10-wave-1-plan.md](10-wave-1-plan.md) | **Việc tiếp theo**, trạng thái, quyết định đã chốt |
| 11 | [11-wave-1-features.md](11-wave-1-features.md) | Hệ thống hiện làm được gì |
| 12 | [12-go-live.md](12-go-live.md) | Đưa lên preprod — làm theo từng bước, có cách kiểm chứng |
| 13 | [13-acceptance.md](13-acceptance.md) | Biên bản nghiệm thu — đã chạy thử những gì, kết quả đo được |

## 2x — Nền tảng kỹ thuật

Đọc trước khi viết code.

| # | File | Nói về |
|---|---|---|
| 20 | [20-architecture.md](20-architecture.md) | Ranh giới module, điểm hoán đổi provider |
| 21 | [21-conventions.md](21-conventions.md) | Quy ước code, vận hành, thẩm mỹ UI |
| 22 | [22-lessons.md](22-lessons.md) | **Bẫy Midnight** — mỗi mục ở đây đều đã tốn nhiều giờ |
| 23 | [23-references.md](23-references.md) | Link, endpoint, phiên bản — tra khi cần, không đọc tuần tự |

## 3x — Chuyên đề

Đọc khi động vào đúng phần đó.

| # | File | Nói về |
|---|---|---|
| 30 | [30-school-vendor-contract.md](30-school-vendor-contract.md) | Vì sao school là vendor độc lập — đọc trước khi sửa `lib/school/` |
| 31 | [31-school-integration.md](31-school-integration.md) | Đặc tả cho trường muốn tích hợp |
| 32 | [32-deployment.md](32-deployment.md) | Vercel, Docker, khoá ký |

## 4x — Wave sau

| # | File | Nói về |
|---|---|---|
| 40 | [40-wave-2-features.md](40-wave-2-features.md) | Wave 2 — toàn bộ mục tiêu và lý do kỹ thuật, W2.1 đến W2.7 |
| 41 | [41-wave-3-features.md](41-wave-3-features.md) | Wave 3 sẽ làm gì |
| 42 | [23-references.md](23-references.md) | Link tài liệu Midnight, đã kiểm chứng còn sống |

## 5x — Wave 2: kế hoạch thực thi

| # | File | Nói về |
|---|---|---|
| 50 | [50-wave-2-plan.md](50-wave-2-plan.md) | **Phạm vi đã chốt** (chỉ W2.1 + W2.1b), lịch theo tuần, ai làm gì, tín hiệu dừng lại |
| 51 | [51-w2-1b-implementation-plan.md](51-w2-1b-implementation-plan.md) | W2.1b: adapter ví ↔ contract đã code xong, phát hiện mới về browser bundle, chưa test trên preprod thật |

`40` nói **mục tiêu và lý do**; `50` nói **làm gì trước, xong khi nào biết**;
`51` nói **code cụ thể ra sao** cho riêng W2.1b (mục rủi ro nhất) và trạng
thái thật của nó. Đọc cả ba khi bắt tay vào Wave 2.

---

## Tra nhanh

| Bạn muốn | Đọc |
|---|---|
| Biết phải làm gì tiếp theo | [10](10-wave-1-plan.md) |
| Deploy lên preprod | [12](12-go-live.md) |
| Sắp viết code | [20](20-architecture.md) → [21](21-conventions.md) |
| Động vào phần Midnight | [22](22-lessons.md) **trước đã** |
| Cần link tài liệu, endpoint, số phiên bản | [23](23-references.md) |
| Động vào `lib/school/` | [30](30-school-vendor-contract.md) |
| Kiểm tra thể lệ, rubric | [01](01-hackathon.md) |

Ngoài thư mục này: [../README.md](../README.md) cho người chấm,
[../business.md](../business.md) cho bài toán nghiệp vụ.
