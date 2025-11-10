# Evalu8 MVP - Codespaces Development Environment

This repository is configured with GitHub Codespaces for instant cloud-based development.

## What's Pre-configured

### Runtime & Tools
- **Node.js 20** (LTS version)
- **pnpm** (fast, disk-efficient package manager)
- **PostgreSQL 15** (for Supabase local development)
- **GitHub CLI** (gh command)

### VS Code Extensions
- **GitHub Copilot** & **Copilot Chat** (AI pair programming)
- **Supabase** (database management)
- **Tailwind CSS IntelliSense** (autocomplete for Tailwind classes)
- **Prettier** (code formatting)
- **ESLint** (code linting)
- **ES7+ React Snippets** (React code snippets)

### Auto-configured Ports
- **5173** - Vite dev server (auto-opens in browser)
- **54321** - Supabase API
- **54323** - Supabase Studio

## Getting Started

### Launch Codespace
1. Go to https://github.com/mikedumka/evalu8-mvp-01
2. Click green **"Code"** button → **"Codespaces"** tab
3. Click **"Create codespace on main"**
4. Wait 2-3 minutes for environment setup

### Initialize Vite + React Project
```bash
# Create Vite project in current directory
pnpm create vite@latest . --template react-ts

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

### Install Supabase CLI (when needed)
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase project
supabase init

# Start local Supabase
supabase start
```

## Project Structure (After Setup)
```
/
├── .devcontainer/          # Codespaces configuration
├── docs/                   # BDD specs & documentation
├── src/                    # React application (after Vite setup)
├── supabase/               # Database migrations (after init)
└── package.json            # Dependencies (after Vite setup)
```

## Next Steps
1. Initialize Vite project
2. Install shadcn/ui components
3. Set up Supabase project
4. Start building features based on BDD specs

## Tips
- Codespaces auto-saves work to GitHub
- Use `gh` CLI for GitHub operations
- Port 5173 forwards automatically when Vite starts
- Stop/restart Codespace from GitHub web UI to save compute hours
