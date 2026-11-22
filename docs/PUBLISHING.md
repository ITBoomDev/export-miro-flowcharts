# Publishing

How a release gets from `main` to users. Listing texts and permission justifications are in
[`STORE_LISTING.md`](STORE_LISTING.md).

## One-time setup

1. **Repository:** `ITBoomDev/export-miro-flowcharts`. Set the description, website and topics (`miro`, `llm`,
   `mermaid`, `chrome-extension`, `flowchart`, `manifest-v3`). Turn on private vulnerability reporting
   (Settings → Code security) so [`SECURITY.md`](../SECURITY.md) works.
2. **Chrome Web Store developer account:** <https://chrome.google.com/webstore/devconsole>. One-time
   registration fee, and 2-step verification on the Google account. If the extension belongs to the
   organization, consider a group publisher.
3. **Privacy policy URL** for the dashboard:
   `https://github.com/ITBoomDev/export-miro-flowcharts/blob/main/docs/PRIVACY.md`

## Release checklist

1. Everything for the release is merged to `main`, and CI is green.
2. Move the `## Unreleased` entries in [`CHANGELOG.md`](../CHANGELOG.md) under a new `## X.Y.Z (date)` heading.
3. Set the version in **both** `manifest.json` and `package.json`. `test/package.test.mjs` fails if they
   differ or the CHANGELOG has no entry.
4. `bun run check`, then `bun run zip`.
5. Commit, then tag and push:
   ```bash
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```
   The **Release** workflow re-runs the checks, verifies the tag matches `manifest.json`, builds the zip and
   creates a GitHub release with `export-miro-flowcharts.zip` attached and generated notes.
6. Upload the same zip to the Chrome Web Store (below).

## Chrome Web Store submission

1. Developer Dashboard → **New item** (first time) or the item → **Package → Upload new package**.
2. **Store listing:** description from `STORE_LISTING.md`, category *Productivity*, language, screenshots
   (from `store/screenshots/`, regenerate with `bun run screenshots`) and the promo tile `store/promo-tile-440x280.png`.
3. **Privacy:**
   - Single purpose: the statement in `STORE_LISTING.md`.
   - Permission justifications: the table in `STORE_LISTING.md`, one entry per permission and for the host.
   - Data usage: collects nothing; certify the three required statements (no selling data, no unrelated
     use, no creditworthiness use).
   - Remote code: **No**.
   - Privacy policy URL from the setup above.
4. **Distribution:** visibility (consider *Unlisted* for the first release to gather feedback), regions, and
   the trader / non-trader declaration for the EU.
5. **Submit for review.** Review usually takes days; host permissions can lengthen it. After approval, the
   listing link goes into the README ("Install") and the repository website field.

## Things that commonly cause rejection

- A name, icon or text that looks like an official Miro product. The README and listing say "Not affiliated
  with Miro". Keep the icon distinct from Miro's logo.
- Permissions without a justification, or broader than needed. Ours are the minimum set, guarded by
  `test/package.test.mjs`.
- Description that doesn't match behavior, or keyword stuffing.
- Remote code or undeclared network use. There is none, and a unit test checks the shipped source.

## After release

- Watch the dashboard for review messages and user feedback.
- Triage GitHub issues. If Miro changes `miro.board.experimental`, update `src/extract.js`, the mock board
  and [`MIRO_SDK_NOTES.md`](MIRO_SDK_NOTES.md), then ship a patch release.
