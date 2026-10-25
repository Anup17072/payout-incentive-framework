# Incentive & Payout Framework

Configuration and entity-facing prototype for incentives and payouts.

## Run locally

Serve the static application from the project root:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000 for the admin and manager interface. Payout configuration is at `/payouts.html`; entity rate cards and earnings are at `/entity-payouts.html`.

## Project layout

- `dist/`: application HTML, CSS, and JavaScript.
- `tests/`: Node.js regression tests.

## Run tests

```sh
for test in tests/*.cjs; do node "$test" || exit 1; done
```

## Scope

This is a prototype with browser-local configuration and sample evaluation data. It is not a production payroll or payment-processing backend.
