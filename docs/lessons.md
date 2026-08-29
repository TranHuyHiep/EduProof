# Bài học khi tích hợp Midnight

Những chỗ mất nhiều thời gian nhất, ghi lại để không lặp. Toàn bộ đều đã kiểm
chứng trên preprod, không phải suy đoán.

Chi tiết kỹ thuật đầy đủ, kèm log và số liệu: [wave-1-plan.md](wave-1-plan.md).

---

## 1. Ma trận phiên bản là nguồn sự thật, không phải "bản mới nhất"

<https://docs.midnight.network/relnotes/support-matrix> — **đọc TRƯỚC khi cài gì.**

Preprod, 29/08/2026:

| Thành phần | Bản đúng |
|---|---|
| Node | 1.0.2 |
| Compact devtools | 0.5.1+ |
| **Compact toolchain** | **0.31.1** (→ language 0.23, runtime 0.16, ledger 8) |
| **Midnight.js** | **4.1.1** |
| **Wallet SDK** | **`@midnight-ntwrk/wallet-sdk` 1.2.0** |
| testkit-js | 4.1.1 |
| Proof server | 8.1.0 |
| Indexer | **api/v4** |

Ba sai lầm đã mắc:

- Cài toolchain **0.34.0** vì nó mới nhất → sinh contract **ledger 9**, mà
  preprod chạy **ledger 8**. Release notes của 0.34.0 ghi rõ *"ledger 9 will be,
  but is not yet, deployed… continue to use toolchain 0.31.x"* — đọc lướt qua.
- Dùng `@midnight-ntwrk/wallet` 5.0.0. **Sai package.** Matrix ghi "Wallet SDK
  1.2.0" là `@midnight-ntwrk/wallet-sdk`, và cách chính thức là
  `MidnightWalletProvider.build()` của **`testkit-js`**, không phải `WalletBuilder`.
- Dùng indexer **api/v3**. Phải là **v4**.

Triệu chứng của cả ba giống hệt nhau: `Wallet sync timeout after 90000ms` —
không nói gì về nguyên nhân.

> **Nguồn tốt nhất không phải docs mà là code mẫu chính thức:**
> `github.com/midnightntwrk/example-bboard` — có `bboard-cli` với launcher
> `preprod-remote`, `wallet-utils.ts`, `midnight-wallet-provider.ts`.
>
> Endpoint nên lấy từ
> `new PreprodTestEnvironment(logger).getEnvironmentConfiguration()` chứ
> **đừng hardcode** — nó tự trả cả faucet URL.

### Hệ quả: hai runtime xung khắc trong cùng một cây dependency

```
compact-runtime 0.19.0  → @midnightntwrk/onchain-runtime-v4   (ledger 9)
midnight-js     4.1.1   → @midnight-ntwrk/ledger-v8           (ledger 8)  ← preprod
```

Contract build ra hard-assert `checkRuntimeVersion('0.19.0')`. Nguy hiểm ở chỗ
nó **không lỗi sớm**: module import được, verifier key đọc được bình thường. Chỉ
vỡ lúc dựng transaction, tức là sau khi đã tốn phí.

`npm run contract:build` giờ pin cứng 0.31.1 để không tái phạm.

---

## 2. Có NIGHT không có nghĩa là trả được phí

Phí trả bằng **DUST**, và DUST **không xin faucet được**. Nó tích dần từ NIGHT
đã được **đăng ký sinh DUST**, và bản thân việc đăng ký là một transaction.

Không có chicken-and-egg: transaction đăng ký **tự trả phí cho chính nó** bằng
lượng DUST mà UTXO *đáng lẽ đã sinh ra* kể từ lúc nó tồn tại — ledger hồi tố
(xem `allow_fee_payment` trong `midnight-ledger/spec/dust.md`).

```
xin NIGHT từ faucet  →  npm run wallet:register-dust  →  deploy
```

### `estimateRegistration()` treo trên ví lạnh

Nó gọi `waitForSyncedState()` bên trong, mà dust wallet sync **từ genesis**:
preprod hơn 1.46 triệu index, tốc độ ~300 index/giây → **hàng giờ**, và không
lưu tiến độ giữa các lần chạy. Nó không báo lỗi, chỉ đứng im.

Cách thay thế: `estimateDustGeneration()` — phép chiếu thuần từ `ctime` của UTXO
và đồng hồ hiện tại, không cần sync. Trả lời cùng một câu hỏi trong một giây.

**Nhưng:** khi *submit* thì fee balancer lại tiêu từ **view local**, nên vẫn
phải đợi dust wallet sync đủ để thấy DUST — nếu không sẽ chết ở bước cuối với
`Insufficient Funds: could not balance dust`. Script deploy giờ đợi và in tiến độ.

Đọc `dust.balance(now) == 0` **không chứng minh được là hết tiền** — nó có thể
chỉ là chưa sync. Cái đáng tin là `registeredForDustGeneration` trong metadata
của UTXO, vì nó đến từ unshielded wallet (sync trong vài giây).

**Liệu pháp duy nhất là chờ.** Đo trên preprod 29/08: ~280 index/giây trên
~1.46 triệu index → khoảng **90 phút** cho một lần sync nguội. Đừng đặt timeout
theo cảm tính: bản đầu tao để 45 phút, nó tự huỷ ở 46% sau 40 phút chờ, và vì
tiến độ **không lưu giữa các tiến trình** nên lần sau phải bắt đầu lại từ 0.

`DustWallet` có `serializeState()` / `restore()`, nhưng `testkit-js` không mở
chúng ra: `MidnightWalletProvider.build()` chỉ nhận `(logger, env, seed)`. Muốn
lưu tiến độ phải bỏ testkit và tự dựng wallet — chưa làm, ghi lại để cân nhắc
nếu phải deploy nhiều lần.

Thêm một chi tiết làm việc chờ lâu hơn: DUST chỉ xuất hiện ở đoạn cuối của
sync, vì UTXO vừa được đăng ký gần đây nên sự kiện của nó nằm sát đầu chain.
Chờ `balance > 0` gần như là chờ sync xong.

---

## 3. Cắt seed BIP39 xuống 32 byte → mở nhầm một ví khác, rỗng

Đây là cái tốn thời gian nhất, và **không có gì báo lỗi cả**.

`testkit` dùng **đủ 64 byte**:

```js
// testkit-js/dist/index.mjs:1665
const seed = Buffer.from(mnemonicToSeedSync(mnemonic)).toString('hex');
```

Script ban đầu cắt `.subarray(0, 32)`. Master seed là gốc của cây HD, nên cắt nó
đi sẽ ra **cây khác**. Cùng mnemonic, cùng account 0 / index 0:

```
đủ 64 byte    → mn_addr_preprod1sxtmgj4…qj84tnl   ← ví mà GUI hiển thị
32 byte đầu   → mn_addr_preprod1h0kexza…q4tvz9a   ← ví hợp lệ, nhưng rỗng
```

Cả hai đều là ví thật. Triệu chứng: tiền gửi vào địa chỉ mà ví GUI hiện ra
"không thấy đâu", và deploy chết vì thiếu phí — trông y hệt lỗi faucet hoặc DUST.

> Trước đây tao ghi nhận nhầm nguyên nhân là "Lace dùng derivation path khác".
> Không phải. Là do cắt seed.

---

## 4. `testkit-js` log master seed ở mức INFO

Script deploy phải chạy logger `silent` ghi vào `/dev/null`:

```js
const logger = pino({ level: "silent" }, pino.destination("/dev/null"));
```

Nâng `DEPLOY_LOG_LEVEL` lên để debug thì seed sẽ hiện ra trên terminal.

---

## 5. `jubjubSchnorrVerify` chưa có trên ledger 8

Nó là builtin của language 0.26 (toolchain 0.34.0), không có trong 0.23. Midnight
xác nhận đây là **polyfill tạm thời** và tự cài là cách đúng hiện nay.

`ecMulGenerator`, `ecMul`, `ecAdd`, `jubjubPointX`, `jubjubPointY` **đều có** trên
0.23, nên `s·G == R + c·pk` viết tay được — xem
[contracts/src/schnorr.compact](../contracts/src/schnorr.compact).

Một điểm cần cẩn thận: tự cài Schnorr **thêm một witness mới**
(`getSchnorrReduction`) mà builtin không có. Prover tự nộp phép chia challenge
hash. Nếu circuit không kiểm tra chặt, prover chọn được challenge tùy ý →
giả mạo chữ ký cho **bất kỳ** khóa nào. Circuit phải ràng buộc
`q·2^248 + rest == cFull` với `q < 116`, và
[contracts/tests/reduction.test.ts](../contracts/tests/reduction.test.ts) nộp các
split sai có chủ đích để chứng minh nó không lừa được.
