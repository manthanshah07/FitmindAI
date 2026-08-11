# FitMind AI — Definition of Done

> **Status:** ACTIVE  
> **Last Updated:** 2026-08-11

---

## Core Principle

A feature is NOT done when it "works on my machine."

A feature is DONE when every item in this checklist is satisfied.

---

## Feature Definition of Done

### Implementation
- [ ] Feature is implemented as specified in the relevant documentation
- [ ] Feature matches the design system (`docs/ui/DESIGN_SYSTEM.md`)
- [ ] No hardcoded values that belong in constants or environment variables
- [ ] TypeScript types defined for all data structures
- [ ] No `any` types without justification
- [ ] No console.log statements in production code

### Validation & Error Handling
- [ ] All user inputs are validated on the frontend (client-side feedback)
- [ ] All inputs are validated on the backend (server-side enforcement)
- [ ] Error states are handled gracefully in the UI
- [ ] Empty states are handled (no blank/broken UI)
- [ ] Loading states are shown during async operations
- [ ] Network errors are caught and shown to the user

### Testing
- [ ] Backend unit tests written and passing
- [ ] API integration tests written and passing (for affected endpoints)
- [ ] Frontend renders correctly with valid data (component test or manual verify)
- [ ] Frontend renders correctly with empty/error data
- [ ] No regressions in existing tests

### Responsive Design
- [ ] Feature works on desktop (>1024px)
- [ ] Feature works on tablet (768–1024px)
- [ ] Feature works on mobile (<768px)
- [ ] No horizontal scroll on any screen size

### Accessibility
- [ ] Interactive elements have accessible labels
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Color contrast meets WCAG AA minimum
- [ ] `prefers-reduced-motion` respected for animations

### Security
- [ ] Protected routes require authentication
- [ ] User cannot access other users' data
- [ ] Sensitive data is not exposed in API responses
- [ ] Input validated against injection attempts

### Documentation
- [ ] If a new component was created, it is added to `COMPONENT_INVENTORY.md`
- [ ] If an architectural decision was made, it is recorded in `00_PROJECT_DECISIONS.md`
- [ ] If an API endpoint was created or changed, `API_OVERVIEW.md` is updated
- [ ] If a new environment variable is needed, `.env.example` and `ENVIRONMENT_SETUP.md` are updated

### Code Quality
- [ ] No duplicate code where a shared function/component would serve
- [ ] Component files are <150 lines (split if needed)
- [ ] Business logic is not inside React components
- [ ] HTTP calls are in service files, not components

### Landing Page Protection
- [ ] The existing landing page renders identically before and after the change
- [ ] No landing page section files were modified

---

## AI Feature Additional Checklist

- [ ] AI does not calculate — backend provides all structured data
- [ ] AI response passes guardrail validation
- [ ] Memory retrieval includes only relevant context
- [ ] Token budget is within defined limits
- [ ] Failure cases (API down, context empty) are handled gracefully
