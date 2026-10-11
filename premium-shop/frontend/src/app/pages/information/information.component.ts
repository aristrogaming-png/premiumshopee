import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SeoService } from '../../services/seo.service';
import { organizationData, breadcrumbs } from '../../shared/seo-content';
import { informationPages } from '../../shared/information-content';

@Component({ standalone: true, imports: [CommonModule, RouterModule], template: `
  <article class="seo-panel" *ngIf="page">
    <nav aria-label="Breadcrumb"><a routerLink="/">Home</a> / {{ page.title }}</nav>
    <h1>{{ page.title }}</h1><p>{{ page.description }}</p>
    <section *ngFor="let section of page.sections"><h2>{{ section.heading }}</h2><p>{{ section.text }}</p><a *ngIf="section.link" [href]="section.link" rel="noopener noreferrer">{{ section.linkText }}</a></section>
    <nav class="help-links" aria-label="Buying help"><a routerLink="/activation-delivery">Activation and delivery</a><a routerLink="/refunds">Refund information</a><a routerLink="/contact">Contact</a><a routerLink="/">Browse subscriptions</a></nav>
  </article>` })
export class InformationComponent implements OnInit {
  page?: typeof informationPages[string];
  constructor(private route: ActivatedRoute, private seo: SeoService, private destroyRef: DestroyRef) {}
  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      const path = data['page']; this.page = informationPages[path];
      const graph = organizationData(); graph['@graph'].push(breadcrumbs([{ name: 'Home', path: '/' }, { name: this.page!.title, path: '/' + path }]));
      this.seo.set(this.page!.title + ' | Premium Dukan', this.page!.description, '/' + path, false, graph);
    });
  }
}
