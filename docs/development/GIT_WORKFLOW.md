# FitMind AI — Git Workflow

> **Status:** ACTIVE  
> **Last Updated:** 2026-08-11

---

## Branch Structure

```
main          ← Production-ready. Only merge from develop after testing.
develop       ← Active integration branch. Features merge here first.
feature/*     ← Feature work
fix/*         ← Bug fixes
docs/*        ← Documentation-only changes (no code)
```

---

## Branch Naming Convention

```
feature/phase-1-auth-login
feature/phase-1-onboarding-wizard
feature/phase-3-workout-logging
fix/fitness-score-calculation
fix/navbar-mobile-overflow
docs/update-api-overview
docs/add-rag-design
```

---

## Commit Message Format

```
type(scope): short description

Body (optional): explain why, not what

Types:
  feat     — New feature
  fix      — Bug fix  
  docs     — Documentation only
  style    — Whitespace, formatting (no logic)
  refactor — Code restructure, no behavior change
  test     — Adding or updating tests
  chore    — Dependency updates, config

Examples:
  feat(auth): implement JWT login endpoint
  fix(nutrition): correct macro calculation for multi-item meals
  docs(database): add measurements table schema
  test(score): add unit tests for fitness score calculation
  chore(deps): add react-router-dom
```

---

## Workflow

```
1. Pull latest develop
   git checkout develop
   git pull origin develop

2. Create feature branch
   git checkout -b feature/phase-1-auth-login

3. Implement feature

4. Commit as you go
   git add .
   git commit -m "feat(auth): add password hashing utility"

5. Push branch
   git push origin feature/phase-1-auth-login

6. Open pull request → develop

7. Review + merge

8. After testing on develop → merge to main
```

---

## Pull Request Checklist

Before merging any PR:

- [ ] Code builds without errors
- [ ] All tests pass
- [ ] Definition of Done checklist complete (`docs/project-management/DEFINITION_OF_DONE.md`)
- [ ] Landing page is unmodified
- [ ] No hardcoded secrets or API keys committed
- [ ] Documentation updated if needed

---

## Files That Must Never Be Committed

Add these to `.gitignore` if not already present:

```
.env
.env.local
.env.production
node_modules/
dist/
__pycache__/
*.pyc
.DS_Store
```
