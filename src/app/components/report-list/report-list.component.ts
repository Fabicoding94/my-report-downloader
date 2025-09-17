import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {
  ReportService,
  Report,
  ReportDetail,
} from 'src/app/services/report.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-report-list',
  templateUrl: './report-list.component.html',
  styleUrls: ['./report-list.component.css'],
})
export class ReportListComponent implements OnInit {
  @ViewChild('brandsSection') brandsSection!: ElementRef<HTMLDivElement>;

  reports: Report[] = [];

  // Oggetto per salvare l’anno selezionato per ogni companyName
  selectedYears: { [companyName: string]: number } = {};

  // Stato separato per ogni azienda (per selezione anno)
  selectedUrls: { [companyName: string]: string } = {};
  selectedTitles: { [companyName: string]: string } = {};
  selectedBrandHistory: { [companyName: string]: string } = {};
  selectedBrandHistoryText: string = '';
  isModalOpen: boolean = false;

  // stato del popup
isSummaryOpen = false;
summaryLoading = false;
summaryError = false;
summaryText = '';
summaryTitle = '';
summaryCompany = '';

  constructor(private reportService: ReportService, private http: HttpClient) {}

  ngOnInit(): void {
    this.reportService.getReports().subscribe((data) => {
      this.reports = data;
      console.log('REPORTS', this.reports); // 👈 aggiungilo per debug

      // Inizializza selezioni con il primo report per ogni azienda
      this.reports.forEach((report) => {
        this.selectedBrandHistory[report.companyName] = report.brandHistory;
        const first = report.report[0];
        if (first) {
          this.selectedUrls[report.companyName] = first.url;
          this.selectedTitles[report.companyName] = first.title;
        }
      });
    });
  }

  // Meta lato FE: KPI, icona, tema, featured
  brandMeta: Record<
    string,
    {
      kpi?: string;
      icon?: string;
      featured?: boolean;
      theme?: 'mint' | 'sage' | 'blue';
    }
  > = {
    //'OVS':                       { kpi: 'Carbon neutral entro 2030', icon: 'bi-bag',      featured: true,  theme: 'mint' },
    OVS: { icon: 'bi-bag', featured: true, theme: 'mint' },
    Gucci: { icon: 'bi-handbag', featured: true, theme: 'blue' },
    Benetton: { icon: 'bi-shop', featured: true, theme: 'mint' },
    'Gruppo Armani': { icon: 'bi-gem', featured: true, theme: 'blue' },
    Ferragamo: { icon: 'bi-gem', featured: true, theme: 'blue' },
    Moncler: { icon: 'bi-snow', featured: true, theme: 'blue' },
    'Oniverse (ex Calzedonia)': {
      icon: 'bi-shop',
      featured: true,
      theme: 'mint',
    },
  };

  getFeatured() {
    return this.reports
      .filter((r) => !!this.brandMeta[r.companyName]?.featured)
      .slice(0, 100);
  }
  getBySegment(segment: 'Fast Fashion' | 'Lusso') {
    // esclude quelli in evidenza per evitare duplicati
    return this.reports.filter(
      (r) => r.segment === segment && !this.brandMeta[r.companyName]?.featured
    );
  }

  getIcon(r: Report) {
    return (
      this.brandMeta[r.companyName]?.icon ||
      (r.segment === 'Lusso' ? 'bi-gem' : 'bi-bag')
    );
  }
  getThemeClass(r: Report) {
    const t =
      this.brandMeta[r.companyName]?.theme ||
      (r.segment === 'Lusso' ? 'mint' : 'blue');
    return 'theme-' + t;
  }
  getKpi(r: Report) {
    return this.brandMeta[r.companyName]?.kpi || null;
  }

  // Per mostrare gli anni in ordine (ultimo prima)

  getSorted(list: ReportDetail[]) {
    return [...list].sort((a, b) => b.year - a.year);
  }

  isFeatured(r: Report) {
    return !!this.brandMeta[r.companyName]?.featured;
  }

  onYearChange(event: Event, reportList: ReportDetail[], companyName: string) {
    const select = event.target as HTMLSelectElement;
    const url = select.value;
    this.selectedUrls[companyName] = url;
    const selected = reportList.find((r) => r.url === url);
    this.selectedTitles[companyName] = selected?.title || '';
  }

  downloadPDF(companyName: string) {
    const url = this.selectedUrls[companyName];
    const title = this.selectedTitles[companyName];

    if (!url) return;

    if (url.includes('monclergroup.com')) {
      window.open(url, '_blank');
    } else {
      this.reportService.downloadReport(url).subscribe(
        (blob) => {
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${title}.pdf`;
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
        },
        (error) => {
          console.error('Errore nel download del file:', error);
        }
      );
    }
  }

  openPDF(companyName: string): void {
    const url = this.selectedUrls[companyName];

    if (!url) return;

    // Alcuni siti (come Moncler) possono avere redirect particolari, quindi si apre sempre in nuova scheda
    window.open(url, '_blank', 'noopener');
  }

  openModal(report: any): void {
    this.selectedBrandHistoryText = report.brandHistory;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }


  openLastReportSummary(companyName: string): void {

  document.body.style.overflow = 'hidden';
  const url = this.selectedUrls[companyName];

  // setup popup
  this.summaryCompany = companyName;
  this.summaryTitle = this.selectedTitles[companyName] || 'Resoconto ultimo report';
  this.summaryText = '';
  this.summaryLoading = true;
  this.summaryError = false;
  this.isSummaryOpen = true;

  // 1) se lo hai già nel payload (campo summaryLastReport), usalo subito
  const local = this.reports.find(r => r.companyName === companyName)?.summaryLastReport;
  if (local) {
    this.summaryText = local;
    this.summaryLoading = false;
    return;
  }

  // 2) altrimenti chiama il BE: per url specifica o per “ultimo disponibile”
  const req$ = url
    ? this.reportService.getSummaryByUrl(url, companyName)
    : this.reportService.getLastSummary(companyName);

  req$.subscribe({
    next: res => {
      this.summaryText = res?.summary || 'Nessun resoconto disponibile.';
      if (res?.title) this.summaryTitle = res.title;
      this.summaryLoading = false;
    },
    error: () => {
      this.summaryError = true;
      this.summaryLoading = false;
    }
  });
}

closeSummary(): void {
  document.body.style.overflow = '';
  this.isSummaryOpen = false;
}

  scrollToBrands() {
    if (this.brandsSection?.nativeElement) {
      this.brandsSection.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } else {
      // fallback nel raro caso ViewChild non sia risolto
      document
        .getElementById('brands')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
