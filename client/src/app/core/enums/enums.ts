// Enums matching the backend

export enum MemberRole {
    Lead = 'Lead',
    Member = 'Member'
}

export enum BacklogCategory {
    ClientFocused = 'ClientFocused',
    TechDebt = 'TechDebt',
    RAndD = 'RAndD'
}

export enum WeekState {
    Setup = 'Setup',
    PlanningOpen = 'PlanningOpen',
    Frozen = 'Frozen',
    Completed = 'Completed'
}

export enum AssignmentStatus {
    NotStarted = 'NotStarted',
    InProgress = 'InProgress',
    Done = 'Done',
    Blocked = 'Blocked'
}
