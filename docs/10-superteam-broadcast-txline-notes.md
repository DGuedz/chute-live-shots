# Knowledge Ingest: Superteam Brasil — World Cup / TxLINE

## Summary

The public X broadcast could not be extracted as text: the X page returned an empty HTML document to the browser scraper, and the local Firecrawl CLI is not authenticated. The attached frame was therefore treated as visual evidence only and cross-checked against the official TxLINE World Cup documentation.

## Confirmed signals

| Signal | CHUTE implication | Status |
|---|---|---|
| Free World Cup tier / no TxL card | We can prototype without purchasing TxL; keep the user experience on paper/devnet for the hackathon. | Confirmed in docs |
| SOL still required | A wallet is needed for the on-chain subscription transaction and network fees, even when the data tier is free. | Confirmed in docs |
| Mainnet SL1 | 60-second delayed World Cup and international-friendlies data. | Confirmed in docs |
| Mainnet SL12 | Real-time World Cup and international-friendlies data. | Confirmed in docs |
| Historical replay | Use replay/history for the pre-quiz intelligence panel and deterministic demo. | Confirmed in docs |
| On-chain validation | Persist proof references and validate before final scoring/settlement. | Confirmed in docs |

## Architecture decision

For CHUTE, the correct split is:

1. Historical replay/snapshots feed the analysis panel and quiz generation.
2. The live scores stream updates the match tracker after the snapshot is locked.
3. The proof endpoint validates the source used for scoring.
4. Solana stores the verifiable anchor/settlement reference; it does not replace the TxLINE source.

The UI should label the selected source and freshness explicitly: `TxLINE replay`, `TxLINE live`, `sourceTimestamp`, `snapshotId`, and `proofRef`.

## Activation constraints

The network must remain consistent across Solana RPC, TxLINE program, guest JWT, activation endpoint, and wallet. Mainnet and devnet credentials/signatures must never be mixed. The activated token and JWT stay server-side in the worker; they must not reach the Telegram Mini App.

Current project state: the worker has the devnet adapter and fail-closed `MISSING_DATA` behavior, but activation still requires a real wallet subscription transaction and wallet signature. No signature or API credential was fabricated.

## Failed or restricted pages

- X broadcast: no transcript or structured content exposed by the public page.
- Firecrawl CLI: not authenticated in the local environment, so no Firecrawl extraction artifact was produced.

## Sources

- [TxLINE World Cup Free Tier](https://txline.txodds.com/documentation/worldcup)
- [Broadcast supplied by the user](https://x.com/i/broadcasts/1DGleervnnoJL?s=20)

## Rerun inputs

```text
workflow: firecrawl-knowledge-ingest
url: https://x.com/i/broadcasts/1DGleervnnoJL?s=20
format: markdown
max_pages: 1
```
