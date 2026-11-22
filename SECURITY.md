# Security Policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately through GitHub:
[Report a vulnerability](https://github.com/ITBoomDev/export-miro-flowcharts/security/advisories/new).

Include what you found, steps to reproduce, the affected version and the impact you see. You can expect an
acknowledgement within a few days and a fix or a clear answer after that. Credit is given in the release
notes unless you prefer otherwise.

## Scope

In scope:

- Anything that makes the extension send data off the device, or load or run remote code.
- Script injection through board content (for example, text on a board that executes in the panel or on the page).
- Permissions broader than documented in [`docs/PRIVACY.md`](docs/PRIVACY.md).
- Leaks of board content or settings to other pages or extensions.

Out of scope: changes Miro makes to its own SDK, and issues that need a modified browser or a malicious
local machine.

## Design properties

- No network requests of any kind, no analytics, no remote code. A unit test (`test/package.test.mjs`)
  guards the shipped source against network APIs.
- Host access is limited to `https://miro.com/app/board/*`, with no content scripts.
- Board-provided text is escaped before it is inserted into the panel's HTML.
