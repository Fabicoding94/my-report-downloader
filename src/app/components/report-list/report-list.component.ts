import { Component, OnInit } from '@angular/core';
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
  reports: Report[] = [];


  // Oggetto per salvare l’anno selezionato per ogni companyName
  selectedYears: { [companyName: string]: number } = {};

  // Stato separato per ogni azienda (per selezione anno)
  selectedUrls: { [companyName: string]: string } = {};
  selectedTitles: { [companyName: string]: string } = {};
selectedBrandHistory: { [companyName: string]: string } = {};
selectedBrandHistoryText: string = '';
isModalOpen: boolean = false;

  constructor(private reportService: ReportService, private http: HttpClient) { }

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


}
