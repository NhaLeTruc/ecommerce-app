---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project and constitution requirements):

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework (SEC: RBAC, secure sessions)
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T008 [P] Configure observability infrastructure (structured logging, tracing, metrics)
- [ ] T009 [P] Configure error handling with correlation IDs
- [ ] T010 Setup environment configuration and secrets management (SEC: Vault/AWS Secrets Manager)
- [ ] T011 [P] Implement rate limiting middleware (SEC: prevent brute-force)
- [ ] T012 [P] Setup security headers (CSP, HSTS, X-Frame-Options)
- [ ] T013 Configure health check endpoints (liveness/readiness)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (REQUIRED per TDD constitution) ⚠️

> **CONSTITUTION REQUIREMENT: Write these tests FIRST, ensure they FAIL before implementation (Red-Green-Refactor)**

- [ ] T020 [P] [US1] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T021 [P] [US1] Integration test for [user journey] in tests/integration/test_[name].py
- [ ] T022 [P] [US1] Security test for [auth/input validation] in tests/security/test_[name].py

### Implementation for User Story 1

- [ ] T023 [P] [US1] Create [Entity1] model in src/models/[entity1].py
- [ ] T024 [P] [US1] Create [Entity2] model in src/models/[entity2].py
- [ ] T025 [US1] Implement [Service] in src/services/[service].py (depends on T023, T024)
- [ ] T026 [US1] Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T027 [US1] Add input validation and sanitization (SEC: prevent injection)
- [ ] T028 [US1] Add error handling with graceful degradation (SRE)
- [ ] T029 [US1] Add structured logging with correlation IDs (OBS)
- [ ] T030 [US1] Add distributed tracing instrumentation (OBS)
- [ ] T031 [US1] Add metrics for RED (Rate, Errors, Duration) (OBS)
- [ ] T032 [US1] Implement circuit breakers for external dependencies (SRE)
- [ ] T033 [US1] Verify test coverage ≥80% (TDD)

**Checkpoint**: At this point, User Story 1 should be fully functional, observable, secure, and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (REQUIRED per TDD constitution) ⚠️

> **CONSTITUTION REQUIREMENT: Write these tests FIRST, ensure they FAIL before implementation (Red-Green-Refactor)**

- [ ] T040 [P] [US2] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T041 [P] [US2] Integration test for [user journey] in tests/integration/test_[name].py
- [ ] T042 [P] [US2] Security test for [auth/input validation] in tests/security/test_[name].py

### Implementation for User Story 2

- [ ] T043 [P] [US2] Create [Entity] model in src/models/[entity].py
- [ ] T044 [US2] Implement [Service] in src/services/[service].py
- [ ] T045 [US2] Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T046 [US2] Add input validation and error handling (SEC/SRE)
- [ ] T047 [US2] Add observability (logging, tracing, metrics) (OBS)
- [ ] T048 [US2] Integrate with User Story 1 components (if needed)
- [ ] T049 [US2] Verify test coverage ≥80% (TDD)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (REQUIRED per TDD constitution) ⚠️

> **CONSTITUTION REQUIREMENT: Write these tests FIRST, ensure they FAIL before implementation (Red-Green-Refactor)**

- [ ] T060 [P] [US3] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T061 [P] [US3] Integration test for [user journey] in tests/integration/test_[name].py
- [ ] T062 [P] [US3] Security test for [auth/input validation] in tests/security/test_[name].py

### Implementation for User Story 3

- [ ] T063 [P] [US3] Create [Entity] model in src/models/[entity].py
- [ ] T064 [US3] Implement [Service] in src/services/[service].py
- [ ] T065 [US3] Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T066 [US3] Add input validation and error handling (SEC/SRE)
- [ ] T067 [US3] Add observability (logging, tracing, metrics) (OBS)
- [ ] T068 [US3] Verify test coverage ≥80% (TDD)

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and constitution compliance

- [ ] T900 [P] Load testing at 2x peak traffic (SRE)
- [ ] T901 [P] Performance optimization and caching strategy review (PERF)
- [ ] T902 [P] Security audit - verify OWASP Top 10 mitigations (SEC)
- [ ] T903 [P] Penetration testing or security scan (SEC)
- [ ] T904 [P] Code quality review - verify SOLID principles (CLEAN CODE)
- [ ] T905 Code cleanup and refactoring for maintainability (CLEAN CODE)
- [ ] T906 [P] SLO monitoring and alerting setup (SRE/OBS)
- [ ] T907 [P] Documentation updates (API docs, ADRs, runbooks)
- [ ] T908 Verify overall test coverage ≥80% (TDD)
- [ ] T909 [P] Dependency vulnerability scan (SEC)
- [ ] T910 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
