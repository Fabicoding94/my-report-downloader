import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportDetail {
  year: number;
  title: string;
  url: string;
}

export interface Report {
  companyName: string;
  segment: string;
  report: ReportDetail[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private apiUrl = 'http://localhost:8080/api/reports'; // Cambia se il tuo endpoint è diverso

  constructor(private http: HttpClient) { }

  getReports(): Observable<Report[]> {
    return this.http.get<Report[]>(this.apiUrl);
  }

  downloadReport(url: string): Observable<Blob> {
    console.log("Downloading report from URL:", url);
     const endpoint = `${this.apiUrl}/download?url=${encodeURIComponent(url)}`;
     return this.http.get(endpoint, { responseType: 'blob' });
  }
}

