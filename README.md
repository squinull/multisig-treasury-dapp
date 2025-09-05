# MultiSig Treasury (Minimal AU Final Project)

This project demonstrates understanding of EVM smart contracts via a **MultiSig wallet**:

- Multiple owners
- N-of-M confirmations
- Auto-execution once quorum is reached
- Unit tests verifying core flows

## Quick Start

```bash
npm i
npm run test
```

Optional local deploy:

```bash
npm run node        # terminal 1
npm run deploy:localhost  # terminal 2
```

## Demo Script (≤ 5 min)

1. **Explain**: Multi-sig treasury, 2-of-3 owners, safe execution.
2. **Test run**: `npm run test` — shows funding, submit, confirm, auto-execute.
3. **(Optional)** Live: start node, deploy, fund contract, submit tx, confirm with second owner.
