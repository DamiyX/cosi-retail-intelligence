# COSI — Retail Commerce Intelligence
COSI is the current codename for an Android-first, offline-first retail intelligence product intended to help retailers understand their business, track changing restock costs, progressively digitize daily operations, and create the foundation for a market-price intelligence network and local product-recognition system.

M0 currently provides an Expo Android navigation shell and reproducible workspace
tooling. Business features, database schema, sync and recognition are not implemented.

Use Node 24.21.0 and npm 11.19.0, then run from the repository root:

```sh
npm ci
npm run validate
npm run mobile:doctor
npm run mobile:export
```

See [developer setup](docs/engineering/DEVELOPMENT.md) for device builds,
environment configuration and moving to another laptop.

- [Current state and next action](docs/engineering/PROJECT_STATE.md)
- [Whole-project context](.agents/contexts/project-context.md)
- [MVP application flow](.agents/contexts/app-flow.md)
- [Active workflow tasks](.agents/workflows/index.json)
- [Product design gate](docs/design/README.md)
- [Ticketing policy](docs/engineering/TICKETING.md)
- [Active M1 tickets](tickets.md)
- [Implementation and audit workflow](docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md)
- [M0 scope and verification](docs/engineering/M0_FOUNDATION.md)
- [Engineering guide](AGENTS.md)
- [Build plan](docs/engineering/BUILD_PLAN.md)
- [Approved decisions](docs/decisions/DECISION_LOG.md)

`apps/mobile` holds the application; `supabase` holds configuration only;
`docs` is the project memory; `tools/scripts` contains portable developer checks.
Continue on the existing task branch when switching coding tools.
