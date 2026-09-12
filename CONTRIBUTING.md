# Contributing

Thanks for taking a look at Live On Air.

The project is intentionally small: plain Manifest V3 JavaScript, no build step, and no runtime dependencies. Keep changes easy to inspect and test with:

```bash
npm test
```

Provider endpoints may change. When updating a provider, keep the parsing logic isolated in `core.js` and add a fixture-based test for the new response shape.
