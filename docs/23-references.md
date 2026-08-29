# Tham chiếu — link cần khi build

Mọi link ở đây đã được kiểm chứng còn sống (2026-08-29). Endpoint và số phiên
bản đọc thẳng từ SDK và từ `node_modules`, không chép tay — nên chúng là cái
đang chạy thật, không phải cái "nên là".

Gặp bẫy khi tích hợp Midnight thì sang [22-lessons.md](22-lessons.md) trước:
mỗi mục ở đó đều đã tốn nhiều giờ.

---

## Tra nhanh khi kẹt

| Triệu chứng | Đi đâu |
|---|---|
| Lỗi lệch phiên bản, runtime không khớp | [Fix version mismatches](https://docs.midnight.network/how-to/fix-version-mismatches) → [ma trận hỗ trợ](https://docs.midnight.network/relnotes/support-matrix) |
| `Custom error: <số>` khi submit | [bảng mã lỗi](https://github.com/midnightntwrk/midnight-expert/tree/main/plugins/midnight-status-codes/skills/status-codes-lookup/scripts) |
| Không hiểu DUST, phí, đăng ký NIGHT | [DUST architecture](https://docs.midnight.network/concepts/dust-architecture) |
| Cú pháp Compact | [language reference](https://docs.midnight.network/develop/reference/compact/lang-ref) · [std library](https://docs.midnight.network/develop/reference/compact/compact-std-library) |
| Muốn hỏi người thật | [forum](https://forum.midnight.network/) · [Discord](https://discord.com/invite/midnightnetwork) |

---

## Endpoint Preprod

Đọc từ `PreprodTestEnvironment` của `testkit-js`, là nguồn sự thật — code không
hardcode mấy giá trị này, nên chúng không thể lệch khỏi mạng thật.

```
indexer      https://indexer.preprod.midnight.network/api/v4/graphql
indexer WS   wss://indexer.preprod.midnight.network/api/v4/graphql/ws
node RPC     https://rpc.preprod.midnight.network
node WS      wss://rpc.preprod.midnight.network
faucet       https://faucet.preprod.midnight.network        (API: /api/drips)
explorer     https://preprod.midnightexplorer.com
```

Kiểm tra nhanh khi nghi mạng có vấn đề. Cả hai chỉ nhận POST, nên `curl` thường
trả 405 dù endpoint vẫn sống:

```bash
curl -s -X POST -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"system_chain","params":[]}' \
  https://rpc.preprod.midnight.network
# {"jsonrpc":"2.0","id":1,"result":"Midnight Preprod"}

curl -s -X POST -H "content-type: application/json" \
  -d '{"query":"{ __typename }"}' \
  https://indexer.preprod.midnight.network/api/v4/graphql
```

Proof server: **chạy local** khi nộp transaction (Midnight yêu cầu), hosted
`https://proof-server.preprod.midnight.network` chỉ dùng cho chứng minh trong
trình duyệt.

```bash
docker run -d --rm --name eduproof-proof-server \
  -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:8.1.0
```

> Faucet: trang gốc trả 200, còn `/api/drips` trả 404 với GET vì nó là đường
> POST mà testkit dùng. Docs có nơi ghi một địa chỉ khác
> (`midnight-tmnight-preprod.nethermind.dev`) — chưa xác minh được cái nào là
> chính thống, nhưng địa chỉ ở trên là cái `testkit-js` thực sự gọi.

---

## Phiên bản đang chạy

Đọc từ `node_modules`, không phải từ `package.json`. Đây là cái thực sự được
nạp.

```
@midnight-ntwrk/compact-runtime          0.16.0
@midnight-ntwrk/ledger-v8                8.1.0
@midnight-ntwrk/midnight-js-contracts    4.1.1
@midnight-ntwrk/testkit-js               4.1.1
@midnight-ntwrk/compact-js               2.5.1
@midnight-ntwrk/wallet-sdk               1.2.0
Compact toolchain                        0.31.1  (language 0.23)
proof-server                             8.1.0
```

**Preprod chạy ledger 8.** Ranh giới sang ledger 9 và bảng đối chiếu đầy đủ:
[22-lessons.md](22-lessons.md) mục cuối.

---

## Tài liệu chính thức

| Link | Dùng khi |
|---|---|
| [docs.midnight.network](https://docs.midnight.network/) | Trang chủ tài liệu |
| [Ma trận hỗ trợ](https://docs.midnight.network/relnotes/support-matrix) | **Nguồn sự thật về phiên bản.** Không đoán, không lấy "bản mới nhất" |
| [Fix version mismatches](https://docs.midnight.network/how-to/fix-version-mismatches) | Runtime không khớp, contract không nạp được |
| [Cài toolchain](https://docs.midnight.network/getting-started/installation) | `compact update 0.31.1` — đúng bản project cần |
| [Compact language reference](https://docs.midnight.network/develop/reference/compact/lang-ref) | Cú pháp, có EBNF grammar |
| [Compact standard library](https://docs.midnight.network/develop/reference/compact/compact-std-library) | Hash, elliptic curve, chữ ký, coin |
| [DUST architecture](https://docs.midnight.network/concepts/dust-architecture) | Cơ chế phí: DUST sinh từ NIGHT đã đăng ký |
| [Networks & environments](https://docs.midnight.network/guides/midnight-local-network) | Bốn môi trường, endpoint, Docker local |
| [Tutorial](https://docs.midnight.network/develop/tutorial/creating) | Dựng DApp từ đầu: contract → CLI → API → UI |
| [Release notes](https://docs.midnight.network/relnotes) · [Blog](https://docs.midnight.network/blog) | Theo dõi thay đổi |

---

## Mã nguồn

| Repo | Nội dung |
|---|---|
| [midnight-ledger](https://github.com/midnightntwrk/midnight-ledger) | Cấu trúc transaction và state. **Branch mặc định `ledger-8`** — đúng bản đang dùng |
| [ledger-8/spec](https://github.com/midnightntwrk/midnight-ledger/tree/ledger-8/spec) | `dust.md`, `intents-transactions.md`, `cost-model.md`, `contracts.md`, `zswap.md` |
| [midnight-node](https://github.com/midnightntwrk/midnight-node) | Node blockchain, partner chain của Cardano |
| [midnight-indexer](https://github.com/midnightntwrk/midnight-indexer) | Đọc block, expose GraphQL |
| [midnight-local-dev](https://github.com/midnightntwrk/midnight-local-dev) | **Chạy mạng local.** `standalone.yml` đã pin sẵn bộ image ledger 8 |
| [midnight-expert](https://github.com/midnightntwrk/midnight-expert) | Plugin Claude Code cho dev Midnight — chứa bảng mã lỗi transaction |
| [LFDT-Minokawa/compact](https://github.com/LFDT-Minokawa/compact) | **Source thật của ngôn ngữ Compact**, nay thuộc Linux Foundation |
| [midnightntwrk/compact](https://github.com/midnightntwrk/compact) | ⚠️ **Đã archived.** Chỉ còn host release artifact — installer script vẫn trỏ vào đây |
| [example-counter](https://github.com/midnightntwrk/example-counter) | ⚠️ **Đã archived.** Vẫn đọc được để tham khảo cách gọi circuit |

> Spec trong `ledger-8/spec` **không** có bảng mã lỗi transaction. README của nó
> nói rõ là chưa bao phủ toàn bộ hành vi ledger. Muốn tra mã lỗi thì dùng
> `midnight-expert` ở trên, hoặc đọc thẳng source Rust.

---

## Docker

[hub.docker.com/u/midnightntwrk](https://hub.docker.com/u/midnightntwrk)

```
midnightntwrk/proof-server:8.1.0            ledger 8 — bản project dùng
midnightntwrk/midnight-node:1.0.0           ledger 8
midnightntwrk/indexer-standalone:4.3.3      ledger 8
```

**Luôn pin tag.** `proof-server:latest` hiện trỏ 8.1.0, nhưng khi 9.x thành mặc
định thì mọi thứ vỡ mà không báo trước.

---

## Hỏi người thật

| Kênh | Dùng khi |
|---|---|
| [forum.midnight.network](https://forum.midnight.network/) | Câu hỏi kỹ thuật có thể tìm lại được. [Thread về lỗi 170](https://forum.midnight.network/t/custom-error-170-on-preprod-public-rpc-with-ledger-v8-8-0-3-but-8-1-0-deploys-fine-version-requirement-or-rpc-specific/1238) từng gỡ được một bế tắc của project này |
| [Discord](https://discord.com/invite/midnightnetwork) | Hỏi nhanh, kênh hỗ trợ dev |
| [midnight.network](https://midnight.network/) | Trang chính thức |

---

## Cuộc thi

Thể lệ, rubric, điều kiện bị loại: [01-hackathon.md](01-hackathon.md).
