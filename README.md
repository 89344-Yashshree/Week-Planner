# Weekly Plan Tracker

A full-stack weekly planning application that helps engineering teams manage sprint cycles, distribute backlog items across team members, allocate effort by category (Client-Focused, Tech Debt, R&D), and track daily progress — all with a structured week lifecycle. Built with **.NET 8** and **Angular 21**, deployed on **Microsoft Azure**.

---

## Architecture

The project follows **Clean Architecture** (Onion Architecture) principles with strict dependency inversion — the Core layer has zero external dependencies, Infrastructure implements Core interfaces, and the API layer orchestrates everything.

```
Week-Planner/
├── backend/
│   ├── src/
│   │   ├── WeeklyPlanTracker.API/              # Presentation layer
│   │   │   ├── Controllers/                    # 6 REST controllers
│   │   │   ├── DTOs/                           # Request/Response data contracts
│   │   │   ├── Middleware/                     # Global exception handling
│   │   │   └── Program.cs                      # App startup & DI configuration
│   │   ├── WeeklyPlanTracker.Core/             # Domain layer (zero dependencies)
│   │   │   ├── Entities/                       # Domain models (6 entities)
│   │   │   ├── Enums/                          # WeekState, BacklogCategory, etc.
│   │   │   ├── Interfaces/                     # Repository & service contracts
│   │   │   └── Services/                       # Business logic (5 services)
│   │   └── WeeklyPlanTracker.Infrastructure/   # Data access layer
│   │       ├── Data/                           # EF Core DbContext & Migrations
│   │       ├── Repositories/                   # Repository implementations
│   │       └── DependencyInjection.cs          # Infrastructure DI registration
│   └── tests/
│       ├── WeeklyPlanTracker.UnitTests/        # Service-level unit tests
│       └── WeeklyPlanTracker.IntegrationTests/ # WebApplicationFactory-based tests
├── frontend/                                   # Angular 21 SPA
│   └── src/app/
│       ├── core/                               # Shared services, models, guards, enums
│       └── features/                           # 10 feature modules
├── .github/workflows/                          # CI/CD pipelines
│   ├── backend.yml                             # Backend build, test & deploy
│   └── frontend.yml                            # Frontend build & deploy
└── WeeklyPlanTracker.sln                       # .NET solution file
```

---

## Week Lifecycle

Each weekly plan moves through a defined state machine:

```
  Setup ──► PlanningOpen ──► Frozen ──► Completed
                                │
                             (Cancel)
```

| State | Description |
|---|---|
| **Setup** | Team lead configures the week — selects participating members, sets the planning date, and defines category allocation percentages (Client-Focused / Tech Debt / R&D). |
| **PlanningOpen** | Team members pick backlog items, commit hours, and self-assign work. Budget hours are auto-calculated based on member count and category splits. |
| **Frozen** | Plan is locked. No new assignments. Members can only post daily progress updates and change assignment statuses (In Progress, Done, Blocked). |
| **Completed** | Week is finalized and archived. Available in Past Weeks for historical review. |

---

## Features

| Module | Description |
|---|---|
| **Team Setup** | Create and configure the team, define team-level settings |
| **Team Members** | Add, edit, activate/deactivate members with roles (Developer, QA, Lead) |
| **Week Setup** | Start a new weekly cycle, set planning date, choose participants, configure category % splits |
| **Backlog** | Full CRUD for backlog items with category tagging, search, filtering, and archiving |
| **Plan Work** | Drag-and-assign backlog items to members, commit hours, respect budget constraints |
| **Progress** | Log daily progress per assignment, update hours completed, set status (In Progress / Done / Blocked) |
| **Review & Freeze** | Validate plan completeness, freeze to prevent changes, review category allocation |
| **Past Weeks** | Browse and inspect completed historical weeks with full assignment details |
| **Login** | Simple authentication guard for team access |
| **Home / Dashboard** | Landing page with navigation to all modules |

---

## API Endpoints

The backend exposes a RESTful API with 6 controllers. All routes are prefixed with `/api`.

### Team Members — `/api/team-members`
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/team-members` | List all team members |
| `GET` | `/api/team-members/{id}` | Get a specific member |
| `POST` | `/api/team-members` | Create a new member |
| `PUT` | `/api/team-members/{id}` | Update member details |
| `DELETE` | `/api/team-members/{id}` | Remove a member |

### Backlog Items — `/api/backlog-items`
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/backlog-items?includeArchived=false&category=ClientFocused&search=foo` | List with filtering |
| `GET` | `/api/backlog-items/{id}` | Get a specific item |
| `POST` | `/api/backlog-items` | Create a new item |
| `PUT` | `/api/backlog-items/{id}` | Update an item |
| `PUT` | `/api/backlog-items/{id}/archive` | Archive an item |
| `DELETE` | `/api/backlog-items/{id}` | Delete an item |

### Weekly Plans — `/api/weekly-plans`
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/weekly-plans/current` | Get the active weekly plan |
| `GET` | `/api/weekly-plans/past` | List all completed plans |
| `GET` | `/api/weekly-plans/{id}` | Get a plan by ID |
| `POST` | `/api/weekly-plans` | Start a new week |
| `PUT` | `/api/weekly-plans/{id}/setup` | Configure members and category % |
| `PUT` | `/api/weekly-plans/{id}/open-planning` | Transition to PlanningOpen |
| `PUT` | `/api/weekly-plans/{id}/freeze` | Freeze the plan |
| `GET` | `/api/weekly-plans/{id}/freeze-validation` | Validate before freezing |
| `PUT` | `/api/weekly-plans/{id}/complete` | Mark week as completed |
| `DELETE` | `/api/weekly-plans/{id}` | Cancel the week |

### Plan Assignments — `/api/plan-assignments`
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/plan-assignments?weekId={id}` | List assignments for a week |
| `POST` | `/api/plan-assignments` | Create a new assignment |
| `PUT` | `/api/plan-assignments/{id}` | Update an assignment |
| `DELETE` | `/api/plan-assignments/{id}` | Remove an assignment |

### Progress — `/api/progress`
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/progress/team?weekId={id}` | Team-wide progress summary |
| `GET` | `/api/progress/member/{memberId}?weekId={id}` | Individual member progress |
| `PUT` | `/api/progress/{assignmentId}` | Submit a progress update |
| `GET` | `/api/progress/{assignmentId}/history` | View update history |

### Data — `/api/data`
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/data/reset` | Reset all application data |

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| .NET 8 | Web API framework |
| ASP.NET Core | Middleware pipeline, DI, CORS, routing |
| Entity Framework Core | ORM with Code-First migrations |
| SQL Server | Production relational database |
| Swagger / OpenAPI | Interactive API documentation |
| xUnit | Unit and integration test framework |
| WebApplicationFactory | In-memory integration testing |

### Frontend
| Technology | Purpose |
|---|---|
| Angular 21 | Component-based SPA framework |
| TypeScript 5.9 | Strongly typed JavaScript |
| RxJS | Reactive state and async management |
| Vitest | Fast unit test runner |
| Prettier | Code formatting |

### DevOps & Cloud
| Technology | Purpose |
|---|---|
| GitHub Actions | CI/CD with separate backend and frontend pipelines |
| Azure App Service | Backend API hosting with managed runtime |
| Azure Static Web Apps | Frontend SPA hosting with global CDN |
| Azure SQL | Managed SQL Server database |

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/)
- [Angular CLI](https://angular.dev/) — `npm install -g @angular/cli`
- SQL Server (local or Azure) — *optional: the API auto-falls back to an in-memory database when no connection string is configured*

### Run the Backend

```bash
cd Week-Planner

# Restore and build
dotnet restore WeeklyPlanTracker.sln
dotnet build WeeklyPlanTracker.sln --configuration Release

# Run the API
dotnet run --project backend/src/WeeklyPlanTracker.API
```

The API launches on `https://localhost:5001` by default.
Swagger UI is available at: **https://localhost:5001/swagger**

> The API automatically runs EF Core migrations on startup with a 30-second timeout to prevent hanging in cloud environments.

### Run the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
ng serve
```

The app opens at `http://localhost:4200` and is pre-configured with CORS to communicate with the backend.

---

## Running Tests

### Backend — Unit Tests

```bash
dotnet test backend/tests/WeeklyPlanTracker.UnitTests --configuration Release
```

### Backend — Integration Tests

Uses `WebApplicationFactory` with an in-memory database for isolated, fast integration tests.

```bash
dotnet test backend/tests/WeeklyPlanTracker.IntegrationTests --configuration Release
```

### Frontend

```bash
cd frontend
npm run test
```

---

## CI/CD Pipelines

Two independent GitHub Actions workflows ensure continuous integration and delivery.

### Backend Pipeline (`backend.yml`)
- **Triggers:** Push or PR to `main` on changes in `backend/**`
- **CI Job:** Restore → Build → Unit Tests → Integration Tests → Upload `.trx` test results as artifacts
- **CD Job:** Runs only on push to `main`. Publishes the API project → Logs into Azure → Deploys as a ZIP package to Azure App Service.

### Frontend Pipeline (`frontend.yml`)
- **Triggers:** Push or PR to `main` on changes in `frontend/**`
- **CI/CD Job:** Checkout → Setup Node.js 20 with npm caching → Install → Build (production config) → Deploy to Azure Static Web Apps using the official Azure action.

---

## Deployment

| Component | Azure Service | URL |
|---|---|---|
| Backend API | Azure App Service | `https://weekplanner-api.azurewebsites.net/api` |
| Frontend SPA | Azure Static Web Apps | `https://nice-ocean-00beb6100.6.azurestaticapps.net` |

---

## Domain Model

Six core entities define the application's data model:

| Entity | Description |
|---|---|
| **TeamMember** | A person on the team with a name, role (Developer / QA / Lead), and active status |
| **BacklogItem** | A work item with title, description, category (ClientFocused / TechDebt / R&D), estimated hours, and archive status |
| **WeeklyPlan** | Represents one weekly cycle — stores planning date, work period, state, category % splits, and computed budget hours |
| **WeeklyPlanMember** | Join entity linking selected team members to a specific weekly plan |
| **PlanAssignment** | Assigns a backlog item to a team member within a plan, with committed hours and current status (InProgress / Done / Blocked) |
| **ProgressUpdate** | Timestamped log entry per assignment recording hours done, status change, and optional notes |

### Entity Relationships

```
TeamMember ──┬── WeeklyPlanMember ──── WeeklyPlan
             │
             └── PlanAssignment ──┬── BacklogItem
                                  │
                                  └── ProgressUpdate (1:N)
```

---

## Middleware & Error Handling

The API uses a global `ExceptionHandlingMiddleware` that catches all unhandled exceptions and returns consistent JSON responses:

| Exception Type | HTTP Status | Behavior |
|---|---|---|
| `InvalidOperationException` | `400 Bad Request` | Business rule violations (e.g., freezing a plan that isn't ready) |
| `KeyNotFoundException` | `404 Not Found` | Requested resource does not exist |
| All other exceptions | `500 Internal Server Error` | Logged with full stack trace; generic message returned to client |

Response format:
```json
{
  "error": "Human-readable error message"
}
```

---

## Key Design Decisions

- **Repository + Unit of Work Pattern** — All data access goes through repository interfaces with a `UnitOfWork` for transactional consistency.
- **Auto-Migration on Startup** — EF Core migrations run automatically when the app starts, with a 30-second timeout to avoid blocking in Azure.
- **Enum Serialization** — All enums are serialized as strings in JSON using `JsonStringEnumConverter` for better API readability.
- **In-Memory DB Fallback** — Integration tests use an in-memory database via `WebApplicationFactory`, and HTTPS redirect is conditionally skipped for non-relational providers.
- **CORS Configuration** — Both `localhost:4200` (dev) and the Azure Static Web App URL are whitelisted for cross-origin requests.
