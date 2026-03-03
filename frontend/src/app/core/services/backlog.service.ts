import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BacklogItem } from '../models/backlog-item.model';
import { BacklogCategory } from '../enums/enums';
import { environment } from '../../../environments/environment';

/** HTTP service for all backlog-item API calls. */
@Injectable({ providedIn: 'root' })
export class BacklogService {
    private base = `${environment.apiUrl}/backlog-items`;

    constructor(private http: HttpClient) { }

    getAll(includeArchived = false, category?: BacklogCategory, search?: string): Observable<BacklogItem[]> {
        let params = new HttpParams().set('includeArchived', includeArchived.toString());
        if (category) params = params.set('category', category);
        if (search) params = params.set('search', search);
        return this.http.get<BacklogItem[]>(this.base, { params });
    }

    getById(id: string): Observable<BacklogItem> {
        return this.http.get<BacklogItem>(`${this.base}/${id}`);
    }

    create(item: { title: string; description?: string; category: BacklogCategory; estimatedHours: number }): Observable<BacklogItem> {
        return this.http.post<BacklogItem>(this.base, item);
    }

    update(id: string, item: { title: string; description?: string; category: BacklogCategory; estimatedHours: number }): Observable<BacklogItem> {
        return this.http.put<BacklogItem>(`${this.base}/${id}`, item);
    }

    archive(id: string): Observable<void> {
        return this.http.put<void>(`${this.base}/${id}/archive`, {});
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }
}
