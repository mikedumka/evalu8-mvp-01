# Project Brief: Sports Player Evaluation System (Evalu8)

**Project Owner:** mdumka@gmail.com  
**Date:** October 31, 2025  
**Document Version:** 1.0  
**BRD Reference:** v1.2 (October 6, 2025)

---

## Project Overview

Development of a multi-tenant web-based platform that streamlines player evaluation processes for amateur sports organizations, from registration through team formation. The system balances comprehensive assessment capabilities with real-time usability for evaluators.

---

## Business Problem

Sports organizations conducting player evaluations face critical challenges:

- **Complexity vs. Usability:** Existing systems are either too complex for real-time use or too simple to provide actionable insights
- **Inconsistent Standards:** Lack of standardized processes across evaluators and sessions leads to subjective, unreliable scoring
- **Administrative Burden:** Manual scheduling, player distribution, and reporting consume excessive time and create errors

---

## Objectives

**Primary Goals:**

1. Simplify evaluation with an intuitive real-time scoring interface
2. Standardize assessment across all sessions, cohorts, and evaluators
3. Enhance data quality through outlier detection and multi-evaluator scoring
4. Support data-driven decisions with comprehensive reporting and analytics

**Secondary Goals:**

- Reduce administrative overhead
- Enable multi-sport compatibility
- Maintain role-based security and data privacy
- Support scalability from 50 to 1000+ players

---

## Key Features

**Core Capabilities:**

- Multi-tenant architecture with complete data isolation
- Reusable drill library with many-to-many relationship to evaluation sessions
- Sport-specific position types with active/inactive management
- Season-based configuration with locked parameters (outlier thresholds, minimum evaluators)
- Intelligent automated player scheduling (4 distribution algorithms)
- Real-time evaluation interface with anonymous jersey-based scoring
- Season-specific quality control with locked outlier deviation threshold (10-50%, default 25%) set during season creation to ensure QA consistency
- Configurable minimum evaluators per player (1-10, default 3) with validation warnings; single evaluator mode disables outlier detection
- Quality validation evaluations for benchmarking (non-scoring assessments by coaches to verify evaluator accuracy)
- Comprehensive reporting (player rankings, session summaries, evaluator consistency)
- Multi-role user management (Administrator, Evaluator, Intake Personnel) with Google OAuth authentication
- 7-day invitation expiration with bulk invite capability

**Technical Foundation:**

- Stack: Vite + React + Supabase (PostgreSQL)
- Google OAuth authentication
- Email reporting capabilities
- 10-year historical data retention

---

## Scope

**In Scope:**

- Association and user management (multi-role invitation system with Google OAuth)
- Position type configuration (sport-specific, active/inactive states)
- Reusable drill library (create, edit, activate/deactivate drills)
- Season management (unique seasons with locked QA parameters)
- Cohort and player administration
- Session scheduling and management (including location/venue management)
- Real-time evaluation scoring with fixed 1-10 scale
- Quality control (locked season-specific outlier thresholds, minimum evaluator requirements)
- Comprehensive reporting and analytics
- Multi-sport configuration
- Historical data retention (10 years, read-only for completed seasons)

**Out of Scope:**

- Mobile native applications (MVP)
- Player/parent portals
- SMS/Text notifications

---

## Success Metrics

**Technical Performance:**

- 99.5% uptime during evaluation season
- Support 10-20 concurrent evaluators across 3-5 sessions
- Page loads under 2 seconds

**User Satisfaction:**

- 95% evaluator satisfaction with interface
- 90% administrator satisfaction with efficiency
- 85% overall system satisfaction

**Operational Efficiency:**

- Reduction in administrative time
- Reduction in scheduling errors
- Reduction in session setup time

---

## Key Stakeholders

**Primary:**

- Sports Association Administrators (system configuration, reporting)
- Evaluators (real-time player scoring)
- Intake/Operations Staff (player registration, session coordination)

**Secondary:**

- System Administrators (platform management)
- Players & Parents (beneficiaries of fair evaluation)

---

## Risks & Mitigation

**Top Risks:**

1. **User adoption resistance** → Mitigation: Early user involvement, 15-minute training, intuitive design
2. **Data quality issues** → Mitigation: Outlier detection, multi-evaluator requirements, validation rules
3. **Performance under load** → Mitigation: Load testing, horizontal scaling, CDN for assets
4. **Scope creep** → Mitigation: Clear requirements, change control process, phased delivery

---

## Next Steps

**Development Preparation:**

1. Complete user story mapping (The Big Picture)
2. Create the Behavior Driven Development Specification (BDD Spec) using Gherkin
3. Create high-fidelity mockups
