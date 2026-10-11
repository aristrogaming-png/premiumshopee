import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../services/seo.service';
@Component({ standalone: true, imports: [RouterModule], template: '<section class="state-panel"><h1>Page not found</h1><p>This page is unavailable. Browse the current catalogue to find an offer.</p><a routerLink="/">Browse subscriptions</a></section>' })
export class NotFoundComponent {
  constructor(seo: SeoService) { seo.set('Page not found | Premium Dukan', 'Browse the current Premium Dukan catalogue.', window.location.pathname, true, []); }
}
