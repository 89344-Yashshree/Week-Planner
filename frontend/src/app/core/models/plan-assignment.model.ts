import { AssignmentStatus } from '../enums/enums';
import { ProgressUpdate } from './progress-update.model';

export interface PlanAssignment {
    id: string;
    weeklyPlanId: string;
    teamMemberId: string;
    memberName: string;
    backlogItemId: string;
    backlogItemTitle: string;
    backlogItemCategory: string;
    committedHours: number;
    hoursCompleted: number;
    status: AssignmentStatus;
    createdAt: string;
    progressUpdates: ProgressUpdate[];
}
