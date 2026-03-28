# oxlint + oxfmt + Husky Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add type-aware linting (oxlint), formatting (oxfmt), and pre-commit hooks (husky + lint-staged) to the project.

**Architecture:** Install four devDependencies (oxlint, oxfmt, husky, lint-staged), create config files, set up a pre-commit hook that auto-formats then lints staged files. Type-aware linting uses the existing `tsconfig.json`.

**Tech Stack:** oxlint, oxfmt, husky v9, lint-staged

**Spec:** `docs/superpowers/specs/2026-03-28-oxlint-oxfmt-husky-design.md`

---

### Task 1: Install devDependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install packages**

Run:

```bash
npm install --save-dev oxlint oxfmt husky lint-staged
```

Expected: All four packages added to `devDependencies` in `package.json`. No errors.

- [ ] **Step 2: Verify installations**

Run:

```bash
npx oxlint --version && npx oxfmt --version && npx husky --version
```

Expected: Version numbers printed for all three tools.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add oxlint, oxfmt, husky, lint-staged devDependencies"
```

---

### Task 2: Create oxlint configuration

**Files:**

- Create: `.oxlintrc.json`

- [ ] **Step 1: Create `.oxlintrc.json`**

Write this file at the project root:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "react", "import"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "style": "warn",
    "pedantic": "warn"
  },
  "rules": {},
  "env": {
    "builtin": true
  },
  "globals": {},
  "ignorePatterns": ["dist/**", "ios/**", "android/**", "src-tauri/**", ".expo/**"]
}
```

- [ ] **Step 2: Run oxlint to verify config is picked up**

Run:

```bash
npx oxlint --type-aware
```

Expected: oxlint runs against the project using the config. It may produce warnings/errors — that's fine, we just need to confirm it reads the config and doesn't crash. Note any rules that need to be disabled.

- [ ] **Step 3: Disable noisy rules if needed**

If the initial run produces false positives or rules incompatible with the React Native/Expo codebase, add them to the `"rules"` section of `.oxlintrc.json` with `"off"` severity. For example:

```json
{
  "rules": {
    "rule-name-here": "off"
  }
}
```

Re-run `npx oxlint --type-aware` after each adjustment until the output is actionable (real issues, not noise).

- [ ] **Step 4: Commit**

```bash
git add .oxlintrc.json
git commit -m "chore: add oxlint config with type-aware linting"
```

---

### Task 3: Add npm scripts

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add lint, fmt, and fmt:check scripts**

Add these entries to the `"scripts"` section in `package.json`:

```json
"lint": "oxlint --type-aware",
"fmt": "oxfmt .",
"fmt:check": "oxfmt --check ."
```

- [ ] **Step 2: Verify scripts work**

Run each script:

```bash
npm run fmt:check
npm run lint
```

Expected: Both commands execute without crashing. `fmt:check` may report unformatted files. `lint` may report warnings/errors from the codebase.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add lint and fmt npm scripts"
```

---

### Task 4: Set up husky and lint-staged

**Files:**

- Modify: `package.json` (add `prepare` script and `lint-staged` config)
- Create: `.husky/pre-commit`

- [ ] **Step 1: Initialize husky**

Run:

```bash
npx husky init
```

Expected: Creates `.husky/` directory with a `pre-commit` file. Also adds `"prepare": "husky"` to `package.json` scripts.

- [ ] **Step 2: Replace pre-commit hook content**

Overwrite `.husky/pre-commit` with:

```sh
npx lint-staged
```

- [ ] **Step 3: Add lint-staged config to package.json**

Add this top-level key to `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "oxfmt",
    "oxlint --type-aware"
  ]
}
```

Order matters: oxfmt runs first (auto-formats, lint-staged re-stages the formatted files), then oxlint checks the formatted result.

- [ ] **Step 4: Test the pre-commit hook**

Make a trivial whitespace change to any `.ts` or `.tsx` file, stage it, and attempt a commit:

```bash
echo "" >> src/lib/features.ts
git add src/lib/features.ts
git commit -m "test: verify pre-commit hook"
```

Expected: The commit triggers lint-staged, which runs oxfmt then oxlint on the staged file. If both pass, the commit succeeds. If oxlint reports errors, the commit is blocked.

- [ ] **Step 5: Reset the test change if needed**

If the test commit succeeded, revert it:

```bash
git reset HEAD~1
git checkout -- src/lib/features.ts
```

If the commit was blocked by lint errors, unstage:

```bash
git checkout -- src/lib/features.ts
```

- [ ] **Step 6: Commit the husky + lint-staged setup**

```bash
git add .husky/pre-commit package.json
git commit -m "chore: add husky pre-commit hook with lint-staged (oxfmt + oxlint)"
```

---

### Task 5: Format the entire codebase

**Files:**

- Modify: All `.ts` and `.tsx` files in `src/` and `app/`

- [ ] **Step 1: Run oxfmt on the whole project**

```bash
npm run fmt
```

Expected: oxfmt formats all TypeScript files in place. Review the diff to ensure nothing looks wrong.

- [ ] **Step 2: Verify the project still compiles**

```bash
npx expo export --platform web 2>&1 | tail -5
```

Expected: Build completes without errors. Formatting changes should be purely cosmetic.

- [ ] **Step 3: Commit the formatted codebase**

```bash
git add -A
git commit -m "style: format entire codebase with oxfmt"
```

---

### Task 6: Fix existing lint errors

**Files:**

- Modify: Various files flagged by oxlint

- [ ] **Step 1: Run full lint and capture output**

```bash
npm run lint 2>&1
```

Review the output. Categorize issues:

- **Errors (correctness)**: Must fix
- **Warnings (suspicious/style/pedantic)**: Fix what's reasonable, disable rules that don't apply

- [ ] **Step 2: Fix correctness errors**

Address all `error`-level issues. These are real bugs or type problems.

- [ ] **Step 3: Fix or suppress remaining warnings**

For warnings that are valid improvements, fix them. For rules that produce false positives in this codebase (e.g., React Native patterns that oxlint doesn't understand), disable them in `.oxlintrc.json`:

```json
"rules": {
  "problematic-rule-name": "off"
}
```

- [ ] **Step 4: Verify clean lint run**

```bash
npm run lint
```

Expected: No errors. Warnings are acceptable if they're known and tracked.

- [ ] **Step 5: Commit all fixes**

```bash
git add -A
git commit -m "fix: resolve existing oxlint errors and configure rule overrides"
```

---

### Task 7: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the "Build & Run Commands" table**

Add these rows to the command table:

```markdown
| `npm run lint` | Run oxlint type-aware checks |
| `npm run fmt` | Format all files with oxfmt |
| `npm run fmt:check` | Check formatting without writing |
```

Also update the note "No linting or test commands" to reflect that linting is now configured.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add lint and fmt commands to CLAUDE.md"
```
