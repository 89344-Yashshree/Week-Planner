import { WeekState } from '../enums/enums';
import { TeamMember } from './team-member.model';

export interface WeeklyPlan {
    id: string;
    planningDate: string;
    workStartDate: string;
    workEndDate: string;
    state: WeekState;
    clientFocusedPercent: number;
    techDebtPercent: number;
    rAndDPercent: number;
    memberCount: number;
    totalHours: number;
    clientFocusedBudgetHours: number;
    techDebtBudgetHours: number;
    rAndDBudgetHours: number;
    workPeriodDisplay: string;
    selectedMembers: TeamMember[];
}
