import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Pilgrim {
  floor: string;
  room: string;
  room_capacity: string;
  row_num: string;
  request_num: string;
  national_id: string;
  name: string;
  passport: string;
  region: string;
  flight_code: string;
  relation: string;
}

export interface PilgrimsResponse {
  total: number;
  records: Pilgrim[];
}

export interface MetaResponse {
  floors: string[];
  rooms: string[];
  regions: string[];
  relations: string[];
}

@Injectable({ providedIn: 'root' })
export class PilgrimsService {
  private http = inject(HttpClient);

  getAll(): Observable<PilgrimsResponse> {
    return this.http.get<PilgrimsResponse>(`${environment.apiUrl}/data`);
  }

  getMeta(): Observable<MetaResponse> {
    return this.http.get<MetaResponse>(`${environment.apiUrl}/data/meta`);
  }
}
