# Tài liệu EduProof

**Bắt đầu ở đây: [wave-1-plan.md](wave-1-plan.md) — nó nói việc tiếp theo phải làm là gì.**

---

## Đọc file nào

| Bạn muốn | Đọc |
|---|---|
| **Biết phải làm gì tiếp theo** | [wave-1-plan.md](wave-1-plan.md) |
| Biết hệ thống hiện làm được gì | [wave-1-features.md](wave-1-features.md) |
| Sắp viết code | [architecture.md](architecture.md) → [conventions.md](conventions.md) |
| Động vào phần Midnight | [lessons.md](lessons.md) **trước đã** — ba cái bẫy ở đó đều tốn nhiều giờ |
| Động vào `lib/school/` hoặc `mock-school-api/` | [school-vendor-contract.md](school-vendor-contract.md) |
| Deploy app | [deployment.md](deployment.md) |
| Lập kế hoạch Wave sau | [wave-2-features.md](wave-2-features.md), [wave-3-features.md](wave-3-features.md) |
| Kiểm tra thể lệ, rubric, deadline | [hackathon.md](hackathon.md) |
| Tích hợp EduProof vào hệ thống trường | [school-integration.md](school-integration.md) |

## Cấu trúc

```
docs/
  wave-1-plan.md            việc tiếp theo, trạng thái, quyết định đã chốt
  wave-1-features.md        Wave 1 làm được gì (đã xong)
  wave-2-features.md        Wave 2 sẽ làm gì
  wave-3-features.md        Wave 3 sẽ làm gì

  architecture.md           ranh giới module, điểm hoán đổi provider
  conventions.md            quy ước code, vận hành, thẩm mỹ UI
  school-vendor-contract.md vì sao school là vendor độc lập
  school-integration.md     đặc tả cho trường muốn tích hợp
  deployment.md             Vercel, Docker, khoá ký
  lessons.md                bẫy khi tích hợp Midnight
  hackathon.md              thể lệ, rubric, deadline
```

Mỗi Wave có file **features**. Riêng Wave 1 có thêm **plan**, vì nó là Wave đang
làm — kế hoạch của Wave 2 và 3 chỉ viết khi tới lượt.

Ngoài thư mục này: [../README.md](../README.md) cho người chấm,
[../business.md](../business.md) cho bài toán nghiệp vụ.
