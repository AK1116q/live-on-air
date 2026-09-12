# v0.1.1 Validation Notes

Date: 2026-09-12. Environment: Windows, Node.js 24.11.0. Browser checks use Playwright with the local Edge installation.

- Node tests cover room parsing, settings validation, provider response mapping, notification text, storage updates, transition-only notifications, and duplicate room prevention.
- Edge loads the actual Manifest V3 extension with a temporary browser profile.
- The popup UI is checked for adding Bilibili and Douyu rooms, settings updates, manual polling, stable popup width, hidden horizontal overflow, and mobile-width layout.
- The provider tests use mocked responses. A manual network smoke check confirmed reachable JSON responses for Bilibili `room/v1/Room/get_info` and Douyu `betard`.

Not validated: real phone delivery to a user-owned ntfy topic, long-running background behavior over many hours, Chrome Web Store packaging, and live Bilibili or Douyu logged-in page variants.

## Reproduce

```bash
npm test
```
