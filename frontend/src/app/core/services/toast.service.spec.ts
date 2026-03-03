import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

/** Unit tests for ToastService — covers show(), dismiss(), auto-dismiss, and observable emissions. */
describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToastService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('show() should add a toast to the queue', () => {
        service.show('Test message', 'success');
        service.toasts$.subscribe(toasts => {
            expect(toasts.length).toBe(1);
            expect(toasts[0].message).toBe('Test message');
            expect(toasts[0].type).toBe('success');
        });
    });

    it('show() with warning type should set type correctly', () => {
        service.show('Heads up', 'warning');
        service.toasts$.subscribe(toasts => {
            expect(toasts[0].type).toBe('warning');
        });
    });

    it('show() with error type should set type correctly', () => {
        service.show('Something failed', 'error');
        service.toasts$.subscribe(toasts => {
            expect(toasts[0].type).toBe('error');
        });
    });

    it('dismiss() should remove the toast with the given id', () => {
        service.show('Toast A', 'success');
        let firstId: number | undefined;
        service.toasts$.subscribe(t => { if (t.length > 0) firstId = t[0].id; });

        if (firstId !== undefined) {
            service.dismiss(firstId);
            service.toasts$.subscribe(t => {
                expect(t.find(x => x.id === firstId)).toBeUndefined();
            });
        }
    });

    it('auto-dismiss should remove toast after 4 seconds', fakeAsync(() => {
        service.show('Auto-dismiss', 'success');
        let count = 0;
        service.toasts$.subscribe(t => count = t.length);
        expect(count).toBe(1);
        tick(4000);
        expect(count).toBe(0);
    }));

    it('multiple toasts should accumulate in the queue', () => {
        service.show('First', 'success');
        service.show('Second', 'error');
        service.toasts$.subscribe(t => {
            expect(t.length).toBe(2);
        });
    });
});
