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

### Nguyên nhân thật — đã xác minh 09/09/2026

DUST spend proof sinh trên state đã cũ. **Đúng như nghi ngờ, và cơ chế cụ thể
là một bug do chính bản sửa checkpoint tạo ra.**

`openFundedWallet()` chờ sync xong trước khi cho submit, nhưng điều kiện vào
vòng chờ là:

```js
if (dust === 0n) { …chờ isStrictlyComplete()… }
```

Điều kiện đó **đúng khi mọi lần chạy đều sync từ genesis**: không có DUST
nghĩa là chưa bắt kịp. Khi thêm restore-từ-checkpoint, lập luận đó gãy — ví
khôi phục báo ngay số dư đã lưu, nên `dust > 0n` khiến vòng chờ **bị nhảy
qua hoàn toàn**, và fee balancer dựng spend proof trên ảnh chụp trễ hai ngày.

Node từ chối: `Custom error: 170`.

Điểm đáng nhớ: **số dư không trả lời câu hỏi đang hỏi.** Câu hỏi là "view local
đã bắt kịp chain chưa", và chỉ `isStrictlyComplete()` trả lời được. Bản sửa
đổi điều kiện thành:

```js
const dustSynced = state.dust.progress?.isStrictlyComplete?.() === true;
if (!dustSynced) { …chờ… }
```

Bài học rộng hơn: một tối ưu (checkpoint) có thể **vô hiệu hoá một rào chắn**
ở chỗ khác mà không ai sửa rào chắn đó. Rào chắn vẫn còn nguyên trong code,
vẫn đọc như đang bảo vệ — chỉ là không còn chạy nữa.

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

## 8. `httpClientProofProvider` thiếu tham số thứ hai → `400 bad input`

Triệu chứng khi gọi circuit đầu tiên trên contract đã deploy:

```
✗ 'check' returned an error: Failed Proof Server response:
  url="http://localhost:6300/check", code="400", status="Bad Request"
```

SDK **nuốt mất body**, mà body mới là thứ nói lý do. `makeHttpRequest` chỉ đọc
`status`/`statusText`. Vá tạm để in body ra thì thấy `"bad input"`.

### Nguyên nhân

```js
httpClientProofProvider(PROOF_SERVER)                              // sai
httpClientProofProvider(PROOF_SERVER, new NodeZkConfigProvider(ASSETS))  // đúng
```

Chữ ký là `(url, zkConfigProvider, config)`. Thiếu tham số thứ hai thì
`getKeyMaterial` trả `undefined` — và nó nuốt lỗi bằng `catch {}` nên không
báo gì — rồi `createCheckPayload(preimage, undefined)` gửi đi payload không có
IR. Server từ chối.

### Vì sao deploy vẫn chạy được

Deploy chỉ chạy **constructor**, đi đường `/prove`, mà `/prove` chịu được
`keyMaterial` thiếu. `/check` thì bắt buộc cần IR. `registerIssuer` là **lời
gọi circuit đầu tiên** của dự án, nên đó là lần đầu `/check` được dùng.

Deploy thành công **không** chứng minh proof provider được cấu hình đúng.

### Bẫy chẩn đoán

`registerIssuer.bzkir` chỉ 135 byte (so với 691 của `proveCredentialPredicate`)
trông như artifact hỏng. Không phải — circuit đó chỉ làm một phép `insert` vào
Map, không có phép toán đường cong. Header `midnight:ir-source[v2]:` hợp lệ.

Sau khi sửa, `/check` trả về **5 phần tử** bình thường. Endpoint không hỏng.

### Cách lấy body lỗi khi cần

```js
// tạm trong node_modules/@midnight-ntwrk/midnight-js-http-client-proof-provider/dist/index.mjs
let body = ''; try { body = await response.clone().text(); } catch {}
throw new Error(`... body="${body.slice(0, 400)}"`);
```

Nhớ hoàn nguyên sau khi xong. Đáng mở issue với midnight-js về việc vứt body.

---

## 9. Gọi contract từ TRÌNH DUYỆT: sáu lớp bẫy nối nhau

Đường Node.js (`scripts/*.mjs` qua `testkit-js`) chạy được từ lâu. Đường
trình duyệt (ví Lace + `midnight-js-contracts`) thì **không có tiền lệ chính
thức** — `example-counter` chỉ có CLI ví headless, không có UI trình duyệt.
Tự dựng lấy thì vấp sáu lớp, mỗi lớp chỉ lộ ra sau khi gỡ xong lớp trước.

Ghi lại vì tất cả đều **đã kiểm chứng trên preprod thật**, và vì chúng có
chung một hình dạng: *SDK gọi một thứ mà ta đinh ninh nó không gọi*.

### 9.1 Ba method bị stub "never calls it" — mà SDK gọi mọi lần

Viết provider cho trình duyệt thì phải tự cài `PublicDataProvider` và
`PrivateStateProvider`. Cám dỗ là chỉ cài phần `callTx` cần, phần còn lại ném
lỗi. Sai ba lần liên tiếp:

| Method bị ném lỗi | Ai gọi |
|---|---|
| `watchForDeployTxData` | `findDeployedContract`, ngay dòng đầu |
| `queryDeployContractState` | `findDeployedContract`, dòng kế |
| `getSigningKey` / `setSigningKey` | `setOrGetInitialSigningKey`, mọi lần |

`findDeployedContract` **không phải** chỉ "tìm địa chỉ" — nó tra lại thông
tin deploy gốc và khoá maintenance authority trước khi trả `callTx` về.

**Cách tra cho dứt điểm**, thay vì sửa từng cái:

```bash
grep -o "privateStateProvider\.[a-zA-Z]*" node_modules/@midnight-ntwrk/midnight-js-contracts/dist/index.mjs | sort -u
grep -o "publicDataProvider\.[a-zA-Z]*"   node_modules/@midnight-ntwrk/midnight-js-contracts/dist/index.mjs | sort -u
```

Không phải method nào trong danh sách cũng nằm trên đường `callTx` —
`queryUnshieldedBalances` chỉ được gọi từ `getUnshieldedBalances()`, một hàm
export riêng — nên vẫn phải đọc chỗ gọi, nhưng danh sách thu hẹp việc phải đọc.

### 9.2 `setNetworkId()` — bước khởi tạo im lặng

```
Error: Network ID has not been configured.
Call setNetworkId() before any wallet or contract operation.
```

`midnight-js` giữ network id ở **module-level state**. Mọi script Node đều
gọi `setNetworkId("preprod")` (`scripts/lib/wallet-setup.mjs`,
`deploy-contract.mjs`, `register-dust.mjs`); đường trình duyệt **không ai
gọi**, và nó vỡ giữa lúc thực thi contract call chứ không phải lúc import.

Đọc state on-chain (`lib/midnight/chain.ts`) thì **không cần** — đã thử:
`ContractState.deserialize` chạy được khi chưa set. Chỉ đường dựng transaction
mới cần.

### 9.3 Hai class `ContractState` trùng tên, khác WASM build

Bẫy khó chịu nhất, vì **TypeScript không thấy được**:

```
Error: 'contractState' parameter ContractState (…nội dung ĐÚNG…) has unexpected type
```

`@midnight-ntwrk/ledger-v8` và `@midnight-ntwrk/compact-runtime`
(re-export `onchain-runtime-v3`) **đều** export một class tên `ContractState`.
Chúng là hai bản WASM riêng, và `compact-runtime` phân biệt bằng `instanceof`:

```
ledger-v8 ContractState instanceof ocrt.ContractState → false
ocrt      ContractState instanceof ocrt.ContractState → true
```

`PublicDataProvider` lấy kiểu **theo từng field**, không đồng nhất:

```ts
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
```

Nên `ContractState` phải lấy từ `compact-runtime`, còn `ZswapChainState` và
`LedgerParameters` vẫn từ `ledger-v8`. Compiler im lặng vì hai class giống
nhau về cấu trúc và đi qua ranh giới dynamic import. **Chỉ test
`toBeInstanceOf` mới bắt được** — xem `tests/browser-providers.test.ts`.

### 9.4 `watchForTxData` khớp nhầm transaction cũ → "thành công" giả

Triệu chứng tệ nhất: UI báo **Published**, link explorer mở ra một
transaction **có thật** — nhưng `proofsVerified` on-chain vẫn `0`.

Một transaction Midnight mang **nhiều identifier** (tx deploy của repo này có
2). Nếu `watchForTxData` chỉ khớp identifier mà không có mốc thời gian, một
`txId` trùng identifier của transaction đã settled từ tháng trước sẽ được
indexer trả về ngay với `status: SUCCESS` — và cả chuỗi báo thành công.

Chữa: đọc chain tip **một lần trước khi poll**, chỉ chấp nhận transaction ở
block `>= mốc`. Dùng `>=` không phải `>`: ví submit *trước* khi hàm chờ chạy,
nên transaction hoàn toàn có thể nằm đúng block đang là tip.

Không đọc được tip thì **throw**, đừng fallback — fallback chính là quay về
hành vi hỏng, và nó kích hoạt đúng lúc indexer kém tin cậy nhất.

### 9.5 `hintUsage` — vì sao ví không hiện popup

`connect()` trả về `ConnectedAPI = WalletConnectedAPI & HintUsage`. Lưu handle
ở kiểu hẹp `WalletConnectedAPI` thì `hintUsage` **không với tới được kể cả về
mặt kiểu**. Tài liệu của nó:

> *"The wallet can use these calls as an opportunity to ask user for
> permissions and in such case - resolve the promise only after the user has
> granted the permissions."*

Gọi lúc **connect**, không phải lúc publish: publish chạy một lần mỗi claim,
hint lười sẽ hỏi quyền lặp lại giữa spinner. Ví cũ không có method này thì bỏ
qua (`typeof` guard), nhưng `hintUsage` **bị từ chối** thì phải báo lỗi rõ.

### 9.6 Bytes transaction tự khai marker — dùng nó, đừng đoán

`balanceUnsealedTransaction` nhận `Transaction<SignatureEnabled, Proof,
PreBinding>`, `submitTransaction` đòi `…, Binding`, và tài liệu **không nói**
output của balancing là loại nào. Đường Node làm ba bước tách bạch
(`balanceUnboundTransaction` → `signRecipe` → `finalizeRecipe`); đường trình
duyệt làm một bước rồi *khẳng định* kết quả đã bound.

Không cần đoán: bytes serialized có **header ASCII tự mô tả**.

```
midnight:transaction[v9](signature[v1],proof,pedersen-schnorr[v1]):
                          ↑ đã ký       ↑ đã bound
```

Đã kiểm chứng bằng WASM thật:

| Kiểm | Kết quả |
|---|---|
| Marker sai khi deserialize | **Throw** `expected header tag '<x>', got '<y>'` — không bao giờ mis-decode |
| `bind()` trên tx đã bound | **Byte-identical no-op** — an toàn |
| `signature[v1]` → `()` | ví balance nhưng **chưa ký** — bắt được trước khi lên chain |

Nên đọc header rồi mới chọn marker (`lib/midnight/tx-markers.ts`), thay vì
try/catch nuốt lỗi.

### 9.7 Đổi khoá trường sau khi đã đăng ký issuer → `bad issuer signature`

Không phải bug code, nhưng tốn một transaction để chữa, nên ghi ở đây.

Issuer đăng ký lên chain ngày 30/08. Commit `6b9a567 "change key"` ngày 31/08
đổi `data/schools.json`. Từ đó khoá trường ký và khoá contract đọc là **hai
khoá khác nhau**, và circuit từ chối đúng như thiết kế:

```
Error: failed assert: bad issuer signature
```

(`contracts/src/schnorr.compact` — `s·G == R + c·pk` không thoả.)

Nó **chỉ lộ ra khi có người gọi circuit thật**, vì `generateProof()` chạy
Simulator và tự `registerIssuer` bằng khoá vừa fetch — luôn khớp với chính
nó. Ba tháng có thể trôi qua trước khi ai đó phát hiện.

Cách đối chiếu, trước khi nghi ngờ circuit:

```bash
# khoá trên chain
npm run contract:verify          # rồi đọc ledger.issuers.lookup(hashToField(schoolId))
# khoá trường đang ký
curl -s -X POST localhost:3000/api/school/<schoolId>/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ school { circuitPublicKey { x y } } }"}'
```

Lệch thì phải `npm run contract:register-issuer` lại — `issuers.insert()` ghi
đè được. **Đổi `SCHOOL_SIGNING_KEY` là một thao tác có chi phí on-chain**, không
phải sửa một dòng JSON.

Bẫy phụ gặp luôn lúc chạy: `scripts/register-issuer.mjs` gọi
`circuitPublicKey()` không tham số, trong khi `lib/school/keys.ts` đã chuyển
sang per-school lúc demo lên ba trường. Script không được cập nhật theo, và
hỏng bằng `Cannot read properties of undefined (reading 'toUpperCase')` —
một hồi quy chỉ script vận hành mới chạm tới, nên không test nào bắt.

### 9.8 Bài học chung: đừng để lỗi bị nuốt

Cả sáu lớp trên chỉ gỡ được lần lượt vì mỗi lần đều **có thông báo nêu đích
danh bước hỏng**. Thứ làm chậm nhất là một khối `catch` trong UI vứt lỗi đi
rồi lặng lẽ chuyển trang — sinh viên thấy nút "không phản ứng gì", và mọi
chẩn đoán bên dưới thành vô dụng.

Kèm theo: `(e as Error).message` không đủ. Extension ví có thể reject bằng
thứ không phải `Error`, khi đó `.message` là `undefined` và alert hiện **rỗng**
— vẫn là "im lặng" dưới mắt người dùng. Xem `lib/midnight/errors.ts`.

---

## 10. Test tự sinh khoá thì không bao giờ bắt được khoá lệch

Lớp thứ bảy, và là lớp đắt nhất — vì nó **không phải bug code**. Sau khi gỡ
xong sáu lớp ở mục 9, circuit chạy thật trên preprod và trả về:

```
failed assert: bad issuer signature
```

Đây thực ra là **tin tốt**: transaction dựng được, proof sinh được, circuit
thực thi và đánh giá dữ liệu thật. Circuit đang làm **đúng** việc của nó —
từ chối một chữ ký không khớp registry.

Nguyên nhân là dữ liệu lệch pha theo thời gian:

| | Khoá x |
|---|---|
| Ghi lên chain 30/08 | `34352304742157505789…` |
| Trường ký từ 31/08 | `1856538893262863716…` |

Commit `6b9a567 "change key"` sửa `SCHOOL_SIGNING_KEY` **sau** khi issuer đã
đăng ký. `circuitSigningKey()` phái sinh khoá JubJub từ chính env var đó, nên
đổi env var là đổi luôn khoá circuit — còn registry trên chain thì đứng yên,
vì chain không có cách nào biết.

### Vì sao 311 test xanh vẫn không thấy

`contracts/tests/circuit.test.ts` phủ circuit rất kỹ, nhưng mọi case đều dựng
issuer bằng `School.create()` — **sinh khoá ngẫu nhiên mỗi lần chạy**. Test
vừa đăng ký vừa ký bằng cùng một khoá nó tự tạo ra, nên **về mặt cấu trúc
không thể** phát hiện hai nửa bất đồng. Nó kiểm tra circuit, không kiểm tra
cấu hình.

Đây là dạng lỗ hổng chỉ thấy khi hỏi: *"test này còn xanh được không nếu
production hỏng?"*

### Cách chữa: một test dùng khoá THẬT

`contracts/tests/real-issuer.test.ts` cố ý **không** sinh khoá. Nó lấy
`circuitPublicKey()` từ `lib/school/keys.ts` và chữ ký từ `signForCircuit()`
trong `lib/school/credential.ts` — đúng hai hàm app thật gọi. Khoá đăng ký và
khoá ký lệch nhau là nó đỏ ngay, cùng một message, trong một giây, không mất
phí.

Đã kiểm chứng đỏ-rồi-xanh: đăng ký khoá cũ → `failed assert: bad issuer
signature`, y hệt chain trả về.

### Tra khoá lệch trong 10 giây

```bash
# Khoá trường đang ký
node --env-file-if-exists=.env.local --experimental-strip-types \
  -e 'const {circuitPublicKey}=await import("./lib/school/keys.ts");
      console.log((await circuitPublicKey("hanoi-university")).x.toString())'

# Khoá đang nằm trên chain — đọc thẳng từ indexer, không tin UI
# (contractAction → ContractState.deserialize → ledger(...).issuers)
```

Hai số phải bằng nhau. Không bằng → chạy `npm run contract:register-issuer`.

### Hệ quả rút ra

`registerIssuer` dùng `issuers.insert()`, tức **upsert** — đăng ký lại ghi đè
tại chỗ, `issuers.size()` vẫn là 1, không sinh entry rác. Đã xác minh bằng
simulator trước khi tiêu DUST.

**Luật:** đổi `SCHOOL_SIGNING_KEY` là một thay đổi **có mặt trên chain**. Đổi
xong phải đăng ký lại, nếu không mọi proof sau đó đều hỏng — và hỏng ở nơi
đắt nhất để phát hiện.

---

---

## 11. Chẩn đoán lỗi dựng transaction mà KHÔNG tốn ví, không tốn DUST

Sau khi sửa khoá issuer, `contract:register-issuer` chạy hết 180 phút sync rồi
chết ở bước cuối:

```
✗ Unexpected error executing scoped transaction '<unnamed>': Error: expected instance of StateValue
  caused by: expected instance of StateValue
```

Đã kiểm chứng: **không có gì lên chain, không mất DUST** — lỗi xảy ra lúc
*dựng* transaction, trước khi submit. `proofsVerified` vẫn 0, khoá vẫn là khoá
cũ.

### Bẫy: đừng lặp lại vòng 3 tiếng để thử một giả thuyết

Phản xạ sai là sửa một dòng rồi chạy lại `contract:register-issuer` — mỗi lần
tốn hàng giờ. `midnight-js-contracts` **export sẵn** entry point tầng dưới:

```js
const mjc = await import("@midnight-ntwrk/midnight-js-contracts");
await mjc.createUnprovenCallTxFromInitialStates(zkConfigProvider, {
  compiledContract, contractAddress, circuitId, coinPublicKey,
  initialContractState, initialZswapChainState, ledgerParameters,
  initialPrivateState, args,
}, encryptionPublicKey);
```

Nó chạy **đúng circuit thật, trên state thật lấy từ indexer**, mà không cần
ví, không sinh proof, không tốn phí — vài chục giây. Đây là cách tái hiện lỗi
để thử giả thuyết.

Hai lưu ý về tham số, cả hai đều mất thời gian mới ra:

| Tham số | Đúng là |
|---|---|
| `coinPublicKey` | **hex thô** qua `parseCoinPublicKeyToHex(...)`, không phải chuỗi bech32 `mn_shield-cpk_…` |
| kết quả `unprovenTx` | nằm ở **`result.private.unprovenTx`**, không phải `result.public` |

Sai kiểu `coinPublicKey` cho ra lỗi lạc đề (`bech32.decode input: string
expected`, hoặc `Invalid hex-digit 'm' at index 0`) — chúng nói về probe, không
phải về bug đang tìm.

### Đường đi của một call, để biết lỗi rơi ở khúc nào

`submitTxCore` (midnight-js-contracts) có đúng ba chặng:

```
proofProvider.proveTx()  →  walletProvider.balanceTx()  →  midnightProvider.submitTx()
```

Cộng thêm chặng dựng trước đó. Bốn chặng, tách được từng cái:

| Chặng | Cần gì | Tốn phí? |
|---|---|---|
| dựng unproven tx | indexer + contract đã build | không |
| `proveTx` | proof server 8.1.0 | không |
| `balanceTx` | ví đã sync + DUST | không |
| `submitTx` | — | **CÓ, và không hoàn tác được** |

Chạy ba chặng đầu là an toàn tuyệt đối. Chỉ `submitTx` mới ghi lên chain.

### `StateValue` cũng là một cái tên bị trùng ở ba package

Giống hệt bẫy `ContractState` ở mục 9.3. Đã đo:

```
compact-runtime.StateValue === onchain-runtime-v3.StateValue   → true
ledger-v8.StateValue        === compact-runtime.StateValue      → false
```

`compact-js/effect/ContractExecutable.js` chuyển đổi giữa hai runtime bằng
`LedgerStateValue.decode(queryContext.state.state.encode())` — nên state đưa
vào **phải** là của `compact-runtime`. Đã xác minh
`indexerPublicDataProvider` trả đúng loại đó (`midnight-js-protocol/compact-runtime`,
cùng class với `compact-runtime`), và chuyển đổi chạy trơn.

Cũng lưu ý `ContractState.deserialize(...).data` là **`ChargedState`**, không
phải `StateValue` — `.data.state` mới là `StateValue`. Nhầm chỗ này sẽ đi tìm
sai hướng.

### Kết quả tách chặng: circuit và proof server đều KHÔNG sai

Chạy ba chặng đầu với khoá thật, ví thật, state thật từ indexer:

```
STAGE 1 OK - unprovenTx: Transaction      ← circuit chạy đúng trên state thật
STAGE 2 OK - provenTx: Transaction        ← proof server sinh proof thật, thành công
STAGE 3 balanceTx ...
```

Nghĩa là `expected instance of StateValue` **không** nằm ở circuit, không nằm ở
việc dựng transaction, và không nằm ở proof server. Hai chỗ đáng nghi nhất đã
bị loại trừ bằng đo đạc chứ không phải suy luận.

Điều này cũng bác bỏ giả thuyết ban đầu của tao — rằng state lấy từ indexer bị
sai runtime. Nếu đúng vậy thì STAGE 1 đã chết.

### Checkpoint là thứ khiến việc chẩn đoán khả thi

Lần sync nguội đầu ghi `.wallet-state/dust.<tag>.json` (11 MB) **trước khi**
submit. Nhờ đó mọi lần chạy sau restore trong vài giây thay vì 3 tiếng:

```
restoring dust state from 1 minutes ago … ok
DUST     22207187414999999999
```

Nếu không có nó thì mỗi giả thuyết tốn 3 tiếng, và việc gỡ lỗi này sẽ không
làm nổi.

## 12. Ví trình duyệt không inject vào HTTP qua IP

Triệu chứng: bấm "Connect a wallet" mà **không hiện ví nào**, dù Lace đã cài và
chạy tốt ở tab khác.

Nguyên nhân không nằm trong code app. Extension ví chỉ bơm `window.midnight`
vào **secure context** — HTTPS, hoặc `localhost`/`127.0.0.1`. Mở app qua
`http://<IP>:3000` thì không phải secure context, nên `window.midnight` là
`undefined` và `installedWallets()` trả mảng rỗng. Nó **đúng**: không có ví nào
để thấy.

Bẫy này chỉ xuất hiện khi **server ở xa còn trình duyệt ở máy khác** — chạy mọi
thứ trên một máy thì không bao giờ gặp.

### Kèm theo: `localhost` trong `NEXT_PUBLIC_*` là localhost CỦA TRÌNH DUYỆT

Cùng một setup remote còn sinh ra một lỗi anh em, dễ hiểu sai hơn:

```
'check' returned an error: TypeError: Failed to fetch
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

`NEXT_PUBLIC_PROOF_SERVER=http://localhost:6300` được **trình duyệt** đọc, nên
`localhost` trỏ về máy người dùng — nơi không có proof server. Server chạy proof
server hoàn toàn khoẻ, `curl` từ server ra 200, và vẫn hỏng.

Phân biệt nhanh: `ERR_CONNECTION_REFUSED` là *không có gì lắng nghe ở đó*, khác
hẳn CORS (bị chặn nhưng có server) và khác timeout.

### Cách chữa: SSH tunnel, không phải mở cổng ra internet

```bash
# Trên MÁY CỦA MÌNH, không phải server:
ssh -p <cong-ssh> -L 3000:localhost:3000 -L 6300:localhost:6300 root@<server-ip>
# rồi mở http://localhost:3000
```

**Kiểm tra cổng SSH trước khi gõ lệnh** — `grep ^Port /etc/ssh/sshd_config`.
Máy này chạy SSH ở **2026**, không phải 22, và lệnh thiếu `-p` thì không bao
giờ kết nối. Triệu chứng lại **giống hệt** proof server hỏng: trang mở được
(qua đường khác), ví nối được, rồi chết ở `Failed to fetch` vì
`localhost:6300` trên máy người dùng rỗng.

Cách kiểm tra tunnel đã lên chưa, trước khi mở app: vào `http://localhost:6300/health`
trên máy mình. Có `{"status":"ok"}` là được.

Phân biệt nhanh khi nghi proof server chết — đọc log của nó:

```bash
docker logs --since 5m eduproof-proof-server
```

**Không có request nào** nghĩa là trình duyệt chưa từng chạm tới, tức lỗi nằm ở
đường mạng chứ không phải ở proof server. Kiểm tra thêm: `ss -tn | grep :3000`
không thấy kết nối từ IP ngoài, và `ss -tn | grep :2026` không thấy phiên SSH.

Một lệnh giải quyết cả hai: trình duyệt thấy `localhost` nên ví inject, và
`localhost:6300` cũng có thật nhờ forward.

Cách khác — mở proof server ra IP public — chạy được nhưng **không nên**: proof
server **nhìn thấy witness**, tức toàn bộ giá trị credential mà cả thiết kế này
sinh ra để giấu ([32-deployment.md](32-deployment.md)). Phơi nó ra internet
không xác thực là đánh đổi thật, không phải chi tiết vặt.

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
