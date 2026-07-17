# Knowledge Ingest: Workshop Hackathon TxOdds — 50k USD

## Summary

The public metadata identifies the source as **Workshop Hackathon TxOdds - 50k USD**, published by **Superteam Brazil**. The Firecrawl CLI could not run because this environment is not authenticated. Direct YouTube page access also did not expose a transcript or caption track, so this document records only verifiable metadata and the safe next step for ingesting the workshop content.

## Output

Metadata captured through YouTube's public oEmbed endpoint:

- Video ID: `B6r_3yPHKZ8`
- Title: `Workshop Hackathon TxOdds - 50k USD`
- Author: `Superteam Brazil`
- Channel: [@SuperteamBrazil](https://www.youtube.com/@SuperteamBrazil)
- Source: [YouTube video](https://www.youtube.com/watch?v=B6r_3yPHKZ8)
- Thumbnail: `https://i.ytimg.com/vi/B6r_3yPHKZ8/hqdefault.jpg`

## Application to CHUTE

The workshop should be used as a primary source for hackathon-specific guidance, but no implementation claim should be derived from it until the audio/transcript is available. The known TxLINE implementation baseline remains:

1. Use historical replay to generate the locked quiz snapshot.
2. Use the live score stream to update the matchday experience.
3. Use TxLINE validation proofs before final scoring.
4. Anchor proof/settlement references on Solana while keeping credentials server-side.

## Failed or Restricted Pages

- Firecrawl scrape: blocked by missing local Firecrawl authentication.
- YouTube watch page: metadata page accessible, transcript/captions not exposed in the returned HTML.

## Sources

- [Workshop Hackathon TxOdds - 50k USD](https://www.youtube.com/watch?v=B6r_3yPHKZ8)
- [Superteam Brazil channel](https://www.youtube.com/@SuperteamBrazil)
- [TxLINE World Cup documentation](https://txline.txodds.com/documentation/worldcup)

## Rerun Inputs

```text
workflow: firecrawl-knowledge-ingest
url: https://www.youtube.com/watch?v=B6r_3yPHKZ8
format: markdown
max_pages: 1
```
