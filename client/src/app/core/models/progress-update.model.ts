import { AssignmentStatus } from '../enums/enums';

export interface ProgressUpdate {
    id: string;
    timestamp: string;
    hoursDone: number;
    status: AssignmentStatus;
    notes?: string;
}
