# oxlint + oxfmt + Husky Pre-commit Hooks

## Overview

Add linting (oxlint with type-aware checking), formatting (oxfmt), and git pre-commit hooks (husky + lint-staged) to the project. Currently no linter, formatter, or git hooks are configured.

## Tools

| Tool        | Purpose                                    | Version Strategy |
| ----------- | ------------------------------------------ | ---------------- |
| oxlint      | Rust-based linter, type-aware via tsconfig | Latest stable    |
| oxfmt       | Rust-based formatter (oxc project)         | Latest stable    |
| husky       | Git hooks manager                          | Latest v9        |
| lint-staged | Run tools on staged files only             | Latest stable    |

## oxlint Configuration

File: `oxlintrc.json` at project root.

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "style": "warn",
    "pedantic": "warn",
  },
  "plugins": ["typescript", "react", "import"],
  "settings": {
    "typescript": {
      "tsconfig": "./tsconfig.json",
    },
  },
  "ignorePatterns": ["dist/", "ios/", "android/", "src-tauri/", ".expo/"],
}
```

### Category Rationale

- **correctness: error** — real bugs, must fix before commit
- **suspicious: warn** — likely bugs, should investigate
- **style: warn** — consistency issues, enforce gradually
- **pedantic: warn** — stricter checks, can disable noisy rules as discovered

### Type-Aware Linting

Enabled via `tsconfig` setting pointing to `./tsconfig.json`. This allows oxlint to use TypeScript type information for deeper analysis (e.g., detecting unused type imports, type-aware no-floating-promises).

## oxfmt Configuration

oxfmt is zero-config. No configuration file needed. It formats `.ts`, `.tsx`, `.js`, `.jsx` files with sensible defaults.

## Husky + lint-staged

### Pre-commit Hook

File: `.husky/pre-commit`

```sh
npx lint-staged
```

### lint-staged Configuration

In `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["oxfmt", "oxlint --tsconfig tsconfig.json"]
  }
}
```

**Order matters**: oxfmt runs first (auto-formats and re-stages), then oxlint checks the formatted result. If oxlint finds errors, the commit is blocked.

## package.json Changes

### New devDependencies

- `oxlint`
- `oxfmt`
- `husky`
- `lint-staged`

### New Scripts

```json
{
  "lint": "oxlint",
  "fmt": "oxfmt .",
  "fmt:check": "oxfmt --check .",
  "prepare": "husky"
}
```

- `lint` — run oxlint on entire project (uses `oxlintrc.json` automatically)
- `fmt` — format entire project
- `fmt:check` — check formatting without writing (useful for CI)
- `prepare` — husky setup hook, runs automatically after `npm install`

## File Changes Summary

| File                | Change                                                  |
| ------------------- | ------------------------------------------------------- |
| `oxlintrc.json`     | New — oxlint configuration                              |
| `.husky/pre-commit` | New — runs lint-staged                                  |
| `package.json`      | Modified — devDependencies, scripts, lint-staged config |

## Out of Scope

- CI pipeline integration
- Editor-specific config (`.vscode/settings.json`)
- Pre-push hooks
- Commit message linting (commitlint)
