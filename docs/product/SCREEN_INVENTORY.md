# FitMind AI — Screen Inventory

> **Status:** PROPOSED  
> **Last Updated:** 2026-08-11

---

## Priority Key

| Label | Meaning |
|---|---|
| MUST HAVE | Required for a functional v1 release |
| SHOULD HAVE | Strongly recommended; may defer to v1.1 |
| FUTURE | Planned but not in current scope |

---

## Public Screens (No Auth Required)

| Screen | Route | Priority | Status |
|---|---|---|---|
| Landing Page | `/` | MUST HAVE | COMPLETE |
| Login | `/login` | MUST HAVE | NOT BUILT |
| Signup | `/signup` | MUST HAVE | NOT BUILT |
| Password Reset | `/reset-password` | SHOULD HAVE | NOT BUILT |

---

## Onboarding (Auth Required)

| Screen | Route | Priority | Status |
|---|---|---|---|
| Personal Info | `/onboarding/profile` | MUST HAVE | NOT BUILT |
| Fitness Goals | `/onboarding/goals` | MUST HAVE | NOT BUILT |
| Fitness Level | `/onboarding/fitness-level` | MUST HAVE | NOT BUILT |
| Preferences | `/onboarding/preferences` | MUST HAVE | NOT BUILT |
| Assessment Result | `/onboarding/assessment` | MUST HAVE | NOT BUILT |

---

## Core Application (Auth Required)

| Screen | Route | Priority | Status |
|---|---|---|---|
| Dashboard | `/dashboard` | MUST HAVE | NOT BUILT |
| AI Coach | `/coach` | MUST HAVE | NOT BUILT |

---

## Workout Module

| Screen | Route | Priority | Status |
|---|---|---|---|
| Workout Overview | `/workout` | MUST HAVE | NOT BUILT |
| Workout Session | `/workout/session` | MUST HAVE | NOT BUILT |
| Workout History | `/workout/history` | SHOULD HAVE | NOT BUILT |
| Exercise Detail | `/workout/exercise/:id` | SHOULD HAVE | NOT BUILT |
| Custom Workout | `/workout/custom` | FUTURE | NOT BUILT |

---

## Nutrition Module

| Screen | Route | Priority | Status |
|---|---|---|---|
| Nutrition Dashboard | `/nutrition` | MUST HAVE | NOT BUILT |
| Food Logger | `/nutrition/log` | MUST HAVE | NOT BUILT |
| Food Search | `/nutrition/search` | MUST HAVE | NOT BUILT |
| Meal History | `/nutrition/history` | SHOULD HAVE | NOT BUILT |
| Food Image Logger | `/nutrition/scan` | FUTURE | NOT BUILT |

---

## Progress Module

| Screen | Route | Priority | Status |
|---|---|---|---|
| Progress Overview | `/progress` | MUST HAVE | NOT BUILT |
| Measurements Log | `/progress/measurements` | MUST HAVE | NOT BUILT |
| Progress Photos | `/progress/photos` | SHOULD HAVE | NOT BUILT |
| Weight Chart | (part of progress overview) | MUST HAVE | NOT BUILT |
| Strength Charts | (part of progress overview) | SHOULD HAVE | NOT BUILT |

---

## Reports

| Screen | Route | Priority | Status |
|---|---|---|---|
| Weekly Report | `/reports/weekly` | MUST HAVE | NOT BUILT |
| Monthly Report | `/reports/monthly` | SHOULD HAVE | NOT BUILT |
| Report Archive | `/reports` | SHOULD HAVE | NOT BUILT |

---

## Account & Settings

| Screen | Route | Priority | Status |
|---|---|---|---|
| Profile | `/profile` | MUST HAVE | NOT BUILT |
| Settings | `/settings` | SHOULD HAVE | NOT BUILT |
| Notifications | `/notifications` | SHOULD HAVE | NOT BUILT |
| Account Security | `/settings/security` | SHOULD HAVE | NOT BUILT |

---

## Total Screen Count

| Category | Must Have | Should Have | Future | Total |
|---|---|---|---|---|
| Public | 2 (+ existing) | 1 | 0 | 3 |
| Onboarding | 5 | 0 | 0 | 5 |
| Core App | 2 | 0 | 0 | 2 |
| Workout | 3 | 2 | 1 | 6 |
| Nutrition | 3 | 1 | 1 | 5 |
| Progress | 2 | 2 | 0 | 4 |
| Reports | 1 | 2 | 0 | 3 |
| Account | 1 | 3 | 0 | 4 |
| **Total** | **19** | **11** | **2** | **32** |
