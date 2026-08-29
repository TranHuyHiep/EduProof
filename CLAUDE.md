# CLAUDE.md

Hướng dẫn cho AI khi làm việc trong repo này.

**Việc tiếp theo phải làm là gì → [docs/wave-1-plan.md](docs/wave-1-plan.md).**
Đọc file đó trước khi hỏi.

---

## Dự án là gì

EduProof cho phép sinh viên chứng minh **mệnh đề** về hồ sơ học tập
(*"GPA ≥ 3.5"*, *"đang theo học"*) mà **không tiết lộ giá trị thật**, dùng
zero-knowledge circuit trên Midnight.

Dự thi Midnight Buildathon. Wave 1 đã xong phần code.

## Lệnh hay dùng

```bash
npm run dev                # http://localhost:3000, mặc định mock provider
npm test                   # 234 test, ~1s
npm run check:boundaries   # luật kiến trúc — PHẢI xanh
npm run build              # build production
npx tsc --noEmit           # typecheck

npm run contract:build     # biên dịch Compact (pin toolchain 0.31.1)
npm run contract:deploy    # deploy lên preprod, có hỏi xác nhận

NEXT_PUBLIC_PROOF_PROVIDER=midnight npm run dev   # chạy circuit thật
```

Chạy `npm test && npm run check:boundaries` trước khi báo là xong việc.

## Bốn thứ không được phá

### 1. Không để giá trị riêng tư lọt vào `Proof`

Kiểu `Proof` không được có field nào chứa được GPA thật, tên thật, mã sinh viên
thật. Đây là bảo đảm **cấu trúc**, không phải quy ước. Giữ bằng
`tests/privacy.test.ts` — nếu phải xoá hết test khác thì giữ lại test này.

Kể cả proof **thất bại** cũng không được thu hẹp giá trị bị giấu.

### 2. School là vendor độc lập

`lib/school/**` và `app/api/school/**` **không được** import `lib/proof/`.
Giữ bằng `npm run check:boundaries`, không phải bằng lời hứa.

### 3. Claim là mệnh đề, không phải giá trị

Không bao giờ đưa giá trị thô vào claim, kể cả khi tiện tay.

### 4. Một điểm hoán đổi provider duy nhất

`lib/proof/index.ts`. Không component nào được biết đang chạy provider nào.

## Luật làm việc

- **Không tự ý deploy, không đụng vào thứ ngoài phạm vi project.** Hỏi trước, mỗi lần.
  Việc ghi lên chain là không thể hoàn tác.
- **Đọc [docs/lessons.md](docs/lessons.md) trước khi động vào phần Midnight.**
  Ba cái bẫy ở đó (phiên bản, DUST, seed) đều đã làm mất nhiều giờ.
- **Không đoán phiên bản thư viện.** Ma trận hỗ trợ chính thức là nguồn sự thật,
  không phải "bản mới nhất". Preprod chạy **ledger 8**.
- Nghi ngờ chỗ nào thì hỏi chủ dự án, đừng tự quyết.

## Bẫy đã biết

| Bẫy | Hệ quả |
|---|---|
| Build contract bằng toolchain 0.34.0 | Ra ledger 9, preprod chạy ledger 8. Không lỗi sớm — chỉ vỡ lúc dựng transaction, sau khi đã tốn phí |
| Cắt seed BIP39 xuống 32 byte | Mở nhầm một ví khác, rỗng. Không có gì báo lỗi |
| Có NIGHT tưởng là trả được phí | Phí trả bằng DUST. Phải đăng ký NIGHT sinh DUST trước |
| `dust.balance() == 0` | Không chứng minh được là hết tiền — có thể chỉ là ví local chưa sync |
| Nâng `DEPLOY_LOG_LEVEL` | `testkit-js` log **master seed** ở mức INFO |

## Ngôn ngữ

- Tài liệu trong `docs/` và `business.md`: **tiếng Việt**.
- `README.md`, comment trong code, tên biến: **tiếng Anh**.
- Trao đổi với chủ dự án: **tiếng Việt**, xưng "tao/mày".

## Cấu trúc

```
contracts/src/      circuit Compact (eduproof.compact, schnorr.compact)
contracts/build/    artifact đã biên dịch — COMMIT vào repo có chủ ý
contracts/tests/    test circuit qua simulator

lib/school/         NHÀ TRƯỜNG — vendor riêng, schema GraphQL là đặc tả công khai
lib/proof/          EDUPROOF — interface ProofProvider, mock và midnight
lib/midnight/       cầu nối — schnorr.ts, prover.ts, local-runner.ts

app/                route (Next.js App Router)
mock-school-api/    nhà trường chạy như service riêng, cổng 4000
docs/               tài liệu
```
