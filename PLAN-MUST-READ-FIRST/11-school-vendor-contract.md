# 11 — School là vendor độc lập: hợp đồng GraphQL

> **Quyết định (Q2, đã chốt):** School **không phải** một mock cho tiện. School là
> **vendor độc lập, có hệ thống riêng của họ**. Dự án này build một trường mẫu expose
> GraphQL để sinh viên query. Các trường khác muốn dùng EduProof cũng **phải expose
> GraphQL theo đúng schema này**.

Điều đó nâng `mock-school-api/` từ "code demo" lên **đặc tả tích hợp**. Nó phải được
thiết kế, viết tài liệu và version hoá như một API công khai.

---

## 1. Vì sao quyết định này quan trọng

### Về kiến trúc
Ranh giới tổ chức trở thành **ranh giới kỹ thuật thật**. EduProof không bao giờ lưu hồ sơ
sinh viên vì hồ sơ đó **nằm ở hệ thống của trường**, đi thẳng từ trường tới browser sinh viên.
Đây là điều làm cho lời hứa riêng tư trở nên đáng tin — không phải vì ta hứa không lưu,
mà vì **ta không có đường nào để lấy**.

### Về thi thố
Rubric có mục *"awareness of the target audience, market potential, and the proposed
adoption path"*. Một **schema tích hợp có tài liệu** chính là con đường tiếp cận:
trường không phải chuyển sang dùng hệ thống của ta, họ chỉ cần expose một endpoint.
Đây là câu trả lời cụ thể cho "làm sao nhân rộng", mạnh hơn nhiều so với lời hứa suông.

### Về Wave sau
Wave 3 dự kiến làm "cổng tích hợp cho trường" — schema này chính là nền móng.

---

## 2. Vấn đề trong bản hiện tại (phải sửa ở Phase 1)

### ⚠️ P1 — Không phải GraphQL thật

`resolve()` hiện dùng **regex dò tên field** trong chuỗi query:

```js
if (/\bschools\b/.test(query)) { ... }
```

Client thì gửi query giả:

```ts
query<{ schools: School[] }>("{ schools }")
```

Đây **không phải GraphQL** — không có schema, không validate, không introspection,
không chọn được field con. Chấp nhận được khi nó là mock nội bộ. **Không chấp nhận được**
khi nó là hợp đồng tích hợp mà trường khác phải cài đặt theo.

Không thể bảo một trường "hãy expose GraphQL giống thế này" khi bản mẫu không phải GraphQL.

**Phải sửa:** dùng schema thật (SDL) + executable schema. Có introspection để trường khác
tự khám phá được.

### ⚠️ P2 — Khoá issuer sinh lại mỗi lần khởi động

```js
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
```

Comment trong code nói "fine for a demo, since the public key travels with each credential".
**Sai về mặt bảo mật**, và Phase 2 sẽ vỡ:

- Nếu public key đi kèm credential thì **verifier chẳng xác thực được gì** — kẻ giả mạo
  chỉ cần tự sinh khoá rồi tự ký. Chữ ký chỉ có nghĩa khi verifier biết trước public key
  **từ nguồn tin cậy độc lập**.
- Phase 2 lấy issuer public key **từ registry on-chain**. Khoá đổi mỗi lần restart thì
  mọi credential cũ hỏng hết.

**Phải sửa:** khoá lấy từ env `SCHOOL_SIGNING_KEY`, cố định. Verifier đọc public key từ
registry (Phase 1: `schools.json`; Phase 2: on-chain), **không** đọc từ credential.

### ⚠️ P3 — `registrar` trả toàn bộ hồ sơ, không kiểm soát truy cập

`fetchRegistrar()` chạy **trong browser** và lấy về đủ GPA của toàn bộ sinh viên.
Trang `/school` cần thế, và về mặt logic thì hợp lý (trường xem dữ liệu của chính trường).
Nhưng như một API công khai thì đây là endpoint rò rỉ hàng loạt, không có auth.

**Phải sửa ở Phase 1:** tách rõ hai vùng trong schema và ghi trong tài liệu:
- **Vùng registrar** — cần xác thực nhân viên trường. Wave 1 mock, ghi rõ `@auth` trong schema
- **Vùng student** — sinh viên chỉ lấy được credential **của chính mình**

Ít nhất phải để `directive` và tài liệu đúng, dù Wave 1 chưa cài đặt auth thật.

### ⚠️ P4 — GPA là số thực

`gpa: 3.72` là `Float`. Circuit ở Phase 2 **không có số thực**. Nếu để schema công bố `Float`
thì tới Phase 2 phải đổi schema — mà schema công khai thì không nên đổi.

**Phải sửa ngay:** công bố `gpaScaled: Int!` (×100 → `372`) kèm `gpaScale: Int!`.
Xem `06-phase2-midnight.md` §1.4.

---

## 3. Schema đề xuất (bản nháp v1)

```graphql
# EduProof School Integration Schema v1
# Trường muốn tích hợp EduProof phải expose endpoint GraphQL cài đặt schema này.

directive @auth(role: Role!) on FIELD_DEFINITION
enum Role { REGISTRAR STUDENT PUBLIC }

# ─────────── Vùng công khai ───────────

type School {
  id: ID!
  name: String!
  shortName: String!
  country: String!
  """Public key Ed25519 của issuer, base64. Verifier đối chiếu với registry."""
  issuerPublicKey: String!
  issuerKeyId: String!
}

# ─────────── Vùng sinh viên ───────────

"""Credential đã ký. Chỉ cấp cho chính chủ."""
type SignedCredential {
  schema: String!            # "eduproof/credential/v1"
  issuer: CredentialIssuer!
  subject: ID!
  attributes: CredentialAttributes!
  issuedAt: DateTime!
  expiresAt: DateTime!
  """Chữ ký Ed25519 trên bản canonical, base64."""
  signature: String!
}

type CredentialIssuer {
  schoolId: ID!
  schoolName: String!
  keyId: String!
}

"""
Witness riêng tư. Chỉ tồn tại trên thiết bị sinh viên.
Mọi giá trị đều là số nguyên để dùng được trong ZK circuit.
"""
type CredentialAttributes {
  status: StudentStatus!
  """GPA đã nhân hệ số. gpaScale=100 → 372 nghĩa là 3.72"""
  gpaScaled: Int!
  gpaScale: Int!
  academicYear: Int!
  degree: Degree!
  major: String!
}

enum StudentStatus { ACTIVE GRADUATED SUSPENDED }
enum Degree { BACHELOR MASTER PHD }

# ─────────── Vùng registrar (cần auth) ───────────

type StudentRecord {
  id: ID!
  name: String!
  schoolId: ID!
  status: StudentStatus!
  gpaScaled: Int!
  academicYear: Int!
  degree: Degree!
  major: String!
  enrolledAt: DateTime!
  expiresAt: DateTime!
}

type Query {
  """Thông tin công khai của trường, gồm cả issuer public key."""
  school: School!

  """Credential của chính người gọi. Wave 1: mock, chọn theo studentId."""
  credential(studentId: ID!): SignedCredential @auth(role: STUDENT)

  """Toàn bộ hồ sơ của trường. Chỉ nhân viên trường."""
  registrar(schoolId: ID): [StudentRecord!]! @auth(role: REGISTRAR)
}

scalar DateTime
```

### Ghi chú thiết kế

- **Không có query `students` trả danh sách công khai.** Bản hiện tại có, và nó rò rỉ
  tên + mã của toàn bộ sinh viên cho bất kỳ ai. Wave 1 dùng nó để chọn sinh viên trong demo
  → chuyển vào vùng `registrar`, hoặc đánh dấu rõ là tiện ích chỉ dành cho demo.
- **`issuerPublicKey` nằm ở `School`, không nằm trong credential.** Đây là điểm sửa P2.
- **Enum viết HOA** theo quy ước GraphQL; client ánh xạ sang chữ thường khi hiển thị.
- **Bản canonical để ký phải được đặc tả**, nếu không trường khác ký ra chữ ký ta verify
  không được. Xem §4.

---

## 4. Đặc tả canonical (bắt buộc, hiện đang thiếu)

Bản hiện tại ký `JSON.stringify(body)` — phụ thuộc **thứ tự khoá**. Ngôn ngữ khác,
thư viện khác sẽ cho chuỗi khác → chữ ký không verify được. Với một hợp đồng tích hợp,
đây là lỗi chặn.

Phải định nghĩa rõ và viết vào tài liệu:

- **Phase 1:** JSON canonical hoá theo **RFC 8785 (JCS)** — khoá sắp xếp, không khoảng trắng
- **Phase 2:** canonical hoá thành `Vector<N, Field>` theo bảng slot ở
  `06-phase2-midnight.md` §1.4. Đây mới là bản chính, vì nó là thứ circuit đọc.

→ Nên định nghĩa **bảng slot** làm bản canonical **ngay từ Phase 1**, để Phase 2 không phải
đổi schema công khai lần nữa.

---

## 5. Việc cần làm (bổ sung vào Phase 1, khối E)

Khối E trong `05-phase1-mock-ui.md` đổi nội dung: **không** phải "chuyển school API thành
Next.js API route", mà là **"nâng school API thành GraphQL thật, giữ độc lập"**.

> ✅ **KHỐI E ĐÃ HOÀN THÀNH (28/08/2026).** Chi tiết kiểm chứng ở §8.

- [x] **E1** — Dùng `graphql` v16 + `buildSchema`. Không cần `graphql-http`:
      hai vỏ tự lo phần vận chuyển, lõi chỉ nhận request và trả kết quả
- [x] **E2** — `lib/school/` là lõi dùng chung. **Q12 quyết: TypeScript**,
      server rời chạy qua `node --experimental-strip-types` (Node 22.23.1) →
      **không cần build step**. Import nội bộ dùng đuôi `.ts` (Node ESM đòi),
      bật `allowImportingTsExtensions` trong tsconfig
- [x] **E3** — `lib/school/schema.ts`: SDL đầy đủ, có mô tả cho từng field
- [x] **E4** — Resolver thật (sửa P1). Schema validation từ chối field lạ
- [x] **E5** — `lib/school/keys.ts` đọc `SCHOOL_SIGNING_KEY` (sửa P2);
      `npm run school:genkey`; cảnh báo to nếu thiếu khoá
- [x] **E6** — `gpaScaled` + `gpaScale` (sửa P4) ở JSON, schema, client, claims.
      So sánh GPA chạy trên số nguyên như circuit Wave 2 sẽ làm
- [x] **E7** — `lib/school/canonical.ts`: JCS viết tay + **bảng slot vector Wave 2**
- [x] **E8** — `app/api/school/graphql/route.ts`
- [x] **E9** — `mock-school-api/server.mjs` còn ~70 dòng, chỉ HTTP + CORS
- [x] **E10** — `lib/school-api.ts` dùng named query + biến; mặc định `/api/school/graphql`
- [x] **E11** — `issuerPublicKey` nằm ở `School`, **không** trong credential
- [x] **E12** — Ba vùng public/student/registrar, mô tả rõ trong SDL
- [x] **E13** — `SchoolBoundaryNote` + comment đầu route + `npm run check:boundaries`
- [x] **E14** — `SCHOOL-INTEGRATION.md`
- [x] **E15** — Introspection hoạt động
- [x] **E16** — Kiểm chứng hai vỏ khớp nhau, gồm cả đường lỗi

## 5. Triển khai: phương án B (đã chốt)

> **Quyết định (Q11, 28/08):** route `/api/school/graphql` **trong cùng app**,
> có ghi chú "đang đóng vai hệ thống ngoài". Một Vercel project.

### 5.1 Hệ quả: school API sống ở hai nơi

| Bản | Chạy ở đâu | Dùng khi nào |
|---|---|---|
| `mock-school-api/` (process riêng, cổng 4000) | Local, Docker | Dev, demo local, quay video, chứng minh ranh giới thật |
| `/api/school/graphql` (route Next.js) | Vercel | Bản demo công khai |

Hai bản **phải trả về kết quả giống hệt nhau** — cùng schema, cùng chữ ký, cùng khoá.
Nếu để chúng trôi lệch nhau thì hợp đồng tích hợp mất giá trị.

### 5.2 Cách tránh lệch: tách lõi dùng chung

Đây là việc bắt buộc, không phải tuỳ chọn.

```
lib/school/                    ← lõi, không phụ thuộc HTTP framework
  schema.ts        SDL + executable schema
  resolvers.ts     resolver thật
  credential.ts    canonical hoá + ký Ed25519
  keys.ts          nạp khoá từ env

mock-school-api/server.mjs     ← vỏ mỏng: HTTP + CORS → gọi lib/school
app/api/school/graphql/route.ts ← vỏ mỏng: Next.js route → gọi lib/school
```

Cả hai vỏ **chỉ làm việc vận chuyển**. Toàn bộ schema, resolver, logic ký nằm ở
`lib/school/` và **chỉ có một bản**.

⚠️ Lưu ý kỹ thuật: `mock-school-api/server.mjs` hiện là ESM thuần Node, không qua bundler,
nên không dùng được alias `@/`. Hai cách:
- Cho `lib/school/` là TypeScript, thêm bước build nhỏ cho server rời, **hoặc**
- Viết `lib/school/` bằng ESM thuần `.mjs`/`.js` để cả hai bên `import` trực tiếp

Chọn cách hai nếu muốn giữ "không build step" — nhưng khi đó mất type safety.
**Cần quyết khi bắt tay code** (ghi ở §7).

### 5.3 Bù lại chỗ "ranh giới bị mờ"

Chọn B nghĩa là ranh giới tổ chức **không còn tự hiện ra** qua kiến trúc triển khai.
Phải bù bằng những thứ khác, nếu không sẽ mất chính cái điểm ta muốn chứng minh:

- [ ] **Route phải nằm dưới `/api/school/`, tách khỏi mọi API khác của EduProof.**
      Đường dẫn tự nó nói lên ranh giới.
- [ ] **Comment ở đầu route** ghi rõ: đây đang **đóng vai** hệ thống của trường,
      không phải một phần của EduProof; bản thật là endpoint của trường
- [ ] **Banner trong UI** ở trang chọn trường: *"Fetching from the school's system
      (simulated at /api/school/graphql)"*
- [ ] **README + slide** dùng sơ đồ có đường phân cách rõ giữa EduProof và School,
      chú thích rằng bản demo gộp chung để tiện triển khai
- [ ] **Khi quay video**: chạy bản Docker (`school-api` là service riêng) để ranh giới
      hiện ra thật, thay vì bản Vercel gộp
- [ ] **Không được để route này import bất kỳ thứ gì từ `lib/proof/`.**
      Trường không biết gì về hệ thống proof. Nếu có import → ranh giới đã rò thật,
      không chỉ mờ về hình thức.

> Gạch đầu dòng cuối là **luật cứng**, không phải khuyến nghị. Ranh giới mờ ở tầng
> triển khai thì chấp nhận được; mờ ở tầng phụ thuộc code thì không.

### 5.4 Cấu hình endpoint

`lib/school-api.ts` phải trỏ được cả hai:

```
# Vercel / mặc định — dùng route trong app
NEXT_PUBLIC_SCHOOL_API=/api/school/graphql

# Local / Docker — trỏ tới hệ thống trường chạy riêng
NEXT_PUBLIC_SCHOOL_API=http://localhost:4000/graphql
```

Đường dẫn tương đối cũng giải quyết luôn CORS ở bản Vercel (nợ kỹ thuật N8:
bỏ IP hard-code `75.119.138.128`).

### 5.5 Khoá ký trên Vercel

⚠️ Serverless **không giữ state giữa các lần gọi**. Nếu khoá sinh ngẫu nhiên lúc khởi động
(lỗi P2 hiện tại) thì mỗi lần gọi là một khoá khác → credential cấp lần trước verify
không được. Phương án B làm lỗi P2 chuyển từ "khó chịu" sang **hỏng hẳn**.

→ `SCHOOL_SIGNING_KEY` trong env là **bắt buộc**, không phải khuyến nghị.
→ Cần script `npm run school:genkey` để sinh khoá lần đầu.
→ Public key tương ứng nằm trong `data/schools.json` (Phase 1) và trên chain (Phase 2).

---

## 6. Ảnh hưởng tới các Phase sau

**Phase 2:** issuer public key chuyển từ `schools.json` sang **registry on-chain**.
Trường gọi `registerIssuer` để đăng ký khoá. Verifier đọc từ chain. Schema GraphQL
**không đổi** — chỉ đổi nguồn tin cậy. Đây chính là lý do phải sửa P2 ngay bây giờ.

**Phase 3:** `docker-compose.yml` chạy trường mẫu như **service riêng**:
```
services:
  app             EduProof         (NEXT_PUBLIC_SCHOOL_API=http://school-api:4000/graphql)
  school-api      Trường mẫu — vendor độc lập
  proof-server    (xem Q3 — ưu tiên dùng endpoint bên ngoài)
```

Đây là bản **thể hiện đúng kiến trúc**, khác với bản Vercel gộp chung (phương án B).
Vì vậy **video demo nên quay trên bản Docker này**, không phải bản Vercel — ranh giới
tổ chức hiện ra thật, đúng điều muốn chứng minh. Bản Vercel để giám khảo bấm vào thử ngay.

Hai bản cùng chạy được là nhờ endpoint đọc từ env (§5.4).

**Wave 3:** schema v1 này là nền cho cổng tích hợp trường.

---

## 7. Cần quyết khi bắt tay code

### 7.1 `lib/school/` viết bằng gì? (chặn E2)

`mock-school-api/server.mjs` là ESM thuần Node, **không qua bundler**, nên không dùng được
alias `@/` và không đọc trực tiếp được TypeScript.

| Cách | Ưu | Nhược |
|---|---|---|
| **A. TypeScript + build step nhỏ** cho server rời (`tsc` ra `dist/`) | Type safety đồng nhất toàn repo; dùng chung type với `types/index.ts` | Mất tính chất "không build step" của server mẫu; thêm một script |
| **B. ESM thuần `.mjs`**, cả hai bên import trực tiếp | Không build step; trường khác đọc code dễ hơn | Mất type safety đúng ở chỗ quan trọng nhất (canonical hoá + ký) |
| **C. TypeScript, để `tsx`/`node --experimental-strip-types` chạy server rời** | Không build step, vẫn có type | Phụ thuộc phiên bản Node; thêm một dev dependency |

**Khuyến nghị: A.** Logic ký và canonical hoá là chỗ sai một byte là hỏng chữ ký —
đúng chỗ cần type nhất. Một script `npm run school:build` là cái giá rẻ.
Nếu Node trên máy đủ mới thì C cũng ổn.

→ Ghi thành **Q12** trong `10-open-questions.md`.

### 7.2 Danh sách sinh viên trong demo

Schema đề xuất **bỏ** query `students` công khai (nó rò rỉ tên + mã của toàn bộ sinh viên).
Nhưng UI hiện dùng nó để chọn sinh viên trong demo.

Ba cách:
- Chuyển vào vùng `registrar` (cần auth) — đúng về mặt bảo mật, nhưng demo phải "đăng nhập"
- Giữ như một field **đánh dấu rõ là tiện ích chỉ dành cho demo**, có `@deprecated`
  và ghi chú trong tài liệu tích hợp là **không bắt buộc**
- Bỏ hẳn, demo chọn sinh viên bằng cách nhập mã

**Khuyến nghị: cách hai.** Giữ demo mượt, nhưng schema nói rõ đây không phải phần
của hợp đồng tích hợp. Trường thật không cần cài field này.


---

## 8. Kết quả kiểm chứng (28/08/2026)

Bốn phép kiểm tra, chạy thật:

### 8.1 Ranh giới kiến trúc — `npm run check:boundaries`
```
✓ app/api/school must not import lib/proof
✓ lib/school must not import lib/proof
✓ lib/data.ts must not read students.json
✓ app must not import mock-provider directly
```
Script `scripts/check-boundaries.mjs` biến **luật cứng ở §5.3 thành thứ máy kiểm được**,
không còn là quy ước dễ quên.

### 8.2 Hai vỏ khớp nhau
So sánh `:4000` với `/api/school/graphql` trên 6 truy vấn (bỏ qua `issuedAt` vì là dấu thời gian):
```
✓ school profile   ✓ credential   ✓ registrar
✓ demoRoster       ✓ unknown student   ✓ invalid field
Both shells agree.
```
Khớp cả **đường lỗi**, không chỉ đường thành công.

### 8.3 Chữ ký và canonical
```
signature verifies: true
tampered GPA rejected: true              (đổi 372 → 400 thì chữ ký hỏng)
canonical form is key-order independent: true
```
Điều thứ ba là điều kiện để trường viết bằng ngôn ngữ khác ký ra chữ ký ta verify được.

### 8.4 Riêng tư ở runtime
Sinh proof cho Alice (GPA 3.72), rồi tìm trong **proof đã lưu** và **trang verify**:
```
clean  372      ← dạng số nguyên mới, cũng không rò
clean  3.72
clean  SV001
clean  Alice
clean  year 3
```

### 8.5 Build
`npm run build` pass, 10 route. `graphql` **không lọt vào bundle client**
(First Load JS vẫn 102 kB) — nó chỉ chạy phía server và ở server rời.

### 8.6 Còn nợ
- Chưa có test tự động (khối H). Bốn script trên hiện nằm ở scratchpad,
  **cần chuyển thành test thật** để tính vào 15% rubric QA.
- `@auth` mới là mô tả trong SDL, **chưa thi hành**. Đúng phạm vi Wave 1,
  nhưng phải nói rõ trong README kẻo giám khảo hiểu nhầm.
