# Shared API contract

`openapi.json` is the ProofBeforePay API's contract, exported from the FastAPI app. Regenerate it after changing an
endpoint:

```bash
apps/api/.venv/Scripts/python scripts/export_openapi.py   # Windows
apps/api/.venv/bin/python scripts/export_openapi.py       # macOS / Linux
```

The web app's hand-written types live in `apps/web/src/types`; any client can generate its own from this file, for
example with `npx openapi-typescript packages/shared-types/openapi.json -o api.d.ts`.
