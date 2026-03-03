import { MemberRole } from '../enums/enums';

export interface TeamMember {
    id: string;
    name: string;
    role: MemberRole;
    isActive: boolean;
    createdAt: string;
}
