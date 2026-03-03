import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirects to /login if no user is logged in. */
export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.currentUser) return true;
    return router.createUrlTree(['/login']);
};

/** Redirects to /home if the current user is not the Team Lead. */
export const leadGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.isLead) return true;
    return router.createUrlTree(['/home']);
};
