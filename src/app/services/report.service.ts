import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface ReportDetail {
  year: number;
  title: string;
  url: string;

}

export interface Report {
  companyName: string;
  segment: string;
  brandHistory: string;
  summaryLastReport: string;
  report: ReportDetail[];
}

export interface ReportSummaryResponse {
  summary: string;
  title?: string;
}

/* === ViewModel per il template (card) === */
export interface BrandCardVM {
  companyName: string;
  segment: string;
  summary: string;                 // breve descrizione (estratta da brandHistory)
  summaryLastReport?: string;     // breve descrizione dell'ultimo report
  kpi?: string;                    // opzionale (solo FE)
  icon?: string;                   // classe bootstrap-icons opzionale
  featured?: boolean;              // evidenzia la card
  availableYears: number[];        // es. [2024, 2023, 2022]
  selectedYear: number;            // default = anno più recente
  urlsByYear: Record<number, string>;
}

/* Meta opzionale lato FE (nessuna modifica al BE) */
const BRAND_META: Record<string, Partial<BrandCardVM>> = {
  'OVS':            { kpi: 'Carbon neutral entro 2030', icon: 'bi-bag',     featured: true },
  'Gucci':          { kpi: '-47% emissioni CO₂',        icon: 'bi-handbag', featured: true },
  'Benetton':       { kpi: '100% cotone sostenibile',   icon: 'bi-tshirt',  featured: true },
  'Gruppo Armani':  { icon: 'bi-gem' },
  'Ferragamo':      { icon: 'bi-gem' },
  'Moncler':        { icon: 'bi-snow' }
};

function truncate(s = '', max = 140) {
  return s && s.length > max ? s.slice(0, max - 1) + '…' : (s || '—');
}

function toBrandCardVM(b: Report): BrandCardVM {
  const sorted = [...(b.report || [])].sort((a, c) => c.year - a.year);
  const availableYears = sorted.map(r => r.year);
  const urlsByYear = sorted.reduce<Record<number, string>>((acc, r) => {
    acc[r.year] = r.url; return acc;
  }, {});
  const selectedYear = availableYears[0] ?? new Date().getFullYear();

  const meta = BRAND_META[b.companyName] || {};
  return {
    companyName: b.companyName,
    segment: b.segment,
    summary: truncate(b.brandHistory, 160),
    kpi: meta.kpi,
    icon: meta.icon,
    featured: !!meta.featured,
    availableYears,
    selectedYear,
    urlsByYear
  };
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
  /* Nuovo: dati già pronti per il template “card” */
  getBrandCards(): Observable<BrandCardVM[]> {
    return this.getReports().pipe(
      map(list => list.map(toBrandCardVM))
    );
  }

   /** Ultimo resoconto noto per l’azienda (lascia scegliere al BE qual è “l’ultimo”) */
  getLastSummary(companyName: string): Observable<ReportSummaryResponse> {
    const endpoint = `${this.apiUrl}/last/summary`;
    const params = new HttpParams().set('company', companyName);
    return this.http.get<ReportSummaryResponse>(endpoint, { params });
  }

  /** Resoconto relativo a uno specifico PDF (url) */
  getSummaryByUrl(url: string, company?: string): Observable<ReportSummaryResponse> {
    const endpoint = `${this.apiUrl}/summary`;
    return this.http.post<ReportSummaryResponse>(endpoint, { url, company });
  }
}

