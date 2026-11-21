---
description: Run unit + smoke tests and report what broke
---

Run `bun run test`, then `bun run typecheck`, then `bun run smoke`.

- If the smoke test can't find a browser, say which one is needed (`npx playwright-core install chromium`
  or `CHROME_PATH`) and stop. Don't install anything without asking.
- For each failure, give the test name, the assertion, the likely cause in our code (file:line) and a
  proposed fix. Don't apply fixes unless I ask.
- If everything passes, reply with one line: the pass counts and the smoke timings.
