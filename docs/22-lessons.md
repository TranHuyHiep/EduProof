# Bài học khi tích hợp Midnight

Những chỗ mất nhiều thời gian nhất, ghi lại để không lặp. Toàn bộ đều đã kiểm
chứng trên preprod, không phải suy đoán.

Chi tiết kỹ thuật đầy đủ, kèm log và số liệu: [10-wave-1-plan.md](10-wave-1-plan.md).

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

---

## 6. Ví sync xong, DUST đủ, proof sinh được — node vẫn từ chối

Triệu chứng, sau khoảng 130 phút sync:

```
synced enough — DUST 134752099999999999
deploying — this generates a zero-knowledge proof and may take minutes …
1010: Invalid Transaction: Custom error: 170
✗ Transaction submission error
```

`1010: Invalid Transaction` là mã chuẩn Substrate. `Custom error: 170` là mã do
runtime Midnight định nghĩa, và bảng mã chính thức
([midnight-expert/plugins/midnight-status-codes](https://github.com/midnightntwrk/midnight-expert/tree/main/plugins/midnight-status-codes),
đối chiếu `midnight-node/ledger/src/versions/common/types.rs`) dịch nó là:

```
170  InvalidDustSpendProof   "The dust spend proof is invalid."
     fix: "Regenerate the dust spend proof using the proof server"
```

**Node từ chối proof của phần trả phí DUST, không phải proof của contract.**
Circuit, witness và bản build ledger 8 đều đã chạy đúng tới tận bước submit —
nên đừng đi sửa circuit.

Các mã lân cận giúp loại trừ nhanh: 169 `InvalidDustRegistrationSignature`,
171 `OutOfDustValidityWindow`, 173 `InsufficientDustForRegistrationFee`,
174 `MalformedContractDeploy`, 179 `UnsupportedProofVersion`. Thiếu tiền là 173,
sai ledger line là 179 — không phải 170.

### Nguyên nhân đã loại trừ

Nghi ngờ đầu tiên là lệch phiên bản proof-server ↔ ledger, vì có
[thread forum trùng khớp](https://forum.midnight.network/t/custom-error-170-on-preprod-public-rpc-with-ledger-v8-8-0-3-but-8-1-0-deploys-fine-version-requirement-or-rpc-specific/1238)
và đội Midnight xác nhận cơ chế đó. **Nhưng ở repo này thì không phải:**

```
proof-server chạy thực tế   midnightntwrk/proof-server:8.1.0  (local, cổng 6300)
@midnight-ntwrk/ledger-v8   8.1.0
```

Hai bên đã khớp sẵn. Điểm dễ nhầm: `scripts/deploy-contract.mjs` đọc biến
`PROOF_SERVER` (mặc định `http://localhost:6300`), **không** đọc
`NEXT_PUBLIC_PROOF_SERVER` — biến đó chỉ dành cho trình duyệt. Nên việc
`.env.local` thiếu `NEXT_PUBLIC_PROOF_SERVER` là vô can. Kiểm tra bằng
`docker ps | grep 6300` trước khi đi theo hướng version.

### Giả thuyết còn lại

DUST spend proof sinh trên state đã cũ. Ví mất hơn hai tiếng để sync, nên tới
lúc submit thì ảnh chụp DUST không còn khớp chain. Chưa xác minh được.

### Vì sao việc này đắt

Tiến trình chết là mất toàn bộ sync — testkit không lưu state giữa các lần chạy,
`MidnightWalletProvider.build()` chỉ nhận `(logger, env, seed)`. Mỗi lần thử mù
tốn hơn hai tiếng chỉ để quay lại đúng điểm cũ.

Hai thứ giảm giá phải trả:

- `scripts/dust-checkpoint.mjs` — `dust.serializeState()` ra
  `.dust-checkpoint.json`. Chỉ lưu được **sau khi sync xong hoàn toàn**; SDK
  không cho lấy state dở dang.
- Dựng stack local bằng `LocalTestEnvironment` của testkit (cần `compose.yml`
  ở thư mục làm việc, service `node_${TESTCONTAINERS_UID}`, `indexer_…`,
  `proof-server_…`) — ví genesis có sẵn tiền, mỗi vòng thử tính bằng phút.
  Lưu ý local **không tái hiện được lỗi 170**: node dev gần như không thu phí,
  nên chỗ hỏng bị bỏ qua chứ không phải được chữa. Local xác minh code đúng,
  không xác minh lỗi đã hết.

### Đừng in mỗi `error.message`

Handler cũ chỉ in `error.message` để tránh lộ seed, và lý do node từ chối nằm
trong `cause` đã không bao giờ tới log — mất luôn phần chẩn đoán của một lần
chạy hai tiếng. Bản hiện tại in cả `cause`, `code`, `data`, và mask mọi chuỗi
hex từ 32 ký tự trở lên.

---

## 7. Sync lại từ đầu mỗi lần — và cách chữa

Ví dust sync từ genesis (~1.46 triệu index, ~2.5 giờ trên Preprod) và testkit
vứt state đi khi tiến trình kết thúc. Hai transaction là hai lần sync.

### testkit không có đường khôi phục — nhưng các gói dưới nó thì có

Tìm trong `testkit-js` sẽ thấy đường cụt, và **đó là kết luận sai**:

| Trong testkit | Thực tế |
|---|---|
| `MidnightWalletProvider.build()` | chỉ nhận `(logger, env, seed)` |
| `FluentWalletBuilder` | có `withSeed`, không có `withState` |
| `WalletSaveStateProvider.save()` | chỉ nhận **shielded/unshielded**, không nhận dust |
| `WalletFactory.restoreShieldedWallet` | shielded, không phải dust |

Nhưng mọi mảnh testkit dùng bên trong đều được **các gói gốc export**:

```
createKeystore                     wallet-sdk-unshielded-wallet
DustWallet(config).restore(state)  wallet-sdk-dust-wallet
WalletEntrySchema                  wallet-sdk-facade
mergeWalletEntries                 wallet-sdk-facade
InMemoryTransactionHistoryStorage  wallet-sdk-abstractions
ZswapSecretKeys, DustSecretKey     ledger-v8            ← KHÔNG phải compact-runtime
WalletFactory, WalletSeeds         testkit-js
MidnightWalletProvider.withWallet  testkit-js
```

Ghép lại là dựng được đúng ví testkit dựng, chỉ thay **một** chỗ: dust wallet
đến từ `restore(savedState)` thay vì `startWithSeed(...)`.

Cài đặt: [scripts/lib/wallet-restore.mjs](../scripts/lib/wallet-restore.mjs),
nối vào [scripts/lib/wallet-setup.mjs](../scripts/lib/wallet-setup.mjs).

### Ba điều dễ sai

**Lưu ở đường ra, không lưu trong nhánh đợi sync.** Khôi phục thành công thì
DUST đã khác 0, nhánh `if (dust === 0n)` không chạy — checkpoint sẽ không bao
giờ được làm mới.

**Checkpoint hỏng không được làm hỏng việc.** JSON hỏng → `readCheckpoint` trả
`null`; state rác → `providerFromCheckpoint` ném lỗi bắt được → quay về sync
đầy đủ. Cả hai đã thử bằng file hỏng thật.

**Đừng commit.** File dẫn xuất từ seed. `.wallet-state/` đã gitignore.

**Dust wallet có `costParameters` riêng, khác cái của facade.** testkit dựng nó
từ `DEFAULT_DUST_OPTIONS` với **ba** trường:

```js
costParameters: {
  ledgerParams: LedgerParameters.initialParameters(),   // từ ledger-v8
  additionalFeeOverhead: 0n,
  feeBlocksMargin: 5,
}
```

Thiếu `ledgerParams` thì ví khôi phục sync đúng nhưng **tính phí sai** — kiểu
hỏng không báo lỗi, chỉ lộ ra lúc node từ chối transaction. Log của testkit ở
mức INFO có in `Creating dust wallet with params: …`, đối chiếu được.

### Ba thứ Midnight không đảm bảo, nên tự phòng

Hỏi support thì được xác nhận: **không có tài liệu nào** nói checkpoint cũ tới
mức nào thì hỏng, `restore()` có kiểm tra network/seed không, hay format có
tương thích giữa các phiên bản không. Nên code tự phòng cả ba:

**Kiểm tra progress sau khi khôi phục.** testkit của Midnight cũng không tin
restored state — nó so applied với highest rồi fallback nếu vô lý. Bản của
mình: `appliedIndex > highestRelevantWalletIndex` nghĩa là state không thuộc
chain này (sai network, hoặc chain đã reset) → sync lại từ đầu.

**Ghi version vào checkpoint.** `serializeState()` có `protocolVersion` nội bộ
nhưng không cam kết đọc được sau khi nâng cấp. Lệch version thì bỏ file. Mất
một checkpoint tốn một lần sync; nạp file thư viện không còn hiểu có thể tốn
một transaction.

**Đọc version thẳng từ `node_modules`.** Export map của
`wallet-sdk-dust-wallet` chặn cả `import.meta.resolve` lẫn `require.resolve`,
kể cả với chính `package.json` của nó (`ERR_PACKAGE_PATH_NOT_EXPORTED`). Dùng
resolver sẽ trả `"unknown"`, và khi đó **mọi** checkpoint đều bị bỏ — tính năng
im lặng vô dụng, triệu chứng giống hệt "chưa có checkpoint". Đã suýt ship lỗi
này; chỉ lộ ra vì có test cả hai chiều khớp/lệch.

### Vẫn nên đếm trước số transaction

Checkpoint không xoá được cái giá của lần sync **đầu tiên**. Wave 1 cần hai
transaction (deploy, đăng ký issuer); gộp đăng ký vào ngay sau deploy trong
cùng tiến trình thì chỉ mất một lần chờ.

Verify proof thì **đọc** chain (`lib/midnight/chain.ts`) — không ví, không
sync, không phí.

---

## Ma trận phiên bản ledger 8 — tra một lần, dùng mãi

Link tài liệu, endpoint Preprod và phiên bản đang chạy:
[23-references.md](23-references.md).

Nguồn: [ma trận chính thức](https://docs.midnight.network/relnotes/support-matrix)
và `standalone.yml` của [midnight-local-dev](https://github.com/midnightntwrk/midnight-local-dev).

| Thành phần | Ledger 8 | Chạm vào là sang ledger 9 |
|---|---|---|
| `midnightntwrk/midnight-node` | **1.0.0**, 1.0.1 | 2.0.0-rc.*, 2.1.0-beta.* |
| `midnightntwrk/indexer-standalone` | **4.3.3** (preprod: `4.3.3-hotfix`) | 4.4.0-* |
| `midnightntwrk/proof-server` | **8.1.0** | 9.0.0-rc.* |
| Compact toolchain | **0.31.1** (language 0.23) | 0.34.0 |
| `@midnight-ntwrk/compact-runtime` | **0.16.0** | 0.19.0 |

`proof-server:latest` hiện trỏ 8.1.0, nhưng đó là quả bom hẹn giờ — luôn pin tag.

Muốn dựng stack local: testkit `LocalTestEnvironment` cần `compose.yml` ở thư mục
làm việc với service `node_${TESTCONTAINERS_UID}`, `indexer_…`, `proof-server_…`.
Healthcheck của node phải chốt ở **block #1 tồn tại**, không phải chỉ cổng RPC trả
lời — indexer resolve block #1 ngay khi khởi động và chết nếu node còn ở genesis.

Lưu ý local **không tái hiện được lỗi 170**: node dev gần như không thu phí DUST.
