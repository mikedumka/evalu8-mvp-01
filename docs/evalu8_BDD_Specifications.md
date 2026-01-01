# BDD Specifications: Evalu8 Sports Player Evaluation System

## Behavior-Driven Development (Gherkin Format)

**Project:** Evalu8 - Sports Player Evaluation System  
**Date:** October 31, 2025  
**Version:** 1.0  
**Reference:** User Story Mapping v1.0

---

## Document Purpose

This document defines acceptance criteria for MVP Release 1 user stories using Gherkin syntax (Given-When-Then). Each feature maps to user stories from the User Story Mapping document and provides concrete, testable scenarios that define "done."

---

## 1️⃣ SETUP & CONFIGURATION

### Feature: Set Up New Season

**User Story:** As an Association Administrator, I want to set up a new season so that we can run annual evaluations

**Business Rules:**

- Season must have a unique name (e.g., "2025 Fall", "2025-2026")
- Only one season can be "active" at a time
- Previous season data remains accessible but read-only when new season starts
- Outlier deviation threshold must be set during season creation (10-50%, default 25%)
- Threshold is locked for the season and cannot be changed once set (ensures QA consistency)
- Minimum evaluators per player requirement is also configured during season setup (1-10, default 3)
- Session capacity must be configured during season setup (applies to all cohorts in the season)
- Session capacity is locked after the first session is created (any type: bulk or individual)

````gherkin
Scenario: Create first season
  Given I am logged in as an Association Administrator
  And no seasons exist in the system
  When I navigate to "Seasons" settings
  And I click "Create New Season"
  And I enter "2025 Fall Evaluations" as the season name
  And I set outlier deviation threshold to "25%"
  And I set minimum evaluators per player to "3"
  And I set minimum sessions per athlete to "5"
  And I set session capacity to "20"
  And I click "Save"
  Then the season "2025 Fall Evaluations" is created
  And it is automatically set as the "Active" season
  And the outlier threshold is locked at 25% for this season
  And the minimum evaluators requirement is set to 3
  And the minimum sessions per athlete is locked at 5
  And the session capacity is set to 20 players per session
  And I see a confirmation message "Season created and activated"

Scenario: Create new season while previous season exists
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" exists and is active with 25% threshold and session capacity 20
  When I create a new season "2026 Winter Evaluations"
  And I set outlier deviation threshold to "20%"
  And I set minimum evaluators per player to "4"
  And I set minimum sessions per athlete to "3"
  And I set session capacity to "15"
  Then both seasons exist in the system
  And "2025 Fall Evaluations" remains active with its locked 25% threshold, 5 minimum evaluations, and session capacity 20
  And "2026 Winter Evaluations" is created with locked 20% threshold, 3 minimum evaluations, and session capacity 15 but is not active

Scenario: Switch active season
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is currently active
  And season "2026 Winter Evaluations" exists but is not active
  When I navigate to "Seasons" settings
  And I click "Activate" next to "2026 Winter Evaluations"
  Then I see a confirmation dialog "Activating this season will deactivate 2025 Fall Evaluations. Continue?"
  When I click "Confirm"
  Then "2026 Winter Evaluations" becomes the active season
  And "2025 Fall Evaluations" is no longer active
  And all new evaluations are associated with "2026 Winter Evaluations"
  And historical data from "2025 Fall Evaluations" remains accessible in read-only mode

Scenario: Prevent duplicate season names
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" already exists
  When I attempt to create another season named "2025 Fall Evaluations"
  Then I see an error message "Season name must be unique"
  And the duplicate season is not created

Scenario: View season statistics
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active
  When I view the season details
  Then I see statistics including:
    | Metric | Value |
    | Total Players Registered | 120 |
    | Evaluation Sessions Scheduled | 8 |
    | Evaluations Completed | 5 |
    | Average Evaluators per Session | 12 |
    | Outlier Deviation Threshold | 25% (locked) |
    | Minimum Evaluators Per Player | 3 |
    | Minimum Sessions Per Athlete | 5 (locked) |
    | Session Capacity | 20 players |

Scenario: Cannot change locked parameters for active season
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active with 25% threshold and 5 minimum sessions per athlete
  When I view the season settings
  Then the outlier threshold field is read-only
  And the minimum sessions per athlete field is read-only
  And I see a message "Threshold and minimum sessions are locked to ensure QA consistency throughout the season"
  And I cannot modify either locked value

Scenario: Configure session capacity during season setup
  Given I am logged in as an Association Administrator
  And I am creating a new season "2025 Fall Evaluations"
  When I enter the season details
  And I set session capacity to "20"
  And I click "Save"
  Then the session capacity is set to 20 players per session
  And this capacity applies to all cohorts in this season
  And I see a confirmation "Session capacity set to 20 players per session"
  And this capacity will be used to calculate wave requirements when cohorts get active players

Scenario: Session capacity locked after first session created
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active with session capacity 20
  And cohort "U11" has 100 active players
  And wave requirements have been calculated (5 waves of 5 sessions each)
  When I create the first session (via bulk import or individual creation)
  And I navigate back to season settings
  Then the session capacity field is read-only
  And I see a message "Session capacity locked: sessions have been created for this season"
  And I cannot modify the session capacity
  And I see a note "Session capacity was set to 20 and is now locked to maintain wave structure integrity"

### Feature: Manage Locations

**User Story:** As an Association Administrator, I want to manage locations (arenas, fields, gyms) so that I can schedule evaluation sessions at specific venues.

**Business Rules:**
- Locations must have a Name, City, Province/State, Address, Postal Code, and optional Map Link
- Locations can be added, edited, and deleted
- A location cannot be deleted if it is currently assigned to any scheduled session (past or future)
- Location names must be unique within the association

Scenario: Add a new location
  Given I am logged in as an Association Administrator
  When I navigate to "Locations" settings
  And I click "Add Location"
  And I enter "Main Arena" as the name
  And I enter "Moose Jaw" as the city
  And I enter "SK" as the province/state
  And I enter "123 Main St" as the address
  And I enter "S6H 1A1" as the postal code
  And I enter "https://maps.google.com/..." as the map link
  And I click "Save"
  Then the location "Main Arena" is created
  And I see it in the list of locations

Scenario: Edit an existing location
  Given I am logged in as an Association Administrator
  And a location "Main Arena" exists
  When I click "Edit" for "Main Arena"
  And I change the name to "Main Arena - Rink A"
  And I click "Save"
  Then the location is updated to "Main Arena - Rink A"

Scenario: Delete an unused location
  Given I am logged in as an Association Administrator
  And a location "Old Gym" exists
  And "Old Gym" is not assigned to any sessions
  When I click "Delete" for "Old Gym"
  And I confirm the deletion
  Then the location "Old Gym" is removed from the system

Scenario: Prevent deletion of used location
  Given I am logged in as an Association Administrator
  And a location "Main Arena" exists
  And "Main Arena" is assigned to a session "Session 1"
  When I attempt to delete "Main Arena"
  Then I see an error message "Cannot delete location because it is used in scheduled sessions"
  And the location "Main Arena" is not deleted

### Feature: Manage Associations & Personnel
**User Story:** As a Platform Administrator, I want to create associations and assign personnel so that organizations can manage their own evaluation programs

**Business Rules:**
- Creating a new association automatically assigns the creator as an Administrator
- Association slugs must be unique and auto-generated based on the name
- Every association must be linked to an active sport type
- Administrators can invite existing users by email and assign one or more roles
- Supported roles: Administrator, Evaluator, Intake Personnel (combinations allowed)
- Administrators can change member roles or deactivate memberships, but cannot remove themselves if they are the sole administrator
- Only active members appear in association, season, and session management screens

```gherkin
Scenario: Create a new association and become the first administrator
  Given I am logged in with a Supabase account
  And I have no active association memberships
  When I open "Association Management"
  And I click "Create Association"
  And I enter "Selkirk Minor Hockey" as the association name
  And I select sport type "Hockey"
  And I enter "info@selkirkminorhockey.ca" as the contact email
  And I click "Save"
  Then the association "Selkirk Minor Hockey" is created with status "Active"
  And a unique slug is generated for the association
  And I am automatically added as an Administrator for this association
  And the association becomes my active context for subsequent actions

Scenario: Add additional administrators to an association
  Given I am logged in as an Administrator for "Selkirk Minor Hockey"
  And I am viewing "Association Personnel"
  When I add the email "coach.baker@example.com"
  And I assign the roles "Administrator" and "Evaluator"
  Then the member "coach.baker@example.com" appears in the personnel list
  And the member has active roles "Administrator" and "Evaluator"
  And an entry is recorded in audit logs noting the role assignment

Scenario: Assign evaluators and intake personnel to an association
  Given I am logged in as an Administrator for "Selkirk Minor Hockey"
  And the member "pat.singh@example.com" exists in the personnel list
  When I edit the member's roles
  And I select "Evaluator" and "Intake Personnel"
  And I save the changes
  Then the member's roles update to "Evaluator, Intake Personnel"
  And the member remains active in the association
  And I see a confirmation message "Roles updated"

Scenario: Deactivate an association member
  Given I am logged in as an Administrator for "Selkirk Minor Hockey"
  And "coach.baker@example.com" has roles "Administrator, Evaluator"
  When I change their status to "Inactive"
  Then the member is removed from active personnel lists
  And the member can no longer access association data
  And the deactivation is recorded in the audit log

Scenario: Prevent removing the last administrator
  Given I am the only Administrator for "Selkirk Minor Hockey"
  When I attempt to deactivate my account or remove the Administrator role
  Then I see an error message "At least one administrator is required"
  And my membership remains unchanged

Scenario: Update association profile
  Given I am logged in as an Administrator for "Selkirk Minor Hockey"
  When I update the association name to "Selkirk Hockey Association"
  And I change the contact email to "admin@selkirkha.ca"
  Then the association profile reflects the new name and contact email
  And the slug remains unchanged for continuity
  And I see a confirmation message "Association profile updated"
````

````

---

### Feature: Create Cohorts (Age Groups/Divisions)
**User Story:** As an Association Administrator, I want to create cohorts (age groups/divisions) so that players are grouped appropriately

**Business Rules:**
- Cohorts must have unique names within an association (e.g., U11, U13, U15)
- Cohorts persist across seasons - same cohorts used year after year
- Cohorts can be based on age group, skill level, or custom groupings
- At least one cohort must exist before players can be assigned
- Cohorts can be marked as active/inactive

```gherkin
Scenario: Create first cohort for association
  Given I am logged in as an Association Administrator
  And no cohorts exist yet
  When I navigate to "Cohorts"
  And I click "Add Cohort"
  And I enter "U11" as cohort name
  And I enter "11 and under players" as description
  And I click "Save"
  Then the cohort "U11" is created
  And its status is "Active"
  And I see a confirmation message "Cohort created successfully"
  And the cohort can be used across all seasons

Scenario: Create multiple cohorts for different age groups
  Given I am logged in as an Association Administrator
  When I create cohort "U11" with description "11 and under players"
  And I create cohort "U13" with description "13 and under players"
  And I create cohort "U15" with description "15 and under players"
  Then I see 3 cohorts in the list
  And each cohort shows its name and player count (0)
  And all cohorts are available for use in any season

Scenario: Prevent duplicate cohort names
  Given I am logged in as an Association Administrator
  And cohort "U11" already exists
  When I attempt to create another cohort named "U11"
  Then I see an error message "Cohort 'U11' already exists"
  And the duplicate cohort is not created

Scenario: Prevent creating cohort without name
  Given I am logged in as an Association Administrator
  When I click "Add Cohort"
  And I leave the name blank
  And I click "Save"
  Then I see an error message "Cohort name is required."
  And the cohort is not created

Scenario: Edit cohort details
  Given I am logged in as an Association Administrator
  And cohort "U11" exists
  When I click "Edit" next to the cohort
  And I change the name to "U11 Elite"
  And I update the description to "11 and under elite division"
  And I click "Save"
  Then the cohort name is updated to "U11 Elite"
  And I see a confirmation message "Cohort updated successfully"
  And the updated cohort name applies to all seasons

Scenario: Deactivate cohort
  Given I am logged in as an Association Administrator
  And cohort "U9" exists
  And no sessions are currently scheduled for this cohort
  When I click "Deactivate" next to the cohort
  Then I see a confirmation dialog "Deactivate U9? Players will remain assigned but cohort won't appear in new sessions."
  When I click "Confirm"
  Then the cohort is marked as "Inactive"
  And it no longer appears when creating new sessions in any season
  But assigned players remain in the cohort
  And historical data from all seasons is preserved

Scenario: Reactivate inactive cohort
  Given I am logged in as an Association Administrator
  And cohort "U9" exists and is inactive
  When I click "Activate" next to the cohort
  Then the cohort is marked as "Active"
  And it appears again when creating new sessions
  And I see a confirmation message "Cohort reactivated successfully"

Scenario: Cannot delete cohort with assigned players
  Given I am logged in as an Association Administrator
  And cohort "U11" has 25 assigned players across multiple seasons
  When I attempt to delete the cohort
  Then I see an error message "Cannot delete cohort with assigned players or historical data. Mark as inactive instead."
  And the cohort remains in the system

Scenario: View cohort statistics across seasons
  Given I am logged in as an Association Administrator
  And cohort "U11" exists
  And "U11" has been used in multiple seasons
  When I click on the cohort to view details
  Then I see cohort statistics for the current active season:
    | Metric | Value |
    | Total Players (Current Season) | 25 |
    | Active Players | 23 |
    | Inactive Players | 2 |
    | Sessions Scheduled | 5 |
    | Evaluations Completed | 3 |
  And I can view historical statistics from previous seasons
````

---

### Feature: Define Previous Levels for Player Distribution

**User Story:** As an Association Administrator, I want to define previous levels so that the "Previous Level" distribution algorithm can assign players based on prior rankings

**Business Rules:**

- Previous levels represent rankings from prior evaluations (e.g., A, B, C or Gold, Silver, Bronze)
- Each association can define custom level names
- Levels must be unique within an association
- Levels persist across seasons - same level structure used year after year
- Levels are ordered/ranked (higher to lower)
- Players can be assigned a previous level during registration or import
- Previous levels are optional - players without levels can still participate

```gherkin
Scenario: Create first set of previous levels
  Given I am logged in as an Association Administrator
  And no previous levels exist yet
  When I navigate to "Previous Levels" settings
  And I click "Add Level"
  And I enter "A" as level name
  And I set rank order to "1" (highest)
  And I click "Save"
  Then the level "A" is created successfully
  And I see a confirmation message "Previous level 'A' has been added"
  And the level can be used across all seasons

Scenario: Create multiple ranked levels
  Given I am logged in as an Association Administrator
  When I create level "A" with rank order 1
  And I create level "B" with rank order 2
  And I create level "C" with rank order 3
  And I create level "D" with rank order 4
  Then I see 4 levels in the list
  And they are displayed in rank order: A, B, C, D
  And all levels are available for use in any season

Scenario: Prevent duplicate level names
  Given I am logged in as an Association Administrator
  And level "A" already exists
  When I attempt to create another level named "A"
  Then I see an error message "Previous level 'A' already exists"
  And the duplicate level is not created

Scenario: Edit level name
  Given I am logged in as an Association Administrator
  And level "A" exists with rank order 1
  When I click "Edit" next to level "A"
  And I change the name to "Gold"
  And I click "Save"
  Then the level name is updated to "Gold"
  And the rank order remains 1
  And I see a confirmation message "Previous level updated successfully"
  And the updated level name applies to all seasons

Scenario: Reorder levels
  Given I am logged in as an Association Administrator
  And levels exist: A (rank 1), B (rank 2), C (rank 3)
  When I navigate to "Previous Levels"
  And I click "Move Up" next to level "C"
  And I click "Move Up" next to level "C" again
  Then the rank order is updated:
    | Level | New Rank |
    | C | 1 |
    | A | 2 |
    | B | 3 |
  And I see a confirmation message "Level order updated"

Scenario: View level usage statistics across seasons
  Given I am logged in as an Association Administrator
  And level "A" exists
  And "A" has been used across multiple seasons
  And 15 players are assigned to level "A" in the current season
  When I view the previous levels list
  Then I see level "A" with player count "15 (current season)"
  And I can view historical usage from previous seasons

Scenario: Cannot delete level with assigned players
  Given I am logged in as an Association Administrator
  And level "A" exists
  And 15 players have previous level "A" across multiple seasons
  When I attempt to delete level "A"
  Then I see an error message "Cannot delete level with assigned players or historical data. You can rename it if needed."
  And level "A" remains in the system
```

---

### Feature: Define Position Types for Sport

**User Story:** As an Association Administrator, I want to define position types for our sport so that players can be evaluated in appropriate positions

**Business Rules:**

- Position types must have unique names within an association
- Position types are sport-specific (e.g., Forward, Defense, Goalie for hockey)
- Position types can be marked as active/inactive
- Cannot delete position types with assigned players
- At least one position type must exist before players can be registered

```gherkin
Scenario: Create first position type for hockey association
  Given I am logged in as an Association Administrator
  And my association is configured for "Hockey"
  And no position types exist yet
  When I navigate to "Position Types" settings
  And I click "Add Position Type"
  And I enter "Forward" as the position name
  And I click "Save"
  Then the position type "Forward" is created successfully
  And I see a confirmation message "Position type 'Forward' has been added"
  And "Forward" appears in the position types list

Scenario: Create multiple position types
  Given I am logged in as an Association Administrator
  And my association has position type "Forward"
  When I add position type "Defense"
  And I add position type "Goalie"
  Then I see 3 position types in the list
  And each position type is marked as "Active"

Scenario: Prevent duplicate position type names
  Given I am logged in as an Association Administrator
  And position type "Forward" already exists
  When I attempt to create another position type named "Forward"
  Then I see an error message "Position type 'Forward' already exists"
  And the duplicate position type is not created

Scenario: Edit existing position type
  Given I am logged in as an Association Administrator
  And position type "Defense" exists
  When I click "Edit" next to "Defense"
  And I change the name to "Defenseman"
  And I click "Save"
  Then the position type is updated to "Defenseman"
  And I see a confirmation message "Position type updated successfully"

Scenario: Deactivate position type
  Given I am logged in as an Association Administrator
  And position type "Goalie" exists
  And no players are currently assigned to "Goalie"
  When I click "Deactivate" next to "Goalie"
  Then "Goalie" is marked as "Inactive"
  And "Goalie" no longer appears in player registration position options
  But "Goalie" still appears in the position types management list

Scenario: Cannot delete position type with assigned players
  Given I am logged in as an Association Administrator
  And position type "Forward" exists
  And 15 players are assigned to "Forward" position
  When I attempt to delete "Forward"
  Then I see an error message "Cannot delete position type with assigned players"
  And "Forward" remains in the system
```

---

### Feature: Create Drills and Evaluation Criteria

**User Story:** As an Association Administrator, I want to create evaluation criteria/drills so that evaluators score consistent attributes

**Business Rules:**

- Drills are reusable objects stored in a drill library
- Each drill must have a unique name within the association
- Drills capture name, description, and detailed evaluation criteria (1-10 scoring scale is fixed)
- Drills are position-agnostic when created (no weight or position assignment)
- Drills can be assigned to multiple sessions (many-to-many relationship)
- When assigned to a session, each drill gets ONE weight that applies to ALL positions using it
- Each position in a session can have maximum 4 drills
- Each position's drills must total exactly 100% weight
- Drill weights are locked after first evaluation score is entered
- Drills can be marked as active/inactive

```gherkin
Scenario: Create first evaluation drill in the library
  Given I am logged in as an Association Administrator
  And no evaluation drills exist yet
  When I navigate to "Drill Library" settings
  And I click "Add Drill"
  And I enter "Skating Speed" as the drill name
  And I enter "Acceleration and straight-line speed assessment" as the drill description
  And I enter "Evaluate player's straight-line skating speed from blue line to blue line" as the evaluation criteria
  And I see the scoring scale is fixed at "1-10"
  And I click "Save"
  Then the drill "Skating Speed" is created successfully
  And I see a confirmation message "Drill 'Skating Speed' has been added to your library"
  And "Skating Speed" appears in the drill library list

Scenario: Create multiple drills
  Given I am logged in as an Association Administrator
  When I create drill "Wrist Shot Accuracy" with description "Assess shooting mechanics" and evaluation criteria "Measure accuracy of wrist shots on net from various positions"
  And I create drill "Passing Accuracy" with description "Core tape-to-tape passing" and evaluation criteria "Evaluate precision and speed of passes to teammates"
  And I create drill "Hockey Sense" with description "Game awareness" and evaluation criteria "Assess player's ability to read the game and make smart decisions"
  And I create drill "Backward Skating" with description "Edge control" and evaluation criteria "Evaluate backward skating technique and speed"
  Then I see 4 drills in the library
  And each drill shows its name and evaluation criteria

Scenario: Require drill description and evaluation criteria
  Given I am logged in as an Association Administrator
  When I click "Add Drill"
  And I enter "Edge Control" as the drill name
  And I leave the description blank
  And I enter "Evaluate transitions between forward and backward skating" as the evaluation criteria
  And I click "Save"
  Then I see an error message "Description is required"
  And the drill is not created
  When I enter "Focus on transitions between forward and backward skating" as the description
  And I clear the evaluation criteria field
  And I click "Save"
  Then I see an error message "Evaluation criteria is required"
  And the drill is not created

Scenario: Prevent duplicate drill names
  Given I am logged in as an Association Administrator
  And drill "Skating Speed" already exists in the library
  When I attempt to create another drill named "Skating Speed"
  Then I see an error message "Drill 'Skating Speed' already exists"
  And the duplicate drill is not created

Scenario: Edit existing drill properties
  Given I am logged in as an Association Administrator
  And drill "Hockey Sense" exists in the library
  When I click "Edit" next to "Hockey Sense"
  And I change the evaluation criteria to "Evaluate player's ability to read plays, anticipate opponent moves, and make smart decisions under pressure"
  And I click "Save"
  Then the drill evaluation criteria is updated
  And I see a confirmation message "Drill updated successfully"
  And the updated criteria will apply to future sessions using this drill

Scenario: View drill details
  Given I am logged in as an Association Administrator
  And drill "Skating Speed" exists in the library
  When I click on "Skating Speed" to view details
  Then I see the drill properties:
    | Property | Value |
    | Name | Skating Speed |
    | Evaluation Criteria | Evaluate player's straight-line skating speed from blue line to blue line |
    | Scoring Scale | 1-10 |
    | Status | Active |
    | Times Used | 8 sessions |

Scenario: Deactivate drill in library
  Given I am logged in as an Association Administrator
  And drill "Backward Skating" exists in the library
  And "Backward Skating" is not currently assigned to any active sessions
  When I click "Deactivate" next to "Backward Skating"
  Then "Backward Skating" is marked as "Inactive"
  And "Backward Skating" no longer appears when selecting drills for new sessions
  But "Backward Skating" still appears in the drill library management list
  And historical sessions using "Backward Skating" are unaffected

Scenario: Reactivate inactive drill
  Given I am logged in as an Association Administrator
  And drill "Backward Skating" is marked as "Inactive"
  When I click "Activate" next to "Backward Skating"
  Then "Backward Skating" is marked as "Active"
  And I see a confirmation message "Drill reactivated"
  And "Backward Skating" now appears in the drill selection list for sessions

Scenario: Cannot delete drill used in completed sessions
  Given I am logged in as an Association Administrator
  And drill "Skating Speed" exists in the library
  And "Skating Speed" has been used in 5 completed evaluation sessions
  When I attempt to delete "Skating Speed"
  Then I see an error message "Cannot delete drill with historical evaluation data. You can deactivate it instead."
  And "Skating Speed" remains in the library
  But I have the option to "Deactivate" it

Scenario: Delete unused drill
  Given I am logged in as an Association Administrator
  And drill "Test Drill" exists in the library
  And "Test Drill" has never been used in any session
  When I click "Delete" next to "Test Drill"
  Then I see a confirmation dialog "Delete 'Test Drill'? This cannot be undone."
  When I click "Confirm"
  Then "Test Drill" is permanently removed from the library
  And I see a confirmation message "Drill deleted successfully"
```

---

### Feature: Invite Users and Assign Roles

**User Story:** As an Association Administrator, I want to invite users and assign roles (Admin, Intake, Evaluator) so that team members have appropriate access

**Business Rules:**

- Users must have valid email addresses
- Available roles: Association Administrator, Intake Personnel, Evaluator
- Users can have multiple roles
- Invitations expire after 7 days if not accepted
- Users authenticate via Google OAuth

```gherkin
Scenario: Invite first evaluator
  Given I am logged in as an Association Administrator
  And no other users exist in my association
  When I navigate to "Team Members" settings
  And I click "Invite User"
  And I enter email "john.smith@email.com"
  And I enter name "John Smith"
  And I select role "Evaluator"
  And I click "Send Invitation"
  Then an invitation email is sent to "john.smith@email.com"
  And I see a confirmation message "Invitation sent to John Smith"
  And John Smith appears in the "Pending Invitations" list
  And the invitation expires in 7 days

Scenario: Invite user with multiple roles
  Given I am logged in as an Association Administrator
  When I click "Invite User"
  And I enter email "sarah.jones@email.com"
  And I enter name "Sarah Jones"
  And I select roles "Evaluator" and "Intake Personnel"
  And I click "Send Invitation"
  Then Sarah Jones is invited with both roles
  And she will have permissions for both evaluation and intake functions

Scenario: User accepts invitation
  Given I am an invited user "John Smith"
  And I received an invitation email
  When I click the invitation link in the email
  And I authenticate with my Google account
  Then my account is activated
  And I am assigned the role "Evaluator"
  And I can now log in to the Evalu8 system
  And the invitation is removed from "Pending Invitations"

Scenario: Prevent duplicate user invitations
  Given I am logged in as an Association Administrator
  And user "john.smith@email.com" has already been invited
  When I attempt to invite "john.smith@email.com" again
  Then I see a message "john.smith@email.com has a pending invitation"
  And I have the option to "Resend Invitation" or "Cancel"

Scenario: Resend expired invitation
  Given I am logged in as an Association Administrator
  And invitation to "jane.doe@email.com" expired 2 days ago
  When I view "Pending Invitations"
  And I click "Resend" next to Jane Doe
  Then a new invitation is sent to "jane.doe@email.com"
  And the expiration date is reset to 7 days from now

Scenario: Change user role after activation
  Given I am logged in as an Association Administrator
  And user "John Smith" is an active Evaluator
  When I navigate to "Team Members"
  And I click "Edit" next to John Smith
  And I add the role "Association Administrator"
  And I click "Save"
  Then John Smith now has roles "Evaluator" and "Association Administrator"
  And he gains administrator permissions immediately

Scenario: Remove user access
  Given I am logged in as an Association Administrator
  And user "Sarah Jones" is an active Evaluator
  When I navigate to "Team Members"
  And I click "Remove" next to Sarah Jones
  Then I see a confirmation dialog "Remove Sarah Jones from your association?"
  When I click "Confirm"
  Then Sarah Jones loses access to the association
  And her historical evaluation data is preserved
  But she can no longer log in to this association

Scenario: Bulk invite multiple evaluators
  Given I am logged in as an Association Administrator
  When I navigate to "Team Members"
  And I click "Bulk Invite"
  And I upload a CSV file with columns: Email, Name, Role
  And the file contains 15 evaluators
  Then all 15 invitation emails are sent
  And I see a confirmation message "15 invitations sent successfully"
  And all 15 users appear in "Pending Invitations" list
```

---

## 2️⃣ PLAYER REGISTRATION & COHORT MANAGEMENT

### Feature: Bulk Import Players via CSV

**User Story:** As an Association Administrator, I want to bulk import players via CSV with their details (name, birthdate, contact info) so that registration is efficient for large groups

**Business Rules:**

- CSV must contain columns in this exact order: First Name, Last Name, Birthdate, Gender, Position, Cohort, Previous Level, Phone, Email 1, Email 2
- Birthdate must be in valid format (m/d/yyyy)
- Birth Year is automatically calculated from Birthdate
- Position must match an active position type in the system
- Cohort (if provided) must match an active cohort in the system
- Previous Level (if provided) must match an active previous level in the system
- Players without a cohort value remain unassigned and can be assigned later
- Duplicate players (same first name, last name, and birthdate) are flagged for review
- Import validates all rows before processing
- Players are imported in "Active" status by default
- All imported players must be assigned to the active season

```gherkin
Scenario: Import players with valid CSV
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active
  And position types "Forward", "Defense", "Goalie" exist and are active
  When I navigate to "Players"
  And I click "Bulk Import"
  And I upload a CSV file with columns: First Name, Last Name, Birthdate, Gender, Position, Cohort, Previous Level, Phone, Email 1, Email 2
  And the file contains:
    | First Name | Last Name | Birthdate | Gender | Position | Cohort | Previous Level | Phone | Email 1 | Email 2 |
    | John | Smith | 05/15/2010 | Male | Forward | U15 | A | 555-0101 | john.dad@email.com | john.mom@email.com |
    | Sarah | Jones | 08/22/2011 | Female | Defense | U13 | B | 555-0102 | sarah.parents@email.com | |
    | Michael | Brown | 01/10/2010 | Male | Goalie | | | 555-0103 | mike.dad@email.com | |
  And I click "Import"
  Then all 3 players are imported successfully
  And they are assigned to season "2025 Fall Evaluations"
  And each player is marked as "Active"
  And John Smith has birth year 2010 derived from 05/15/2010
  And I see a confirmation message "3 players imported successfully"

Scenario: Import players with cohort assignments
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active
  And cohorts "U11", "U13" exist and are active
  And position types "Forward", "Defense" exist and are active
  When I navigate to "Players"
  And I click "Bulk Import"
  And I upload a CSV file with columns: First Name, Last Name, Birthdate, Gender, Position, Cohort, Previous Level, Phone, Email 1, Email 2
  And the file contains:
    | First Name | Last Name | Birthdate | Gender | Position | Cohort | Previous Level | Phone | Email 1 | Email 2 |
    | John | Smith | 05/15/2010 | Male | Forward | U11 | | 555-0101 | email@test.com | |
    | Sarah | Jones | 08/22/2011 | Female | Defense | U13 | | 555-0102 | email@test.com | |
    | Michael | Brown | 01/10/2010 | Male | Forward | | | 555-0103 | email@test.com | |
  And I click "Import"
  Then all 3 players are imported successfully
  And John Smith is assigned to cohort "U11"
  And Sarah Jones is assigned to cohort "U13"
  And Michael Brown is not assigned to any cohort
  And I see a confirmation message "3 players imported successfully (2 assigned to cohorts)"

Scenario: Validate CSV format before import
  Given I am logged in as an Association Administrator
  When I upload a CSV file for import
  And the file is missing the "Birthdate" column
  Then I see an error message "Invalid CSV format. Required columns: First Name, Last Name, Birthdate, Gender, Position, Cohort, Previous Level, Phone, Email 1, Email 2"
  And no players are imported
  And I have the option to "Download Template CSV"

Scenario: Detect invalid position types during import
  Given I am logged in as an Association Administrator
  And only position types "Forward", "Defense", "Goalie" exist
  When I upload a CSV file containing:
    | First Name | Last Name | Birthdate | Gender | Position | Cohort | Previous Level | Phone | Email 1 | Email 2 |
    | John | Smith | 05/15/2010 | Male | Forward | U15 | A | 555-0101 | email@test.com | |
    | Sarah | Jones | 08/22/2011 | Female | Midfielder | U13 | B | 555-0102 | email@test.com | |
  Then I see a validation error "Row 2: Position 'Midfielder' does not exist"
  And no players are imported
  And I can "Fix Errors and Retry"

Scenario: Detect invalid cohorts during import
  Given I am logged in as an Association Administrator
  And only cohorts "U11", "U13" exist and are active
  When I upload a CSV file containing:
    | First Name | Last Name | Birthdate | Gender | Position | Cohort | Previous Level | Phone | Email 1 | Email 2 |
    | John | Smith | 05/15/2010 | Male | Forward | U11 | | 555-0101 | email@test.com | |
    | Sarah | Jones | 08/22/2011 | Female | Defense | U15 | | 555-0102 | email@test.com | |
  Then I see a validation error "Row 2: Cohort 'U15' does not exist or is inactive"
  And no players are imported
  And I can "Fix Errors and Retry"

Scenario: Detect invalid birth dates
  Given I am logged in as an Association Administrator
  When I upload a CSV file containing:
    | First Name | Last Name | Birthdate | Gender | Position | Cohort | Previous Level | Phone | Email 1 | Email 2 |
    | John | Smith | 2010-05-15 | Male | Forward | U15 | | 555-0101 | email@test.com | |
    | Sarah | Jones | 08/22/2011 | Female | Defense | U13 | | 555-0102 | email@test.com | |
  Then I see a validation error "Row 1: Invalid date format. Use m/d/yyyy"
  And no players are imported

Scenario: Flag potential duplicate players
  Given I am logged in as an Association Administrator
  And player "John Smith" with birthdate 05/15/2010 already exists
  When I upload a CSV file containing:
    | First Name | Last Name | Birthdate | Gender | Position | Cohort | Previous Level | Phone | Email 1 | Email 2 |
    | John | Smith | 05/15/2010 | Male | Forward | U15 | | 555-0101 | email@test.com | |
    | Sarah | Jones | 08/22/2011 | Female | Defense | U13 | | 555-0102 | email@test.com | |
  Then I see a warning "1 potential duplicate detected"
  And I see a review screen showing:
    | CSV Player | Existing Player | Action |
    | John Smith (05/15/2010) | John Smith (05/15/2010, Forward) | Skip / Import Anyway |
  When I select "Skip" for John Smith
  And I click "Continue Import"
  Then only Sarah Jones is imported
  And I see a confirmation message "1 player imported, 1 duplicate skipped"

Scenario: Import large player list
  Given I am logged in as an Association Administrator
  When I upload a CSV file with 150 players
  And all data is valid
  And I click "Import"
  Then I see a progress indicator
  And all 150 players are imported successfully
  And I see a confirmation message "150 players imported successfully"
  And I can view the complete player list

Scenario: Download CSV template
  Given I am logged in as an Association Administrator
  When I navigate to "Players"
  And I click "Bulk Import"
  And I click "Download Template CSV"
  Then a CSV file is downloaded with headers: First Name, Last Name, Birthdate, Gender, Position, Cohort, Previous Level, Phone, Email 1, Email 2
  And the file contains example data for guidance
  And Cohort and Previous Level columns show "(Optional)" in the header
```

---

### Feature: Manually Add Individual Players

**User Story:** As an Association Administrator, I want to manually add individual players with their details so that late registrations are accommodated

**Business Rules:**

- Required fields: First Name, Last Name, Birthdate, Position
- Optional fields: Notes, Gender, Phone, Email 1, Email 2
- Birthdate must be a valid date (m/d/yyyy)
- Position must be an active position type
- Players are created in "Active" status
- Players are assigned to the active season

```gherkin
Scenario: Add first player manually
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active
  And no players exist yet
  And position type "Forward" is active
  When I navigate to "Players"
  And I click "Add Player"
  And I enter "John" as first name
  And I enter "Smith" as last name
  And I enter "05/15/2010" as birthdate
  And I select "Forward" as position
  And I enter "555-0101" as phone
  And I enter "john.dad@email.com" as email 1
  And I click "Save"
  Then player "John Smith" is created successfully
  And he is assigned to season "2025 Fall Evaluations"
  And his status is "Active"
  And his birth year is calculated as 2010
  And I see a confirmation message "Player added successfully"

Scenario: Add player with optional notes
  Given I am logged in as an Association Administrator
  When I add a new player
  And I enter all required fields
  And I enter "Previous team captain, strong leadership" in notes
  And I click "Save"
  Then the player is created with the notes saved
  And notes are visible when viewing player details

Scenario: Prevent adding player with missing required fields
  Given I am logged in as an Association Administrator
  When I click "Add Player"
  And I enter "John" as first name
  And I leave last name empty
  And I click "Save"
  Then I see an error message "Last Name is required"
  And the player is not created
  And I remain on the player entry form

Scenario: Validate birthdate format
  Given I am logged in as an Association Administrator
  When I add a new player
  And I enter "2010-15-05" as birthdate
  And I click "Save"
  Then I see an error message "Invalid date format"
  And the player is not created

Scenario: Show only active positions in dropdown
  Given I am logged in as an Association Administrator
  And position "Forward" is active
  And position "Goalie" is inactive
  When I click "Add Player"
  And I open the "Position" dropdown
  Then I see "Forward" in the list
  But I do not see "Goalie" in the list

Scenario: Add multiple players in sequence
  Given I am logged in as an Association Administrator
  When I add player "John Smith"
  And I see confirmation "Player added successfully"
  And I click "Add Another Player"
  Then the form is cleared
  And I can immediately enter the next player's details
```

---

### Feature: Edit Player Information

**User Story:** As an Association Administrator, I want to edit player information so that errors can be corrected

**Business Rules:**

- All player fields can be edited (name, birth year, position, notes)
- Cannot change player's season assignment after creation
- Editing a player does not affect historical evaluation data
- Changes are timestamped and logged

```gherkin
Scenario: Edit player name
  Given I am logged in as an Association Administrator
  And player "John Smith" exists
  When I navigate to "Players"
  And I click "Edit" next to John Smith
  And I change the first name to "Jonathan"
  And I click "Save"
  Then the player's name is updated to "Jonathan Smith"
  And I see a confirmation message "Player updated successfully"
  And the change is logged with timestamp

Scenario: Correct birth year error
  Given I am logged in as an Association Administrator
  And player "Sarah Jones" has birth year 2010
  When I edit Sarah Jones
  And I change birth year to "2011"
  And I click "Save"
  Then the birth year is updated to 2011
  And historical evaluation data remains linked to the player

Scenario: Change position
  Given I am logged in as an Association Administrator
  And player "Michael Brown" has position "Defense"
  And position "Forward" is active
  When I edit Michael Brown
  And I change position to "Forward"
  And I click "Save"
  Then the position is updated to "Forward"
  And the player can now be evaluated for forward positions

Scenario: Update player notes
  Given I am logged in as an Association Administrator
  And player "John Smith" has notes "Previous team captain"
  When I edit John Smith
  And I change notes to "Previous team captain, strong leadership, good communication"
  And I click "Save"
  Then the notes are updated
  And I can view the full notes in player details

Scenario: Validate edited data
  Given I am logged in as an Association Administrator
  When I edit a player
  And I clear the last name field
  And I click "Save"
  Then I see an error message "Last Name is required"
  And the changes are not saved
  And I remain in edit mode

Scenario: Cancel edit without saving
  Given I am logged in as an Association Administrator
  And player "John Smith" exists
  When I click "Edit" next to John Smith
  And I change the first name to "Jonathan"
  And I click "Cancel"
  Then no changes are saved
  And the player's name remains "John Smith"
```

---

### Feature: Mark Players as Withdrawn

**User Story:** As an Association Administrator, I want to mark players as withdrawn so that they are removed from evaluation sessions

**Business Rules:**

- Players can be marked as "Withdrawn" when they leave the program
- Withdrawn players are automatically removed from all future session assignments
- Withdrawn players do not appear in evaluator player lists
- Historical evaluation data for withdrawn players is preserved
- Players can be reactivated if they return
- No-shows are handled during session intake, not through player status changes

```gherkin
Scenario: Mark player as withdrawn
  Given I am logged in as an Association Administrator
  And player "John Smith" is active
  And John Smith has completed 2 evaluation sessions
  When I navigate to "Players"
  And I click "Mark as Withdrawn" next to John Smith
  Then I see a confirmation dialog "Mark John Smith as withdrawn? He will be removed from all future session assignments."
  When I click "Confirm"
  Then John Smith's status changes to "Withdrawn"
  And I see a confirmation message "John Smith marked as withdrawn"
  And his historical evaluation data is preserved

Scenario: Withdrawn players are removed from future session assignments
  Given I am logged in as an Association Administrator
  And player "John Smith" is marked as withdrawn
  And John Smith is assigned to 3 upcoming evaluation sessions
  When I view those sessions
  Then John Smith is automatically removed from all future session assignments
  And I see a note "Player withdrawn" in the session history

Scenario: Withdrawn players don't appear in new session assignments
  Given I am logged in as an Association Administrator
  And player "John Smith" is marked as withdrawn
  When I create a new evaluation session
  And I view available players for assignment
  Then John Smith does not appear in the player list

Scenario: Withdrawn players don't appear in evaluator views
  Given I am an Evaluator
  And player "John Smith" is marked as withdrawn
  When I log in and view my upcoming session
  Then John Smith does not appear in my player list
  Even if he was previously assigned to this session

Scenario: Reactivate previously withdrawn player
  Given I am logged in as an Association Administrator
  And player "John Smith" is currently withdrawn
  When I navigate to "Players"
  And I filter by "Withdrawn" status
  And I click "Reactivate" next to John Smith
  Then I see a confirmation dialog "Reactivate John Smith? He will be available for session assignments again."
  When I click "Confirm"
  Then John Smith's status changes to "Active"
  And he now appears in player selection lists
  And his historical evaluation data is still accessible

Scenario: View withdrawn players list
  Given I am logged in as an Association Administrator
  And 3 players are active
  And 2 players are withdrawn
  When I navigate to "Players"
  And I select "Show: Withdrawn" filter
  Then I see only the 2 withdrawn players
  And each shows their withdrawn status and date marked withdrawn

Scenario: Bulk mark players as withdrawn
  Given I am logged in as an Association Administrator
  When I navigate to "Players"
  And I select 5 players using checkboxes
  And I click "Bulk Actions"
  And I select "Mark as Withdrawn"
  Then I see a confirmation dialog "Mark 5 players as withdrawn? They will be removed from all future sessions."
  When I click "Confirm"
  Then all 5 players are marked withdrawn
  And they are removed from all future session assignments
  And I see a confirmation message "5 players marked as withdrawn"

Scenario: No-shows are handled during intake not player status
  Given I am logged in as Intake Personnel
  And I am checking in players for today's session
  And player "John Smith" is assigned to this session but does not show up
  When I complete the session intake process
  Then John Smith remains in "Active" status
  And his absence is recorded as a no-show for this specific session
  And he still appears in future session assignments
  And no-show tracking is handled separately from player status
```

---

### Feature: Mark Players with "Other" Status

**User Story:** As an Association Administrator, I want to mark players with "Other" status and provide a reason so that injured, sick, or unavailable players are tracked appropriately and can be manually ranked later

**Business Rules:**

- Players can be marked as "Other" status when they cannot participate in evaluations due to injury, illness, or other circumstances
- A description/reason must be provided when marking a player as "Other" status (e.g., "Broken arm", "Sick with flu", "Family emergency")
- Players with "Other" status remain in the active season roster
- Players with "Other" status are automatically removed from all future session assignments
- Players with "Other" status do not appear in evaluator player lists
- Historical evaluation data for "Other" status players is preserved
- Players with "Other" status must be manually ranked (handled in reporting features)
- Players can be returned to "Active" status when they are able to participate again
- The reason/description is visible in player details and reports

```gherkin
Scenario: Mark player with "Other" status and provide reason
  Given I am logged in as an Association Administrator
  And player "John Smith" is active
  And John Smith has completed 1 evaluation session
  When I navigate to "Players"
  And I click "Change Status" next to John Smith
  And I select "Other" as the new status
  And I enter "Broken arm - out for 6 weeks" as the reason
  And I click "Save"
  Then John Smith's status changes to "Other"
  And the reason "Broken arm - out for 6 weeks" is saved
  And I see a confirmation message "John Smith marked as Other status"
  And his historical evaluation data is preserved

Scenario: Require reason when marking player as "Other" status
  Given I am logged in as an Association Administrator
  And player "Sarah Jones" is active
  When I navigate to "Players"
  And I click "Change Status" next to Sarah Jones
  And I select "Other" as the new status
  And I leave the reason field empty
  And I click "Save"
  Then I see an error message "Reason is required when marking player as Other status"
  And the status change is not saved
  And I remain on the status change form

Scenario: Players with "Other" status are removed from future session assignments
  Given I am logged in as an Association Administrator
  And player "John Smith" is marked as "Other" status with reason "Concussion protocol"
  And John Smith is assigned to 3 upcoming evaluation sessions
  When I view those sessions
  Then John Smith is automatically removed from all future session assignments
  And I see a note "Other status: Concussion protocol" in the session history

Scenario: Players with "Other" status don't appear in new session assignments
  Given I am logged in as an Association Administrator
  And player "John Smith" has "Other" status with reason "Knee injury"
  When I create a new evaluation session
  And I view available players for assignment
  Then John Smith does not appear in the player list

Scenario: Players with "Other" status don't appear in evaluator views
  Given I am an Evaluator
  And player "John Smith" has "Other" status
  When I log in and view my upcoming session
  Then John Smith does not appear in my player list
  Even if he was previously assigned to this session

Scenario: Return player from "Other" status to "Active"
  Given I am logged in as an Association Administrator
  And player "John Smith" has "Other" status with reason "Broken arm - out for 6 weeks"
  When I navigate to "Players"
  And I click "Change Status" next to John Smith
  And I select "Active" as the new status
  And I click "Save"
  Then I see a confirmation dialog "Return John Smith to Active status? He will be available for session assignments again."
  When I click "Confirm"
  Then John Smith's status changes to "Active"
  And he now appears in player selection lists
  And his historical evaluation data is still accessible
  And the "Other" status reason is preserved in his history

Scenario: View players with "Other" status
  Given I am logged in as an Association Administrator
  And 20 players are active
  And 3 players have "Other" status
  And 2 players are withdrawn
  When I navigate to "Players"
  And I select "Show: Other" filter
  Then I see only the 3 players with "Other" status
  And each shows their status, reason, and date marked as "Other"

Scenario: View reason for "Other" status in player details
  Given I am logged in as an Association Administrator
  And player "John Smith" has "Other" status with reason "Shoulder injury - surgery required"
  When I view John Smith's player details
  Then I see his current status as "Other"
  And I see the reason "Shoulder injury - surgery required"
  And I see the date he was marked as "Other" status
  And I see his evaluation history prior to status change

Scenario: Bulk mark players with "Other" status
  Given I am logged in as an Association Administrator
  When I navigate to "Players"
  And I select 3 players using checkboxes
  And I click "Bulk Actions"
  And I select "Mark as Other Status"
  And I enter "Unable to attend - season conflict" as the reason
  And I click "Confirm"
  Then all 3 players are marked with "Other" status
  And they all share the reason "Unable to attend - season conflict"
  And they are removed from all future session assignments
  And I see a confirmation message "3 players marked as Other status"

Scenario: Edit reason for existing "Other" status
  Given I am logged in as an Association Administrator
  And player "John Smith" has "Other" status with reason "Knee injury"
  When I navigate to player "John Smith" details
  And I click "Edit Status Reason"
  And I change the reason to "Knee injury - cleared for light activity"
  And I click "Save"
  Then the reason is updated to "Knee injury - cleared for light activity"
  And I see a confirmation message "Status reason updated"
  And the status remains "Other"

Scenario: Filter and export players by status including "Other"
  Given I am logged in as an Association Administrator
  And 20 players are active
  And 3 players have "Other" status with various reasons
  And 2 players are withdrawn
  When I navigate to "Players"
  And I select "Show: All Statuses"
  And I export to CSV
  Then the CSV includes all 25 players
  And the file shows status column with values: Active, Other, Withdrawn
  And for "Other" status players, a separate "Status Reason" column shows their reasons
```

---

### Feature: Assign Players to Cohorts

**User Story:** As an Association Administrator, I want to assign players to cohorts so that they're evaluated with peers

**Business Rules:**

- Players can only be assigned to one cohort at a time within a season
- Players must be active to be assigned to cohorts
- Cohort must be active to receive new player assignments
- Players can be reassigned to different cohorts if needed

```gherkin
Scenario: Assign player to cohort
  Given I am logged in as an Association Administrator
  And player "John Smith" exists and is active
  And cohort "U12 - Born 2013" exists and is active
  And John Smith is not assigned to any cohort
  When I navigate to player "John Smith" details
  And I click "Assign to Cohort"
  And I select "U12 - Born 2013" from the dropdown
  And I click "Save"
  Then John Smith is assigned to cohort "U12 - Born 2013"
  And I see a confirmation message "Player assigned to cohort successfully"

Scenario: Bulk assign players to cohort
  Given I am logged in as an Association Administrator
  And players "John Smith", "Sarah Jones", "Michael Brown" exist
  And cohort "U12 - Born 2013" exists
  When I navigate to "Players"
  And I filter players with birth year "2013"
  And I select all 3 players using checkboxes
  And I click "Bulk Actions"
  And I select "Assign to Cohort"
  And I choose "U12 - Born 2013"
  And I click "Confirm"
  Then all 3 players are assigned to "U12 - Born 2013"
  And I see a confirmation message "3 players assigned to cohort"

Scenario: Reassign player to different cohort
  Given I am logged in as an Association Administrator
  And player "John Smith" is assigned to cohort "U12 Division A"
  And cohort "U12 Division B" exists
  When I navigate to player "John Smith" details
  And I click "Change Cohort"
  And I select "U12 Division B"
  And I click "Save"
  Then I see a confirmation dialog "Move John Smith from U12 Division A to U12 Division B?"
  When I click "Confirm"
  Then John Smith is reassigned to "U12 Division B"
  And he is removed from "U12 Division A"

Scenario: Cannot assign inactive player to cohort
  Given I am logged in as an Association Administrator
  And player "John Smith" is inactive
  When I attempt to assign John Smith to a cohort
  Then I see an error message "Cannot assign inactive player to cohort. Reactivate player first."
  And the assignment is not made

Scenario: Cannot assign player to inactive cohort
  Given I am logged in as an Association Administrator
  And player "John Smith" is active
  And cohort "U10 - Born 2015" is inactive
  When I attempt to assign John Smith to "U10 - Born 2015"
  Then I see an error message "Cannot assign player to inactive cohort"
  And I have the option to "Reactivate Cohort"

Scenario: View unassigned players
  Given I am logged in as an Association Administrator
  And 5 players are assigned to cohorts
  And 3 players are not assigned to any cohort
  When I navigate to "Players"
  And I filter by "Unassigned to Cohort"
  Then I see only the 3 unassigned players
  And I can bulk assign them from this view
```

---

### Feature: View Player Lists by Cohort

**User Story:** As an Association Administrator, I want to view player lists by cohort so that I can verify registration accuracy

**Business Rules:**

- Player lists show: last name, first name, birth year, position, status, cohort assignment, previous level
- Lists can be filtered by cohort, position, status, previous level
- Lists can be sorted by last name, first name, birth year, position, previous level
- Export functionality available for offline review

```gherkin
Scenario: View all players in a cohort
  Given I am logged in as an Association Administrator
  And cohort "U12 - Born 2013" has 25 assigned players
  When I navigate to "Cohorts"
  And I click "View Players" next to "U12 - Born 2013"
  Then I see a list of all 25 players
  And each player shows:
    | Field | Example |
    | Last Name | Smith |
    | First Name | John |
    | Birth Year | 2013 |
    | Position | Forward |
    | Status | Active |
    | Cohort | U12 - Born 2013 |
    | Previous Level | A |

Scenario: Filter players by position within cohort
  Given I am logged in as an Association Administrator
  And cohort "U12 - Born 2013" has players with various positions
  When I view the cohort player list
  And I filter by position "Forward"
  Then I see only players with position "Forward"
  And the count shows "10 of 25 players"

Scenario: Filter players by status
  Given I am logged in as an Association Administrator
  And cohort "U12 - Born 2013" has 20 active, 3 with "Other" status, and 2 withdrawn players
  When I view the cohort player list
  And I filter by status "Active"
  Then I see only the 20 active players
  And players with "Other" status and withdrawn players are hidden

Scenario: Filter players by previous level
  Given I am logged in as an Association Administrator
  And cohort "U12 - Born 2013" has players with various previous levels
  When I view the cohort player list
  And I filter by previous level "A"
  Then I see only players with previous level "A"
  And the count shows "8 of 25 players"

Scenario: Sort player list
  Given I am logged in as an Association Administrator
  When I view a cohort player list
  And I click the "Last Name" column header
  Then the list is sorted alphabetically by last name
  When I click "Birth Year" column header
  Then the list is sorted by birth year (youngest to oldest)
  When I click "Previous Level" column header
  Then the list is sorted by previous level rank order

Scenario: Search for player by name
  Given I am logged in as an Association Administrator
  When I navigate to "Players"
  And I enter "Smith" in the search box
  Then I see all players with "Smith" in their name
  And each result shows their cohort assignment

Scenario: View players across all cohorts
  Given I am logged in as an Association Administrator
  And multiple cohorts exist with assigned players
  When I navigate to "Players"
  And I select "Show: All Cohorts"
  Then I see players from all cohorts
  And each player shows their cohort name in the list
  And I can filter and sort across all cohorts

Scenario: Export player list for cohort
  Given I am logged in as an Association Administrator
  And cohort "U12 - Born 2013" has 25 players
  When I view the cohort player list
  And I click "Export to CSV"
  Then a CSV file is downloaded with all player details
  And the file includes columns: Last Name, First Name, Birth Year, Position, Status, Cohort, Previous Level
```

---

## 3️⃣ SESSION SCHEDULING & CONFIGURATION

### Feature: Create Sessions in Bulk

**User Story:** As an Association Administrator, I want to create sessions in bulk via CSV so that scheduling multiple sessions is efficient

**Business Rules:**

- CSV must contain columns: Session Name, Date, Time, Location, Cohort
- **Bulk session imports must contain only ONE cohort per session** (mixed cohorts in a single file are allowed)
- Date must be in valid format (MM/DD/YYYY or YYYY-MM-DD)
- Time must be in valid format (HH:MM AM/PM or 24-hour format)
- Cohort must match an active cohort in the system
- Drills are NOT included in CSV - they must be assigned after session creation
- Duplicate session names are allowed (different dates/times)
- Import validates session count matches pre-calculated wave requirements for the cohort
- All sessions are created in "Draft" status
- All sessions are assigned to the active season
- Import preview shows wave distribution and validates against pre-calculated wave requirements

```gherkin
Scenario: Import sessions with valid CSV for single cohort
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active
  And cohort "U11" exists and is active
  When I navigate to "Sessions"
  And I click "Bulk Create"
  And I upload a CSV file with columns: Session Name, Date, Time, Location, Cohort
  And the file contains:
    | Session Name | Date | Time | Location | Cohort |
    | U11 Session 1 | 11/15/2025 | 6:00 PM | Main Arena | U11 |
    | U11 Session 2 | 11/16/2025 | 6:00 PM | Main Arena | U11 |
    | U11 Session 3 | 11/17/2025 | 6:00 PM | Main Arena | U11 |
  And I click "Preview Import"
  Then I see the preview with all 3 sessions
  And all sessions are for cohort "U11"
  When I click "Confirm Import"
  Then all 3 sessions are created successfully
  And they are assigned to season "2025 Fall Evaluations"
  And they are assigned to cohort "U11"
  And each session has status "Draft"
  And no drills are assigned to any session
  And I see a confirmation message "3 sessions created successfully for cohort U11"

Scenario: Validate CSV format before import
  Given I am logged in as an Association Administrator
  When I upload a CSV file for session import
  And the file is missing the "Cohort" column
  Then I see an error message "Invalid CSV format. Required columns: Session Name, Date, Time, Location, Cohort"
  And no sessions are created
  And I have the option to "Download Template CSV"

Scenario: Detect invalid cohorts during import
  Given I am logged in as an Association Administrator
  And only cohorts "U11", "U13" exist and are active
  When I upload a CSV file containing:
    | Session Name | Date | Time | Location | Cohort |
    | U11 Session 1 | 11/15/2025 | 6:00 PM | Main Arena | U11 |
    | U15 Session 1 | 11/16/2025 | 6:00 PM | Main Arena | U15 |
  Then I see a validation error "Row 2: Cohort 'U15' does not exist or is inactive"
  And no sessions are imported
  And I can "Fix Errors and Retry"

Scenario: Detect invalid dates during import
  Given I am logged in as an Association Administrator
  When I upload a CSV file containing:
    | Session Name | Date | Time | Location | Cohort |
    | U11 Session 1 | 13/45/2025 | 6:00 PM | Main Arena | U11 |
    | U13 Session 1 | 11/16/2025 | 7:00 PM | Practice Rink | U13 |
  Then I see a validation error "Row 1: Invalid date format. Use MM/DD/YYYY"
  And no sessions are imported

Scenario: Detect invalid times during import
  Given I am logged in as an Association Administrator
  When I upload a CSV file containing:
    | Session Name | Date | Time | Location | Cohort |
    | U11 Session 1 | 11/15/2025 | 25:00 PM | Main Arena | U11 |
  Then I see a validation error "Row 1: Invalid time format. Use HH:MM AM/PM"
  And no sessions are imported

Scenario: Import large session list
  Given I am logged in as an Association Administrator
  When I upload a CSV file with 50 sessions
  And all data is valid
  And I click "Import"
  Then I see a progress indicator
  And all 50 sessions are created successfully
  And I see a confirmation message "50 sessions created successfully"
  And I can view the complete session list

Scenario: Download CSV template
  Given I am logged in as an Association Administrator
  When I navigate to "Sessions"
  And I click "Bulk Create"
  And I click "Download Template CSV"
  Then a CSV file is downloaded with headers: Session Name, Date, Time, Location, Cohort
  And the file contains example data for guidance
  And a note states "Drills must be assigned after session creation"

Scenario: Sessions created without drills require manual assignment with weights
  Given I am logged in as an Association Administrator
  And I have bulk imported 10 sessions for cohort "U11"
  And cohort "U11" has positions "Forward", "Defense", "Goalie"
  When I view any of the created sessions
  Then I see drill configuration status:
    | Position | Weight | Drills | Status |
    | Forward | 0% | 0/4 | ✗ |
    | Defense | 0% | 0/4 | ✗ |
    | Goalie | 0% | 0/4 | ✗ |
  And I see a prompt "Add drills with weights to reach 100% per position before marking session as Ready"
  And I can click "Add Drill" to begin configuration

Scenario: Preview CSV data before import
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active
  And cohorts "U11", "U13" exist and are active
  When I navigate to "Sessions"
  And I click "Bulk Create"
  And I upload a CSV file containing:
    | Session Name | Date | Time | Location | Cohort |
    | U11 Session 1 | 11/15/2025 | 6:00 PM | Main Arena | U11 |
    | U11 Session 2 | 11/22/2025 | 6:00 PM | Main Arena | U11 |
    | U13 Session 1 | 11/16/2025 | 7:00 PM | Practice Rink | U13 |
  Then I see a preview table showing all 3 sessions with their details
  And each row shows: Session Name, Date, Time, Location, Cohort
  And I see a summary "3 sessions ready to import"
  And I see buttons "Cancel", "Back to Edit", and "Confirm Import"

Scenario: Preview wave distribution for imported sessions
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has minimum sessions per athlete set to 5 and session capacity 20
  And cohort "U11" has 100 active players
  And wave requirements were pre-calculated when cohort got active players: 5 waves of 5 sessions each (25 total sessions)
  And cohort "U11" currently has 0 waves created
  When I upload a CSV file with 25 sessions for cohort "U11"
  And I click "Preview Import"
  Then I see the CSV data preview table with all 25 sessions
  And I see a "Wave Distribution Preview" section showing:
    | Wave Information | Value |
    | Cohort | U11 |
    | Total Athletes | 100 |
    | Session Capacity | 20 (from season settings) |
    | Pre-calculated Wave Requirements | 5 waves of 5 sessions each (25 total) |
    | Sessions Being Imported | 25 |
    | Wave Distribution | Wave 1: 5 sessions, Wave 2: 5 sessions, Wave 3: 5 sessions, Wave 4: 5 sessions, Wave 5: 5 sessions |
  And I see a success message "Import matches pre-calculated wave requirements ✓"

Scenario: Preview shows partial wave fulfillment with matching import
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has minimum sessions per athlete set to 5 and session capacity 20
  And cohort "U11" has 100 active players with pre-calculated requirements: 5 waves of 5 sessions each
  And cohort "U11" currently has Wave 1 and Wave 2 completed (10 sessions)
  When I upload a CSV file with 15 sessions for cohort "U11"
  And I click "Preview Import"
  Then I see the CSV data preview table
  And I see "Wave Distribution Preview" showing:
    | Wave Information | Value |
    | Pre-calculated Total Requirements | 25 sessions (5 waves × 5 sessions) |
    | Completed Waves | Wave 1, Wave 2 (10 sessions) |
    | Remaining Sessions from Pre-calculation | 15 sessions (3 waves) |
    | Sessions Being Imported | 15 |
    | New Waves That Can Be Created | Wave 3: 5 sessions, Wave 4: 5 sessions, Wave 5: 5 sessions |
  And I see a success message "Import matches pre-calculated wave requirements ✓"
  And the "Confirm Import" button is enabled

Scenario: Preview shows partial wave fulfillment with valid incremental import
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has minimum sessions per athlete set to 5 and session capacity 20
  And cohort "U11" has 100 active players with pre-calculated requirements: 5 waves of 5 sessions each (25 total)
  And cohort "U11" currently has Wave 1 and Wave 2 completed (10 sessions)
  When I upload a CSV file with 10 sessions for cohort "U11"
  And I click "Preview Import"
  Then I see the CSV data preview table
  And I see "Wave Distribution Preview" showing:
    | Wave Information | Value |
    | Pre-calculated Total Requirements | 25 sessions |
    | Completed Waves | Wave 1, Wave 2 (10 sessions) |
    | Remaining Sessions from Pre-calculation | 15 sessions |
    | Sessions Being Imported | 10 |
    | Sessions Still Needed After Import | 5 sessions |
    | Total After Import | 20 of 25 sessions |
  And I see a success message "Import allowed: 10 sessions can be created (20/25 total, within pre-calculated requirements) ✓"
  And the "Confirm Import" button is enabled
  And I see a note "You can import the remaining 5 sessions later if needed"

Scenario: Preview shows partial import with existing sessions stays within limit
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has minimum sessions per athlete set to 3 and session capacity 15
  And cohort "U13" has 30 active players with pre-calculated requirements: 3 waves of 2 sessions each (6 total)
  And cohort "U13" currently has 2 sessions created (Wave 1 completed)
  When I upload a CSV file with 3 sessions for cohort "U13"
  And I click "Preview Import"
  Then I see the CSV data preview table
  And I see "Wave Distribution Preview" showing:
    | Wave Information | Value |
    | Pre-calculated Wave Requirements | 6 sessions total |
    | Existing Sessions | 2 sessions (Wave 1) |
    | Sessions Being Imported | 3 |
    | Total After Import | 5 of 6 sessions |
    | Sessions Still Needed | 1 session |
  And I see a success message "Import allowed: 3 sessions can be created (5/6 total, within pre-calculated requirements) ✓"
  And the "Confirm Import" button is enabled
  And I see a note "You can import the remaining 1 session later if needed"

Scenario: Preview shows excess sessions beyond required waves
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has minimum sessions per athlete set to 3 and session capacity 15
  And cohort "U13" has 30 active players with pre-calculated requirements: 3 waves of 2 sessions each (6 total)
  And cohort "U13" currently has 0 sessions created
  When I upload a CSV file with 10 sessions for cohort "U13"
  And I click "Preview Import"
  Then I see the CSV data preview table
  And I see "Wave Distribution Preview" showing:
    | Wave Information | Value |
    | Pre-calculated Wave Requirements | 3 waves (6 sessions) |
    | Existing Sessions | 0 |
    | Sessions Being Imported | 10 |
    | Total After Import | 10 sessions |
    | Excess Sessions | 4 sessions over limit |
  And I see an error message "Import would exceed pre-calculated wave requirements by 4 sessions. Maximum allowed: 6 sessions total."
  And I see details "Pre-calculated requirements: 6 sessions maximum. Your import would create 10 sessions (4 over limit)."
  And the "Confirm Import" button is disabled
  And I see a prompt "Edit your CSV to remove 4 sessions (import 6 or fewer), then re-upload"
  And I see a note "Custom waves must be created separately after standard waves are established"

Scenario: Import sessions for multiple cohorts
  Given I am logged in as an Association Administrator
  And cohorts "U11" and "U13" exist and are active
  When I upload a CSV file containing:
    | Session Name | Date | Time | Location | Cohort |
    | U11 Session 1 | 11/15/2025 | 6:00 PM | Main Arena | U11 |
    | U11 Session 2 | 11/16/2025 | 6:00 PM | Main Arena | U11 |
    | U13 Session 1 | 11/17/2025 | 7:00 PM | Practice Rink | U13 |
  Then I see a preview table showing all 3 sessions
  And I see a summary "3 sessions ready to import"
  When I click "Confirm Import"
  Then all 3 sessions are created successfully
  And U11 sessions are assigned to cohort "U11"
  And U13 session is assigned to cohort "U13"
  And I see a confirmation message "3 sessions imported successfully"

Scenario: Confirm import after reviewing preview
  Given I am logged in as an Association Administrator
  And I have uploaded a CSV file for cohort "U11" and reviewed the preview
  And the preview shows all data is valid
  And the wave distribution preview shows session count matches pre-calculated requirements
  And the "Confirm Import" button is enabled
  When I click "Confirm Import"
  Then all sessions are created successfully
  And the system automatically organizes sessions into waves based on chronological order
  And I see a confirmation message "25 sessions imported and organized into 5 waves for cohort U11 (matches pre-calculated requirements)"
  And I am redirected to "Wave Management" view for cohort "U11"
  And I see all waves created with status "Not Started"

Scenario: Cancel import from preview
  Given I am logged in as an Association Administrator
  And I have uploaded a CSV file and see the preview
  When I click "Cancel"
  Then no sessions are imported
  And I return to the bulk import upload screen
  And the CSV file is cleared

Scenario: Edit CSV after preview
  Given I am logged in as an Association Administrator
  And I have uploaded a CSV file and see the preview
  And I notice errors in the session data
  When I click "Back to Edit"
  Then I return to the upload screen
  And I can upload a corrected CSV file
  And no sessions have been imported yet
```

---

## 4️⃣ PLAYER DISTRIBUTION & WAVE MANAGEMENT

### Feature: Organize Sessions into Waves

**User Story:** As an Association Administrator, I want sessions to be automatically organized into waves so that each athlete is evaluated the required number of times across multiple rounds

**Business Rules:**

- A **wave** is a complete evaluation round where every athlete in a cohort is evaluated exactly once
- **Wave requirements are pre-calculated when a cohort is assigned active players** (using session capacity from season settings)
- Sessions per Wave = Total Athletes in Cohort ÷ Session Capacity (rounded up if needed)
- Number of Waves = Minimum Sessions Per Athlete (set in season configuration)
- Total Sessions = Sessions per Wave × Number of Waves
- Wave requirements are locked once calculated to maintain session structure integrity
- Waves are numbered sequentially (Wave 1, Wave 2, Wave 3, etc.)
- **Session import validates against pre-calculated wave requirements** - must not exceed total required sessions
- Imported sessions are assigned to waves chronologically based on scheduled date/time
- Each wave can use a different distribution algorithm (Alphabetical, Random, Previous Level, Current Ranking)
- **Teams per session configured during wave distribution** (range: 1-6, default: 2)
- Teams are numbered sequentially within each session (Team 1, Team 2, Team 3, etc.)
- Different waves can have different team counts (e.g., Wave 1 = 1 team for skill drills, Wave 2 = 2 teams for scrimmage)
- Distribution algorithms assign athletes to sessions first, then evenly to teams within sessions
- Team assignment allows slight variance (e.g., Team 1: 5 players, Team 2: 5 players, Team 3: 4 players)
- Sessions are assigned to waves chronologically based on their scheduled date/time
- Wave status: Not Started, In Progress, Completed
- A wave is "In Progress" when any session in that wave has started
- A wave is "Completed" when all sessions in that wave are completed
- **Sequential distribution rule:** Cannot distribute players for Wave N+1 until Wave N has been distributed and marked as "Ready"
- Cannot delete or modify sessions that are part of a ready/completed wave
- If athlete count doesn't divide evenly, final sessions are under-capacity (e.g., 35 athletes with 20 capacity = Wave with 18+17, not 20+15)
- Wave assignments are displayed on each session card/row
- Athletes can participate in both standard waves and custom waves

```gherkin
Scenario: View wave requirements before creating sessions
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has minimum sessions per athlete set to 5 and session capacity 20
  And cohort "U11" has 100 active players
  When I navigate to "Wave Management" for cohort "U11"
  Then I see "Wave Requirements for Cohort U11"
  And I see the pre-calculated requirements:
    | Field | Value |
    | Total Athletes | 100 |
    | Session Capacity (from season) | 20 players |
    | Minimum Sessions Required | 5 |
    | Sessions per Wave | 5 |
    | Number of Waves Required | 5 |
    | Total Sessions Needed | 25 |
  And I see a note "Import exactly 25 sessions via CSV to fulfill these requirements"
  And I see a button "Import Sessions for U11"

Scenario: Import sessions matching pre-calculated wave requirements
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has minimum sessions per athlete set to 5 and session capacity 20
  And cohort "U11" has 100 active players
  And wave requirements were pre-calculated when players were assigned: 5 waves of 5 sessions each (25 total)
  And cohort "U11" currently has 0 sessions created
  When I import 25 sessions via CSV for cohort "U11"
  And I click "Confirm Import"
  Then the system validates the import matches pre-calculated requirements (25 sessions = 5 waves × 5 sessions)
  And all 25 sessions are created successfully
  And sessions are assigned to pre-calculated waves chronologically:
    | Wave | Sessions | Date Range |
    | Wave 1 | 5 sessions | Nov 15 - Nov 19, 2025 |
    | Wave 2 | 5 sessions | Nov 22 - Nov 26, 2025 |
    | Wave 3 | 5 sessions | Nov 29 - Dec 3, 2025 |
    | Wave 4 | 5 sessions | Dec 6 - Dec 10, 2025 |
    | Wave 5 | 5 sessions | Dec 13 - Dec 17, 2025 |
  And all waves have status "Not Started"
  And I see "25 sessions imported for cohort U11 - matches pre-calculated requirements (5 waves × 5 sessions)"

Scenario: Distribute athletes for first wave using selected algorithm with team configuration
  Given I am logged in as an Association Administrator
  And cohort "U11" has 5 pre-calculated waves with 25 sessions imported
  And Wave 1 contains 5 sessions with status "Not Started"
  And no athletes are assigned yet
  When I navigate to "Wave Management" for cohort "U11"
  And I click "Distribute Athletes" for Wave 1
  And I select distribution algorithm "Alphabetical"
  And I set teams per session to "4"
  And I click "Preview Distribution"
  Then I see a preview showing 5 sessions with 20 athletes each distributed alphabetically
  And I see team-level distribution:
    | Session | Team 1 | Team 2 | Team 3 | Team 4 |
    | Session 1 | 5 athletes | 5 athletes | 5 athletes | 5 athletes |
    | Session 2 | 5 athletes | 5 athletes | 5 athletes | 5 athletes |
    | Session 3 | 5 athletes | 5 athletes | 5 athletes | 5 athletes |
    | Session 4 | 5 athletes | 5 athletes | 5 athletes | 5 athletes |
    | Session 5 | 5 athletes | 5 athletes | 5 athletes | 5 athletes |
  And athletes are distributed alphabetically within each session across teams
  When I click "Confirm Distribution"
  Then Wave 1 status changes to "Ready"
  And each athlete in cohort "U11" is assigned to exactly 1 session and 1 team in Wave 1
  And I see a confirmation message "Wave 1 ready: 100 athletes distributed across 5 sessions (4 teams per session) using Alphabetical algorithm"

Scenario: Choose different distribution algorithm and team count per wave
  Given I am logged in as an Association Administrator
  And Wave 1 is completed using "Alphabetical" distribution with 4 teams per session
  And Wave 2 already exists with 5 sessions (from pre-calculated wave requirements)
  And Wave 2 has status "Not Started"
  When I click "Distribute Athletes" for Wave 2
  And I select distribution algorithm "Random"
  And I set teams per session to "2"
  And I click "Preview Distribution"
  Then I see athletes redistributed randomly across the 5 Wave 2 sessions
  And I see team-level distribution with 2 teams per session:
    | Session | Team 1 | Team 2 |
    | Session 1 | 10 athletes | 10 athletes |
    | Session 2 | 10 athletes | 10 athletes |
    | Session 3 | 10 athletes | 10 athletes |
    | Session 4 | 10 athletes | 10 athletes |
    | Session 5 | 10 athletes | 10 athletes |
  And athletes are regrouped differently than Wave 1
  When I click "Confirm Distribution"
  Then Wave 2 status changes to "Ready"
  And each athlete is assigned to exactly 1 session and 1 team in Wave 2

Scenario: Sequential distribution enforcement - cannot distribute Wave 2 before Wave 1 is ready
  Given I am logged in as an Association Administrator
  And cohort "U11" has 5 pre-calculated waves with sessions imported
  And Wave 1 status is "Not Started" (athletes not yet distributed)
  And Wave 2 status is "Not Started"
  When I attempt to distribute athletes for Wave 2
  Then I see an error message "Cannot distribute athletes for Wave 2 until Wave 1 is distributed and marked as Ready"
  And I see a prompt "Complete athlete distribution for Wave 1 first"
  And Wave 2 distribution is blocked

Scenario: Distribute next wave after previous wave is ready
  Given I am logged in as an Association Administrator
  And Wave 1 has status "Ready" (athletes distributed and assigned)
  And Wave 2 already exists with 5 sessions (from pre-calculated requirements)
  When I click "Distribute Athletes" for Wave 2
  And I select distribution algorithm "Previous Level"
  And I set teams per session to "2"
  And I click "Confirm Distribution"
  Then Wave 2 status changes to "Ready"
  And athletes are distributed using their previous level rankings
  And each athlete is assigned to exactly 1 session and 1 team
  And I see "Wave 2 ready - scheduled to begin after Wave 1 completes (2 teams per session)"

Scenario: Use default team configuration when distributing wave
  Given I am logged in as an Association Administrator
  And Wave 1 already exists with 5 sessions (from pre-calculated requirements)
  And Wave 1 has status "Not Started"
  When I click "Distribute Athletes" for Wave 1
  And I select distribution algorithm "Alphabetical"
  Then I see the teams per session field defaults to "2"
  And I see a dropdown showing options "1, 2, 3, 4, 5, 6"
  When I accept the default and click "Confirm Distribution"
  Then Wave 1 status changes to "Ready"
  And each session has 2 teams configured

Scenario: Configure different team counts for skill drills vs scrimmage waves
  Given I am logged in as an Association Administrator
  And cohort has 3 pre-calculated waves with sessions imported
  And Wave 1 is for skill evaluation (stations-based drills)
  And Wave 2 is for scrimmage evaluation (game-based competition)
  When I distribute athletes for Wave 1
  And I select distribution algorithm "Alphabetical"
  And I set teams per session to "1"
  And I click "Confirm Distribution"
  Then Wave 1 is configured with 1 team per session (all players wear same jersey color)
  When Wave 1 is completed
  And I distribute athletes for Wave 2
  And I select distribution algorithm "Random"
  And I set teams per session to "2"
  And I click "Confirm Distribution"
  Then Wave 2 is configured with 2 teams per session (players split into opposing teams)
  And Wave 1 configuration remains 1 team per session
  And I see confirmation "Different waves can have different team counts based on evaluation type"

Scenario: Handle uneven athlete distribution in wave with team variance
  Given I am logged in as an Association Administrator
  And cohort "U13" has 35 active players
  And session capacity is 20 players
  And wave requirements were pre-calculated: 3 waves of 2 sessions each (6 total)
  And I have imported 6 sessions for cohort "U13" matching the pre-calculated requirements
  When I distribute athletes for Wave 1 using "Alphabetical" algorithm
  And I set teams per session to "2"
  And I click "Confirm Distribution"
  Then Session 1 is assigned 18 athletes
  And Session 2 is assigned 17 athletes
  And I see team-level distribution with slight variance:
    | Session | Team 1 | Team 2 |
    | Session 1 | 9 athletes | 9 athletes |
    | Session 2 | 9 athletes | 8 athletes |
  And no session exceeds 20 capacity
  And I see a note "Athletes distributed evenly across 2 sessions (under-capacity allowed), teams balanced within sessions"

Scenario: Track wave completion status
  Given I am logged in as an Association Administrator
  And Wave 1 has 5 sessions
  And 3 sessions are "Completed" and 2 are "In Progress"
  When I view Wave 1 details
  Then the wave status shows "In Progress"
  And I see progress "3 of 5 sessions completed"
  When all 5 sessions are completed
  Then wave status automatically updates to "Completed"
  And I see "Wave 1 Completed - Wave 2 can now be scheduled"

Scenario: View wave details and session list
  Given I am logged in as an Association Administrator
  And Wave 1 exists with 5 sessions
  When I click on "Wave 1" in the Wave Management view
  Then I see wave details:
    | Field | Value |
    | Wave Number | 1 |
    | Status | In Progress |
    | Distribution Algorithm | Alphabetical |
    | Teams per Session | 4 |
    | Sessions in Wave | 5 |
    | Athletes Participating | 100 |
    | Sessions Completed | 3 of 5 |
  And I see a list of all sessions in Wave 1:
    | Session Name | Date | Time | Location | Status |
    | U11 Session 1 | 11/15/2025 | 6:00 PM | Main Arena | Completed |
    | U11 Session 2 | 11/16/2025 | 6:00 PM | Main Arena | Completed |
    | U11 Session 3 | 11/17/2025 | 6:00 PM | Main Arena | Completed |
    | U11 Session 4 | 11/18/2025 | 6:00 PM | Main Arena | In Progress |
    | U11 Session 5 | 11/19/2025 | 6:00 PM | Main Arena | Ready |

Scenario: Track athlete evaluation count toward minimum requirement
  Given I am logged in as an Association Administrator
  And season requires 5 minimum sessions per athlete
  And Wave 1 and Wave 2 are completed
  When I view athlete "John Smith" evaluation progress
  Then I see:
    | Field | Value |
    | Athlete Name | John Smith |
    | Evaluations Completed | 2 |
    | Minimum Required | 5 |
    | Waves Completed | 2 of 5 |
    | Evaluations Remaining | 3 |
  And I see progress bar showing "40% complete"

Scenario: Prevent distributing multiple waves simultaneously
  Given I am logged in as an Association Administrator
  And Wave 1 status is "In Progress" (sessions are underway)
  And Wave 2 status is "Not Started"
  When I attempt to distribute athletes for Wave 2
  Then I see an error message "Cannot distribute Wave 2 until Wave 1 is completed"
  And Wave 2 remains "Not Started"
  And I must wait for Wave 1 to reach "Completed" status before distributing Wave 2
```

---

### Feature: Create Custom Evaluation Waves

**User Story:** As an Association Administrator, I want to create custom evaluation waves for specialized groups so that position-specific or skill-specific evaluations can be conducted separately

**Business Rules:**

- Custom waves are created for specific subsets of athletes (e.g., 5 catchers out of 100 total players)
- Custom waves require a descriptive name (e.g., "Catcher Evaluation Wave", "Advanced Skills Wave")
- Administrator manually sets the number of sessions in a custom wave
- Administrator manually selects specific athletes to participate
- Athletes can participate in both standard waves and custom waves
- **Custom wave evaluations do NOT count toward the athlete's minimum evaluation requirement** (only standard waves count)
- Custom waves have their own status tracking (Not Started, In Progress, Completed)
- Custom waves can be scheduled independently of standard waves
- Custom waves appear separately in Wave Management view
- Sessions in custom waves are tagged with the custom wave name
- Player selection supports filtering by position, previous level, status, search by name
- Distribution algorithm is still applied to selected athletes
- Teams per session configured during custom wave distribution (range: 1-6, default: 2)
- Custom waves can have different team counts than standard waves

```gherkin
Scenario: Create custom wave for position-specific evaluation
  Given I am logged in as an Association Administrator
  And cohort "U15 Baseball" has 100 active players
  And 5 players have position "Catcher"
  When I navigate to "Wave Management" for cohort "U15 Baseball"
  And I click "Create Custom Wave"
  And I enter name "Catcher Evaluation Wave"
  And I set number of sessions to 2
  And I click "Select Players"
  And I filter by position "Catcher"
  And I select all 5 catchers
  And I click "Confirm Player Selection"
  Then I see "5 players selected for Catcher Evaluation Wave"
  And I see "2 sessions required"
  When I select distribution algorithm "Alphabetical"
  And I set teams per session to "1"
  And I click "Create Custom Wave"
  Then custom wave "Catcher Evaluation Wave" is created
  And 2 sessions are tagged with "Catcher Evaluation Wave"
  And 5 catchers are distributed across 2 sessions:
    | Session | Team 1 |
    | Session 1 | 3 catchers |
    | Session 2 | 2 catchers |
  And I see a confirmation message "Custom wave created: Catcher Evaluation Wave (1 team per session)"

Scenario: Require name for custom wave
  Given I am logged in as an Association Administrator
  When I click "Create Custom Wave"
  And I leave the name field empty
  And I attempt to proceed
  Then I see an error message "Custom wave name is required"
  And the custom wave is not created

Scenario: Select players via search for custom wave
  Given I am logged in as an Association Administrator
  And cohort "U13 Hockey" has 30 players
  When I create a custom wave
  And I click "Select Players"
  And I search for "Smith"
  Then I see all players with "Smith" in their name
  And I can select individual players or "Select All"
  When I select 3 players
  And I click "Confirm Player Selection"
  Then I see "3 players selected"

Scenario: Filter players by previous level for custom wave
  Given I am logged in as an Association Administrator
  And cohort "U11" has players with various previous levels
  When I create a custom wave named "Advanced Skills Wave"
  And I click "Select Players"
  And I filter by previous level "A"
  Then I see only players with previous level "A"
  When I click "Select All Filtered"
  And I confirm selection
  Then all filtered players are added to the custom wave

Scenario: Allow mixed participation - athlete in both standard and custom waves
  Given I am logged in as an Association Administrator
  And athlete "John Smith" is participating in standard Wave 1
  And a custom wave "Catcher Evaluation Wave" is being created
  When I select "John Smith" for the custom wave
  And I click "Create Custom Wave"
  Then "John Smith" is assigned to both standard Wave 1 and custom "Catcher Evaluation Wave"
  And only standard wave evaluations count toward his minimum evaluation requirement
  And I see a note "John Smith: 2 evaluations scheduled (1 standard + 1 custom, only standard counts toward minimum)"

Scenario: Custom wave evaluations do not count toward minimum requirement
  Given I am logged in as an Association Administrator
  And athlete "Jane Doe" has completed 3 standard wave evaluations
  And athlete "Jane Doe" has completed 1 custom wave evaluation
  And minimum sessions per athlete is 5
  When I view athlete "Jane Doe" evaluation progress
  Then I see:
    | Field | Value |
    | Evaluations Completed (Standard) | 3 |
    | Additional Evaluations (Custom) | 1 |
    | Minimum Required | 5 |
    | Evaluations Remaining | 2 |
  And I see a note "Custom wave evaluations do not count toward minimum requirement"

Scenario: View custom waves separately in Wave Management
  Given I am logged in as an Association Administrator
  And cohort "U15 Baseball" has 5 standard waves
  And 2 custom waves exist: "Catcher Evaluation Wave" and "Pitching Mechanics Wave"
  When I navigate to "Wave Management" for cohort "U15 Baseball"
  Then I see two sections:
    | Section | Content |
    | Standard Waves | Wave 1, Wave 2, Wave 3, Wave 4, Wave 5 |
    | Custom Waves | Catcher Evaluation Wave, Pitching Mechanics Wave |
  And each custom wave shows its name, athlete count, session count, and status

Scenario: Track custom wave completion status
  Given I am logged in as an Association Administrator
  And custom wave "Catcher Evaluation Wave" has 2 sessions
  And both sessions are "Completed"
  When I view the custom wave details
  Then the status shows "Completed"
  And I see "2 of 2 sessions completed"
  And I see "5 athletes evaluated"

Scenario: Set custom session count for custom wave
  Given I am logged in as an Association Administrator
  When I create a custom wave
  And I select 12 players
  And session capacity is 20
  And I set number of sessions to 3
  Then the system distributes 12 players across 3 sessions (4 + 4 + 4)
  And I see a preview showing the distribution
  When I set number of sessions to 2
  Then the system redistributes as 2 sessions (6 + 6)
  And I can adjust the session count before finalizing

Scenario: Apply distribution algorithm to custom wave players
  Given I am logged in as an Association Administrator
  And I have selected 10 players for custom wave "Advanced Skills Wave"
  When I choose distribution algorithm "Random"
  And I set 2 sessions
  Then the 10 players are randomly distributed across 2 sessions
  When I click "Preview Wave"
  Then I see which players are assigned to each session
  And I can regenerate the random distribution if desired
```

---

### Feature: Create Individual Sessions

**User Story:** As an Association Administrator, I want to create individual sessions manually so that I can schedule sessions one at a time when needed

**Business Rules:**

- Sessions are created in "Draft" status
- Required fields: Session Name, Date, Time, Location, Season (auto-assigned to active season)
- Sessions must be assigned to exactly one cohort
- At least 1 drill must be assigned to a session before it can be marked "Ready"
- Session statuses: Draft → Ready → In Progress → Completed
- Cannot edit sessions that are "In Progress" or "Completed"
- Sessions can be deleted only if status is "Draft" and no players are assigned
- **Cannot create individual sessions for a cohort once wave requirements are fulfilled** (prevents orphan sessions)
- Individual session creation allowed until cohort reaches pre-calculated session requirements
- System validates individual session creation against pre-calculated wave requirements
- **Drill Cloning:** When the first session in a wave reaches 100% drill configuration (all positions = 100%), administrator is offered option to clone that configuration to all other sessions in the same wave
- Clone is a separate action (not automatic when marking session ready)
- Clone copies all drills with their weights and position assignments
- Clone overwrites any existing drill configuration on target sessions
- Clone only offered for the first session in a wave to reach 100% (not for subsequent sessions)
- All sessions in a wave share the same cohort, ensuring position compatibility

```gherkin
Scenario: Create first evaluation session
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" is active
  And cohort "U11" exists and is active
  When I navigate to "Sessions"
  And I click "Create New Session"
  And I enter "U11 Session 1" as session name
  And I select date "November 15, 2025"
  And I select time "6:00 PM"
  And I enter "Main Arena" as location
  And I select cohort "U11"
  And I click "Save"
  Then the session "U11 Session 1" is created
  And its status is "Draft"
  And it is assigned to season "2025 Fall Evaluations"
  And I see a confirmation message "Session created in Draft status"

Scenario: Require all mandatory fields
  Given I am logged in as an Association Administrator
  When I click "Create New Session"
  And I enter "U11 Session 1" as session name
  And I leave the date field empty
  And I click "Save"
  Then I see an error message "Date is required"
  And the session is not created
  And I remain on the session creation form

Scenario: Assign first drill to session with weight and positions
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And cohort "U11" has positions "Forward", "Defense", "Goalie"
  And drill "Skating Speed" exists and is active
  When I view session "U11 Session 1" details
  And I click "Add Drill"
  And I select drill "Skating Speed"
  And I enter weight "40"
  And I select positions "Forward", "Defense"
  And I click "Add Drill"
  Then drill "Skating Speed" is assigned to the session with weight 40%
  And it applies to positions "Forward" and "Defense"
  And I see position status:
    | Position | Weight | Drills |
    | Forward | 40% | 1/4 |
    | Defense | 40% | 1/4 |
    | Goalie | 0% | 0/4 |
  And I see a confirmation message "Drill added successfully"

Scenario: Add multiple drills to build complete position weights
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has drill "Skating Speed" at 40% for "Forward", "Defense"
  And drills "Shooting Accuracy", "Positioning", "Checking" exist and are active
  When I add drill "Shooting Accuracy" with weight 35% for position "Forward"
  Then I see position status:
    | Position | Weight | Drills |
    | Forward | 75% | 2/4 |
    | Defense | 40% | 1/4 |
  When I add drill "Positioning" with weight 25% for position "Forward"
  Then I see position status:
    | Position | Weight | Drills |
    | Forward | 100% ✓ | 3/4 |
    | Defense | 40% | 1/4 |
  When I add drill "Checking" with weight 30% for position "Defense"
  And I add drill "Shot Blocking" with weight 30% for position "Defense"
  Then I see position status:
    | Position | Weight | Drills |
    | Forward | 100% ✓ | 3/4 |
    | Defense | 100% ✓ | 3/4 |

Scenario: Prevent exceeding 100% weight for a position
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has these drills:
    | Drill | Weight | Positions |
    | Skating Speed | 40% | Forward, Defense |
    | Shooting Accuracy | 35% | Forward |
    | Positioning | 25% | Forward |
  And position "Forward" is at 100% (3 drills)
  When I attempt to add drill "Stickhandling" with weight 20% for position "Forward"
  Then I see an error message "Cannot add drill: Forward would exceed 100% (current: 100%, adding: 20%, total: 120%)"
  And I see a prompt "Please deselect Forward or adjust weight"
  And the drill is not added

Scenario: Prevent exceeding 4 drills per position
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has these drills for position "Forward":
    | Drill | Weight |
    | Skating Speed | 40% |
    | Shooting Accuracy | 30% |
    | Positioning | 20% |
    | Stickhandling | 10% |
  And position "Forward" has 4 drills (maximum reached)
  When I attempt to add drill "Breakaway Speed" with weight 5% for position "Forward"
  Then I see an error message "Cannot add drill: Forward already has maximum 4 drills"
  And I see a list of current Forward drills
  And I see a prompt "Please deselect Forward or remove an existing drill first"
  And the drill is not added

Scenario: Preview weight totals when adding drill
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has these current weights:
    | Position | Weight | Drills |
    | Forward | 60% | 2 |
    | Defense | 40% | 1 |
    | Goalie | 75% | 3 |
  When I select drill "Skating Speed"
  And I enter weight "40"
  And I select positions "Forward", "Defense"
  Then I see a preview:
    | Position | Current | After Adding | Status |
    | Forward | 60% | 100% | ✓ |
    | Defense | 40% | 80% | ✓ |
  And the "Add Drill" button is enabled
  When I also select position "Goalie"
  Then I see updated preview:
    | Position | Current | After Adding | Status |
    | Forward | 60% | 100% | ✓ |
    | Defense | 40% | 80% | ✓ |
    | Goalie | 75% | 115% | ✗ Exceeds 100% |
  And the "Add Drill" button is disabled
  And I see an error "Cannot add: Goalie would exceed 100%"

Scenario: Cannot mark session ready without drills totaling 100% per position
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And session has these drill weights:
    | Position | Weight | Drills |
    | Forward | 100% ✓ | 3 |
    | Defense | 70% | 2 |
    | Goalie | 100% ✓ | 4 |
  When I attempt to change status to "Ready"
  Then I see an error message "Cannot mark session as Ready: Not all positions have 100% drill weight"
  And I see details "Position Defense has only 70% (missing 30%)"
  And the status remains "Draft"

Scenario: Remove drill from session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has drill "Skating Speed" at 40% for "Forward", "Defense"
  And no evaluations have been entered yet
  When I view session drills
  And I click "Remove" next to "Skating Speed"
  Then I see a confirmation dialog "Remove Skating Speed from this session?"
  When I click "Confirm"
  Then "Skating Speed" is removed from the session
  And position weights are updated:
    | Position | Weight | Drills |
    | Forward | 60% | 2 |
    | Defense | 60% | 2 |
  And I see a confirmation message "Drill removed successfully"

Scenario: Cannot modify drills after evaluations started
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has status "In Progress"
  And at least one evaluation score has been entered
  When I view session drills
  Then I see all drills displayed as read-only
  And I do not see "Add Drill" button
  And I do not see "Remove" buttons next to drills
  And I see a note "Drill configuration locked: evaluations in progress"

Scenario: Mark session as ready with all requirements met
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And all positions have 100% drill weight:
    | Position | Weight | Drills |
    | Forward | 100% ✓ | 3 |
    | Defense | 100% ✓ | 3 |
    | Goalie | 100% ✓ | 4 |
  And at least 3 evaluators are assigned to this session
  And at least 1 intake personnel is assigned to this session
  And at least 1 player is assigned to this session
  When I click "Mark as Ready"
  Then I see a confirmation dialog "Mark session as Ready? This will notify assigned personnel."
  When I click "Confirm"
  Then the session status changes to "Ready"
  And drill configuration is locked
  And notifications are sent to assigned evaluators and intake personnel
  And I see a confirmation message "Session marked as Ready"

Scenario: Edit draft session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  When I view session details
  And I click "Edit"
  And I change the time to "7:00 PM"
  And I change the location to "Practice Rink"
  And I click "Save"
  Then the session time is updated to "7:00 PM"
  And the location is updated to "Practice Rink"
  And I see a confirmation message "Session updated successfully"

Scenario: Cannot edit completed session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has status "Completed"
  When I view session details
  Then I do not see an "Edit" button
  And session details are displayed as read-only

Scenario: Delete draft session without players
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And no players are assigned to this session
  When I click "Delete" next to the session
  Then I see a confirmation dialog "Delete session 'U11 Session 1'? This cannot be undone."
  When I click "Confirm"
  Then the session is permanently deleted
  And I see a confirmation message "Session deleted successfully"

Scenario: Cannot delete session with assigned players
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And 15 players are assigned to this session
  When I attempt to delete the session
  Then I see an error message "Cannot delete session with assigned players. Remove players first or cancel the session instead."
  And the session remains in the system

Scenario: Clone drill configuration to all other sessions in wave
  Given I am logged in as an Association Administrator
  And Wave 1 for cohort "U11" has 5 sessions with status "Draft"
  And session "U11 Session 1" is the first session in Wave 1 to reach 100% drill configuration
  And session "U11 Session 1" has these drills configured:
    | Drill | Weight | Positions |
    | Skating Speed | 40% | Forward, Defense |
    | Shooting Accuracy | 35% | Forward |
    | Positioning | 25% | Forward |
    | Checking | 30% | Defense |
    | Shot Blocking | 30% | Defense |
    | Reaction Time | 40% | Goalie |
    | Positioning | 30% | Goalie |
    | Glove Work | 20% | Goalie |
    | Movement | 10% | Goalie |
  And all positions have 100% weight (Forward: 100%, Defense: 100%, Goalie: 100%)
  And the other 4 sessions in Wave 1 have 0% drill configuration
  When I view session "U11 Session 1" details
  Then I see a button "Clone Drill Configuration to Wave"
  When I click "Clone Drill Configuration to Wave"
  Then I see a confirmation dialog "Clone drill configuration to all 4 other sessions in Wave 1? This will overwrite any existing drill assignments."
  And I see details showing the 4 target sessions: "U11 Session 2, U11 Session 3, U11 Session 4, U11 Session 5"
  When I click "Confirm Clone"
  Then all drills with weights and position assignments are copied to the 4 other sessions
  And I see a progress message "Cloning configuration to 4 sessions..."
  And I see a success message "Drill configuration cloned to 4 sessions in Wave 1"
  And each of the 4 target sessions now shows 100% drill configuration
  And I can view any target session to verify drills match exactly

Scenario: Decline clone offer and configure sessions individually
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is the first session in Wave 1 to reach 100% drill configuration
  And I see the "Clone Drill Configuration to Wave" button
  When I choose not to click the clone button
  And I navigate to session "U11 Session 2"
  Then I can configure drills manually for "U11 Session 2"
  And I can add different drills or weights if desired
  And the clone button remains available on "U11 Session 1" until I choose to use it

Scenario: Clone overwrites partially configured sessions
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is the first in Wave 1 to reach 100% configuration
  And session "U11 Session 1" has drills totaling 100% per position
  And session "U11 Session 2" has partial configuration (Forward: 40%, Defense: 0%, Goalie: 0%)
  And session "U11 Session 3" has different drills configured (Forward: 75%, Defense: 60%, Goalie: 0%)
  And sessions "U11 Session 4" and "U11 Session 5" have 0% configuration
  When I click "Clone Drill Configuration to Wave" on session "U11 Session 1"
  And I click "Confirm Clone"
  Then all 4 target sessions have their drill configurations overwritten
  And session "U11 Session 2" partial configuration is replaced
  And session "U11 Session 3" different configuration is replaced
  And all 4 sessions now match session "U11 Session 1" drill configuration exactly
  And I see "Drill configuration cloned to 4 sessions (2 partial configurations overwritten)"

Scenario: No clone offer for second session reaching 100%
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is the first in Wave 1 to reach 100% configuration
  And the clone button is available on session "U11 Session 1"
  When I configure session "U11 Session 2" drills manually
  And I complete 100% drill configuration for session "U11 Session 2"
  And I view session "U11 Session 2" details
  Then I do not see a "Clone Drill Configuration to Wave" button
  And only session "U11 Session 1" (the first) has the clone option
  And I must manually configure remaining sessions or use the clone from session "U11 Session 1"

Scenario: Clone button remains available until used
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is the first in Wave 1 to reach 100% configuration
  And the clone button is visible on session "U11 Session 1"
  And I have not yet clicked the clone button
  When I configure session "U11 Session 2" manually
  And I configure session "U11 Session 3" manually
  And I return to session "U11 Session 1"
  Then the "Clone Drill Configuration to Wave" button is still available
  And I can still clone to the remaining unconfigured sessions (if any exist)
  When I click "Clone Drill Configuration to Wave"
  Then I see only the sessions that have not yet been fully configured or manually set

Scenario: Clone disabled after all sessions reach 100%
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is the first in Wave 1 to reach 100% configuration
  And I have manually configured all other 4 sessions in Wave 1 to 100%
  When I view session "U11 Session 1" details
  Then I see the "Clone Drill Configuration to Wave" button is disabled
  And I see a note "All sessions in Wave 1 already have 100% drill configuration"

Scenario: Prevent creating individual session when wave requirements fulfilled
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has session capacity 20 and minimum evaluations 5
  And cohort "U11" has 100 active players with pre-calculated requirements: 5 waves of 5 sessions each (25 total)
  And all 25 required sessions have been created via bulk import
  When I navigate to "Sessions"
  And I click "Create New Session"
  And I attempt to select cohort "U11"
  Then I see an error message "Cannot create individual session for cohort U11: wave requirements fulfilled (25/25 sessions)"
  And I see details "All required sessions for standard waves have been created. Use custom waves for additional evaluations."
  And cohort "U11" is disabled in the cohort selection dropdown
  And I cannot create an individual session for cohort "U11"

Scenario: Allow creating individual session when below wave requirements
  Given I am logged in as an Association Administrator
  And season "2025 Fall Evaluations" has session capacity 20 and minimum evaluations 5
  And cohort "U11" has 100 active players with pre-calculated requirements: 5 waves of 5 sessions each (25 total)
  And 10 sessions have been created for cohort "U11" (from previous bulk import or individual creation)
  When I navigate to "Sessions"
  And I click "Create New Session"
  And I select cohort "U11"
  Then cohort "U11" is available in the dropdown
  And I see a note "U11: 10 of 25 required sessions created (15 remaining)"
  When I enter session details
  And I click "Save"
  Then the individual session is created successfully
  And I see a confirmation "Session created for cohort U11 (11/25 sessions)"
  And the session count toward wave requirements is updated
```

---

### Feature: Assign Evaluators to Sessions

**User Story:** As an Association Administrator, I want to assign evaluators to sessions so that there are sufficient scorers

**Business Rules:**

- Multiple evaluators can be assigned to one session
- Users must have "Evaluator" role to be assigned
- System validates that minimum evaluators requirement is met (from season settings)
- Evaluators can be assigned to multiple sessions
- Evaluators receive notifications when assigned
- Evaluators can be added, removed, or changed at any time BEFORE session starts (status: Draft or Ready)
- Once session status changes to "In Progress", evaluator assignments are locked to preserve score data integrity
- Cannot remove or change evaluators after they have entered scores (prevents orphaned evaluation data)

```gherkin
Scenario: Assign evaluators to session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And users "John Smith", "Sarah Jones", "Mike Brown" have "Evaluator" role
  And season minimum evaluators per player is set to "3"
  When I view session "U11 Session 1" details
  And I click "Assign Evaluators"
  And I select evaluators "John Smith", "Sarah Jones", "Mike Brown"
  And I click "Save"
  Then all 3 evaluators are assigned to the session
  And I see a confirmation message "3 evaluators assigned to session"
  And each evaluator receives a notification about the assignment

Scenario: Warning when below minimum evaluators
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And season minimum evaluators per player is set to "3"
  And users "John Smith", "Sarah Jones" have "Evaluator" role
  When I view session "U11 Session 1" details
  And I click "Assign Evaluators"
  And I select evaluators "John Smith", "Sarah Jones"
  And I click "Save"
  Then I see a warning message "Only 2 evaluators assigned. Season minimum is 3. Some players may not meet the minimum evaluator requirement."
  And the evaluators are assigned
  But the session cannot be marked as "Ready" until minimum is met

Scenario: View evaluator's assigned sessions
  Given I am logged in as an Association Administrator
  And evaluator "John Smith" is assigned to sessions "U11 Session 1", "U13 Session 2", "U11 Session 3"
  When I navigate to "Team Members"
  And I view "John Smith" details
  Then I see a list of his assigned sessions:
    | Session Name | Date | Time | Cohort | Status |
    | U11 Session 1 | Nov 15, 2025 | 6:00 PM | U11 | Draft |
    | U13 Session 2 | Nov 16, 2025 | 6:00 PM | U13 | Ready |
    | U11 Session 3 | Nov 17, 2025 | 6:00 PM | U11 | Draft |

Scenario: Remove evaluator from session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And evaluator "John Smith" is assigned to this session
  When I view session details
  And I click "Remove" next to John Smith in the evaluators list
  Then I see a confirmation dialog "Remove John Smith from this session?"
  When I click "Confirm"
  Then John Smith is removed from the session
  And he receives a notification about the removal
  And I see a confirmation message "Evaluator removed from session"

Scenario: Add evaluator incrementally over time
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Ready"
  And evaluator "John Smith" was assigned yesterday
  And evaluator "Sarah Jones" was assigned today
  And session minimum evaluators is 3
  When I view session details today
  And I click "Assign Evaluators"
  And I select evaluator "Mike Brown"
  And I click "Save"
  Then Mike Brown is assigned to the session
  And I see a confirmation message "3 evaluators now assigned (meets minimum requirement)"
  And the session can proceed with all 3 evaluators

Scenario: Replace evaluator due to last-minute unavailability before session starts
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is scheduled for today at 6:00 PM
  And session status is "Ready"
  And evaluators "John Smith", "Sarah Jones", "Mike Brown" are assigned
  And it is currently 4:00 PM (2 hours before session)
  When I receive notification that John Smith is sick
  And I view session details
  And I click "Remove" next to John Smith
  And I click "Assign Evaluators"
  And I select evaluator "Emily Davis"
  And I click "Save"
  Then John Smith is removed from the session
  And Emily Davis is assigned to the session
  And Emily Davis receives immediate notification
  And I see "Evaluator substitution successful: Emily Davis replaces John Smith"

Scenario: Cannot remove evaluator after session starts
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has status "In Progress"
  And evaluators "John Smith", "Sarah Jones", "Mike Brown" are assigned
  And John Smith has already entered scores for 5 players
  When I view session details
  Then I do not see a "Remove" option next to any evaluator
  And the evaluator list shows "(Locked - session in progress)"
  And I see a note "Evaluator assignments are locked once session starts to preserve score data integrity"

Scenario: Cannot add evaluators after session starts
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has status "In Progress"
  And 3 evaluators are currently assigned
  When I view session details
  Then I do not see an "Assign Evaluators" button
  And I see a note "Evaluator assignments locked - session in progress"

Scenario: Only users with Evaluator role appear in assignment list
  Given I am logged in as an Association Administrator
  And user "John Smith" has role "Evaluator"
  And user "Sarah Jones" has role "Intake Personnel"
  And user "Mike Brown" has role "Association Administrator"
  When I view session "U11 Session 1" details
  And I click "Assign Evaluators"
  Then I see "John Smith" in the available evaluators list
  But I do not see "Sarah Jones" or "Mike Brown" in the list
```

---

### Feature: Assign Intake Personnel to Sessions

**User Story:** As an Association Administrator, I want to assign intake personnel to sessions so that player check-in is managed

**Business Rules:**

- Multiple intake personnel can be assigned to one session
- Users must have "Intake Personnel" role to be assigned
- At least 1 intake personnel must be assigned before session can be marked "Ready"
- Intake personnel can be assigned to multiple sessions
- Intake personnel receive notifications when assigned
- Intake personnel can be added, removed, or changed at any time before or during the session
- Personnel management remains flexible to handle last-minute changes, substitutions, or scheduling adjustments

```gherkin
Scenario: Assign intake personnel to session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And users "Sarah Jones", "Mike Brown" have "Intake Personnel" role
  When I view session "U11 Session 1" details
  And I click "Assign Intake Personnel"
  And I select "Sarah Jones", "Mike Brown"
  And I click "Save"
  Then both intake personnel are assigned to the session
  And I see a confirmation message "2 intake personnel assigned to session"
  And each receives a notification about the assignment

Scenario: Cannot mark session ready without intake personnel
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And 3 drills are assigned to this session
  And 3 evaluators are assigned to this session
  And no intake personnel are assigned to this session
  When I attempt to change status to "Ready"
  Then I see an error message "At least 1 intake personnel must be assigned before marking session as Ready"
  And the status remains "Draft"

Scenario: Remove intake personnel from session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Draft"
  And intake personnel "Sarah Jones" is assigned to this session
  When I view session details
  And I click "Remove" next to Sarah Jones in the intake personnel list
  Then I see a confirmation dialog "Remove Sarah Jones from this session?"
  When I click "Confirm"
  Then Sarah Jones is removed from the session
  And she receives a notification about the removal
  And I see a confirmation message "Intake personnel removed from session"

Scenario: Add additional intake personnel for busy session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with status "Ready"
  And intake personnel "Sarah Jones" is already assigned
  And I realize the session has 40 players (higher than usual)
  When I view session details
  And I click "Assign Intake Personnel"
  And I select "Mike Brown"
  And I click "Save"
  Then both Sarah Jones and Mike Brown are assigned to the session
  And I see "2 intake personnel assigned (additional help for larger session)"

Scenario: Replace intake personnel day-of due to emergency
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is scheduled for today at 6:00 PM
  And intake personnel "Sarah Jones" is assigned
  And it is currently 5:30 PM (30 minutes before session)
  When Sarah Jones calls in with a family emergency
  And I view session details
  And I click "Remove" next to Sarah Jones
  And I click "Assign Intake Personnel"
  And I select "Emily Davis"
  And I click "Save"
  Then Sarah Jones is removed from the session
  And Emily Davis is assigned to the session
  And Emily Davis receives immediate notification
  And I see "Intake personnel substitution successful: Emily Davis replaces Sarah Jones"

Scenario: View intake personnel's assigned sessions
  Given I am logged in as an Association Administrator
  And intake personnel "Sarah Jones" is assigned to sessions "U11 Session 1", "U13 Session 2"
  When I navigate to "Team Members"
  And I view "Sarah Jones" details
  Then I see a list of her assigned sessions:
    | Session Name | Date | Time | Cohort | Status |
    | U11 Session 1 | Nov 15, 2025 | 6:00 PM | U11 | Draft |
    | U13 Session 2 | Nov 16, 2025 | 6:00 PM | U13 | Ready |
```

---

### Feature: Distribute Players to Sessions Using Alphabetical Algorithm

**User Story:** As an Association Administrator, I want to distribute players alphabetically so that sessions have balanced player lists

**Business Rules:**

- Players are sorted by last name, then first name
- **Two-level distribution:** Players distributed to sessions first, then to teams within each session
- Players are distributed evenly across selected sessions
- Within each session, players are distributed evenly across teams (alphabetically)
- Only "Active" players from the assigned cohort are included
- Distribution is previewed before finalizing
- System calculates actual players per session (total active players ÷ number of sessions) within session capacity limit set during season setup
- System calculates players per team (session players ÷ teams in session)
- Remainder players are distributed one per session/team starting with first session/team
- Team count per session configured during wave distribution (applies to all sessions in wave)

```gherkin
Scenario: Distribute players alphabetically across wave sessions with team distribution
  Given I am logged in as an Association Administrator
  And cohort "U11" has 30 active players
  And Wave 1 for cohort "U11" has 3 sessions with status "Not Started"
  And Wave 1 sessions are: "U11 Session 1", "U11 Session 2", "U11 Session 3"
  When I navigate to "Wave Management" for cohort "U11"
  And I click on "Wave 1"
  And I click "Distribute Players"
  And I select distribution method "Alphabetical"
  And I set teams per session to "2"
  And I click "Preview Distribution"
  Then I see a preview showing session-level distribution:
    | Session | Players Assigned | Names (First 3) |
    | U11 Session 1 | 10 | Adams, Blake, Carter |
    | U11 Session 2 | 10 | Davis, Evans, Foster |
    | U11 Session 3 | 10 | Green, Harris, Irving |
  And I see team-level distribution within sessions:
    | Session | Team 1 | Team 2 |
    | Session 1 | 5 players (Adams-Brown) | 5 players (Carter-Evans) |
    | Session 2 | 5 players (Davis-Green) | 5 players (Foster-Harris) |
    | Session 3 | 5 players (Green-Jones) | 5 players (Irving-Miller) |
  And I see a summary "30 players distributed across 3 sessions in Wave 1 (10 per session, 5 per team)"

Scenario: Finalize alphabetical distribution for wave
  Given I am logged in as an Association Administrator
  And I have previewed an alphabetical distribution for Wave 1
  And the preview shows 30 players across 3 sessions
  When I click "Finalize Distribution"
  Then all 30 players are assigned to their respective sessions and teams in Wave 1
  And I see a confirmation message "Wave 1 ready: 30 players distributed across 3 sessions (2 teams per session) using Alphabetical algorithm"
  And Wave 1 status changes to "Ready"
  And each session in Wave 1 shows its assigned player count and team assignments

Scenario: Handle remainder players in alphabetical distribution (sessions and teams)
  Given I am logged in as an Association Administrator
  And cohort "U11" has 25 active players
  And Wave 1 for cohort "U11" has 3 sessions with status "Not Started"
  And Wave 1 sessions are: "U11 Session 1", "U11 Session 2", "U11 Session 3"
  When I navigate to "Wave Management" for cohort "U11"
  And I click on "Wave 1"
  And I click "Distribute Players"
  And I select distribution method "Alphabetical"
  And I set teams per session to "2"
  And I click "Preview Distribution"
  Then I see session-level distribution:
    | Session | Players Assigned |
    | U11 Session 1 | 9 |
    | U11 Session 2 | 8 |
    | U11 Session 3 | 8 |
  And I see team-level distribution within sessions:
    | Session | Team 1 | Team 2 |
    | Session 1 | 5 players | 4 players |
    | Session 2 | 4 players | 4 players |
    | Session 3 | 4 players | 4 players |
  And session 1 receives one extra player, distributed to Team 1 (remainder rule)

Scenario: Exclude withdrawn and "Other" status players from wave distribution
  Given I am logged in as an Association Administrator
  And cohort "U11" has 28 players total
  And 25 players are "Active"
  And 2 players are "Withdrawn"
  And 1 player has "Other" status
  And Wave 1 for cohort "U11" has 3 sessions with status "Not Started"
  When I navigate to "Wave Management" for cohort "U11"
  And I click on "Wave 1"
  And I click "Distribute Players"
  And I select distribution method "Alphabetical"
  And I click "Preview Distribution"
  Then only the 25 "Active" players appear in the distribution
  And withdrawn and "Other" status players are excluded
  And I see a note "3 players excluded (2 Withdrawn, 1 Other status)"
```

---

### Feature: Distribute Players to Sessions Using Random Algorithm

**User Story:** As an Association Administrator, I want to distribute players randomly so that sessions have unbiased player assignments

**Business Rules:**

- Players are randomized before distribution
- **Two-level distribution:** Players distributed to sessions first, then to teams within each session
- Players are distributed evenly across selected sessions
- Within each session, players are distributed evenly across teams (in randomized order)
- Only "Active" players from the assigned cohort are included
- Distribution is previewed before finalizing
- Each preview generates a new random distribution (both session and team assignments randomized)
- System calculates actual players per session (total active players ÷ number of sessions) within session capacity limit set during season setup
- System calculates players per team (session players ÷ teams in session)
- Remainder players are distributed one per session/team based on randomized order
- Team count per session configured during wave distribution (applies to all sessions in wave)

```gherkin
Scenario: Distribute players randomly across wave sessions with team distribution
  Given I am logged in as an Association Administrator
  And cohort "U11" has 30 active players
  And Wave 1 for cohort "U11" has 3 sessions with status "Not Started"
  And Wave 1 sessions are: "U11 Session 1", "U11 Session 2", "U11 Session 3"
  When I navigate to "Wave Management" for cohort "U11"
  And I click on "Wave 1"
  And I click "Distribute Players"
  And I select distribution method "Random"
  And I set teams per session to "2"
  And I click "Preview Distribution"
  Then I see a preview showing session-level distribution:
    | Session | Players Assigned |
    | U11 Session 1 | 10 |
    | U11 Session 2 | 10 |
    | U11 Session 3 | 10 |
  And I see team-level distribution within sessions:
    | Session | Team 1 | Team 2 |
    | Session 1 | 5 players (random) | 5 players (random) |
    | Session 2 | 5 players (random) | 5 players (random) |
    | Session 3 | 5 players (random) | 5 players (random) |
  And player names are randomly distributed across both sessions and teams
  And I see a summary "30 players distributed across 3 sessions in Wave 1 (10 per session, 5 per team)"

Scenario: Regenerate random distribution for wave (sessions and teams)
  Given I am logged in as an Association Administrator
  And I have previewed a random distribution for Wave 1
  When I click "Regenerate Preview"
  Then I see a new random distribution
  And the player assignments are different from the previous preview (both session and team assignments)
  And the total count remains 30 players across 3 sessions in Wave 1
  And each session still has 10 players distributed across 2 teams

Scenario: Finalize random distribution for wave
  Given I am logged in as an Association Administrator
  And I have previewed a random distribution for Wave 1
  And I am satisfied with the player assignments
  When I click "Finalize Distribution"
  Then all players are assigned to their respective sessions and teams in Wave 1
  And I see a confirmation message "Wave 1 ready: 30 players distributed across 3 sessions (2 teams per session) using Random algorithm"
  And Wave 1 status changes to "Ready"
  And each session in Wave 1 shows its assigned player count and team assignments
```

---

### Feature: Distribute Players to Sessions Using Previous Level Algorithm

**User Story:** As an Association Administrator, I want to distribute players by previous level so that sessions have balanced skill distributions

**Business Rules:**

- Players are grouped by previous level (A, B, C, D, etc.)
- **Two-level distribution:** Players distributed to sessions first (by level), then to teams within each session
- Within each level, players are distributed evenly across sessions
- Within each session, players are distributed evenly across teams ensuring each team gets a mix of skill levels
- Players without a previous level are distributed last (alphabetically)
- Only "Active" players from the assigned cohort are included
- Distribution is previewed before finalizing
- Ensures each session gets a mix of skill levels
- Ensures each team within a session gets a balanced mix of skill levels
- System calculates actual players per session (total active players ÷ number of sessions) within session capacity limit set during season setup
- System calculates players per team (session players ÷ teams in session)
- Team count per session configured during wave distribution (applies to all sessions in wave)

```gherkin
Scenario: Distribute players by previous level across wave sessions with team distribution
  Given I am logged in as an Association Administrator
  And cohort "U11" has 24 active players
  And 6 players have previous level "A"
  And 8 players have previous level "B"
  And 10 players have previous level "C"
  And Wave 1 for cohort "U11" has 3 sessions with status "Not Started"
  And Wave 1 sessions are: "U11 Session 1", "U11 Session 2", "U11 Session 3"
  When I navigate to "Wave Management" for cohort "U11"
  And I click on "Wave 1"
  And I click "Distribute Players"
  And I select distribution method "Previous Level"
  And I set teams per session to "2"
  And I click "Preview Distribution"
  Then I see a preview showing session-level distribution:
    | Session | Total Players | Level A | Level B | Level C |
    | U11 Session 1 | 8 | 2 | 3 | 3 |
    | U11 Session 2 | 8 | 2 | 3 | 3 |
    | U11 Session 3 | 8 | 2 | 2 | 4 |
  And I see team-level distribution within sessions:
    | Session | Team 1 | Team 2 |
    | Session 1 | 4 players (1A, 1B, 2C) | 4 players (1A, 2B, 1C) |
    | Session 2 | 4 players (1A, 1B, 2C) | 4 players (1A, 2B, 1C) |
    | Session 3 | 4 players (1A, 1B, 2C) | 4 players (1A, 1B, 2C) |
  And each session has a balanced mix of skill levels
  And each team within sessions has a balanced mix of skill levels
  And I see a summary "24 players distributed across 3 sessions in Wave 1 (8 per session, 4 per team)"

Scenario: Handle players without previous level in wave distribution (with team distribution)
  Given I am logged in as an Association Administrator
  And cohort "U11" has 27 active players
  And 6 players have previous level "A"
  And 6 players have previous level "B"
  And 6 players have previous level "C"
  And 9 players have no previous level assigned
  And Wave 1 for cohort "U11" has 3 sessions with status "Not Started"
  And Wave 1 sessions are: "U11 Session 1", "U11 Session 2", "U11 Session 3"
  When I navigate to "Wave Management" for cohort "U11"
  And I click on "Wave 1"
  And I click "Distribute Players"
  And I select distribution method "Previous Level"
  And I set teams per session to "2"
  And I click "Preview Distribution"
  Then players with levels A, B, C are distributed first (to sessions and teams)
  And players without previous level are distributed last (alphabetically to sessions and teams)
  And I see session-level distribution:
    | Session | Players with Levels | Players without Level | Total |
    | Session 1 | 6 (2A, 2B, 2C) | 3 | 9 |
    | Session 2 | 6 (2A, 2B, 2C) | 3 | 9 |
    | Session 3 | 6 (2A, 2B, 2C) | 3 | 9 |
  And I see team-level distribution showing balanced levels within each session
  And I see a note "9 players without previous level distributed alphabetically across sessions and teams"

Scenario: Finalize previous level distribution for wave
  Given I am logged in as an Association Administrator
  And I have previewed a previous level distribution for Wave 1
  And each session has a balanced skill mix
  When I click "Finalize Distribution"
  Then all players are assigned to their respective sessions and teams in Wave 1
  And I see a confirmation message "Wave 1 ready: 24 players distributed across 3 sessions (2 teams per session) using Previous Level algorithm"
  And Wave 1 status changes to "Ready"
  And each session in Wave 1 shows its assigned player count, team assignments, and breakdown by level
```

---

### Feature: Distribute Players to Sessions Using Current Ranking Algorithm

**User Story:** As an Association Administrator, I want to distribute players by current ranking so that sessions have balanced skill distributions based on in-progress evaluation scores

**Business Rules:**

- **[TO BE DEFINED]** This algorithm will be designed for Wave 2+ distributions after Wave 1 evaluations are completed
- Players are ranked by their cumulative evaluation scores from previous waves
- **Two-level distribution:** Players distributed to sessions first (by rank), then to teams within each session
- Distribution uses snake draft pattern to ensure balanced sessions (1st → Session 1, 2nd → Session 2, ..., last → Session N, next → Session N, next → Session N-1, ...)
- Within each session, players distributed to teams ensuring each team gets a mix of skill levels
- Only available for waves after initial evaluation data exists
- Only "Active" players from the assigned cohort are included
- Distribution is previewed before finalizing
- System calculates actual players per session (total active players ÷ number of sessions) within session capacity limit set during season setup
- Team count per session configured during wave distribution (applies to all sessions in wave)

**Note:** Detailed scenarios will be defined after Wave 1 evaluation and ranking system requirements are finalized.

```gherkin
# Placeholder - Scenarios to be defined in future iteration
```

---

### Feature: Clone Sessions for Recurring Schedules

**User Story:** As an Association Administrator, I want to clone sessions so that I can quickly create similar sessions

**Business Rules:**

- Cloned sessions copy: name (with suffix), cohort, drills, location
- Cloned sessions require new: date, time
- Cloned sessions do NOT copy: player assignments, evaluator assignments, intake personnel assignments
- Cloned sessions are created in "Draft" status
- Original session remains unchanged

```gherkin
Scenario: Clone session with new date and time
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists with:
    | Field | Value |
    | Date | Nov 15, 2025 |
    | Time | 6:00 PM |
    | Location | Main Arena |
    | Cohort | U11 |
    | Drills | Skating Speed, Passing Accuracy, Wrist Shot |
    | Status | Ready |
  When I view session details
  And I click "Clone Session"
  And I enter date "Nov 22, 2025"
  And I enter time "6:00 PM"
  And I click "Create Clone"
  Then a new session "U11 Session 1 (Copy)" is created
  And it has date "Nov 22, 2025" and time "6:00 PM"
  And it has location "Main Arena" and cohort "U11"
  And it has the same 3 drills assigned
  And its status is "Draft"
  And it has no players, evaluators, or intake personnel assigned
  And the original session remains unchanged

Scenario: Clone session and modify name
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" exists
  When I click "Clone Session"
  And the default name "U11 Session 1 (Copy)" is shown
  And I change the name to "U11 Session 2"
  And I enter the new date and time
  And I click "Create Clone"
  Then the new session is created with name "U11 Session 2"

Scenario: Clone multiple sessions in sequence
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is scheduled for Nov 15, 2025
  When I clone the session with date "Nov 22, 2025"
  Then "U11 Session 1 (Copy)" is created
  When I clone the original session again with date "Nov 29, 2025"
  Then "U11 Session 1 (Copy 2)" is created
  And all 3 sessions exist independently
```

---

### Feature: Reassign Players Between Sessions

**User Story:** As an Association Administrator, I want to reassign players between sessions so that I can balance attendance or handle schedule conflicts

**Business Rules:**

- Players can only be reassigned between sessions of the same cohort
- Players can only be reassigned from "Draft" or "Ready" status sessions
- Cannot reassign players from "In Progress" or "Completed" sessions
- Player's evaluation data moves with them if session is not yet completed
- System warns if target session would exceed recommended capacity

```gherkin
Scenario: Reassign player to different session
  Given I am logged in as an Association Administrator
  And player "John Smith" is assigned to session "U11 Session 1" (status: Draft)
  And session "U11 Session 2" exists for the same cohort (status: Draft)
  When I view session "U11 Session 1" details
  And I select player "John Smith"
  And I click "Reassign Player"
  And I select target session "U11 Session 2"
  And I click "Confirm"
  Then John Smith is removed from "U11 Session 1"
  And John Smith is added to "U11 Session 2"
  And I see a confirmation message "Player reassigned to U11 Session 2"

Scenario: Bulk reassign players between sessions
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has 20 players assigned (status: Draft)
  And session "U11 Session 2" exists for the same cohort (status: Draft)
  When I view session "U11 Session 1" details
  And I select 5 players using checkboxes
  And I click "Reassign Players"
  And I select target session "U11 Session 2"
  And I click "Confirm"
  Then all 5 players are moved to "U11 Session 2"
  And session "U11 Session 1" now has 15 players
  And session "U11 Session 2" has its original count plus 5
  And I see a confirmation message "5 players reassigned to U11 Session 2"

Scenario: Cannot reassign players from completed session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has status "Completed"
  And player "John Smith" is assigned to this session
  When I view session details
  Then I do not see a "Reassign" option for players
  And the player list is read-only

Scenario: Warning when reassigning to session nearing capacity
  Given I am logged in as an Association Administrator
  And session "U11 Session 2" already has 25 players assigned
  And recommended session capacity is 25 players
  When I attempt to reassign player "John Smith" to "U11 Session 2"
  Then I see a warning "U11 Session 2 is at capacity (25 players). Reassign anyway?"
  When I click "Proceed"
  Then the player is reassigned
  And the session exceeds recommended capacity

Scenario: Cannot reassign player to session of different cohort
  Given I am logged in as an Association Administrator
  And player "John Smith" is in cohort "U11" and assigned to "U11 Session 1"
  And session "U13 Session 1" exists for cohort "U13"
  When I attempt to reassign John Smith to "U13 Session 1"
  Then I see an error message "Cannot reassign player to session of different cohort"
  And the reassignment is blocked
```

---

## 5️⃣ SESSION INTAKE & CHECK-IN

### Feature: Session Intake & Check-In

**User Story:** As Intake Personnel, I want to check in athletes and assign jersey colors and numbers so that each team has identifiable players during evaluations

**Business Rules:**

- Intake personnel checks in athletes upon arrival at the session
- Athletes are pre-assigned to teams based on wave distribution (read-only during check-in)
- Each athlete must be assigned a jersey color and jersey number during check-in
- **Jersey Color Assignment:**
  - First player to check in for a team selects that team's primary jersey color
  - Each jersey color can only be assigned to ONE team per session
  - Teams can have multiple jersey colors (e.g., Team 1 = mostly Red + some Black if Red jerseys run out)
  - Color-team associations reset for each new session (Session 1 Team 1 = Red, Session 2 Team 1 = Blue)
- **Jersey Number Assignment:**
  - Jersey numbers range: 0-999
  - Jersey numbers must be unique within a team
  - Same jersey number can be used across different teams in the same session (Team 1 #5 and Team 2 #5 = both allowed)
- Intake workflow: System prompts for jersey color and number, intake personnel enters values
- System validates jersey uniqueness rules during check-in
- Athletes who do not show up are marked as "No-show" (not withdrawn)
- Check-in status tracked: Not Checked In, Checked In, No-show
- Jersey assignments displayed in session roster and reports
- Team + jersey number displayed with every session score in reports

```gherkin
Scenario: Check in first player and assign jersey for team
  Given I am logged in as Intake Personnel
  And session "U11 Session 1" has started
  And "John Smith" is assigned to "Team 1" in this session (via distribution algorithm)
  And no players have checked in yet
  When John Smith arrives
  And I click "Check In" for John Smith
  Then system prompts "Select jersey color for Team 1"
  And I select jersey color "Red"
  Then system prompts "Enter jersey number for John Smith"
  And I enter jersey number "7"
  When I click "Confirm Check-In"
  Then John Smith is marked as "Checked In"
  And John Smith has jersey "Red #7"
  And Team 1 is associated with jersey color "Red"
  And I see confirmation message "John Smith checked in: Team 1, Red #7"

Scenario: First player check-in selects team color
  Given I am logged in as Intake Personnel
  And session "U13 Session 1" has 2 teams
  And no players have checked in yet for Team 1
  When the first player for Team 1 arrives
  And I check in the player
  And I select jersey color "Blue"
  Then "Blue" is assigned as Team 1's primary color
  And I see "Team 1 jersey color set to Blue"
  When a second player for Team 1 arrives
  And I check in the player
  Then system automatically suggests jersey color "Blue" (Team 1's color)
  And I see "Team 1 color: Blue (selected)"
  And I can accept Blue or choose a different color if Blue jerseys run out

Scenario: Prevent duplicate jersey color across teams in session
  Given I am logged in as Intake Personnel
  And session "U15 Session 1" has 2 teams
  And Team 1 has been assigned jersey color "Red"
  When I check in the first player for Team 2
  And I attempt to select jersey color "Red"
  Then I see an error message "Jersey color Red is already assigned to Team 1 in this session"
  And I see available colors: "Blue, Green, Black, White, Yellow, Orange"
  When I select jersey color "Blue"
  Then Team 2 is successfully assigned jersey color "Blue"

Scenario: Allow multi-color jerseys within same team
  Given I am logged in as Intake Personnel
  And session "U11 Session 1" has Team 1 with primary color "Red"
  And 8 out of 10 Team 1 players have checked in with "Red" jerseys
  And the facility has run out of Red jerseys
  When the 9th player for Team 1 arrives
  And I check in the player
  And I select jersey color "Black"
  And I enter jersey number "12"
  Then the player is checked in with "Black #12"
  And Team 1 roster shows:
    | Player Name | Jersey Color | Jersey Number |
    | Player 1 | Red | 5 |
    | Player 2 | Red | 7 |
    | ... | ... | ... |
    | Player 9 | Black | 12 |
  And I see note "Team 1 has multiple jersey colors: Red (8 players), Black (1 player)"

Scenario: Prevent duplicate jersey number within team
  Given I am logged in as Intake Personnel
  And session "U13 Session 1" has Team 1
  And "Sarah Johnson" is checked in with jersey "Red #10"
  When I check in "Mike Davis" (also Team 1)
  And I select jersey color "Red"
  And I enter jersey number "10"
  Then I see an error message "Jersey number 10 is already assigned to Sarah Johnson (Team 1)"
  And I see prompt "Please enter a different jersey number (0-999)"
  When I change jersey number to "11"
  Then Mike Davis is successfully checked in with "Red #11"

Scenario: Allow same jersey number across different teams
  Given I am logged in as Intake Personnel
  And session "U15 Session 1" has 2 teams
  And "Alex Brown" (Team 1) is checked in with jersey "Red #5"
  When I check in "Taylor Green" (Team 2)
  And I select jersey color "Blue"
  And I enter jersey number "5"
  Then Taylor Green is successfully checked in with "Blue #5"
  And I see confirmation "Team 2: Blue #5 (allowed - different team than Team 1)"

Scenario: Validate jersey number range (0-999)
  Given I am logged in as Intake Personnel
  And I am checking in a player
  When I enter jersey number "1000"
  Then I see an error message "Jersey number must be between 0 and 999"
  When I enter jersey number "-5"
  Then I see an error message "Jersey number must be between 0 and 999"
  When I enter jersey number "0"
  Then jersey number "0" is accepted

Scenario: View team roster with jersey assignments
  Given I am logged in as Intake Personnel
  And session "U11 Session 1" is in progress
  And 5 out of 10 Team 1 players have checked in
  When I view the Team 1 roster
  Then I see:
    | Player Name | Check-In Status | Jersey Color | Jersey Number | Team |
    | John Smith | Checked In | Red | 7 | Team 1 |
    | Sarah Lee | Checked In | Red | 10 | Team 1 |
    | Mike Wong | Checked In | Red | 5 | Team 1 |
    | Emma Davis | Checked In | Red | 12 | Team 1 |
    | Ryan Kumar | Checked In | Black | 3 | Team 1 |
    | Lisa Chen | Not Checked In | - | - | Team 1 |
    | Tom Garcia | Not Checked In | - | - | Team 1 |
    | Anna Park | Not Checked In | - | - | Team 1 |
    | Chris Taylor | Not Checked In | - | - | Team 1 |
    | Maya Patel | Not Checked In | - | - | Team 1 |
  And I see summary "Team 1: 5 of 10 checked in (Red: 4, Black: 1)"

Scenario: Handle player no-show during intake
  Given I am logged in as Intake Personnel
  And session "U13 Session 1" is in progress
  And "Alex Johnson" is assigned to Team 2 but has not arrived
  When the session start time passes
  And Alex Johnson has not checked in
  And I click "Mark as No-show" for Alex Johnson
  Then Alex Johnson's status changes to "No-show"
  And Alex Johnson is NOT assigned a jersey
  And I see confirmation "Alex Johnson marked as No-show for this session"
  And Alex Johnson remains "Active" in the system (not withdrawn)
  And Alex Johnson can be checked into future sessions
```

---

## 6️⃣ REAL-TIME PLAYER EVALUATION

### Feature: Access Evaluator Interface

**User Story:** As an Evaluator, I want to access my assigned session so that I can begin scoring athletes

**Business Rules:**

- Evaluators can only access sessions they are assigned to
- Evaluators cannot access sessions until status is "In Progress"
- Evaluator sees only checked-in athletes (no-shows are hidden)
- Athletes displayed by team with jersey color and number (names hidden during evaluation for anonymity)
- Evaluators see drills assigned to the session with weights
- Evaluator interface is mobile-friendly (tablet/phone optimized)
- Session remains read-only until session starts

```gherkin
Scenario: Evaluator logs in and views assigned sessions
  Given I am logged in as an Evaluator
  And I am assigned to sessions "U11 Session 1" and "U13 Session 2"
  When I navigate to "My Sessions"
  Then I see a list of my assigned sessions:
    | Session Name | Date | Time | Cohort | Status |
    | U11 Session 1 | Nov 15, 2025 | 6:00 PM | U11 | In Progress |
    | U13 Session 2 | Nov 16, 2025 | 6:00 PM | U13 | Ready |
  And I can click on "U11 Session 1" to enter evaluation interface
  And "U13 Session 2" shows "Not Started - evaluation locked until session begins"

Scenario: Access evaluation interface for in-progress session
  Given I am logged in as an Evaluator
  And session "U11 Session 1" has status "In Progress"
  And I am assigned to this session
  When I click on "U11 Session 1"
  Then I see the evaluation interface with:
    | Section | Content |
    | Session Info | U11 Session 1, Nov 15 2025, 6:00 PM |
    | Drills | List of drills with weights |
    | Athletes | Grouped by team with jersey colors/numbers |
    | My Progress | Scores entered / total required |
  And athlete names are hidden (only jersey numbers visible)

Scenario: Cannot access session not assigned to me
  Given I am logged in as an Evaluator
  And session "U11 Session 1" exists
  And I am NOT assigned to this session
  When I attempt to navigate to "U11 Session 1" evaluation interface
  Then I see an error message "Access denied: You are not assigned to this session"
  And I am redirected to "My Sessions" page

Scenario: View only checked-in athletes in evaluation interface
  Given I am logged in as an Evaluator
  And session "U11 Session 1" is in progress
  And 30 athletes were assigned to this session
  And 25 athletes have checked in
  And 5 athletes are marked as "No-show"
  When I access the evaluation interface
  Then I see only the 25 checked-in athletes
  And the 5 no-shows are not displayed
  And I see a note "25 of 30 athletes checked in and ready for evaluation"
```

---

### Feature: View Athletes by Team with Jersey Identification

**User Story:** As an Evaluator, I want to see athletes organized by team with jersey colors and numbers so that I can identify them during evaluations without knowing their names

**Business Rules:**

- Athletes grouped by team number (Team 1, Team 2, etc.)
- Each athlete displays: Team number, jersey color, jersey number (names hidden)
- Evaluator can expand/collapse team groups
- Athletes within teams sorted by jersey number (ascending)
- Evaluator can filter view: All Teams, Team 1 only, Team 2 only, etc.
- Visual color indicators for jersey colors (not just text)
- Anonymous evaluation ensures unbiased scoring

```gherkin
Scenario: View athletes organized by team
  Given I am logged in as an Evaluator
  And session "U11 Session 1" has 2 teams
  And Team 1 has 12 checked-in athletes
  And Team 2 has 13 checked-in athletes
  When I access the evaluation interface
  Then I see athletes organized by team:
    | Team | Athletes | Display |
    | Team 1 | 12 | Red #3, Red #5, Red #7, ... |
    | Team 2 | 13 | Blue #2, Blue #4, Blue #6, ... |
  And each team section is expandable/collapsible
  And I see team summaries "Team 1 (12 athletes), Team 2 (13 athletes)"

Scenario: View athlete with jersey color and number (name hidden)
  Given I am logged in as an Evaluator
  And athlete "John Smith" has checked in as "Team 1, Red #7"
  When I view the evaluation interface
  Then I see "Team 1, Red #7" in the athlete list
  And I do NOT see "John Smith" anywhere on the screen
  And the jersey display shows:
    - Team icon/badge with "1"
    - Red color indicator (visual swatch)
    - Jersey number "7"
  And I can click on this athlete to enter scores

Scenario: Athletes sorted by jersey number within team
  Given I am logged in as an Evaluator
  And Team 1 has these checked-in athletes:
    | Jersey | Check-in Order |
    | Red #12 | 1st |
    | Red #3 | 2nd |
    | Red #7 | 3rd |
    | Red #5 | 4th |
  When I view Team 1 athletes
  Then they are displayed in jersey number order:
    | Display Order |
    | Red #3 |
    | Red #5 |
    | Red #7 |
    | Red #12 |

Scenario: Filter athletes by team
  Given I am logged in as an Evaluator
  And session has 3 teams with athletes
  When I view the evaluation interface
  Then I see a filter dropdown "Show: All Teams"
  When I select "Team 1 only"
  Then I see only Team 1 athletes
  And Team 2 and Team 3 are hidden
  When I select "Team 2 only"
  Then I see only Team 2 athletes
  When I select "All Teams"
  Then I see all teams expanded

Scenario: Visual color indicators for jerseys
  Given I am logged in as an Evaluator
  And athlete "Team 1, Red #7" is displayed
  When I view the athlete row
  Then I see a visual red color swatch next to the jersey number
  And the color swatch is clearly visible (not just text saying "Red")
  And I can quickly identify jersey color at a glance during fast-paced evaluation
```

---

### Feature: Enter Evaluation Scores for Athletes

**User Story:** As an Evaluator, I want to enter scores for athletes on each drill so that evaluations are recorded accurately

**Business Rules:**

- Scores range: 1-10 (integers only)
- Each athlete scored once per drill by each evaluator
- Evaluator can score athletes in any order
- Scores are saved immediately upon entry
- Evaluator can edit their own scores before finalizing
- Cannot edit scores after evaluation is finalized
- Score entry interface shows drill name, weight, and criteria
- System tracks completion: scores entered vs. total required
- Evaluator can score drills in any order (drill-by-drill or athlete-by-athlete approach)

```gherkin
Scenario: Enter score for athlete on specific drill
  Given I am logged in as an Evaluator
  And session "U11 Session 1" is in progress
  And athlete "Team 1, Red #7" is checked in
  And drill "Skating Speed" is assigned to this session with weight 40%
  When I click on athlete "Team 1, Red #7"
  Then I see athlete details:
    | Field | Value |
    | Team | Team 1 |
    | Jersey | Red #7 |
    | Drills | Skating Speed (40%), Shooting Accuracy (35%), Positioning (25%) |
  When I click on drill "Skating Speed"
  Then I see score entry interface:
    | Field | Value |
    | Drill | Skating Speed |
    | Weight | 40% |
    | Criteria | Speed, technique, consistency |
    | Score | [1-10 scale slider/buttons] |
  When I select score "8"
  And I click "Save Score"
  Then the score is saved immediately
  And I see confirmation "Score saved: Team 1, Red #7 - Skating Speed: 8"
  And drill "Skating Speed" shows checkmark for this athlete

Scenario: View my evaluation progress
  Given I am logged in as an Evaluator
  And session "U11 Session 1" has 25 checked-in athletes
  And session has 3 drills
  And total evaluations required: 25 athletes × 3 drills = 75
  And I have entered 30 scores so far
  When I view the evaluation interface
  Then I see progress indicator "30 of 75 evaluations completed (40%)"
  And I see a progress bar showing 40%
  And I can see which athletes/drills still need scores

Scenario: Edit my own score before finalizing
  Given I am logged in as an Evaluator
  And I have entered score "7" for "Team 1, Red #7" on drill "Skating Speed"
  And I have not finalized my evaluation
  When I click on "Team 1, Red #7"
  And I click on drill "Skating Speed"
  Then I see current score "7"
  When I change the score to "8"
  And I click "Update Score"
  Then the score is updated to "8"
  And I see confirmation "Score updated: Team 1, Red #7 - Skating Speed: 8"

Scenario: Score validation - slider enforces whole numbers only (1-10)
  Given I am logged in as an Evaluator
  And I am entering a score for "Team 1, Red #7" on drill "Skating Speed"
  When I view the score entry interface
  Then I see a slider with discrete stops from 1 to 10
  And the slider only allows whole numbers (no decimal values)
  And I cannot select values outside the 1-10 range
  When I move the slider to position "8"
  Then the score displays "8"
  And the slider prevents me from selecting "0", "11", or any decimal like "7.5"
  When I confirm score "10"
  Then the score is accepted
  And only whole numbers (1-10) can be saved

Scenario: Track completion by athlete
  Given I am logged in as an Evaluator
  And athlete "Team 1, Red #7" has 3 drills to be evaluated
  And I have scored 2 out of 3 drills for this athlete
  When I view athlete "Team 1, Red #7"
  Then I see completion status:
    | Drill | Status |
    | Skating Speed | ✓ Scored (8) |
    | Shooting Accuracy | ✓ Scored (7) |
    | Positioning | Not scored |
  And I see "2 of 3 drills completed for Team 1, Red #7"

Scenario: Visual completion indicators for athletes in team view
  Given I am logged in as an Evaluator
  And session "U11 Session 1" has Team 1 with 10 athletes
  And session has 3 drills per athlete
  And I have completed all scores for 6 athletes (Red #3, #5, #7, #10, #12, #15)
  And I have partial scores for 2 athletes (Red #8 has 2/3 drills, Red #14 has 1/3 drills)
  And I have not scored 2 athletes (Red #20, #22)
  When I view Team 1 athlete list
  Then I see visual completion indicators for each athlete:
    | Jersey | Indicator | Status |
    | Red #3 | ✓ Green checkmark | Complete (3/3 drills) |
    | Red #5 | ✓ Green checkmark | Complete (3/3 drills) |
    | Red #7 | ✓ Green checkmark | Complete (3/3 drills) |
    | Red #8 | ⚠ Yellow warning | Incomplete (2/3 drills) |
    | Red #10 | ✓ Green checkmark | Complete (3/3 drills) |
    | Red #12 | ✓ Green checkmark | Complete (3/3 drills) |
    | Red #14 | ⚠ Yellow warning | Incomplete (1/3 drills) |
    | Red #15 | ✓ Green checkmark | Complete (3/3 drills) |
    | Red #20 | ○ Gray circle | Not started (0/3 drills) |
    | Red #22 | ○ Gray circle | Not started (0/3 drills) |
  And I can quickly identify which athletes still need evaluation
  And I see team summary "Team 1: 6 complete, 2 incomplete, 2 not started (8/10 athletes evaluated)"

Scenario: Score athletes drill-by-drill (all athletes for one drill)
  Given I am logged in as an Evaluator
  And I prefer to score all athletes on one drill before moving to the next
  When I select drill "Skating Speed" from the drill list
  Then I see all 25 athletes with score entry for "Skating Speed" only
  And I can quickly enter scores: Red #3 = 8, Red #5 = 7, Red #7 = 9, etc.
  And scores are saved as I enter them
  When I complete all 25 athletes for "Skating Speed"
  Then I see "Skating Speed: 25 of 25 complete ✓"
  And I can move to the next drill

Scenario: Score athletes athlete-by-athlete (all drills for one athlete)
  Given I am logged in as an Evaluator
  And I prefer to score one athlete across all drills before moving to the next
  When I select athlete "Team 1, Red #7"
  Then I see all drills for this athlete:
    | Drill | Weight | Score |
    | Skating Speed | 40% | [Not scored] |
    | Shooting Accuracy | 35% | [Not scored] |
    | Positioning | 25% | [Not scored] |
  When I enter scores: Skating Speed = 8, Shooting Accuracy = 7, Positioning = 9
  Then all scores are saved
  And athlete "Team 1, Red #7" shows "3 of 3 drills complete ✓"
  And I can move to the next athlete
```

---

### Feature: View Drill Details During Evaluation

**User Story:** As an Evaluator, I want to view drill criteria and weights so that I can score athletes accurately

**Business Rules:**

- Drill details include: name, weight, evaluation criteria
- Criteria displayed as reference during scoring
- Weights visible to understand drill importance
- Drill details accessible without leaving score entry interface
- Evaluators can view drill library descriptions if needed

```gherkin
Scenario: View drill criteria during score entry
  Given I am logged in as an Evaluator
  And I am scoring athlete "Team 1, Red #7" on drill "Skating Speed"
  When I view the score entry interface
  Then I see drill details:
    | Field | Value |
    | Drill Name | Skating Speed |
    | Weight | 40% |
    | Criteria | Evaluate: acceleration, top speed, edge control, recovery |
  And criteria remain visible while I enter the score
  And I can reference criteria to ensure accurate scoring

Scenario: View drill weights to understand importance
  Given I am logged in as an Evaluator
  And athlete "Team 1, Red #7" has these drills:
    | Drill | Weight |
    | Skating Speed | 40% |
    | Shooting Accuracy | 35% |
    | Positioning | 25% |
  When I view the athlete evaluation screen
  Then I see all drills with their weights displayed
  And I understand that "Skating Speed" has the highest weight (most important)
```

---

### Feature: Finalize Evaluation Session

**User Story:** As an Evaluator, I want to finalize my evaluation so that my scores are locked and submitted

**Business Rules:**

- Evaluators can finalize their evaluation at any time (complete or incomplete)
- Warning shown if incomplete, displaying count of missing scores
- If finalizing incomplete, evaluator must provide a reason (e.g., "Ran out of time", "Had to leave early", "Technical issues")
- Reason is recorded with finalization timestamp for administrator review
- Once finalized, evaluator cannot edit their scores
- System timestamps finalization
- Administrator can see which evaluators have finalized and their completion status
- Incomplete finalizations are flagged for administrator review
- Session remains open until all evaluators finalize (or administrator closes session)

```gherkin
Scenario: Finalize evaluation with all scores complete
  Given I am logged in as an Evaluator
  And session "U11 Session 1" has 25 athletes and 3 drills
  And I have entered all 75 required scores (25 × 3)
  When I click "Finalize My Evaluation"
  Then I see a confirmation dialog "Finalize evaluation? You cannot edit scores after finalizing."
  And I see summary "75 of 75 evaluations complete (100%)"
  When I click "Confirm Finalize"
  Then my evaluation is finalized
  And I see confirmation "Evaluation finalized successfully. Thank you!"
  And I can no longer edit any scores
  And system records finalization timestamp

Scenario: Warning when finalizing with incomplete scores
  Given I am logged in as an Evaluator
  And session "U11 Session 1" has 25 athletes and 3 drills
  And total evaluations required: 25 athletes × 3 drills = 75
  And I have entered 70 out of 75 required scores
  When I view the evaluation interface
  Then I see progress indicator "70 of 75 evaluations completed (93%)"
  And I see "Finalize My Evaluation" button is enabled
  When I click "Finalize My Evaluation"
  Then I see a warning dialog "Incomplete Evaluation - 5 scores missing"
  And I see list of missing scores:
    | Athlete | Drill |
    | Team 1, Red #12 | Skating Speed |
    | Team 2, Blue #8 | Shooting Accuracy |
    | Team 2, Blue #15 | Positioning |
    | Team 2, Blue #20 | Skating Speed |
    | Team 1, Red #5 | Positioning |
  And I see prompt "Please provide a reason for finalizing incomplete evaluation:"
  And I see a text field for entering reason
  And I see buttons "Finalize Anyway" and "Continue Scoring"
  When I enter reason "Had to leave early due to family emergency"
  And I click "Finalize Anyway"
  Then my evaluation is finalized
  And I see confirmation "Evaluation finalized with 70 of 75 scores. Reason recorded."
  And system records finalization timestamp and reason
  And my evaluation is flagged as "Incomplete" for administrator review

Scenario: Cannot edit scores after finalizing
  Given I am logged in as an Evaluator
  And I have finalized my evaluation
  When I attempt to view athlete "Team 1, Red #7"
  Then I see all my scores as read-only
  And I do not see "Edit" or "Update Score" buttons
  And I see a note "Evaluation finalized on Nov 15, 2025 at 7:45 PM - scores cannot be changed"

Scenario: Administrator views evaluator finalization status
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has 3 evaluators assigned
  And evaluator "John Smith" has finalized
  And evaluator "Sarah Jones" has finalized
  And evaluator "Mike Brown" has not finalized
  When I view session "U11 Session 1" details
  Then I see evaluator status:
    | Evaluator | Scores Entered | Finalized | Timestamp |
    | John Smith | 75 of 75 | ✓ Yes | Nov 15, 2025 7:30 PM |
    | Sarah Jones | 75 of 75 | ✓ Yes | Nov 15, 2025 7:45 PM |
    | Mike Brown | 65 of 75 | ✗ No | - |
  And I see summary "2 of 3 evaluators finalized"
```

---

## 7️⃣ QUALITY CONTROL & VALIDATION

### Feature: Detect Score Outliers Using Deviation Threshold

**User Story:** As an Association Administrator, I want the system to flag scores that deviate significantly from other evaluators so that I can review potentially problematic evaluations

**Business Rules:**

- Outlier threshold set per season (10-50%, default 25%)
- Outlier threshold locked after season activation (cannot be changed mid-season)
- System calculates standard deviation for each athlete's drill scores
- Scores outside threshold percentage are flagged as outliers
- Outliers do NOT prevent finalization (flagged for review only)
- Administrator can view outlier reports
- Outliers visible in athlete detail view with evaluator identification
- Multiple outliers from same evaluator may indicate systematic scoring bias
- Outlier detection runs after all evaluators finalize (or session closes)

```gherkin
Scenario: Configure outlier threshold during season setup
  Given I am logged in as an Association Administrator
  And I am creating a new season "2025-26"
  When I configure quality control settings
  Then I see "Outlier Threshold" field with default value "25%"
  And I see range constraint "(10-50%)"
  And I see description "Scores this far from average will be flagged for review"
  When I set outlier threshold to "30%"
  And I activate the season
  Then outlier threshold is locked at 30%
  And I cannot change this value for the season

Scenario: System detects outlier score (high deviation)
  Given season "2025-26" has outlier threshold set to 25%
  And athlete "John Smith" (Red #7) was evaluated on drill "Skating Speed" by 5 evaluators
  And scores are: 8, 8, 7, 9, 3
  And average score is 7.0
  And standard deviation is 2.24
  And score "3" deviates by 57% from average
  When the system runs outlier detection
  Then score "3" is flagged as an outlier
  And the system records:
    | Field | Value |
    | Athlete | John Smith (Red #7) |
    | Drill | Skating Speed |
    | Evaluator | Sarah Jones |
    | Score | 3 |
    | Average | 7.0 |
    | Deviation | -57% |
    | Threshold | 25% |
    | Status | Flagged - exceeds threshold |

Scenario: System does NOT flag score within threshold
  Given season "2025-26" has outlier threshold set to 25%
  And athlete "John Smith" (Red #7) was evaluated on drill "Skating Speed" by 5 evaluators
  And scores are: 8, 8, 7, 9, 7
  And average score is 7.8
  And all scores are within 15% of average
  When the system runs outlier detection
  Then no scores are flagged as outliers
  And all scores are marked as "Normal - within threshold"

Scenario: Administrator views outlier report for session
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has completed outlier detection
  And 12 scores were flagged as outliers out of 225 total scores
  When I navigate to session "U11 Session 1" quality control report
  Then I see outlier summary "12 outliers detected (5.3% of scores)"
  And I see outlier list:
    | Athlete | Drill | Evaluator | Score | Avg | Deviation | Action |
    | Red #7 | Skating Speed | Sarah Jones | 3 | 7.0 | -57% | [Review] |
    | Blue #12 | Shooting Accuracy | Mike Brown | 10 | 6.5 | +54% | [Review] |
    | Red #15 | Positioning | Sarah Jones | 2 | 6.8 | -71% | [Review] |
  And I can click [Review] to view athlete detail page
  And I can filter outliers by evaluator

Scenario: Identify evaluator with multiple outliers (systematic bias)
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has 3 evaluators
  And evaluator "Sarah Jones" has 8 scores flagged as outliers
  And evaluator "Mike Brown" has 2 scores flagged as outliers
  And evaluator "John Smith" has 1 score flagged as outlier
  When I view the outlier report
  Then I see evaluator summary:
    | Evaluator | Total Scores | Outliers | Outlier Rate |
    | Sarah Jones | 75 | 8 | 10.7% |
    | Mike Brown | 75 | 2 | 2.7% |
    | John Smith | 75 | 1 | 1.3% |
  And evaluator "Sarah Jones" is highlighted as "High outlier rate - review recommended"
  And I can click on evaluator name to see all their scores
  And I can document corrective action (e.g., evaluator training needed)

Scenario: Outliers do not prevent finalization
  Given I am an Evaluator "Sarah Jones"
  And I have entered all 75 required scores
  And 3 of my scores will be flagged as outliers (I don't know this yet)
  When I click "Finalize My Evaluation"
  Then my evaluation finalizes successfully
  And I do NOT see any outlier warnings
  And outlier detection runs after finalization (administrator-only visibility)
```

---

### Feature: Enforce Minimum Evaluators Per Athlete

**User Story:** As an Association Administrator, I want to ensure each athlete is scored by at least the minimum number of evaluators so that rankings are reliable

**Business Rules:**

- Minimum evaluators set per season (1-10, default 3)
- Minimum evaluators locked after season activation
- System validates athlete has minimum evaluators before including in rankings
- Athletes with fewer than minimum evaluators receive warning in reports
- Administrator can view athletes not meeting minimum
- Athletes can be manually excluded from rankings if minimum not met
- Session must have at least the minimum number of evaluators assigned

```gherkin
Scenario: Configure minimum evaluators during season setup
  Given I am logged in as an Association Administrator
  And I am creating a new season "2025-26"
  When I configure quality control settings
  Then I see "Minimum Evaluators Per Athlete" field with default value "3"
  And I see range constraint "(1-10)"
  And I see description "Each athlete must be scored by at least this many evaluators"
  When I set minimum evaluators to "4"
  And I activate the season
  Then minimum evaluators is locked at 4
  And I cannot change this value for the season

Scenario: Validate session has minimum evaluators assigned
  Given season "2025-26" has minimum evaluators set to 3
  And I am creating session "U11 Session 1"
  And I have assigned 2 evaluators to the session
  When I attempt to change session status to "Ready"
  Then I see validation error "Session requires at least 3 evaluators (minimum per season)"
  And session status remains "Draft"
  When I assign a 3rd evaluator
  And I attempt to change session status to "Ready"
  Then validation passes
  And session status changes to "Ready"

Scenario: System detects athlete scored by fewer than minimum evaluators
  Given season "2025-26" has minimum evaluators set to 3
  And session "U11 Session 1" is complete
  And athlete "John Smith" (Red #7) was scored by only 2 evaluators
  And evaluator "Mike Brown" did not score this athlete (finalized incomplete)
  When the system runs quality control validation
  Then athlete "John Smith" (Red #7) is flagged with warning "Scored by 2 evaluators (minimum 3 required)"
  And the system records:
    | Field | Value |
    | Athlete | John Smith (Red #7) |
    | Evaluators | 2 (Sarah Jones, John Smith) |
    | Required | 3 |
    | Status | Below minimum |

Scenario: Administrator views athletes below minimum evaluator count
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is complete
  And 3 athletes were scored by fewer than 3 evaluators
  When I navigate to session "U11 Session 1" quality control report
  Then I see minimum evaluator warning "3 athletes scored by fewer than 3 evaluators"
  And I see athlete list:
    | Athlete | Evaluators | Required | Missing Evaluators | Action |
    | Red #7 | 2 | 3 | Mike Brown | [View Details] |
    | Blue #12 | 2 | 3 | Sarah Jones | [View Details] |
    | Red #22 | 1 | 3 | Mike Brown, John Smith | [View Details] |
  And I see recommendation "These athletes may have unreliable rankings. Consider manual review."

Scenario: Reports include warning for athletes below minimum
  Given season "2025-26" has minimum evaluators set to 3
  And athlete "John Smith" (Red #7) was scored by 2 evaluators
  And I generate the final rankings report
  When I view athlete "John Smith" in the report
  Then I see ranking "Rank 12 of 100"
  And I see warning indicator "⚠ Scored by 2 of 3 required evaluators"
  And I see note "Ranking may be less reliable due to insufficient evaluator count"
```

---

### Feature: Validate Score Completeness and Data Integrity

**User Story:** As an Association Administrator, I want to ensure all evaluation data is complete and valid so that reports are accurate

**Business Rules:**

- All checked-in athletes must have scores from all assigned evaluators
- All scores must be within valid range (1-10)
- No duplicate scores (same athlete, drill, evaluator combination)
- Missing scores flagged in quality control report
- Data integrity checks run before report generation
- Administrator can view incomplete evaluations by evaluator
- System prevents duplicate score entry at database level

```gherkin
Scenario: System detects missing scores after session completion
  Given session "U11 Session 1" has 25 checked-in athletes
  And session has 3 drills per athlete
  And session has 3 evaluators assigned
  And total expected scores: 25 athletes × 3 drills × 3 evaluators = 225
  And evaluator "Mike Brown" finalized with 70 of 75 required scores (incomplete)
  And evaluator "Mike Brown" provided reason "Ran out of time"
  And 5 scores are missing from evaluator "Mike Brown"
  When administrator views the quality control report
  Then system runs data integrity check
  And system detects "5 missing scores"
  And system flags session with warning "Data incomplete - 220 of 225 scores entered (97.8%)"
  And system shows Mike Brown's evaluation as "Incomplete - reason: Ran out of time"

Scenario: Administrator views missing score report
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is closed
  And evaluator "Mike Brown" has 5 missing scores
  When I navigate to session "U11 Session 1" quality control report
  Then I see completeness summary "220 of 225 scores entered (97.8% complete)"
  And I see missing scores section:
    | Athlete | Drill | Evaluator | Status |
    | Red #7 | Skating Speed | Mike Brown | Missing |
    | Blue #12 | Shooting Accuracy | Mike Brown | Missing |
    | Red #15 | Positioning | Mike Brown | Missing |
    | Blue #20 | Skating Speed | Mike Brown | Missing |
    | Red #22 | Shooting Accuracy | Mike Brown | Missing |
  And I see recommendation "Contact evaluator Mike Brown to complete missing scores"

Scenario: System validates score range during entry
  Given I am an Evaluator entering scores
  And I am using the slider interface for score entry
  When I attempt to save a score
  Then the system validates the score is between 1 and 10
  And the system validates the score is a whole number
  And invalid scores cannot be saved (UI enforces this)

Scenario: System prevents duplicate scores
  Given I am an Evaluator "Sarah Jones"
  And I have already scored athlete "Red #7" on drill "Skating Speed" with score "8"
  And the score is saved in the database
  When I attempt to enter another score for "Red #7" on "Skating Speed"
  Then the system detects existing score
  And I see current score "8" with option to "Edit" (not create duplicate)
  And database constraint prevents duplicate entry if attempted via API

Scenario: Data integrity check before report generation
  Given I am logged in as an Association Administrator
  And I want to generate final rankings for cohort "U11"
  When I click "Generate Rankings Report"
  Then the system runs data integrity validation:
    | Check | Result |
    | All scores within valid range (1-10) | ✓ Pass |
    | No duplicate scores | ✓ Pass |
    | Minimum evaluators met | ⚠ 3 athletes below minimum |
    | Score completeness | ⚠ 5 athletes with incomplete evaluations |
    | Incomplete evaluations reconciled | ✗ 5 athletes require reconciliation |
    | Outlier detection complete | ✓ Pass |
  And I see summary "Data validation: 1 blocker, 2 warnings detected"
  And I see error "Cannot generate report: 5 incomplete evaluations must be reconciled"
  And I see button "Reconcile Incomplete Evaluations"
  When I click "Reconcile Incomplete Evaluations"
  Then I am directed to the reconciliation interface
  And I reconcile all 5 athletes
  When I return to "Generate Rankings Report"
  And I click "Generate Rankings Report"
  Then the system validates again:
    | Check | Result |
    | Incomplete evaluations reconciled | ✓ Pass - All reconciled |
  And I see summary "Data validation: 2 warnings detected"
  And I can choose to "Proceed with Report" or "Review Warnings"
  When I click "Proceed with Report"
  Then the report is generated with warnings and reconciliation notes included

Scenario: View data integrity summary across all sessions in cohort
  Given I am logged in as an Association Administrator
  And cohort "U11" has completed 5 sessions across multiple waves
  When I navigate to cohort "U11" quality control dashboard
  Then I see data integrity summary:
    | Session | Athletes | Expected Scores | Actual Scores | Completeness | Outliers | Below Min Evaluators |
    | U11 Session 1 | 20 | 180 | 180 | 100% | 8 | 0 |
    | U11 Session 2 | 20 | 180 | 175 | 97.2% | 5 | 2 |
    | U11 Session 3 | 20 | 180 | 180 | 100% | 12 | 1 |
    | U11 Session 4 | 20 | 180 | 180 | 100% | 6 | 0 |
    | U11 Session 5 | 20 | 180 | 178 | 98.9% | 7 | 3 |
  And I see cohort totals "Total: 893 of 900 scores (99.2% complete), 38 outliers, 6 athletes below minimum"
  And I can click on each session to view detailed quality control report
```

---

### Feature: Reconcile Incomplete Evaluations

**User Story:** As an Association Administrator, I want to reconcile incomplete evaluations so that I can generate accurate rankings despite missing scores

**Business Rules:**

- Reconciliation required before generating final rankings report
- Administrator must manually review and reconcile each incomplete evaluation
- Three reconciliation methods available:
  1. **Apply Partial Averaging (Drill-Level):** Use available evaluator scores for each drill
  2. **Mark Drill Invalid:** Exclude specific drill from position score calculation
  3. **Exclude Athlete:** Remove athlete from rankings entirely
- Partial averaging applies at individual drill level (not session-wide)
- If drill has at least 1 evaluator score, partial average can be calculated
- If drill has 0 evaluator scores, drill is automatically excluded (NULL)
- Drills below minimum evaluators are flagged with warning but can use partial averaging
- Position score calculation (per session): Σ (Drill Score × Drill Weight), result is out of 100
- Overall position score: Average of all session position scores (0-100 scale)
- Example: Session score = (7.5 × 40) + (7.8 × 35) + (7.2 × 25) = 753/10 = 75.3 out of 100
- Excluded drills do NOT redistribute weights to other drills
- Bulk reconciliation actions available (e.g., "Apply Partial Averaging to All")
- All reconciliation decisions recorded with timestamp and administrator identity
- Reconciliation decisions can be changed before final report generation
- Reconciliation status displayed in quality control dashboard

```gherkin
Scenario: View incomplete evaluations requiring reconciliation
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is complete
  And 5 athletes have incomplete evaluations
  When I navigate to session "U11 Session 1" quality control report
  Then I see section "Incomplete Evaluations Requiring Reconciliation"
  And I see incomplete evaluation list:
    | Athlete | Total Scores | Expected | Missing | Affected Drills | Status |
    | Red #7 | 2 of 3 | 9 | 7 | Skating Speed (1/3 evaluators) | ⚠ Needs Reconciliation |
    | Blue #12 | 1 of 3 | 9 | 8 | Puck Control (0/3), Shooting (1/3) | ⚠ Needs Reconciliation |
    | Red #15 | 2 of 3 | 9 | 7 | Shooting (2/3 evaluators) | ⚠ Needs Reconciliation |
    | Blue #20 | 2 of 3 | 9 | 7 | Skating Speed (2/3 evaluators) | ⚠ Needs Reconciliation |
    | Red #22 | 1 of 3 | 9 | 8 | Puck Control (1/3 evaluators) | ⚠ Needs Reconciliation |
  And I see button "Reconcile Incomplete Evaluations"

Scenario: Apply partial averaging for athlete with incomplete drill scores
  Given I am logged in as an Association Administrator
  And athlete "Red #7" has incomplete evaluations:
    | Drill | Evaluator 1 | Evaluator 2 | Evaluator 3 | Weight |
    | Skating Speed | 7.0 | 8.0 | 7.5 | 40% |
    | Puck Control | 8.5 | 7.0 | Missing | 35% |
    | Shooting | 6.0 | Missing | Missing | 25% |
  When I click "Reconcile" for athlete "Red #7"
  Then I see reconciliation interface with three options
  When I select "Apply Partial Averaging (Drill-Level)"
  Then I see calculation preview:
    | Drill | Available Scores | Drill Score | Status |
    | Skating Speed | 3 of 3 | (7.0+8.0+7.5)/3 = 7.50 | ✓ All evaluators |
    | Puck Control | 2 of 3 | (8.5+7.0)/2 = 7.75 | ⚠ Partial (2/3) |
    | Shooting | 1 of 3 | 6.0/1 = 6.00 | ⚠ Partial (1/3) |
  And I see position score calculation:
    """
    Session Position Score = (7.50 × 40) + (7.75 × 35) + (6.00 × 25)
                           = 300 + 271.25 + 150
                           = 721.25 / 10
                           = 72.13 out of 100
    """
  And I see warning "2 drills scored by fewer than 3 evaluators (minimum)"
  When I click "Apply Partial Averaging"
  Then reconciliation is saved
  And athlete "Red #7" status changes to "✓ Reconciled - Partial Averaging Applied"
  And position score 72.13 is recorded with drill-level completion flags

Scenario: Mark specific drill as invalid for athlete
  Given I am logged in as an Association Administrator
  And athlete "Blue #12" has incomplete evaluations:
    | Drill | Evaluator 1 | Evaluator 2 | Evaluator 3 | Weight |
    | Skating Speed | 8.0 | 7.5 | 7.0 | 40% |
    | Puck Control | Missing | Missing | Missing | 35% |
    | Shooting | 6.0 | Missing | Missing | 25% |
  When I click "Reconcile" for athlete "Blue #12"
  And I select "Mark Drill Invalid"
  And I select drill "Puck Control" (0 evaluators)
  And I enter reason "No evaluators completed this drill - tablet malfunction"
  Then I see calculation preview:
    | Drill | Status | Included in Position Score |
    | Skating Speed | ✓ All evaluators (7.5) | Yes |
    | Puck Control | ✗ Marked Invalid | No (excluded) |
    | Shooting | ⚠ Partial (1/3) (6.0) | Yes |
  And I see position score calculation:
    """
    Session Position Score = (7.50 × 40) + (6.00 × 25)
                           = 300 + 150
                           = 450 / 10
                           = 45.0 out of 100

    Note: Puck Control (35 weight points) excluded - no weight redistribution
    Maximum possible score reduced to 65 (40 + 25)
    """
  When I click "Mark as Invalid"
  Then reconciliation is saved
  And athlete "Blue #12" status changes to "✓ Reconciled - Drill Excluded"
  And reason is recorded in audit trail

Scenario: Exclude athlete from rankings entirely
  Given I am logged in as an Association Administrator
  And athlete "Red #22" has incomplete evaluations:
    | Drill | Evaluator 1 | Evaluator 2 | Evaluator 3 |
    | Skating Speed | Missing | Missing | Missing |
    | Puck Control | 8.0 | Missing | Missing |
    | Shooting | Missing | Missing | Missing |
  When I click "Reconcile" for athlete "Red #22"
  And I select "Exclude Athlete from Rankings"
  And I enter reason "Insufficient evaluation data - athlete injured mid-session"
  Then I see confirmation dialog "Exclude Red #22 from rankings? This athlete will not receive a rank."
  When I click "Exclude Athlete"
  Then reconciliation is saved
  And athlete "Red #22" status changes to "✓ Reconciled - Excluded from Rankings"
  And athlete "Red #22" will not appear in final rankings report
  And reason is recorded in audit trail

Scenario: Bulk apply partial averaging to multiple athletes
  Given I am logged in as an Association Administrator
  And 15 athletes have incomplete evaluations due to one evaluator leaving early
  When I view "Incomplete Evaluations Requiring Reconciliation"
  And I select all 15 athletes using checkboxes
  And I click "Bulk Reconcile"
  And I select "Apply Partial Averaging to All Selected"
  Then I see confirmation dialog "Apply partial averaging to 15 athletes?"
  And I see summary "This will calculate drill scores using available evaluators (2 of 3)"
  When I click "Apply to All"
  Then all 15 athletes are reconciled using partial averaging
  And I see confirmation "15 athletes reconciled - partial averaging applied"
  And all 15 athletes show status "✓ Reconciled - Partial Averaging Applied"

Scenario: View reconciliation audit trail
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" has reconciled evaluations
  When I view session "U11 Session 1" quality control report
  Then I see section "Reconciliation History"
  And I see reconciliation decisions:
    | Athlete | Method | Affected Drills | Administrator | Timestamp | Reason |
    | Red #7 | Partial Averaging | Puck Control (2/3), Shooting (1/3) | John Admin | Nov 15, 2025 8:30 PM | N/A |
    | Blue #12 | Drill Excluded | Puck Control | John Admin | Nov 15, 2025 8:32 PM | Tablet malfunction |
    | Red #22 | Excluded from Rankings | All | John Admin | Nov 15, 2025 8:35 PM | Insufficient data |
  And I can click on any athlete to view detailed reconciliation calculation

Scenario: Change reconciliation decision before final report
  Given I am logged in as an Association Administrator
  And athlete "Red #7" was reconciled using "Partial Averaging"
  And final rankings report has not been generated yet
  When I view athlete "Red #7" reconciliation details
  And I click "Change Reconciliation Method"
  Then I see the reconciliation interface again
  When I select "Mark Drill Invalid" instead
  And I mark "Shooting" as invalid
  And I enter reason "Reconsidered - only 1 evaluator score is unreliable"
  And I click "Update Reconciliation"
  Then the reconciliation method is changed
  And athlete "Red #7" status shows "✓ Reconciled - Drill Excluded"
  And position score is recalculated
  And audit trail records both decisions with timestamps

Scenario: Cannot generate report without reconciling incomplete evaluations
  Given I am logged in as an Association Administrator
  And cohort "U11" has completed all evaluation sessions
  And 5 athletes have incomplete evaluations requiring reconciliation
  When I navigate to "Generate Rankings Report"
  And I click "Generate Report"
  Then I see validation error "Cannot generate report: 5 incomplete evaluations require reconciliation"
  And I see button "Go to Reconciliation"
  When I click "Go to Reconciliation"
  Then I am directed to the incomplete evaluations list
  And I must reconcile all 5 athletes before report generation
```

---

## 8️⃣ REPORTING & ANALYTICS

### Feature: Generate Final Rankings Report

**User Story:** As an Association Administrator, I want to generate final rankings for a cohort so that I can assign players to teams

**Business Rules:**

- Rankings calculated using overall position scores (0-100 scale)
- Session position score = Σ (Drill Score × Drill Weight) / 10, result out of 100
- Overall position score = Average of all session position scores
- Drill scores (1-10) calculated using partial averaging if incomplete (per reconciliation decisions)
- Athletes ranked from highest to lowest overall position score
- Athletes with "Withdrawn" or "Other" status excluded from rankings
- Athletes excluded during reconciliation do not appear in rankings
- Rankings include drill-level completion indicators (✓ complete, ⚠ partial)
- Warnings displayed for athletes below minimum evaluators
- Report includes reconciliation notes for incomplete evaluations
- Report shows: Rank, Player Name, Position Score, Session Count, Drill Breakdown, Warnings
- Report can be exported (PDF, CSV, Excel)
- Historical rankings preserved for each season

```gherkin
Scenario: Generate rankings report for cohort with complete data
  Given I am logged in as an Association Administrator
  And cohort "U11" has completed all evaluation sessions
  And all evaluations are complete (no missing scores)
  And all incomplete evaluations have been reconciled
  When I navigate to "Reports" and select "Generate Rankings"
  And I select cohort "U11"
  And I click "Generate Report"
  Then I see final rankings report with 100 athletes ranked
  And I see ranking table:
    | Rank | Player Name | Position Score | Sessions | Drill Breakdown | Warnings |
    | 1 | Sarah Johnson | 87.5 | 5 | Skating: 9.0, Shooting: 8.5, Positioning: 8.5 | None |
    | 2 | Mike Wong | 86.2 | 5 | Skating: 8.8, Shooting: 8.3, Positioning: 8.7 | None |
    | 3 | Emma Davis | 84.5 | 5 | Skating: 8.2, Shooting: 8.7, Positioning: 8.4 | None |
    | ... | ... | ... | ... | ... | ... |
  And I can export report as PDF, CSV, or Excel

Scenario: Rankings include drill-level completion indicators
  Given I am logged in as an Association Administrator
  And I generate rankings for cohort "U11"
  And athlete "John Smith" (Rank 12) has partial evaluations:
    | Drill | Evaluators | Status |
    | Skating Speed | 3 of 3 | ✓ Complete |
    | Puck Control | 2 of 3 | ⚠ Partial |
    | Shooting | 1 of 3 | ⚠ Partial |
  When I view "John Smith" in the rankings report
  Then I see position score "72.1"
  And I see drill breakdown with completion indicators:
    | Drill | Score | Weight | Status |
    | Skating Speed | 7.50 | 40 | ✓ All evaluators (3/3) |
    | Puck Control | 7.75 | 35 | ⚠ Partial (2/3 evaluators) |
    | Shooting | 6.00 | 25 | ⚠ Partial (1/3 evaluators) |
  And I see warning "2 drills scored by fewer than 3 evaluators"

Scenario: Exclude withdrawn and "Other" status athletes from rankings
  Given I am logged in as an Association Administrator
  And cohort "U11" has 103 registered players
  And 100 players have status "Active"
  And 2 players have status "Withdrawn"
  And 1 player has status "Other" with reason "Injured"
  When I generate rankings report for cohort "U11"
  Then I see 100 athletes ranked (only "Active" players)
  And withdrawn and "Other" status players are excluded
  And I see note "3 players excluded from rankings (2 Withdrawn, 1 Other)"

Scenario: Display reconciliation notes for incomplete evaluations
  Given I am logged in as an Association Administrator
  And athlete "Red #22" was reconciled using "Exclude Athlete from Rankings"
  And athlete "Blue #12" was reconciled with "Drill Excluded" (Puck Control)
  And athlete "Red #7" was reconciled with "Partial Averaging Applied"
  When I generate rankings report
  Then athlete "Red #22" does not appear in rankings
  And athlete "Blue #12" appears with note "Drill excluded: Puck Control (reason: Tablet malfunction)"
  And athlete "Red #7" appears with note "Partial averaging applied: Puck Control (2/3), Shooting (1/3)"

Scenario: Export rankings report
  Given I am logged in as an Association Administrator
  And I have generated rankings for cohort "U11"
  When I click "Export Report"
  Then I see export options: PDF, CSV, Excel
  When I select "PDF"
  Then a PDF file is generated with:
    - Association logo and name
    - Report title "U11 Final Rankings - Season 2025-26"
    - Generation date and time
    - Full ranking table with all columns
    - Drill-level completion indicators
    - Warnings and reconciliation notes
    - Administrator name and signature line
  And the PDF downloads to my device
```

---

### Feature: View Athlete Evaluation Details

**User Story:** As an Association Administrator, I want to view detailed evaluation data for an athlete so that I can understand their ranking

**Business Rules:**

- Athlete detail page shows all session scores across all waves
- Shows individual evaluator scores by drill (anonymized or named based on settings)
- Displays position score calculation with drill weights
- Shows session-by-session performance trends
- Includes quality control flags (outliers, partial evaluations, below minimum evaluators)
- Shows jersey number and team assignment for each session
- Displays reconciliation decisions if applicable
- Can be accessed from rankings report or player management

```gherkin
Scenario: View athlete evaluation summary
  Given I am logged in as an Association Administrator
  And athlete "John Smith" participated in 5 evaluation sessions
  When I navigate to "Players" and search for "John Smith"
  And I click "View Evaluation Details"
  Then I see athlete summary:
    | Field | Value |
    | Name | John Smith |
    | Cohort | U11 |
    | Position | Forward |
    | Previous Level | B |
    | Sessions Participated | 5 of 5 |
    | Overall Position Score | 74.5 |
    | Final Rank | 35 of 100 |
  And I see session-by-session breakdown

Scenario: View session-by-session performance
  Given I am logged in as an Association Administrator
  And I am viewing evaluation details for "John Smith"
  Then I see session breakdown:
    | Session | Date | Jersey | Evaluators | Drills Scored | Session Score | Status |
    | U11 Session 1 | Nov 15, 2025 | Team 1, Red #7 | 3 | 3 of 3 | 75.0 | ✓ Complete |
    | U11 Session 2 | Nov 22, 2025 | Team 2, Blue #12 | 3 | 3 of 3 | 73.0 | ✓ Complete |
    | U11 Session 3 | Nov 29, 2025 | Team 1, Red #5 | 3 | 3 of 3 | 75.5 | ✓ Complete |
    | U11 Session 4 | Dec 6, 2025 | Team 2, Blue #8 | 2 | 3 of 3 | 74.0 | ⚠ 2 evaluators |
    | U11 Session 5 | Dec 13, 2025 | Team 1, Red #10 | 3 | 3 of 3 | 75.0 | ✓ Complete |
  And I see average session score "74.5"

Scenario: View drill-level scores across all sessions
  Given I am logged in as an Association Administrator
  And I am viewing evaluation details for "John Smith"
  When I click "Drill Breakdown"
  Then I see scores by drill across all sessions:
    | Drill | Session 1 | Session 2 | Session 3 | Session 4 | Session 5 | Average | Weight |
    | Skating Speed | 7.5 | 7.0 | 7.8 | 7.2 | 7.6 | 7.42 | 40 |
    | Puck Control | 7.8 | 7.5 | 7.3 | 7.5 | 7.4 | 7.50 | 35 |
    | Shooting | 7.2 | 7.5 | 7.5 | 7.6 | 7.5 | 7.46 | 25 |
  And I see overall position score "74.5" (average of 5 session scores)

Scenario: View individual evaluator scores for specific session and drill
  Given I am logged in as an Association Administrator
  And I am viewing evaluation details for "John Smith"
  And session "U11 Session 1" had 3 evaluators
  When I click on "U11 Session 1" → "Skating Speed"
  Then I see individual evaluator scores:
    | Evaluator | Score | Timestamp | Outlier Flag |
    | Evaluator A | 7.0 | Nov 15, 2025 7:15 PM | Normal |
    | Evaluator B | 8.0 | Nov 15, 2025 7:18 PM | Normal |
    | Evaluator C | 7.5 | Nov 15, 2025 7:20 PM | Normal |
  And I see drill average "7.50"

Scenario: View quality control flags in athlete details
  Given I am logged in as an Association Administrator
  And athlete "John Smith" has quality control issues:
    - Session 4: Only 2 of 3 evaluators
    - Session 2: 1 outlier score on "Shooting" drill
    - Session 5: Partial averaging applied on "Puck Control"
  When I view evaluation details for "John Smith"
  Then I see quality control section:
    | Session | Issue | Details |
    | Session 4 | ⚠ Below minimum evaluators | 2 of 3 evaluators (minimum: 3) |
    | Session 2 | ⚠ Outlier detected | Shooting drill: 1 score flagged |
    | Session 5 | ⚠ Partial evaluation | Puck Control: 2 of 3 evaluators |
  And I can click on each issue to view details
```

---

### Feature: Compare Athletes Side-by-Side

**User Story:** As an Association Administrator, I want to compare multiple athletes side-by-side so that I can make informed team placement decisions

**Business Rules:**

- Compare up to 4 athletes simultaneously
- Shows position scores, drill breakdowns, and session performance
- Highlights differences in performance areas
- Displays quality control warnings for each athlete
- Can select athletes from rankings or search by name
- Comparison can be exported (PDF, Excel)

```gherkin
Scenario: Compare two athletes side-by-side
  Given I am logged in as an Association Administrator
  And I am viewing rankings for cohort "U11"
  When I select athletes "John Smith" (Rank 35) and "Sarah Lee" (Rank 36)
  And I click "Compare Athletes"
  Then I see side-by-side comparison:
    | Metric | John Smith | Sarah Lee |
    | Rank | 35 of 100 | 36 of 100 |
    | Position Score | 74.5 | 74.2 |
    | Sessions | 5 of 5 | 5 of 5 |
    | Skating Speed | 7.42 (40) | 7.80 (40) |
    | Puck Control | 7.50 (35) | 7.10 (35) |
    | Shooting | 7.46 (25) | 7.20 (25) |
    | Previous Level | B | C |
    | Warnings | 1 (below min evaluators) | None |
  And I see Sarah Lee has higher "Skating Speed" score highlighted
  And I see John Smith has higher "Puck Control" and "Shooting" scores highlighted

Scenario: Compare athletes across multiple drills
  Given I am logged in as an Association Administrator
  And I am comparing 3 athletes
  When I view the drill breakdown comparison
  Then I see visual chart comparing drill scores:
    - Bar chart showing each drill side-by-side
    - Color-coded bars for each athlete
    - Drill weights displayed
    - Highest score per drill highlighted
  And I can identify strengths and weaknesses at a glance

Scenario: Export athlete comparison
  Given I am logged in as an Association Administrator
  And I have compared 4 athletes
  When I click "Export Comparison"
  And I select "PDF"
  Then a PDF is generated with:
    - All 4 athletes side-by-side
    - Position scores and rankings
    - Drill-level breakdown with visual charts
    - Quality control warnings
    - Previous level and position type
    - Generation date and administrator name
```

---

### Feature: View Session Performance Analytics

**User Story:** As an Association Administrator, I want to view session-level analytics so that I can assess evaluation quality and consistency

**Business Rules:**

- Session analytics show score distribution, evaluator consistency, and completion rates
- Displays outlier count and percentage by session
- Shows evaluator-by-evaluator performance (score ranges, outlier rates)
- Includes drill-level statistics (average scores, standard deviation)
- Compares sessions within same cohort to identify anomalies
- Can drill down into specific issues (outliers, incomplete evaluations)

```gherkin
Scenario: View session performance summary
  Given I am logged in as an Association Administrator
  And session "U11 Session 1" is complete
  When I navigate to "Session Analytics" for "U11 Session 1"
  Then I see session summary:
    | Metric | Value |
    | Athletes Evaluated | 25 |
    | Evaluators | 3 |
    | Total Scores Entered | 225 (100%) |
    | Average Session Position Score | 73.5 |
    | Score Range | 52.0 - 91.0 |
    | Outliers Detected | 8 (3.6%) |
    | Athletes Below Min Evaluators | 0 |
    | Incomplete Evaluations | 0 |

Scenario: View evaluator consistency metrics
  Given I am logged in as an Association Administrator
  And I am viewing analytics for "U11 Session 1"
  When I click "Evaluator Consistency"
  Then I see evaluator breakdown:
    | Evaluator | Scores Entered | Avg Score Given | Score Range | Outliers | Consistency Rating |
    | Evaluator A | 75 | 7.2 | 5.0 - 9.0 | 2 (2.7%) | High |
    | Evaluator B | 75 | 7.4 | 6.0 - 9.5 | 1 (1.3%) | High |
    | Evaluator C | 75 | 7.5 | 5.5 - 10.0 | 5 (6.7%) | Medium |
  And I see note "Evaluator C has higher outlier rate - review recommended"

Scenario: Compare sessions within cohort
  Given I am logged in as an Association Administrator
  And cohort "U11" has completed 5 sessions
  When I navigate to "Cohort Analytics" for "U11"
  Then I see session comparison:
    | Session | Athletes | Avg Score | Score Range | Outliers | Incomplete |
    | Session 1 | 25 | 73.5 | 52.0 - 91.0 | 8 (3.6%) | 0 |
    | Session 2 | 25 | 72.8 | 58.0 - 89.0 | 5 (2.2%) | 2 |
    | Session 3 | 25 | 74.2 | 60.0 - 92.0 | 12 (5.3%) | 1 |
    | Session 4 | 25 | 73.0 | 55.0 - 90.0 | 6 (2.7%) | 0 |
    | Session 5 | 25 | 74.0 | 62.0 - 93.0 | 7 (3.1%) | 3 |
  And I see cohort average "73.5"
  And I can click on any session to view detailed analytics
```

---

## 9️⃣ SYSTEM ADMINISTRATION & MAINTENANCE

### Feature: Manage Association Accounts

**User Story:** As a System Administrator, I want to create and manage association accounts so that organizations can use the platform independently

**Business Rules:**

- Each association is a separate tenant with isolated data
- Association requires: Name, Sport Type, Contact Email
- Associations have unique identifiers (slug/subdomain)
- Associations can be active or inactive (deactivated accounts retain data but block access)
- Cannot delete associations (only deactivate for data preservation)
- Sport type assigned during creation (cannot be changed after creation)
- System tracks creation date, last activity, and user count per association

```gherkin
Scenario: Create new association account
  Given I am logged in as a System Administrator
  When I navigate to "Associations"
  And I click "Create New Association"
  Then I see a form with fields:
    | Field | Required | Example |
    | Association Name | Yes | Los Angeles Minor Hockey |
    | Sport Type | Yes | Hockey |
    | Contact Email | Yes | admin@laminorhockey.com |
    | Subdomain | Yes | la-hockey |
  When I enter "Los Angeles Minor Hockey" as association name
  And I select "Hockey" as sport type
  And I enter "admin@laminorhockey.com" as contact email
  And I enter "la-hockey" as subdomain
  And I click "Create Association"
  Then a new association account is created
  And I see confirmation "Los Angeles Minor Hockey created successfully"
  And the association has status "Active"
  And an invitation is automatically sent to "admin@laminorhockey.com" with role "Association Administrator"
  And the association appears in the associations list

Scenario: View all associations
  Given I am logged in as a System Administrator
  And multiple associations exist
  When I navigate to "Associations"
  Then I see a list of all associations with:
    | Column | Example |
    | Name | Los Angeles Minor Hockey |
    | Sport Type | Hockey |
    | Status | Active |
    | Created Date | Oct 15, 2025 |
    | Last Activity | Nov 5, 2025 |
    | User Count | 12 |
    | Active Seasons | 1 |
  And I can filter by sport type, status, or search by name
  And I can sort by name, created date, or last activity

Scenario: Edit association details
  Given I am logged in as a System Administrator
  And association "Los Angeles Minor Hockey" exists
  When I navigate to "Associations"
  And I click "Edit" next to Los Angeles Minor Hockey
  Then I see editable fields:
    | Field | Current Value | Editable |
    | Association Name | Los Angeles Minor Hockey | Yes |
    | Sport Type | Hockey | No (locked) |
    | Contact Email | admin@laminorhockey.com | Yes |
    | Subdomain | la-hockey | No (locked) |
  When I change association name to "LA Minor Hockey Association"
  And I change contact email to "contact@laminorhockey.com"
  And I click "Save Changes"
  Then the association details are updated
  And I see confirmation "Association updated successfully"

Scenario: Deactivate association account
  Given I am logged in as a System Administrator
  And association "Los Angeles Minor Hockey" has status "Active"
  And the association has 12 active users and 1 active season
  When I navigate to "Associations"
  And I click "Deactivate" next to Los Angeles Minor Hockey
  Then I see a warning dialog:
    """
    Deactivate Los Angeles Minor Hockey?
    - All 12 users will lose access immediately
    - Active season will be frozen (no new evaluations)
    - Historical data will be preserved (read-only)
    - Reactivation is possible
    """
  When I click "Confirm Deactivation"
  Then the association status changes to "Inactive"
  And all users from that association are blocked from login
  And I see confirmation "Los Angeles Minor Hockey deactivated. Data preserved."

Scenario: Reactivate deactivated association
  Given I am logged in as a System Administrator
  And association "Los Angeles Minor Hockey" has status "Inactive"
  When I navigate to "Associations"
  And I click "Reactivate" next to Los Angeles Minor Hockey
  Then I see a confirmation dialog "Reactivate Los Angeles Minor Hockey? All users will regain access."
  When I click "Confirm"
  Then the association status changes to "Active"
  And all previously active users regain access
  And I see confirmation "Los Angeles Minor Hockey reactivated successfully"

Scenario: Prevent duplicate subdomain
  Given I am logged in as a System Administrator
  And association with subdomain "la-hockey" already exists
  When I attempt to create a new association with subdomain "la-hockey"
  Then I see an error "Subdomain 'la-hockey' is already in use. Please choose a unique subdomain."
  And the association is not created
```

---

### Feature: Manage System Users

**User Story:** As a System Administrator, I want to invite and manage system-level users so that association staff can access Evalu8 with the correct permissions.

**Business Rules:**

- Only users with the "System Administrator" role can invite system users.
- Invitations send an automated email prompting the recipient to sign in with Google.
- First name and last name are captured separately and stored as "Last, First" for roster alignment.
- An association and at least one association role must be assigned at invite time.
- Re-inviting an existing email updates roles and association membership without sending duplicate invites.
- System roles and association roles are activated immediately after invite completion.

```gherkin
Scenario: Invite a brand-new system user
  Given I am logged in as a System Administrator
  And I navigate to "System Users"
  When I click "Add user"
  And I enter "rivera.alex@example.com" for email
  And I enter "Rivera" for last name
  And I enter "Alex" for first name
  And I select association "Selkirk Minor Hockey"
  And I assign association role "Administrator"
  And I assign system role "System Administrator"
  And I click "Send invitation"
  Then the system sends an email invitation to "rivera.alex@example.com"
  And the invite instructs the recipient to sign in with Google to activate their access
  And the user appears in the System Users table with status "Active"
  And I see confirmation "Invitation sent and system access configured."

Scenario: Update roles for an existing system user
  Given "lee.taylor@example.com" already exists in Auth and System Users
  And I am logged in as a System Administrator
  When I click "Add user"
  And I enter "lee.taylor@example.com" for email
  And I enter "Lee" for last name
  And I enter "Taylor" for first name
  And I select association "Los Angeles Minor Hockey"
  And I assign association role "Evaluator"
  And I click "Send invitation"
  Then no duplicate invitation email is sent
  And the system updates Lee Taylor's association roles and membership
  And I see confirmation "User already exists; system access updated."

Scenario: Prevent invite without required fields
  Given I am logged in as a System Administrator
  When I click "Add user"
  And I leave the last name field blank
  And I click "Send invitation"
  Then I see an inline error "Last name is required."
  And the invitation is not sent
  When I enter "Morgan" for last name
  And I leave the association selection blank
  And I click "Send invitation"
  Then I see an inline error "Association selection is required."
  And the invitation is not sent
```

---

### Feature: Configure Sport Types for Associations

**User Story:** As a System Administrator, I want to configure sport types so that associations can select appropriate sports for their evaluations

**Business Rules:**

- System supports multiple sport types (Hockey, Basketball, Soccer, Baseball, etc.)
- Sport types are system-wide (managed by System Administrator)
- Each sport type has: Name, Active/Inactive status
- Sport type assigned to association during creation (cannot be changed)
- Cannot delete sport types (only deactivate)
- Inactive sport types cannot be assigned to new associations
- Existing associations retain access to their sport type even if deactivated

```gherkin
Scenario: Create new sport type
  Given I am logged in as a System Administrator
  When I navigate to "Sport Types"
  And I click "Create Sport Type"
  Then I see a form with field "Sport Name"
  When I enter "Baseball" as sport name
  And I click "Create"
  Then a new sport type "Baseball" is created with status "Active"
  And I see confirmation "Sport type 'Baseball' created successfully"
  And "Baseball" appears in the sport types list

Scenario: View all sport types
  Given I am logged in as a System Administrator
  And sport types "Hockey", "Basketball", "Baseball" exist
  When I navigate to "Sport Types"
  Then I see a list of all sport types:
    | Sport Name | Status | Associations Using | Created Date |
    | Hockey | Active | 5 | Oct 1, 2025 |
    | Basketball | Active | 3 | Oct 1, 2025 |
    | Baseball | Inactive | 2 | Oct 5, 2025 |
  And I can filter by status (Active/Inactive)

Scenario: Deactivate sport type
  Given I am logged in as a System Administrator
  And sport type "Baseball" has status "Active"
  And 2 associations are using "Baseball"
  When I navigate to "Sport Types"
  And I click "Deactivate" next to Baseball
  Then I see a warning dialog:
    """
    Deactivate Baseball?
    - Cannot be assigned to new associations
    - 2 existing associations retain access
    - Can be reactivated later
    """
  When I click "Confirm"
  Then sport type "Baseball" status changes to "Inactive"
  And I see confirmation "Baseball deactivated. Existing associations unaffected."
  And "Baseball" no longer appears in sport type dropdown for new associations

Scenario: Reactivate sport type
  Given I am logged in as a System Administrator
  And sport type "Baseball" has status "Inactive"
  When I navigate to "Sport Types"
  And I click "Reactivate" next to Baseball
  Then I see confirmation dialog "Reactivate Baseball? It will be available for new associations."
  When I click "Confirm"
  Then sport type "Baseball" status changes to "Active"
  And "Baseball" appears in sport type dropdown for new associations
  And I see confirmation "Baseball reactivated successfully"

Scenario: Prevent duplicate sport type names
  Given I am logged in as a System Administrator
  And sport type "Hockey" already exists
  When I attempt to create a new sport type named "Hockey"
  Then I see an error "Sport type 'Hockey' already exists"
  And the sport type is not created
```

---

### Feature: Monitor System Performance and Uptime

**User Story:** As a System Administrator, I want to monitor system uptime and performance so that SLAs are met (99.5% target)

**Business Rules:**

- System tracks uptime, response times, error rates, concurrent users
- SLA target: 99.5% uptime during evaluation season
- Performance target: Page loads under 2 seconds
- Capacity target: Support 10-20 concurrent evaluators across 3-5 sessions
- Real-time dashboards show current system health
- Automated alerts for performance degradation or downtime
- Historical metrics stored for trend analysis
- Monthly uptime reports generated automatically

```gherkin
Scenario: View real-time system health dashboard
  Given I am logged in as a System Administrator
  When I navigate to "System Health"
  Then I see real-time metrics:
    | Metric | Current Value | Target | Status |
    | System Uptime (30 days) | 99.7% | 99.5% | ✓ On Target |
    | Current Active Users | 45 | N/A | Normal |
    | Concurrent Evaluators | 12 | 10-20 | ✓ Within Capacity |
    | Active Sessions | 4 | 3-5 | ✓ Within Capacity |
    | Avg Response Time | 1.2s | <2s | ✓ On Target |
    | Error Rate (24h) | 0.3% | <1% | ✓ Normal |
    | Database Load | 65% | <80% | Normal |
    | Storage Used | 42 GB | 100 GB | Normal |
  And metrics auto-refresh every 30 seconds

Scenario: Receive alert for performance degradation
  Given I am logged in as a System Administrator
  And I have configured alert thresholds
  When average response time exceeds 3 seconds for 5 minutes
  Then I receive an email alert:
    """
    PERFORMANCE ALERT: Response Time Degraded
    Current Avg: 3.2 seconds (Target: <2 seconds)
    Duration: 5 minutes
    Affected Endpoints: /api/evaluations/score
    Concurrent Users: 55
    Action Required: Investigate database queries or scale resources
    """
  And I see a warning banner in the system health dashboard
  And the alert is logged in the alerts history

Scenario: View historical performance trends
  Given I am logged in as a System Administrator
  When I navigate to "System Health" > "Performance History"
  And I select date range "Last 30 days"
  Then I see charts showing:
    | Chart | Data Points |
    | Uptime % (daily) | 30 data points, one per day |
    | Avg Response Time (hourly) | 720 data points |
    | Concurrent Users (peak per day) | 30 data points |
    | Error Rate (daily) | 30 data points |
  And I can identify peak usage times (e.g., evenings 6-9 PM)
  And I can spot performance degradation patterns

Scenario: Generate monthly uptime report
  Given I am logged in as a System Administrator
  And the month of October 2025 has ended
  When I navigate to "System Health" > "Reports"
  And I select "October 2025 Uptime Report"
  Then I see a report with:
    | Metric | Value |
    | Total Uptime | 99.6% |
    | Total Downtime | 2.9 hours |
    | Downtime Incidents | 2 |
    | Avg Response Time | 1.4s |
    | Peak Concurrent Users | 68 (Oct 15, 8:00 PM) |
    | Total API Requests | 1.2M |
    | Error Rate | 0.4% |
  And I see incident details:
    | Date | Duration | Cause | Resolution |
    | Oct 8 | 45 min | Database maintenance | Scheduled |
    | Oct 22 | 2 hours | Server outage | Hardware replacement |
  And I can export the report to PDF

Scenario: Configure performance alert thresholds
  Given I am logged in as a System Administrator
  When I navigate to "System Health" > "Alert Settings"
  Then I see configurable thresholds:
    | Alert Type | Default Threshold | My Threshold |
    | Response Time | >2s for 5 min | >3s for 5 min |
    | Error Rate | >1% for 10 min | >2% for 10 min |
    | Uptime | <99.5% monthly | <99% monthly |
    | Concurrent Users | >100 | >80 |
  When I change "Response Time" threshold to ">2.5s for 3 min"
  And I click "Save Settings"
  Then alert thresholds are updated
  And future alerts use the new thresholds
```

---

### Feature: Backup Data with 10-Year Retention

**User Story:** As a System Administrator, I want to backup data with 10-year retention so that historical records are preserved

**Business Rules:**

- Automated daily backups of all association data
- 10-year retention policy for all evaluation data
- Backups include: Players, Sessions, Evaluations, Scores, Reports, Users
- Point-in-time restore capability
- Backups stored in geographically separate location
- Backup integrity verified automatically
- Restore operations logged and audited
- Read-only access to historical data after season completion

```gherkin
Scenario: Automated daily backup execution
  Given the system is configured for daily backups at 3:00 AM
  When the backup process runs on Nov 6, 2025
  Then the system backs up all data for all associations:
    | Data Type | Records Backed Up |
    | Associations | 8 |
    | Users | 156 |
    | Seasons | 12 |
    | Players | 1,250 |
    | Sessions | 85 |
    | Evaluations | 18,750 |
    | Scores | 56,250 |
  And backup is stored with filename "backup-2025-11-06-03-00.sql"
  And backup integrity is verified
  And backup metadata is logged:
    | Backup Date | Size | Duration | Status | Location |
    | Nov 6, 2025 3:00 AM | 2.3 GB | 12 min | Success | us-west-backup |
  And System Administrators receive confirmation email

Scenario: View backup history
  Given I am logged in as a System Administrator
  When I navigate to "System" > "Backups"
  Then I see a list of all backups:
    | Date | Size | Status | Retention Until | Actions |
    | Nov 6, 2025 | 2.3 GB | Success | Nov 6, 2035 | Restore, Download |
    | Nov 5, 2025 | 2.2 GB | Success | Nov 5, 2035 | Restore, Download |
    | Nov 4, 2025 | 2.1 GB | Success | Nov 4, 2035 | Restore, Download |
  And I can filter by date range or status
  And I see total storage used by backups: 682 GB

Scenario: Restore data from backup (specific association)
  Given I am logged in as a System Administrator
  And association "LA Minor Hockey" accidentally deleted critical data on Nov 5, 2025
  And a backup from Nov 4, 2025 exists
  When I navigate to "System" > "Backups"
  And I click "Restore" next to Nov 4, 2025 backup
  Then I see restore options:
    - Restore all data (full system restore)
    - Restore specific association
  When I select "Restore specific association"
  And I select "LA Minor Hockey"
  And I select restore point "Nov 4, 2025 11:59 PM"
  And I click "Confirm Restore"
  Then I see a warning:
    """
    WARNING: This will replace current LA Minor Hockey data with Nov 4 backup.
    Current data will be archived before restoration.
    Estimated time: 5 minutes
    """
  When I click "Proceed"
  Then the system:
    - Archives current LA Minor Hockey data
    - Restores LA Minor Hockey data from Nov 4 backup
    - Logs restore operation with details
  And I see confirmation "LA Minor Hockey restored successfully from Nov 4, 2025"
  And users from LA Minor Hockey can access their restored data

Scenario: Backup integrity verification failure
  Given the system runs daily backup verification
  When backup "backup-2025-11-06-03-00.sql" fails integrity check
  Then the system immediately:
    - Logs the failure with details
    - Sends critical alert to System Administrators
    - Attempts backup again
    - Displays error in backup dashboard
  And I receive alert email:
    """
    CRITICAL: Backup Integrity Check Failed
    Backup: Nov 6, 2025 3:00 AM
    Issue: Checksum mismatch detected
    Status: Automatic retry scheduled for 4:00 AM
    Action Required: Monitor retry status and investigate if retry fails
    """

Scenario: View 10-year historical data retention
  Given I am logged in as a System Administrator
  And association "LA Minor Hockey" has completed seasons from 2020-2025
  When I navigate to "System" > "Data Retention"
  Then I see retention status for all associations:
    | Association | Oldest Data | Total Size | Retention Until | Status |
    | LA Minor Hockey | Season 2020 | 15 GB | Oct 2030 | Active |
    | Selkirk Minor | Season 2021 | 12 GB | Nov 2031 | Active |
  And I see confirmation "All data within 10-year retention policy"
  And data older than 10 years is automatically archived (not deleted)
```

---

### Feature: View Usage Analytics by Association

**User Story:** As a System Administrator, I want to view usage analytics by association so that capacity planning is informed

**Business Rules:**

- Track usage metrics per association: Active users, sessions, evaluations, storage
- Real-time and historical analytics available
- Identify peak usage times for capacity planning
- Track growth trends (users, data, activity)
- Export analytics for reporting
- Compare associations to identify outliers
- Forecast capacity needs based on trends

```gherkin
Scenario: View association usage summary
  Given I am logged in as a System Administrator
  And multiple associations are active
  When I navigate to "Analytics" > "Association Usage"
  Then I see a summary table:
    | Association | Active Users | Active Seasons | Total Players | Total Sessions (30d) | Storage Used | Last Activity |
    | LA Minor Hockey | 12 | 1 | 125 | 25 | 4.2 GB | Nov 6, 2025 8:30 PM |
    | Selkirk Minor | 8 | 1 | 85 | 15 | 2.8 GB | Nov 6, 2025 7:15 PM |
    | Calgary Youth | 15 | 2 | 200 | 40 | 6.5 GB | Nov 5, 2025 9:00 PM |
  And I can sort by any column
  And I can filter by sport type or activity date

Scenario: View detailed analytics for specific association
  Given I am logged in as a System Administrator
  When I navigate to "Analytics" > "Association Usage"
  And I click on "LA Minor Hockey"
  Then I see detailed analytics:
    | Metric | Value |
    | Total Users | 12 |
    | Active Users (30d) | 10 |
    | Association Admins | 2 |
    | Evaluators | 8 |
    | Intake Personnel | 2 |
    | Total Seasons | 3 (1 active, 2 completed) |
    | Total Players | 125 |
    | Total Sessions (current season) | 25 |
    | Total Evaluations | 1,875 |
    | Total Scores | 5,625 |
    | Storage Used | 4.2 GB |
    | Avg Session Duration | 2.5 hours |
    | Peak Concurrent Evaluators | 8 (Nov 3, 7:30 PM) |
  And I see charts for:
    - User activity over time (30 days)
    - Sessions per week
    - Storage growth trend

Scenario: Identify peak usage times across all associations
  Given I am logged in as a System Administrator
  When I navigate to "Analytics" > "System Usage Trends"
  And I select "Last 30 Days"
  Then I see a heatmap showing peak usage:
    | Day of Week | Peak Hour | Concurrent Users | Active Sessions |
    | Monday | 6:00-8:00 PM | 45 | 5 |
    | Tuesday | 6:00-8:00 PM | 38 | 4 |
    | Wednesday | 7:00-9:00 PM | 52 | 6 |
    | Saturday | 9:00-11:00 AM | 35 | 4 |
  And I see note "Peak usage: Wednesday evenings 7-9 PM (52 concurrent users)"
  And I can use this data to plan infrastructure scaling

Scenario: Forecast capacity needs
  Given I am logged in as a System Administrator
  And historical data shows 20% user growth per season
  When I navigate to "Analytics" > "Capacity Planning"
  Then I see forecasts:
    | Metric | Current (Nov 2025) | Forecast (Mar 2026) | Forecast (Nov 2026) |
    | Total Users | 156 | 185 | 220 |
    | Peak Concurrent Users | 68 | 80 | 95 |
    | Storage Used | 45 GB | 60 GB | 80 GB |
    | Associations | 8 | 10 | 12 |
  And I see recommendations:
    - "Current infrastructure can support up to 150 concurrent users"
    - "Storage capacity sufficient until Q3 2026"
    - "Consider database scaling by Q2 2026"

Scenario: Export usage analytics
  Given I am logged in as a System Administrator
  When I navigate to "Analytics" > "Association Usage"
  And I click "Export Analytics"
  Then I see export options:
    - CSV (tabular data)
    - PDF (formatted report with charts)
  When I select "PDF"
  And I click "Export"
  Then a PDF report is generated with:
    - Summary table of all associations
    - Usage trends charts
    - Peak usage analysis
    - Capacity forecast
    - Generated date and System Administrator name
```

---

### Feature: Audit Logs for Security Events

**User Story:** As a System Administrator, I want to audit logs for security events so that breaches are detected

**Business Rules:**

- Log all security-relevant events: Logins, data access, configuration changes, exports
- Each log entry includes: Timestamp, User, Association, Action, Resource, IP Address, Status
- Logs retained for 10 years
- Real-time security alerts for suspicious activity
- Filter and search capabilities for investigation
- Export logs for compliance reporting
- Automated anomaly detection (e.g., multiple failed logins)

```gherkin
Scenario: View security audit log
  Given I am logged in as a System Administrator
  When I navigate to "Security" > "Audit Log"
  Then I see a chronological log of security events:
    | Timestamp | User | Association | Event Type | Action | Resource | IP Address | Status |
    | Nov 6, 8:45 PM | john@email.com | LA Minor Hockey | DATA_ACCESS | View Report | Rankings Report | 192.168.1.10 | Success |
    | Nov 6, 8:30 PM | sarah@email.com | Selkirk Minor | AUTHENTICATION | Login | N/A | 10.0.0.5 | Success |
    | Nov 6, 8:15 PM | admin@email.com | LA Minor Hockey | CONFIG_CHANGE | Edit Session | Session ID 45 | 192.168.1.10 | Success |
    | Nov 6, 8:00 PM | unknown | N/A | AUTHENTICATION | Failed Login | N/A | 203.45.67.89 | Failed |
  And I can filter by event type, user, association, or date range
  And I can search by IP address or resource

Scenario: Track user login history
  Given I am logged in as a System Administrator
  When I navigate to "Security" > "Audit Log"
  And I filter by event type "AUTHENTICATION"
  Then I see all login attempts:
    | Timestamp | User | Association | Status | IP Address | Device |
    | Nov 6, 8:30 PM | sarah@email.com | Selkirk Minor | Success | 10.0.0.5 | Chrome/Windows |
    | Nov 6, 7:15 PM | john@email.com | LA Minor Hockey | Success | 192.168.1.10 | Safari/macOS |
    | Nov 6, 6:45 PM | unknown | N/A | Failed | 203.45.67.89 | Unknown |
    | Nov 6, 6:40 PM | unknown | N/A | Failed | 203.45.67.89 | Unknown |
  And I can identify suspicious patterns (e.g., multiple failed logins from same IP)

Scenario: Detect and alert on suspicious activity
  Given the system monitors audit logs for anomalies
  When user "john@email.com" has 5 failed login attempts within 10 minutes
  Then the system:
    - Logs the pattern as "SUSPICIOUS_ACTIVITY"
    - Sends alert email to System Administrators
    - Temporarily locks the account for 15 minutes
    - Logs the lockout event
  And I receive alert:
    """
    SECURITY ALERT: Multiple Failed Login Attempts
    User: john@email.com
    Association: LA Minor Hockey
    Failed Attempts: 5 in 10 minutes
    IP Address: 203.45.67.89
    Action Taken: Account temporarily locked (15 min)
    """

Scenario: Track data export activities
  Given I am logged in as a System Administrator
  When I navigate to "Security" > "Audit Log"
  And I filter by event type "DATA_EXPORT"
  Then I see all export activities:
    | Timestamp | User | Association | Export Type | Resource | Status |
    | Nov 6, 5:00 PM | admin@email.com | LA Minor Hockey | PDF | Rankings Report | Success |
    | Nov 5, 3:30 PM | admin@email.com | LA Minor Hockey | CSV | Player List | Success |
    | Nov 4, 2:15 PM | evaluator@email.com | Selkirk Minor | PDF | Session Report | Success |
  And I can verify no unauthorized data exports occurred

Scenario: Track configuration changes
  Given I am logged in as a System Administrator
  When I navigate to "Security" > "Audit Log"
  And I filter by event type "CONFIG_CHANGE"
  Then I see all configuration changes:
    | Timestamp | User | Association | Action | Resource | Old Value | New Value |
    | Nov 6, 4:00 PM | admin@email.com | LA Minor Hockey | Edit Drill | Drill "Skating Speed" | Weight: 30 | Weight: 40 |
    | Nov 5, 10:00 AM | admin@email.com | LA Minor Hockey | Create Cohort | Cohort "U13" | N/A | Created |
    | Nov 4, 2:00 PM | sysadmin@email.com | System | Deactivate Sport | Sport "Baseball" | Active | Inactive |
  And I can trace who made what changes and when

Scenario: Export audit logs for compliance
  Given I am logged in as a System Administrator
  When I navigate to "Security" > "Audit Log"
  And I select date range "Oct 1 - Oct 31, 2025"
  And I click "Export Logs"
  Then I see export options: CSV, JSON
  When I select "CSV"
  And I click "Export"
  Then a CSV file is downloaded with all audit log entries for October 2025
  And the export includes all columns: Timestamp, User, Association, Event Type, Action, Resource, IP Address, Status
  And the export action itself is logged in the audit log
```

---

## Document Status

- ✅ Stage 1: SETUP & CONFIGURATION - Complete (6 features)
- ✅ Stage 2: PLAYER REGISTRATION & COHORT MANAGEMENT - Complete (6 features)
- ✅ Stage 3: SESSION SCHEDULING & CONFIGURATION - Complete (5 features)
- ✅ Stage 4: PLAYER DISTRIBUTION & WAVE MANAGEMENT - Complete (6 features)
- ✅ Stage 5: SESSION INTAKE & CHECK-IN - Complete (1 feature)
- ✅ Stage 6: REAL-TIME PLAYER EVALUATION - Complete (5 features)
- ✅ Stage 7: QUALITY CONTROL & VALIDATION - Complete (4 features)
- ✅ Stage 8: REPORTING & ANALYTICS - Complete (4 features)
- ✅ Stage 9: SYSTEM ADMINISTRATION & MAINTENANCE - Complete (6 features)

---

**Status:** All BDD specifications complete for MVP Release 1  
**Total Features:** 44 features across 9 stages  
**Owner:** mdumka@gmail.com  
**Next Phase:** High-fidelity mockups and technical implementation
