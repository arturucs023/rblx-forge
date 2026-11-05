---
name: Roblox Reference Research
description: Find, verify, and organize visual references for Roblox builds. Use it when a build needs a look, before art direction, or to grow the local reference library.
---

# roblox-reference-research

References are evidence, not decoration. Every image the project keeps must be real, on disk, licensed for local use, and indexed. Never invent URLs, authors, or licenses. If a candidate cannot be verified, it does not enter the library.

## Objective

1. Answer a visual question ("medieval stone wall", "warm interior light") with 2–4 concrete images from `references/`.
2. Verify each new image: stable direct URL, real file (magic bytes + rendered preview), exact license + author + source page.
3. Keep the index (`docs/REFERENCE_LIBRARY.md`) truthful: name, category, file, source URL, author, license, description, tags, date.

## Scope and limits

- Covers: local search, vetting with license criteria, honest download, attribution, and moodboards.
- Does NOT generate images or do concept art (that is manual/external work).
- Does NOT approve dubious licenses: when in doubt, the candidate is rejected.

## Use cases

- A build needs a look and must be answered with real references.
- Growing `references/` with a new category.
- Auditing that the index and files are still valid.

## Step-by-step process

1. **Search locally first.** List matching files under `references/`; prefer them over the web. Cite paths, not impressions.
2. **Web fallback.** File: pages on Wikimedia Commons (verify with `imageinfo`/`extmetadata`: artist, `LicenseShortName`), or CC0 libraries whose license page you actually open (e.g. kenney.nl). Allowed: CC0, public domain, CC BY, CC BY-SA. Rejected: "free download" pages without a license, search-engine thumbnails, expiring/tokenized URLs, AI wallpaper farms.
3. **Honest download.** Prefer `thumb.wikimedia.org` variants with size when the full host limits; record which variant was saved. Verify magic bytes (`FF D8 FF` JPEG / `89 50 4E 47` PNG) and open the image yourself.
4. **Attribution.** CC BY / CC BY-SA require credit: author + license + link in the index. CC0/PD also record author and source.
5. **Moodboards.** A moodboard is a set of files + one intent line per image ("wall texture rhythm", "night palette"), never a generated image presented as reference.

## Technical knowledge

- Licenses: CC0/PD (free use), CC BY (attribution), CC BY-SA (attribution + share alike). Formats and magic bytes for verification.

## Best practices

- Verify before indexing, always in that order.
- One image, one complete index row; no half rows.
- Periodically recheck that source links are still alive.

## Common mistakes

- Saving from the search preview and inventing author/license.
- Mixing generated concept art into the reference library (AI outputs go in `references/concept-art/` clearly labeled, never as references).
- Empty category folders "for later": only indexed files count.

## Quality and done criteria

- [ ] Each indexed image opens, matches its description, and has source + author + license recorded.
- [ ] No broken links, no unattributed CC BY/SA, no empty folders.
- Verification: reopen each file; recheck one random source URL per batch. If the model cannot display images in the current session, say so explicitly and mark visual checks as NOT VERIFIED.

## Tools

- File system + image viewer + `docs/REFERENCE_LIBRARY.md`.
- `webfetch` for license pages; local checksums if the batch requires it.

## Limitations

- Cannot verify licenses on sites that hide or fake them.
- Generates no content: only curates what is existing and verifiable.
