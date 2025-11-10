# Lovable UI Prompts for Evalu8 MVP

**Instructions:** Each prompt below is self-contained and ready to copy/paste into Lovable. The design system is included with every screen prompt for consistency.

---

## Screen 1: Login Page

**Copy this entire prompt into Lovable:**

```
Create a modern login page for a youth sports evaluation system called "Evalu8".

DESIGN SYSTEM:
- Primary color: Violet (#8B5CF6)
- Component library: shadcn/ui (Violet theme)
- CSS framework: Tailwind CSS
- Icons: Lucide React
- Typography: Clean, modern sans-serif
- Responsive design (mobile, tablet, desktop breakpoints)
- Loading states with spinner animations
- Error states with clear messaging
- Success feedback with toast notifications
- Accessible (ARIA labels, keyboard navigation, focus states)

LAYOUT & COMPONENTS:
- Split-screen layout: Left side = branding/hero, Right side = login form
- Left side: Display "Evalu8" logo, tagline "Streamline Youth Sports Evaluations", and decorative sports-themed illustration
- Right side: Centered login form with Google OAuth button
- Use shadcn/ui Card component for form container
- Single button: "Sign in with Google" (primary violet, Lucide LogIn icon)
- Footer text: "Youth sports evaluation platform for associations"
- Color scheme: Violet primary (#8B5CF6), neutral grays, white background
- Responsive: Stack vertically on mobile, side-by-side on desktop
- Add subtle gradient background on left side
```

---

## Screen 2: Dashboard (Home Screen)

**Copy this entire prompt into Lovable:**

```
Create a comprehensive dashboard home screen for a sports evaluation administrator.

DESIGN SYSTEM:
- Primary color: Violet (#8B5CF6)
- Component library: shadcn/ui (Violet theme)
- CSS framework: Tailwind CSS
- Icons: Lucide React
- Typography: Clean, modern sans-serif
- Responsive design (mobile, tablet, desktop breakpoints)
- Loading states with spinner animations
- Error states with clear messaging
- Success feedback with toast notifications
- Accessible (ARIA labels, keyboard navigation, focus states)

LAYOUT & COMPONENTS:
- Top: Header with "Dashboard" title, user profile dropdown (right), association switcher dropdown (left)
- Below header: Stats cards row (4 cards)
  - Card 1: Total Players (number + Lucide Users icon)
  - Card 2: Active Sessions (number + Lucide Calendar icon)
  - Card 3: Pending Evaluations (number + Lucide ClipboardList icon)
  - Card 4: Completed Waves (number + Lucide CheckCircle icon)
- Main content area: Two columns
  - Left column (60%): "Upcoming Sessions" list (session name, date/time, cohort, status badge, "View" button)
  - Right column (40%): "Recent Activity" feed (icon + action description + timestamp)
- Bottom: Quick action buttons: "Register Player", "Create Session", "Distribute Wave"
- Use shadcn/ui Card components for stats and content sections
- Status badges with colors: Ready (green), In Progress (blue), Draft (gray), Completed (violet)
- Lucide icons throughout (Calendar, Users, ClipboardList, CheckCircle, Plus, ArrowRight)
- Hover states on interactive elements
- Empty states with illustrations if no data
- Responsive: Single column stack on mobile
```

---

## Screen 3: Player Registration Form

**Copy this entire prompt into Lovable:**

```
Create a multi-section player registration form for youth sports.

DESIGN SYSTEM:
- Primary color: Violet (#8B5CF6)
- Component library: shadcn/ui (Violet theme)
- CSS framework: Tailwind CSS
- Icons: Lucide React
- Typography: Clean, modern sans-serif
- Responsive design (mobile, tablet, desktop breakpoints)
- Loading states with spinner animations
- Error states with clear messaging
- Success feedback with toast notifications
- Accessible (ARIA labels, keyboard navigation, focus states)

FORM STRUCTURE:
- Header: "Register New Player" title, Back button (Lucide ArrowLeft)
- Section 1: Personal Information
  - Fields: First Name*, Last Name*, Date of Birth*, Email, Phone
  - All text inputs using shadcn/ui Input component
- Section 2: Program Information
  - Season dropdown* (select from list)
  - Cohort dropdown* (select from list, filtered by season)
  - Position dropdown* (select from sport-specific positions)
  - Previous Level dropdown (optional, select: A/B/C/D/None)
- Section 3: Registration Status
  - Status radio buttons: Active (default), Withdrawn, Other
  - If "Other" selected: Show reason textarea (required)
- Footer: Cancel button (secondary), Save Draft button (outline), Register Player button (primary violet)

VALIDATION & UX:
- Use shadcn/ui Form components with validation
- Required fields marked with red asterisk
- Field validation: Show error messages inline (red text, Lucide AlertCircle icon)
- Success state: Green checkmark + "Player registered successfully" toast
- Responsive: Full-width inputs on mobile, 2-column grid on desktop
- Visual grouping with subtle borders between sections
```

---

## Screen 4: Session Creation Interface

**Copy this entire prompt into Lovable:**

```
Create a session creation and configuration interface with tabbed navigation.

DESIGN SYSTEM:
- Primary color: Violet (#8B5CF6)
- Component library: shadcn/ui (Violet theme)
- CSS framework: Tailwind CSS
- Icons: Lucide React
- Typography: Clean, modern sans-serif
- Responsive design (mobile, tablet, desktop breakpoints)
- Loading states with spinner animations
- Error states with clear messaging
- Success feedback with toast notifications
- Accessible (ARIA labels, keyboard navigation, focus states)

LAYOUT & TABS:
- Header: "Create Evaluation Session" title, status badge (Draft), Save button (top right)
- Tabs: Basic Info | Drills & Weights | Assignments | Review
- Tab 1: Basic Info
  - Session Name* (text input)
  - Date* (date picker)
  - Time* (time picker)
  - Location* (text input)
  - Cohort* (dropdown)
  - Wave assignment (auto-assigned display or custom wave dropdown)
  - Session Capacity* (number input, range: 10-50)
  - Teams per Session* (number input, range: 1-6)
- Tab 2: Drills & Weights
  - Selected Drills table (columns: Drill Name, Weight %, Applies to Positions, Actions)
  - "Add Drill" button (opens modal)
  - Position validation cards below table (one per position showing total weight and drill count)
  - Clone Configuration button (if session is first to reach 100% in wave)
- Tab 3: Assignments
  - Evaluators multi-select dropdown*
  - Intake Personnel multi-select dropdown*
  - Minimum evaluators badge (e.g., "Min: 3 evaluators")
- Tab 4: Review
  - Summary of all configuration (read-only display)
  - Validation checklist with green checkmarks or red X icons
  - "Save as Draft" or "Mark as Ready" buttons

VALIDATION & UX:
- Use shadcn/ui Tabs component
- Validation indicators: Green checkmark (valid), yellow alert (warning), red X (error)
- Progress indicator showing which tabs are complete
- Lucide icons: Calendar, Clock, MapPin, Users, Target, CheckCircle, AlertTriangle
- Disabled "Mark as Ready" button until all validations pass
- Responsive: Stack form fields vertically on mobile
```

---

## Screen 5: Wave Distribution Screen

**Copy this entire prompt into Lovable:**

```
Create a wave management and player distribution interface.

DESIGN SYSTEM:
- Primary color: Violet (#8B5CF6)
- Component library: shadcn/ui (Violet theme)
- CSS framework: Tailwind CSS
- Icons: Lucide React
- Typography: Clean, modern sans-serif
- Responsive design (mobile, tablet, desktop breakpoints)
- Loading states with spinner animations
- Error states with clear messaging
- Success feedback with toast notifications
- Accessible (ARIA labels, keyboard navigation, focus states)

LAYOUT & COMPONENTS:
- Header: "Wave Management - [Cohort Name]" title, cohort filter dropdown
- Top section: Wave summary cards (horizontal scroll on mobile)
  - Each card: Wave number, status badge, session count, player count, "Distribute" button
  - Status colors: Not Started (gray), Ready (green), In Progress (blue), Completed (violet)
- Main content: Selected wave details panel
  - Left: Distribution algorithm selector
    - Radio buttons: Alphabetical, Random, Previous Level, Current Ranking
    - Description text for selected algorithm
  - Right: Sessions in wave list
    - Each row: Session name, date/time, capacity (e.g., "0/20"), status
- Bottom action area:
  - Teams per session input (1-6)
  - Preview Distribution button (outline)
  - Confirm & Distribute button (primary violet, disabled until preview)
- Modal: Distribution Preview
  - Table showing all players with assigned session and team
  - Columns: Player Name, Position, Previous Level (if applicable), Session, Team
  - Cancel and Confirm buttons

FEATURES & UX:
- Use shadcn/ui Card, RadioGroup, Table, Dialog components
- Visual distinction between standard waves and custom waves (custom waves have badge)
- Disabled state for "Distribute" if previous wave not yet distributed
- Loading spinner during distribution calculation
- Success toast: "Wave [N] distributed successfully"
- Lucide icons: Shuffle, ArrowDownAZ, TrendingUp, Users, CheckCircle
```

---

## Screen 6: Check-In Interface

**Copy this entire prompt into Lovable:**

```
Create a real-time player check-in interface for session intake personnel.

DESIGN SYSTEM:
- Primary color: Violet (#8B5CF6)
- Component library: shadcn/ui (Violet theme)
- CSS framework: Tailwind CSS
- Icons: Lucide React
- Typography: Clean, modern sans-serif
- Responsive design (mobile, tablet, desktop breakpoints)
- Loading states with spinner animations
- Error states with clear messaging
- Success feedback with toast notifications
- Accessible (ARIA labels, keyboard navigation, focus states)

LAYOUT & COMPONENTS:
- Header: "[Session Name] - Check-In" title, session date/time, Back button
- Top stats row: 4 summary cards
  - Total Players, Checked In (green), Pending (yellow), No Shows (red)
  - Each with large number and Lucide icon
- Search bar: "Search by name or jersey number" (Lucide Search icon)
- Main content: Two-column layout
  - Left (60%): Pending Players list
    - Each player card: Name, Position, Team assignment (pre-assigned, read-only)
    - "Check In" button per player
  - Right (40%): Checked In players list (scrollable)
    - Each player: Name, jersey color badge, jersey number badge, timestamp
    - "Mark No-Show" icon button (Lucide X)
- Check-In Modal (appears when "Check In" clicked):
  - Player name and team display (read-only)
  - Jersey Color dropdown (e.g., Red, Blue, Black, White, Yellow, Green)
  - Jersey Number input (0-999)
  - Validation messages: Color warning (if different team using same color), number error (if duplicate within team)
  - Cancel and Confirm buttons
- No-Show section (collapsible): List of no-show players with "Undo" button

FEATURES & UX:
- Real-time updates (new check-ins appear instantly)
- Color-coded badges for jersey colors (actual color preview)
- Large touch-friendly buttons for tablet use
- Auto-focus on search bar
- Confirmation dialog for marking no-shows
- Success feedback: Brief highlight animation when player checked in
- Lucide icons: Search, Users, CheckCircle, Clock, UserX, ArrowLeft
- Empty state illustration if no pending players
```

---

## Screen 7: Evaluation Scoring Interface

**Copy this entire prompt into Lovable:**

```
Create a streamlined evaluation scoring interface for evaluators.

DESIGN SYSTEM:
- Primary color: Violet (#8B5CF6)
- Component library: shadcn/ui (Violet theme)
- CSS framework: Tailwind CSS
- Icons: Lucide React
- Typography: Clean, modern sans-serif
- Responsive design (mobile, tablet, desktop breakpoints)
- Loading states with spinner animations
- Error states with clear messaging
- Success feedback with toast notifications
- Accessible (ARIA labels, keyboard navigation, focus states)

LAYOUT & COMPONENTS:
- Header: "[Session Name] - Evaluation" title, evaluator name display, "Finalize Session" button (top right)
- Filters bar: Position filter tabs (All, Forward, Defense, Goalie, etc.)
- Main content: Player scoring cards (grid layout, 2-3 columns on desktop, 1 column on mobile)
  - Each card header: Player name, position, team + jersey (e.g., "Team 1, Red #7")
  - Card body: Drill scoring rows
    - Each row: Drill name, weight percentage badge, score input (1-10 slider)
    - Visual: Slider with tick marks, current value display
  - Card footer: Total score preview (0-100 scale, calculated automatically)
  - Save icon button (auto-saves on change)
- Bottom: Progress indicator showing "X of Y players evaluated"
- Finalize Modal:
  - Completion summary (e.g., "85% of evaluations complete")
  - If incomplete: Warning message + Reason textarea (required)
  - If complete: Success message
  - Cancel and Confirm Finalize buttons

FEATURES & UX:
- Use shadcn/ui Slider component for score input (1-10 range)
- Real-time score calculation (weighted average)
- Auto-save with visual feedback (brief green checkmark animation)
- Disabled sliders for already-scored players (gray out)
- Position badge colors matching position type
- Weight badge displays percentage (e.g., "40%")
- Responsive grid: 1 column mobile, 2 columns tablet, 3 columns desktop
- Lucide icons: Users, Target, Save, CheckCircle, AlertCircle
- Smooth animations for score updates
```

---

## Screen 8: Reports/Rankings Page

**Copy this entire prompt into Lovable:**

```
Create a comprehensive reporting and analytics page with multiple report types.

DESIGN SYSTEM:
- Primary color: Violet (#8B5CF6)
- Component library: shadcn/ui (Violet theme)
- CSS framework: Tailwind CSS
- Icons: Lucide React
- Typography: Clean, modern sans-serif
- Responsive design (mobile, tablet, desktop breakpoints)
- Loading states with spinner animations
- Error states with clear messaging
- Success feedback with toast notifications
- Accessible (ARIA labels, keyboard navigation, focus states)

LAYOUT & COMPONENTS:
- Header: "Reports & Analytics" title, date range selector, Export buttons (CSV, PDF)
- Filters bar:
  - Season dropdown
  - Cohort dropdown
  - Position dropdown
  - View selector tabs: Rankings | Outliers | Session Progress
- Tab 1: Player Rankings
  - Table columns: Rank, Player Name, Position, Final Score (0-100), Evaluations Count, Outliers Count
  - Color-coded ranks: Top 25% (gold bg), Middle 50% (white), Bottom 25% (light red)
  - Sort by: Rank, Score, Name
  - Click row to view player detail modal
- Tab 2: Outlier Visualization
  - Table columns: Player Name, Drill Name, Score, Deviation %, Evaluator, Session Date
  - Yellow badge for outlier flag
  - Filter: Show all / Show only flagged
- Tab 3: Session Progress
  - Card grid showing all sessions
  - Each card: Session name, date, progress bar, stats (checked in, evaluated, completion %)
  - Status badge: Draft, Ready, In Progress, Completed
- Player Detail Modal:
  - Player info header (name, position, team, jersey)
  - Drill scores table (drill, score, weight, evaluator, session)
  - Score trend chart (if multiple waves)
  - Close button

FEATURES & UX:
- Use shadcn/ui Table, Card, Tabs, Dialog components
- Interactive tables with sortable columns (Lucide ArrowUp/ArrowDown icons)
- Progress bars with percentage labels
- Color-coded performance indicators (green = excellent, yellow = average, red = needs improvement)
- Export buttons with Lucide Download icon
- Empty states with illustrations if no data
- Responsive: Table scrolls horizontally on mobile, cards stack vertically
- Lucide icons: Trophy, TrendingUp, AlertTriangle, Download, Calendar, Users, Target
- Tooltip on hover for detailed information
```

---

## Usage Tips

**How to Use These Prompts:**

1. **Copy one complete prompt at a time** - Each screen prompt is fully self-contained
2. **Paste directly into Lovable** - No editing needed, ready to generate
3. **Iterate after generation** - Test the screen, then refine specific elements
4. **Build in order** - Start with Login, then Dashboard, then work through the operational screens

**Recommended Order:**
1. Login Page (simplest, establishes brand)
2. Dashboard (sets navigation pattern)
3. Player Registration Form (establishes form patterns)
4. Session Creation Interface (complex form with tabs)
5. Wave Distribution Screen (algorithm selection UX)
6. Check-In Interface (real-time updates)
7. Evaluation Scoring Interface (slider-based scoring)
8. Reports/Rankings Page (most complex, data visualization)

**After Each Generation:**
- Test responsive behavior (mobile, tablet, desktop)
- Verify shadcn/ui components are used correctly
- Check color consistency (Violet primary throughout)
- Confirm all Lucide icons render properly
- Test loading/error/empty states
- Validate accessibility (keyboard nav, ARIA labels)

This approach ensures you establish design patterns early and maintain consistency across all screens!
