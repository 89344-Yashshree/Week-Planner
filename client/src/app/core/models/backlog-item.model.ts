import { BacklogCategory } from '../enums/enums';

export interface BacklogItem {
    id: string;
    title: string;
    description?: string;
    category: BacklogCategory;
    estimatedHours: number;
    isArchived: boolean;
    isInActivePlan: boolean;
    createdAt: string;
}
