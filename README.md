# Incentive & Payout Framework

A runnable prototype for configuring incentives and payouts and showing entities their rate cards, progress, and earnings.

## Run locally

Requires Python 3 and a modern browser. No build step or dependency installation is needed.

```sh
git clone https://github.com/Anup17072/payout-incentive-framework.git
cd payout-incentive-framework
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000.

| Page | Path |
| --- | --- |
| Incentive configuration, registries, and incentive preview | /index.html |
| Payout structures and manager templates | /payouts.html |
| Entity rate card and earnings | /entity-payouts.html |

Use the role/navigation controls in the app to switch between admin and manager views. Entity previews include sample data.

## Host your own copy

Upload the **contents of `dist/`** to any static web host. Set the publish directory to `dist` and leave the build command empty. Keep the files together so their relative links work.

For GitHub Pages, publish the contents of `dist/` as the root of your Pages deployment. No server-side application, database, or API keys are required for the prototype.

## What is included

- Entity, key, and unit registries.
- Admin incentive definitions and manager programmes with milestones, caps, and estimated coverage.
- Fixed and unit-based payout components, lookup ranges, formulas, templates, and user mapping.
- Entity incentive previews, rate cards, and component-level earnings drill-down.
- Sample configurations and data for exploring the flows.

## Data and limitations

This is a client-side prototype, not a production payroll or payment-processing system. SQL configuration does not connect to a live database. Coverage and earnings previews use sample data.

Browser session storage is used for configuration state. Refreshing within the same session can retain that state; closing the session, clearing site data, or using another browser/device may not. Hosting the source does not transfer configurations entered in another browser. There is no shared database, authentication service, payment processing, or production evaluation scheduler.

## Tests

Requires Node.js 18 or newer. From the repository root:

```sh
for test in tests/*.cjs; do node "$test" || exit 1; done
```

On any platform, individual suites can also be run with `node tests/incentive-milestones.cjs`, for example.

## Project layout

- `dist/`: complete application HTML, CSS, and JavaScript; these are editable source files.
- `tests/`: regression tests using Node.js built-in modules.
- `LICENSE`: MIT license permitting reuse and hosting.

## License

MIT. See [LICENSE](LICENSE).
