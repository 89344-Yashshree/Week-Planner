import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** HTTP service for seed, export, import, and reset operations. */
@Injectable({ providedIn: 'root' })
export class DataService {
    private base = `${environment.apiUrl}/data`;

    constructor(private http: HttpClient) { }

    seed(): Observable<any> {
        return this.http.post(`${this.base}/seed`, {});
    }

    /** Downloads all app data as a JSON Blob. */
    export(): Observable<Blob> {
        return this.http.get(`${this.base}/export`, { responseType: 'blob' });
    }

    /** Restores data from a JSON backup file. */
    import(file: File): Observable<any> {
        const fd = new FormData();
        fd.append('file', file);
        return this.http.post(`${this.base}/import`, fd);
    }

    reset(): Observable<any> {
        return this.http.delete(`${this.base}/reset`);
    }
}
