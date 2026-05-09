import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PilgrimsService, Pilgrim } from '../../core/services/pilgrims.service';
import { AuthService } from '../../core/services/auth.service';

function normalizeAr(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[ؐ-ًؚ-ٰٟ]/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[يى]/g, 'ي')
    .toLowerCase();
}

const FLOOR_ORDER: Record<string, number> = {
  'الدور الأول': 1, 'الدور الثاني': 2, 'الدور الثالث': 3,
  'الدور الرابع': 4, 'الدور الخامس': 5, 'الدور السادس': 6,
  'الدور السابع': 7, 'الدور الثامن': 8, 'الدور التاسع': 9,
  'الدور العاشر': 10,
};

@Component({
  selector: 'app-pilgrims',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pilgrims.component.html',
  styleUrl: './pilgrims.component.scss',
})
export class PilgrimsComponent implements OnInit, OnDestroy {
  private pilgrimsService = inject(PilgrimsService);
  private auth = inject(AuthService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  allRecords: Pilgrim[] = [];
  filtered: Pilgrim[] = [];
  paged: Pilgrim[] = [];
  loading = true;
  error = '';

  searchTerm = '';
  filterFloor = '';
  filterRoom = '';
  filterRegion = '';
  filterRelation = '';

  floors: string[] = [];
  rooms: string[] = [];
  allRooms: string[] = [];
  regions: string[] = [];
  relations: string[] = [];

  page = 1;
  pageSize = 50;
  totalPages = 1;

  get totalPilgrims(): number { return this.allRecords.length; }
  get uniqueRooms(): number { return new Set(this.allRecords.map(r => r.room)).size; }
  get uniqueFloors(): number { return new Set(this.allRecords.map(r => r.floor)).size; }
  get uniqueRegions(): number { return new Set(this.allRecords.map(r => r.region)).size; }

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.pilgrimsService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.allRecords = res.records;
        this.buildFilterOptions();
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'فشل تحميل البيانات';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildFilterOptions(): void {
    this.floors = [...new Set(this.allRecords.map(r => r.floor))]
      .sort((a, b) => (FLOOR_ORDER[a] ?? 99) - (FLOOR_ORDER[b] ?? 99));
    this.allRooms = [...new Set(this.allRecords.map(r => r.room))]
      .sort((a, b) => parseInt(a) - parseInt(b));
    this.regions = [...new Set(this.allRecords.map(r => r.region))].sort();
    this.relations = [...new Set(this.allRecords.map(r => r.relation))].sort();
    this.rooms = this.allRooms;
  }

  onSearchInput(): void { this.searchSubject.next(this.searchTerm); }

  onFloorChange(): void {
    this.filterRoom = '';
    this.rooms = this.filterFloor
      ? [...new Set(this.allRecords.filter(r => r.floor === this.filterFloor).map(r => r.room))]
          .sort((a, b) => parseInt(a) - parseInt(b))
      : this.allRooms;
    this.applyFilters();
  }

  applyFilters(): void {
    const term = normalizeAr(this.searchTerm.trim());
    this.filtered = this.allRecords.filter(r => {
      if (this.filterFloor && r.floor !== this.filterFloor) return false;
      if (this.filterRoom && r.room !== this.filterRoom) return false;
      if (this.filterRegion && r.region !== this.filterRegion) return false;
      if (this.filterRelation && r.relation !== this.filterRelation) return false;
      if (term) {
        const haystack = normalizeAr(`${r.name} ${r.passport} ${r.national_id} ${r.request_num}`);
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.page = 1;
    this.updatePage();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterFloor = '';
    this.filterRoom = '';
    this.filterRegion = '';
    this.filterRelation = '';
    this.rooms = this.allRooms;
    this.applyFilters();
  }

  updatePage(): void {
    const start = (this.page - 1) * this.pageSize;
    this.paged = this.filtered.slice(start, start + this.pageSize);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.updatePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const pages: number[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1);
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  flightDisplay(code: string): string {
    return /^\d+$/.test(code) ? code : '—';
  }

  logout(): void { this.auth.logout(); }

  hasActiveFilter(): boolean {
    return !!(this.searchTerm || this.filterFloor || this.filterRoom || this.filterRegion || this.filterRelation);
  }
}
