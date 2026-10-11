import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalyticsService } from '../services/analytics.service';

@Component({ selector: 'app-store-preferences', standalone: true, imports: [CommonModule, RouterModule], template: `
  <p class="preference-note">A global catalogue of digital subscriptions. Prices in USD.</p>
  <div *ngIf="!analytics.decided" class="analytics-choice"><span>Allow optional product and enquiry analytics?</span><button type="button" (click)="analytics.choose(true)">Allow analytics</button><button type="button" (click)="analytics.choose(false)">Decline</button><a routerLink="/privacy">Privacy details</a></div>
  <button *ngIf="analytics.decided" class="text-link text-sm" type="button" (click)="analytics.decided = false">Analytics preferences</button>
` })
export class StorePreferencesComponent {
  constructor(public analytics: AnalyticsService) {}
}
