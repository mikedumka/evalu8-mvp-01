# Copilot Instructions for Evalu8 Project

## Project Overview

**Evalu8** is a sports player evaluation system built with:

- **Frontend:** Vite + React
- **Backend:** Supabase (PostgreSQL)
- **Documentation:** BDD Specifications (Gherkin format)

## Project Goals

Build an MVP for youth sports associations to:

1. Register and manage players across seasons
2. Schedule evaluation sessions with automated player distribution
3. Enable real-time player scoring by multiple evaluators
4. Apply quality control measures (outlier detection, minimum evaluators)
5. Generate reports and rankings for team placement

## Working Principles

### 1. Documentation-First Approach

- All features must be defined in BDD specifications before implementation
- Use Gherkin syntax (Given-When-Then) for acceptance criteria
- Keep business rules clear and testable
- Update specifications before writing code

### 2. Terminology Consistency

Always use these exact terms throughout the codebase:

- **Season** (not "year" or "period")
- **Cohort** (not "age group" or "division")
- **Position** (not "preferred position" or "role")
- **Withdrawn** (not "inactive" for players leaving the program)
- **Active/Inactive** (for system objects like cohorts, drills, position types)
- **Previous Level** (not "prior level" or "last year level")
- **Intake Personnel** (not "check-in staff")
- **Evaluator** (not "judge" or "scorer")

### 3. Global Change Awareness

When I suggest a change or edit:

1. **Always search the entire codebase** for related instances
2. Update all occurrences for consistency
3. Check documentation, code, and tests
4. Confirm all related updates were made

### 4. Data Model Core Concepts

#### Player Status

- **Active:** Player participates in evaluations
- **Withdrawn:** Player has left the program (removed from future sessions)
- **Other:** Player cannot participate due to injury, illness, or other circumstances (requires reason/description, removed from sessions, manually ranked later)
- **No-shows:** Tracked during session intake, NOT as player status

#### Key Relationships

- Players → One cohort per season
- Players → One position
- Players → Optional previous level (for distribution algorithm)
- Sessions → Multiple drills (many-to-many with weight configuration)
- Session Drills → One weight per drill, applies to selected positions
- Position → Maximum 4 drills per position per session, must total exactly 100% weight
- Sessions → Multiple players assigned
- Evaluations → One player, one drill, one evaluator, one session

#### Quality Control

- **Outlier Threshold:** Set per season (10-50%, default 25%), locked after activation
- **Minimum Evaluators Per Athlete:** Set per season (1-10, default 3), locked after activation
- **Minimum Sessions Per Athlete:** Set per season (e.g., 3-10), locked after activation, drives wave calculations
- System flags scores outside deviation threshold
- Reports warn if player scored by fewer than minimum evaluators
- **Incomplete Evaluations:** Evaluators can finalize sessions with missing scores (requires mandatory reason)
- **Reconciliation Required:** Administrators must reconcile incomplete evaluations before generating final rankings
- **Reconciliation Methods:** Partial averaging (drill-level), mark drill invalid, exclude athlete entirely
- **Scoring Scale:** Position scores calculated 0-100 (drill scores entered 1-10)

### 5. Feature Development Stages

MVP Release 1 has 9 stages (ALL COMPLETE):

1. ✅ Setup & Configuration (6 features)
2. ✅ Player Registration & Cohort Management (6 features)
3. ✅ Session Scheduling & Configuration (5 features)
4. ✅ Player Distribution & Wave Management (6 features)
5. ✅ Session Intake & Check-IN (1 feature)
6. ✅ Real-Time Player Evaluation (5 features)
7. ✅ Quality Control & Validation (4 features)
8. ✅ Reporting & Analytics (4 features)
9. ✅ System Administration & Maintenance (6 features)

**Total:** 44 features across 9 stages

### 6. Code Style Preferences

- Use clear, descriptive variable names
- Prefer functional components (React)
- Write SQL queries using Supabase client
- Keep components small and focused
- Use TypeScript for type safety

### 7. BDD Specification Format

```gherkin
### Feature: [Feature Name]
**User Story:** As a [role], I want to [action] so that [benefit]

**Business Rules:**
- Rule 1
- Rule 2

Scenario: [Scenario name]
  Given [context]
  And [additional context]
  When [action]
  And [additional action]
  Then [expected outcome]
  And [additional outcome]
```

### 8. Common Operations

#### Adding New Features

1. Define user story and business rules
2. Write scenarios covering happy path and edge cases
3. Include validation scenarios
4. Add error handling scenarios
5. Update related features if needed

#### Modifying Existing Features

1. Search for all related instances
2. Update business rules if needed
3. Modify all affected scenarios
4. Check for cascade effects in other features
5. Verify terminology consistency

#### Data Validations to Include

- Required field validation
- Format validation (dates, emails, years)
- Uniqueness checks (prevent duplicates)
- Reference validation (ensure related entities exist)
- State validation (e.g., only active items can be assigned)
- Permission checks (role-based access)

## File Structure

```
/evalu8_BDD_Specifications.md    # All BDD scenarios (master document)
/evalu8_Project_Brief_Executive.md
/evalu8_Project_Brief_Standard.md
/evalu8_Technical_Architecture.md # Tech stack and architecture decisions
/src/                             # React application code (TBD)
/supabase/                        # Database schema and migrations (TBD)
```

## Technology Stack

**Frontend:**

- React + Vite (fast build, HMR)
- shadcn/ui with Violet theme (customizable components)
- Tailwind CSS (utility-first styling)
- Lucide Icons (icon library)
- React Context API (global state management)
- React Router (client-side routing)

**Backend:**

- Supabase (PostgreSQL BaaS)
- Supabase Auth with Google OAuth
- Supabase Realtime (live evaluation updates)
- Supabase Storage (CSV imports/exports)
- Row-level security (multi-tenant isolation)

## When Working Together

### I'll Provide

- Clear requirements and user stories
- Business logic and rules
- Validation requirements
- Edge cases to handle

### You Should

- Ask clarifying questions if requirements are ambiguous
- Point out potential inconsistencies
- Suggest edge cases I might have missed
- Verify changes across the entire codebase
- Maintain terminology consistency
- Keep documentation in sync with code

### Communication Style

- Be direct and concise
- Confirm understanding before making large changes
- Summarize what was changed after updates
- Ask if terminology or patterns are unclear
- Suggest improvements to structure or approach

## Key Domain Rules

### Season Management

- Only one active season at a time
- Season data persists (read-only after deactivation)
- QA settings (outlier threshold, min evaluators) locked per season

### Cohort & Level Persistence

- Cohorts persist across seasons (association-wide)
- Previous levels persist across seasons (association-wide)
- Position types are sport-specific (association-wide)

### Wave-Based Scheduling System

Evalu8 uses a wave-based system to organize evaluations across multiple rounds:

#### Wave Fundamentals

- **Wave:** A complete evaluation round where every athlete in a cohort is evaluated exactly once
- **Purpose:** Ensure each athlete receives the minimum required evaluations through multiple rounds
- **Formula:** Total Sessions = (Total Athletes ÷ Session Capacity) × Minimum Sessions Per Athlete

#### Wave Calculations

- **Sessions per Wave** = Total Athletes in Cohort ÷ Session Capacity (rounded up)
- **Number of Waves** = Minimum Sessions Per Athlete (configured in season setup)
- **Total Sessions** = Sessions per Wave × Number of Waves

#### Standard Waves

- **Automatically created during CSV import** based on chronological session order
- Each wave can use different distribution algorithm (selected by administrator)
- Sequential distribution enforced (cannot distribute Wave 2 until Wave 1 is distributed and ready)
- Wave status: Not Started → Ready (after distribution) → In Progress → Completed
- Sessions display wave number in UI

#### Custom Waves

- Created for position-specific or skill-specific evaluations (e.g., baseball catchers)
- Require descriptive names (e.g., "Catcher Evaluation Wave")
- Administrator manually selects specific athletes
- Administrator sets custom session count
- Can be scheduled independently of standard waves
- Appear separately in Wave Management view

#### Key Rules

- **Automatic Wave Creation:** Waves are created automatically during CSV import based on chronological order
- **Sequential Distribution:** Cannot distribute athletes for Wave N+1 until Wave N is distributed and marked as "Ready"
- **Mixed Participation:** Athletes can participate in both standard and custom waves
- **Evaluation Counting:** Only standard wave evaluations count toward minimum evaluation requirement (custom waves do NOT count)
- **Under-Capacity Allowed:** If athletes don't divide evenly, distribute unevenly (e.g., 35 athletes = 18+17, not 20+15)
- **Hard Session Capacity:** Session maximum is absolute (no flexibility)
- **Algorithm Per Wave:** Each wave independently chooses distribution algorithm (administrator selects when distributing athletes)
- **Single Cohort Import:** Bulk session imports must contain sessions for only ONE cohort at a time
- **Exact Session Count:** Import must contain exactly the number of sessions needed for remaining waves (no excess sessions allowed for standard waves)
- **Import Preview:** System validates session count against wave requirements and prevents import if counts don't match
- **Post-Import:** After import, administrator distributes athletes to each wave using chosen algorithm

#### Real-World Examples

1. **Los Angeles Basketball:** 100 athletes, 20 capacity, 5 minimum evaluations = 5 waves × 5 sessions = 25 total sessions
2. **Selkirk Minor Hockey:** 30 athletes, 15 capacity, 3 minimum evaluations = 3 waves × 2 sessions = 6 total sessions
3. **Baseball Catchers:** 5 catchers out of 100 total players = Custom wave with 2 sessions for catcher-specific drills

### Player Distribution Algorithms

All distribution algorithms work in two levels: athletes to sessions, then athletes within sessions to teams.

1. **Alphabetical (Two-Level Distribution):**

   - **Level 1:** Sort all athletes alphabetically by last name
   - **Level 2:** Distribute sorted athletes to sessions (balance session capacity)
   - **Level 3:** Within each session, distribute alphabetically to teams
   - **Example:** 100 athletes, 5 sessions (20 each), 4 teams per session
     - Session 1 gets athletes 1-20, then athletes 1-5 → Team 1, 6-10 → Team 2, 11-15 → Team 3, 16-20 → Team 4
     - Session 2 gets athletes 21-40, distributed alphabetically to 4 teams
     - Continues for all sessions

2. **Random (Two-Level Distribution):**

   - **Level 1:** Randomize all athletes (shuffle order)
   - **Level 2:** Distribute randomized athletes to sessions (balance session capacity)
   - **Level 3:** Within each session, distribute in randomized order to teams
   - **Example:** 100 athletes randomized, distributed to 5 sessions, then each session distributes athletes to teams in randomized order

3. **Previous Level (Two-Level Distribution):**

   - **Level 1:** Group all athletes by previous level (A, B, C, D)
   - **Level 2:** Distribute each level evenly across sessions (e.g., 25 A-level players → 5 per session)
   - **Level 3:** Within each session, balance levels across teams (each team gets mix of A/B/C/D)
   - **Example:** Session 1 has 5 A-level, 5 B-level, 5 C-level, 5 D-level → Team 1 gets 1-2 of each level, Team 2 gets 1-2 of each level

4. **Current Ranking (Two-Level Distribution):**
   - **Level 1:** Rank all athletes by in-progress evaluation scores (highest to lowest)
   - **Level 2:** Distribute ranked athletes across sessions using snake draft (1st → Session 1, 2nd → Session 2, ..., 5th → Session 5, 6th → Session 5, 7th → Session 4, ...)
   - **Level 3:** Within each session, balance rankings across teams (Team 1 gets top-ranked + bottom-ranked, Team 2 gets middle-ranked)
   - **Example:** Ensures each session and each team has balanced skill distribution

**Note:** Algorithm can be chosen independently for each wave

**Team Configuration:**

- Teams per session: 1-6 (default 2)
- Configured during wave distribution (wave-specific)
- Different waves can have different team counts (e.g., Wave 1 = 1 team for drills, Wave 2 = 2 teams for scrimmage)

### Session Intake & Jersey Assignment System

#### Team Assignment

- **Pre-Distribution:** Athletes pre-assigned to teams during wave distribution (read-only during check-in)
- **Team Identification:** Teams numbered sequentially (Team 1, Team 2, Team 3, etc.)
- **Distribution Variance:** Teams can have slight variance in athlete count (e.g., 5, 5, 5, 4)

#### Jersey Color Assignment

- **Dynamic Assignment:** Jersey color assigned during check-in (NOT pre-configured)
- **First Player Rule:** First player to check in for each team selects that team's primary color
- **Color Uniqueness:** Each color can only be assigned to ONE team per session
- **Multi-Color Teams:** Teams can have multiple colors (e.g., Team 1 = mostly Red + some Black if Red jerseys run out)
- **Color Reset:** Color-team associations reset for each new session

#### Jersey Number Assignment

- **Range:** 0-999
- **Uniqueness:** Within team only (not session-wide)
- **Cross-Team:** Same number allowed across different teams (Team 1 #5 and Team 2 #5 = both valid)

#### Intake Workflow

- **System Prompts:** Intake personnel prompted for jersey color + number
- **Validation:** Real-time validation of color uniqueness (per team) and number uniqueness (within team)
- **Entry:** Intake personnel enters values (doesn't matter what player requests)

#### Reporting

- **Display:** Team + jersey number displayed with every session score
- **Format:** "Team 1, Red #7" or "Team 2, Blue #10"

### Drill Weight System

- **Drill Creation:** Drills created in library with name and criteria (no weight)
- **Session Assignment:** Each drill assigned ONE weight that applies to ALL positions using it
- **Position Configuration:** Each position selects which drills apply (max 4 drills)
- **Weight Validation:** Each position's drills must total exactly 100%
- **Real-time Validation:** System prevents adding drills that would exceed 100% or 4-drill limit
- **Locking:** Drill configuration locked after first evaluation score entered
- **Drill Cloning:** First session in wave to reach 100% can clone configuration to all other sessions in same wave
- **Clone Behavior:** Separate action (button), overwrites existing configurations, applies to wave-only
- **Example:** Skating (40%) used by Forward and Defense = both get 40%, cannot be different

### Evaluation Workflow

1. Create session (draft status)
2. Assign drills with weights to positions (each position = 100%)
3. **Optional:** Clone drill configuration from first configured session to other sessions in wave
4. Assign cohort, evaluators, intake personnel
5. Assign players (manual or automated distribution via waves with team assignment)
6. Move to "ready" status (validates: 100% per position, min evaluators, intake personnel, players assigned)
7. **Intake:** Check-in players, assign jersey colors and numbers, track no-shows
   - First player per team selects team's primary jersey color
   - Intake personnel enters jersey number (0-999, unique within team)
   - System validates color uniqueness (per team) and number uniqueness (within team)
8. Evaluate: Score players on assigned drills (1-10 scale, weighted by drill percentages)
9. **Finalize:** Evaluators can finalize session anytime (complete or incomplete)
   - If incomplete: mandatory reason required (e.g., "Had to leave early")
   - Incomplete finalizations flagged for administrator review
10. **Reconcile:** Administrator reconciles incomplete evaluations (partial averaging, mark invalid, or exclude)
11. Complete: Lock scores, run QA checks (outlier detection, minimum evaluator validation)
12. Report: Generate rankings and analytics (0-100 scale, includes team + jersey number with scores)

## Questions to Ask Me

- "Should this validation be on the frontend, backend, or both?"
- "What happens to historical data when [action] occurs?"
- "Is this field required or optional?"
- "Should we handle this edge case: [scenario]?"
- "Do you want this change applied globally across all related features?"

## Success Criteria

- All features have complete BDD specifications
- Terminology is consistent across all documents
- Business rules are clear and testable
- Edge cases and validations are comprehensive
- Changes are applied globally when appropriate
- Documentation stays in sync with implementation

## Operational Guidelines

- **Server Management:** Always restart the development server (e.g., `npm run dev`) after making changes that require a restart (e.g., environment variables, configuration files).
- **Tool Usage:** Do not use the `help` command in the terminal.
