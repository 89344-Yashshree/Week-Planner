# Weekly Plan Tracker

> **Live App:** [https://nice-ocean-00beb6100.6.azurestaticapps.net](https://nice-ocean-00beb6100.6.azurestaticapps.net)

A full-stack weekly planning application that helps engineering teams manage sprint cycles, distribute backlog items across team members, allocate effort by category (Client-Focused, Tech Debt, R&D), and track daily progress — all with a structured week lifecycle. Built with .NET 8 and Angular 21, deployed on Microsoft Azure.
---

## Features

| Module | Description |
|---|---|
| **Team Setup** | Create your team, assign a Lead |
| **Login** | Select your identity from the team list, role-based access (Lead vs Member) |
| **Manage Members** | Add / remove members, reassign Lead role |
| **Backlog** | CRUD for work items with category tagging, search, filtering, and archiving |
| **Week Setup** | Start a new week, pick members, set category % splits (Client Focused / Tech Debt / R&D) |
| **Plan Work** | Assign backlog items to yourself, commit hours (30h per member) |
| **Review & Freeze** | Validate plan completeness, shows Ready badge per member, freeze to lock assignments |
| **Update Progress** | Log hours done and update status (In Progress / Done / Blocked) with circular progress ring |
| **Team Progress** | Dashboard showing overall %, by-category bars, and expandable by-member breakdowns with update history |
| **Past Weeks** | Browse completed historical weeks with expandable detail cards |
| **Data Tools** | Seed sample data, export/import JSON backups, reset app |
| **Dark / Light Theme** | Toggle between dark and light mode, persists across sessions |
| **Toast Notifications** | Non-blocking success, warning, and error messages in the top-right corner |
| **Confirmation Dialogs** | Custom styled modals for destructive actions (delete, reset, cancel) |

---

## Week Lifecycle

```
Setup ──► PlanningOpen ──► Frozen ──► Completed
                            │
                         (Cancel)
```

- **Setup** — Lead selects members, sets date, defines category %
- **PlanningOpen** — Members pick items and commit hours
- **Frozen** — Plan locked, members post progress updates only
- **Completed** — Archived to Past Weeks

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21, TypeScript 5.9, RxJS |
| Backend | .NET 8, ASP.NET Core, Entity Framework Core, SQL Server |
| Data | Browser localStorage (offline-first) |
| Backend Hosting | Azure App Service |
| Frontend Hosting | Azure Static Web Apps |
| CI/CD | GitHub Actions |

---

## Getting Started

**Prerequisites**

- [Node.js 20+](https://nodejs.org/)
- [Angular CLI](https://angular.dev/) — `npm install -g @angular/cli`
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) *(for backend only)*
- SQL Server *(optional — falls back to in-memory DB if not configured)*

**Run Frontend**

```bash
cd frontend
npm install
ng serve
```

App opens at `http://localhost:4200`. All data is stored in your browser's localStorage.

**Run Backend**

```bash
cd backend
dotnet restore
dotnet build --configuration Release
dotnet run --project src/WeeklyPlanTracker.API
```

API launches at `https://localhost:5001`. Swagger UI available at `https://localhost:5001/swagger`.

---

## Project Structure

```
Week-Planner/
├── frontend/                          # Angular 21 SPA
│   └── src/app/
│       ├── core/                      # Services, models, guards, enums
│       │   ├── services/              # localStorage-backed data services
│       │   ├── models/                # TypeScript interfaces
│       │   ├── enums/                 # WeekState, BacklogCategory, etc.
│       │   └── guards/               # Auth & role guards
│       └── features/                  # Feature components
│           ├── home/                  # Dashboard
│           ├── login/                 # User selection
│           ├── team-setup/            # Initial team creation
│           ├── team-members/          # Manage members
│           ├── backlog/               # Backlog list & form
│           ├── week-setup/            # Week configuration
│           ├── plan-work/             # Work planning
│           ├── review-freeze/         # Review & freeze
│           ├── progress/              # Update & team progress
│           └── past-weeks/            # Historical weeks
├── backend/                           # .NET 8 Web API (not used by frontend)
│   ├── src/
│   │   ├── WeeklyPlanTracker.API/     # Presentation layer
│   │   │   ├── Controllers/           # 6 REST controllers
│   │   │   ├── DTOs/                  # Request/Response contracts
│   │   │   ├── Middleware/            # Global exception handling
│   │   │   └── Program.cs            # Startup & DI config
│   │   ├── WeeklyPlanTracker.Core/    # Domain layer (zero dependencies)
│   │   │   ├── Entities/              # 6 domain models
│   │   │   ├── Enums/                 # WeekState, BacklogCategory, etc.
│   │   │   ├── Interfaces/            # Repository & service contracts
│   │   │   └── Services/              # Business logic
│   │   └── WeeklyPlanTracker.Infrastructure/  # Data access layer
│   │       ├── Data/                  # EF Core DbContext & Migrations
│   │       └── Repositories/          # Repository implementations
│   └── tests/
│       ├── WeeklyPlanTracker.UnitTests/
│       └── WeeklyPlanTracker.IntegrationTests/
├── .github/workflows/                 # CI/CD pipelines
│   ├── frontend.yml                   # Auto-deploy on push
│   └── backend.yml                    # Manual trigger only
└── prd.md                             # Product Requirements Document
```

---

## CI/CD

- **Frontend** — Auto-deploys to Azure Static Web Apps on push to `main` (changes in `frontend/**`)
- **Backend** — Manual trigger only (`workflow_dispatch`)
