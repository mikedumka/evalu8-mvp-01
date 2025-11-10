# User Story Mapping: Evalu8 Sports Player Evaluation System
## The Big Picture

**Project:** Evalu8 - Sports Player Evaluation System  
**Date:** October 31, 2025  
**Version:** 1.0  
**Reference:** Project Brief v1.0

---

## User Story Mapping Framework

This user story map organizes features by **user journey** (horizontal backbone) and **priority** (vertical swim lanes). Stories flow left-to-right in the order users experience them, and top-to-bottom by release priority.

---

## Primary User Personas

1. **Association Administrator** - Configures system, manages seasons, registers players, schedules sessions, generates reports
2. **Intake Personnel** - Checks players into sessions, assigns jersey numbers, marks attendance
3. **Evaluator** - Scores players in real-time during evaluation sessions
4. **System Administrator** - Manages multi-tenant platform, user access, system health

---

## User Journey Backbone (Left to Right)

```
SETUP → REGISTRATION → SCHEDULING → INTAKE → EVALUATION → REPORTING → ANALYSIS
```

---

## Story Map by Journey Stage

### 1️⃣ SETUP & CONFIGURATION
*User: Association Administrator, System Administrator*

#### 🟦 MVP Release 1 (Must Have)
- **As an** Association Administrator, **I want to** define position types for our sport **so that** players can be evaluated for appropriate positions
- **As an** Association Administrator, **I want to** create evaluation criteria/drills **so that** evaluators score consistent attributes
- **As an** Association Administrator, **I want to** configure outlier deviation thresholds **so that** quality control matches our standards
- **As an** Association Administrator, **I want to** set up a new season **so that** we can run annual evaluations
- **As an** Association Administrator, **I want to** invite users and assign roles (Admin, Intake, Evaluator) **so that** team members have appropriate access
- **As an** Association Administrator, **I want to** require minimum evaluators per player (e.g., 3) **so that** scores are reliable

#### 🟩 MVP Release 2 (Should Have)
- **As an** Association Administrator, **I want to** copy configuration from previous season **so that** I don't recreate criteria annually

#### 🟨 Future Enhancement (Nice to Have)
- **As an** Association Administrator, **I want to** create custom drill categories **so that** evaluations reflect our unique methodology

---

### 2️⃣ PLAYER REGISTRATION & COHORT MANAGEMENT
*User: Association Administrator*

#### 🟦 MVP Release 1 (Must Have)
- **As an** Association Administrator, **I want to** bulk import players via CSV with their details (name, birth year, preferred position) **so that** registration is efficient for large groups
- **As an** Association Administrator, **I want to** manually add individual players with their details **so that** late registrations are accommodated
- **As an** Association Administrator, **I want to** edit player information **so that** errors can be corrected
- **As an** Association Administrator, **I want to** mark players as inactive/withdrawn **so that** no-shows don't appear in evaluations
- **As an** Association Administrator, **I want to** create cohorts (age groups/divisions) **so that** players are grouped appropriately
- **As an** Association Administrator, **I want to** assign players to cohorts **so that** they're evaluated with peers
- **As an** Association Administrator, **I want to** view player lists by cohort **so that** I can verify registration accuracy

#### 🟩 MVP Release 2 (Should Have)
- **As an** Association Administrator, **I want to** validate jersey number uniqueness per session **so that** evaluators don't confuse players during evaluations
- **As an** Association Administrator, **I want to** export player lists **so that** I can share rosters with staff

---

### 3️⃣ SESSION SCHEDULING & PLAYER DISTRIBUTION
*User: Association Administrator*

#### 🟦 MVP Release 1 (Must Have)
- **As an** Association Administrator, **I want to** bulk import sessions via CSV with their details (date/time/location) **so that** scheduling is efficient for multiple sessions
- **As an** Association Administrator, **I want to** manually create individual sessions with their details **so that** ad-hoc sessions can be added
- **As an** Association Administrator, **I want to** assign sessions to specific cohorts **so that** the right players attend
- **As an** Association Administrator, **I want to** assign evaluators and intake personnel to sessions **so that** scoring and check-in are distributed
- **As an** Association Administrator, **I want to** use automated player distribution (4 algorithms: Alphabetical, Random, Previous Level, Current Ranking) **so that** players get fair exposure across evaluators
- **As an** Association Administrator, **I want to** preview player assignments before finalizing **so that** distributions can be verified
- **As an** Association Administrator, **I want to** clone sessions with the ability to modify date/time/location **so that** recurring evaluations are faster to set up
- **As an** Association Administrator, **I want to** handle last-minute player reassignments **so that** absences don't disrupt schedules
- **As an** Association Administrator, **I want to** view session capacity warnings **so that** overcrowding is avoided
- **As an** Association Administrator, **I want to** send email notifications to evaluators, intake personnel, and players **so that** they receive session details

---

### 4️⃣ SESSION INTAKE & CHECK-IN
*User: Intake Personnel*

#### 🟦 MVP Release 1 (Must Have)
- **As** Intake Personnel, **I want to** see my assigned sessions **so that** I know when and where to check in players
- **As** Intake Personnel, **I want to** view the list of players scheduled for a session **so that** I can prepare for arrivals
- **As** Intake Personnel, **I want to** check players in as they arrive **so that** attendance is tracked
- **As** Intake Personnel, **I want to** assign jersey numbers to checked-in players **so that** evaluators can identify them
- **As** Intake Personnel, **I want to** the system to prevent duplicate jersey numbers for the session **so that** each player has a unique identifier
- **As** Intake Personnel, **I want to** add walk-in players to the session **so that** late registrations can participate

#### 🟩 MVP Release 2 (Should Have)
- **As** Intake Personnel, **I want to** print player roster with jersey numbers **so that** evaluators have a backup copy to perform evaluations by paper (in case their device isn't working or they can't log in)
- **As** Intake Personnel, **I want to** send check-in confirmations to parents/players **so that** attendance is communicated

---

### 5️⃣ REAL-TIME PLAYER EVALUATION
*User: Evaluator*

#### 🟦 MVP Release 1 (Must Have)
- **As an** Evaluator, **I want to** log in and see my assigned sessions **so that** I know my schedule
- **As an** Evaluator, **I want to** start an evaluation session **so that** I can begin scoring
- **As an** Evaluator, **I want to** see a list of players assigned to me (by jersey number) **so that** I know who to evaluate
- **As an** Evaluator, **I want to** select a player by jersey number **so that** I can score them
- **As an** Evaluator, **I want to** score players on multiple criteria/drills **so that** assessments are comprehensive
- **As an** Evaluator, **I want to** use a simple rating interface (tap/click scores) **so that** evaluation is fast during live action
- **As an** Evaluator, **I want to** add optional notes to player evaluations **so that** I can capture qualitative observations
- **As an** Evaluator, **I want to** see which players I've evaluated **so that** I don't miss anyone
- **As an** Evaluator, **I want to** edit scores before submitting **so that** errors can be corrected
- **As an** Evaluator, **I want to** submit completed evaluations **so that** scores are recorded
- **As an** Evaluator, **I want to** see progress indicators (e.g., 8/12 players evaluated) **so that** I know my pace
- **As an** Evaluator, **I want to** filter player lists by position **so that** I can focus on relevant players
- **As an** Evaluator, **I want to** use offline mode with sync **so that** connectivity issues don't block scoring
- **As an** Evaluator, **I want to** see visual cues for incomplete scores **so that** I'm reminded to complete evaluations

#### 🟩 MVP Release 2 (Should Have)

#### 🟨 Future Enhancement (Nice to Have)

---

### 6️⃣ QUALITY CONTROL & VALIDATION
*User: Association Administrator*

#### 🟦 MVP Release 1 (Must Have)
- **As an** Association Administrator, **I want to** configure quality validation sessions (non-scoring) **so that** evaluator accuracy can be benchmarked
- **As an** Association Administrator, **I want to** see outlier detection alerts (25% deviation threshold) **so that** inconsistent scores are flagged
- **As an** Association Administrator, **I want to** view flagged evaluations **so that** I can investigate scoring inconsistencies

#### 🟩 MVP Release 2 (Should Have)
- **As an** Association Administrator, **I want to** review evaluator consistency reports **so that** I can identify training needs
- **As an** Association Administrator, **I want to** exclude outlier scores from final rankings **so that** results are accurate
- **As an** Association Administrator, **I want to** contact evaluators about flagged scores **so that** clarification can be requested

#### 🟨 Future Enhancement (Nice to Have)
- **As an** Association Administrator, **I want to** use machine learning to predict outliers **so that** quality control is proactive

---

### 7️⃣ REPORTING & ANALYTICS
*User: Association Administrator*

#### 🟦 MVP Release 1 (Must Have)
- **As an** Association Administrator, **I want to** generate player ranking reports by cohort **so that** team formation is data-driven
- **As an** Association Administrator, **I want to** see aggregated scores per player across all evaluations **so that** overall performance is clear
- **As an** Association Administrator, **I want to** export reports to PDF/Excel **so that** they can be shared with coaches
- **As an** Association Administrator, **I want to** view session summary reports **so that** I can see evaluation completion status
- **As an** Association Administrator, **I want to** see evaluator participation reports **so that** workload is visible

#### 🟩 MVP Release 2 (Should Have)
- **As an** Association Administrator, **I want to** compare player scores across positions **so that** versatility is assessed
- **As an** Association Administrator, **I want to** view evaluator consistency metrics **so that** scoring reliability is measured
- **As an** Association Administrator, **I want to** generate trend reports across seasons **so that** player development is tracked
- **As an** Association Administrator, **I want to** filter reports by date range, cohort, session **so that** analysis is flexible
- **As an** Association Administrator, **I want to** email reports directly to stakeholders **so that** distribution is automated

#### 🟨 Future Enhancement (Nice to Have)
- **As an** Association Administrator, **I want to** create custom dashboards **so that** key metrics are visible at a glance
- **As an** Association Administrator, **I want to** use predictive analytics to forecast team composition **so that** roster decisions are optimized

---

### 8️⃣ SYSTEM ADMINISTRATION & MAINTENANCE
*User: System Administrator*

#### 🟦 MVP Release 1 (Must Have)
- **As a** System Administrator, **I want to** create new association accounts **so that** organizations can use the platform independently
- **As a** System Administrator, **I want to** configure sport types (hockey, basketball, etc.) for associations **so that** evaluation criteria match each sport
- **As a** System Administrator, **I want to** authenticate users via Google OAuth **so that** login is secure and convenient
- **As a** System Administrator, **I want to** monitor system uptime and performance **so that** SLAs are met (99.5% target)
- **As a** System Administrator, **I want to** manage multi-tenant data isolation **so that** associations can't access each other's data
- **As a** System Administrator, **I want to** backup data with 10-year retention **so that** historical records are preserved
- **As a** System Administrator, **I want to** manage user authentication **so that** access is secure
- **As a** System Administrator, **I want to** view usage analytics by association **so that** capacity planning is informed
- **As a** System Administrator, **I want to** configure system-wide settings **so that** platform behavior is consistent
- **As a** System Administrator, **I want to** audit logs for security events **so that** breaches are detected

#### 🟩 MVP Release 2 (Should Have)
- **As a** System Administrator, **I want to** auto-scale infrastructure based on load **so that** performance is maintained during peak evaluations

#### 🟨 Future Enhancement (Nice to Have)

---

## Release Planning Summary

### 🟦 MVP Release 1 (Must Have) - Core Functionality
**Goal:** End-to-end evaluation workflow from setup through basic reporting

**User Stories:** 57 stories  
**Timeline:** 12-16 weeks  
**Success Criteria:**
- Association can configure system and onboard users
- Players can be registered and assigned to cohorts
- Sessions can be scheduled with automated player distribution
- Evaluators can score players in real-time
- Basic quality control and reporting are functional
- System supports 10-20 concurrent evaluators across 3-5 sessions

### 🟩 MVP Release 2 (Should Have) - Enhanced Usability
**Goal:** Improve efficiency, flexibility, and data quality

**User Stories:** 12 stories  
**Timeline:** 8-10 weeks (after Release 1)  
**Success Criteria:**
- Reduced administrative time through automation
- Enhanced quality control with evaluator consistency tracking
- Advanced reporting with trends and analytics
- Improved evaluator experience with progress tracking

### 🟨 Future Enhancements (Nice to Have) - Innovation
**Goal:** Competitive differentiation and advanced capabilities

**User Stories:** 13 stories  
**Timeline:** Post-MVP (prioritized by user feedback)  
**Success Criteria:**
- Mobile native applications
- Player/parent portals
- Advanced analytics and ML-based insights
- Multi-sport and multi-region scalability

---

## Dependencies & Risks

### Critical Dependencies
1. **Authentication → All Features:** Google OAuth must be implemented first
2. **Association Setup → Everything:** Can't register players or create sessions without association configuration
3. **Player Registration → Evaluation:** Can't evaluate until players are in the system
4. **Session Creation → Player Distribution:** Distribution algorithms depend on session structure
5. **Evaluation Completion → Reporting:** Reports require completed evaluation data

### Technical Risks
1. **Real-time Performance:** 10-20 concurrent evaluators must not degrade page load times (<2s target)
2. **Data Integrity:** Multi-tenant isolation must be bulletproof
3. **Outlier Detection Accuracy:** 25% threshold may need tuning based on real-world data
4. **Offline Sync:** Evaluator offline mode adds complexity (Release 2)

### User Adoption Risks
1. **Evaluator Training:** 15-minute training target must be achievable
2. **Change Resistance:** Intuitive design critical to overcome status quo bias
3. **Trust in Automation:** Player distribution algorithms must be transparent

---

## Measurement & Success Metrics

### Technical KPIs (Aligned with Project Brief)
- ✅ 99.5% uptime during evaluation season
- ✅ Support 10-20 concurrent evaluators across 3-5 sessions
- ✅ Page loads under 2 seconds
- ✅ Zero data breaches (multi-tenant isolation)

### User Satisfaction KPIs
- ✅ 95% evaluator satisfaction with interface
- ✅ 90% administrator satisfaction with efficiency
- ✅ 85% overall system satisfaction

### Operational Efficiency KPIs
- ✅ 50%+ reduction in administrative time (scheduling, reporting)
- ✅ 80%+ reduction in scheduling errors
- ✅ 60%+ reduction in session setup time

### Quality KPIs
- ✅ <5% outlier scores flagged per session
- ✅ 100% of players evaluated by ≥3 evaluators
- ✅ <10% evaluator consistency variance

---

## Next Steps After User Story Mapping

1. ✅ **Create BDD Specifications (Gherkin)** - Define acceptance criteria for MVP Release 1 stories
2. ✅ **Design High-Fidelity Mockups** - Focus on evaluator interface and admin dashboards
3. **Sprint Planning** - Break Release 1 into 2-week sprints
4. **Technical Architecture Design** - Supabase schema, API contracts, component structure
5. **Dev Environment Setup** - Vite + React + Supabase stack
6. **Begin Development** - Start with authentication and association setup

---

## Appendix: Story Sizing Estimates (T-Shirt Sizes)

**Release 1 Stories by Size:**
- **XL (8+ days):** Multi-tenant setup, automated player distribution algorithms, real-time evaluation interface
- **L (5-7 days):** Session scheduling, player registration import, reporting engine
- **M (3-4 days):** Cohort management, evaluator assignment, outlier detection
- **S (1-2 days):** Individual CRUD operations, basic list views, role assignment

**Total Estimated Effort (Release 1):** ~280-320 development days (2-3 FTE for 12-16 weeks)

---

**Document Status:** ✅ Complete  
**Next Action:** Create BDD Specification for Release 1 user stories  
**Owner:** mdumka@gmail.com
