import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** HTTP service for seed, export, and reset operations. */
@Injectable({ providedIn: 'root' })
export class DataService {
    private base = `${environment.apiUrl}/data`;

    constructor(private http: HttpClient) { }

    seed(): Observable<any> {
        return this.http.post(`${this.base}/seed`, {});
    }

    export(): void {
        // Trigger browser file download
        window.open(`${this.base}/export`, '_blank');
    }

    reset(): Observable<any> {
        return this.http.delete(`${this.base}/reset`);
    }
}
