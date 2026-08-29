# 03 — Kiến trúc

## 1. Nguyên tắc chỉ đạo

> **Provider pattern.** Toàn bộ phần "sinh proof / xác thực proof" nằm sau **một interface**.
> Phase 1 dùng `MockProofProvider`. Phase 2 đổi **đúng một dòng** sang `MidnightProofProvider`.
> Không có logic proof nào nằm trong React component.

Điểm hoán đổi duy nhất là `lib/proof/index.ts`:

```ts
export const proofProvider: ProofProvider = new MockProofProvider();
//                                          ^^^^^^^^^^^^^^^^^^^^^ Phase 2 đổi ở đây
```

## 2. Sơ đồ tầng

```
┌─────────────────────────────────────────────────────────┐
│  app/            React Server + Client Components        │
│                  KHÔNG chứa logic proof, KHÔNG chứa      │
│                  logic nghiệp vụ. Chỉ render + gọi lib.  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  lib/proof/      ProofProvider interface                 │
│                  ├─ mock-provider.ts    (Phase 1)        │
│                  ├─ midnight-provider.ts (Phase 2)       │
│                  ├─ claims.ts    schema + đánh giá       │
│                  └─ store/       lưu trữ (async)         │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  types/          Domain model thuần                      │
│                  Không React, không blockchain           │
└─────────────────────────────────────────────────────────┘

  Bên cạnh, độc lập:
┌─────────────────────────────────────────────────────────┐
│  lib/school-api.ts     client gọi API của TRƯỜNG         │
│  mock-school-api/      server giả lập TRƯỜNG (:4000)     │
│  lib/wallet.ts         kết nối ví CIP-30 + demo fallback │
│  lib/session.ts        credential + ví, chỉ trong browser│
└─────────────────────────────────────────────────────────┘
```

## 3. Ranh giới module — luật cứng

| Luật | Vì sao |
|---|---|
| `app/**` không được `import` từ `mock-provider` trực tiếp | Đổi provider phải chỉ sửa 1 chỗ |
| `types/index.ts` không được import React hay thư viện Midnight | Domain model phải dùng được ở cả circuit lẫn UI |
| `lib/data.ts` **chỉ chứa dữ liệu trường**, không chứa hồ sơ sinh viên | Hồ sơ sinh viên thuộc về trường, đi thẳng từ API trường tới browser sinh viên. Nếu thấy ai thêm `getStudent()` vào đây → kiến trúc đã rò |
| `Proof` không được thêm field chứa giá trị riêng tư | Bảo đảm riêng tư mang tính cấu trúc |
| Credential đã ký **không rời browser** trừ khi ở dạng ZK proof | Là điểm bán hàng của sản phẩm |

## 4. Tách DB về sau (Postgres-ready)

Chủ dự án nói: *"code sao cho sau này tách ra DB riêng cũng dễ, có lẽ tao dùng postgres"*.

Hiện `lib/proof/store.ts` là **đồng bộ** (`readProof(): Proof | null`). Postgres thì bắt buộc
bất đồng bộ. Nếu để nguyên, ngày chuyển sang Postgres sẽ phải sửa lan ra toàn bộ call site.

**Đổi ngay ở Phase 1** thành interface bất đồng bộ:

```
lib/proof/store/
  types.ts        interface ProofStore   (tất cả method trả Promise)
  local-store.ts  LocalStorageProofStore (Phase 1)
  index.ts        export const proofStore: ProofStore = new LocalStorageProofStore()
```

```ts
export interface ProofStore {
  save(proof: Proof): Promise<void>;
  read(proofId: string): Promise<Proof | null>;
  listBySubject(subject: string): Promise<Proof[]>;
}
```

Chi phí đổi bây giờ: **2 call site** (đều trong `mock-provider.ts`). Chi phí đổi sau: rất cao.

Về sau chỉ cần thêm `postgres-store.ts` (hoặc `chain-store.ts` query on-chain) và đổi 1 dòng
ở `index.ts`. **Wave 1 không dùng Postgres** — chỉ chuẩn bị hình dạng interface.

## 5. Ràng buộc Vercel free tier

| Ràng buộc | Cách tuân thủ |
|---|---|
| Không process nền chạy dài | `mock-school-api` không lên Vercel; chuyển thành Next.js API route ở Phase 1 |
| Serverless function có giới hạn bộ nhớ | Không load WASM Midnight ở server nếu tránh được — sinh proof nên chạy **client-side** |
| Cold start | Giữ bundle server nhỏ; không import thư viện nặng ở top-level route |
| Không ghi được filesystem | Mọi dữ liệu ghi phải ở localStorage hoặc on-chain, không ghi file lúc runtime |
| Build phải nhẹ | Không compile Compact contract lúc build. Commit sẵn artifact đã compile |

> **Quyết định:** `mock-school-api/server.mjs` (port 4000) chỉ dùng để dev local.
> Ở Phase 1 phải có bản Next.js API route tương đương để deploy Vercel được bằng **một process duy nhất**.

## 6. Sinh proof chạy ở đâu? (quan trọng cho Phase 2)

**Client-side.** Lý do:

- Credential riêng tư **không được rời máy sinh viên** → không thể gửi lên server để sinh proof
- Vercel serverless không đủ tài nguyên chạy chứng minh ZK
- Đúng mô hình Midnight: proof server chạy phía người dùng

→ Phase 2, `MidnightProofProvider` là **client-side**, kết nối proof server cục bộ /
proof server của ví. Điều này phải nói rõ trong README và slide, vì nó thể hiện ta **hiểu**
mô hình Midnight (điểm rubric Engineering 40%).

## 7. Dual-ledger — thứ giám khảo tìm

Midnight có hai sổ:

- **Public ledger** — trạng thái on-chain ai cũng thấy
- **Private state** — dữ liệu riêng nằm ở máy người dùng, circuit đọc dưới dạng witness

EduProof ánh xạ tự nhiên:

| Dữ liệu | Nằm ở | Ai thấy |
|---|---|---|
| Registry trường + public key issuer | Public ledger | Mọi người |
| Commitment của proof đã phát hành | Public ledger | Mọi người |
| Credential đã ký (GPA, tên, mã SV) | Private state (browser) | Chỉ sinh viên |
| Khoá bí mật của sinh viên | Private state | Chỉ sinh viên |
| Kết quả mệnh đề (boolean) | Public output của circuit | Verifier |

Bảng này nên xuất hiện **nguyên văn trong README và slide** — nó trả lời trực tiếp
tiêu chí "demonstrates an understanding of Midnight's dual-ledger model".
