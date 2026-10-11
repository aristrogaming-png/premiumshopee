import { Injectable, Optional } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Product } from '../models/product';
import { bootstrapData } from '../shared/bootstrap-data';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  allowed = false;
  decided = false;
  private initialized = false;
  private lastPage = '';
  constructor(@Optional() router: Router | null = null) {
    try { const choice = localStorage.getItem('analytics-consent'); this.decided = choice !== null; this.allowed = choice === 'yes'; } catch {}
    if (this.allowed) this.initialize();
    router?.events.subscribe(event => { if (event instanceof NavigationEnd) this.pageView(); });
    document.addEventListener('click', event => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      try { if (['wa.me', 'chat.whatsapp.com'].includes(new URL(anchor.href).hostname)) this.event('whatsapp_click'); } catch {}
    });
  }
  choose(allowed: boolean): void {
    this.allowed = allowed;
    this.decided = true;
    try { localStorage.setItem('analytics-consent', allowed ? 'yes' : 'no'); } catch {}
    const target = window as any;
    if (allowed) { this.initialize(); this.pageView(); }
    else if (target.gtag) target.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  }
  private initialize(): void {
    const id = bootstrapData()?.analyticsId;
    if (!id || !/^G-[A-Z0-9]+$/.test(id)) return;
    const target = window as any;
    if (this.initialized) { target.gtag('consent', 'update', { analytics_storage: 'granted' }); return; }
    this.initialized = true;
    target.dataLayer = target.dataLayer || [];
    target.gtag = function() { target.dataLayer.push(arguments); };
    target.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    target.gtag('js', new Date());
    // No automatic page URL/referrer collection: query strings may contain personal/search data.
    target.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: 'https://premiumdukan.com' + window.location.pathname, page_referrer: this.referrer() });
    const script = document.createElement('script');
    script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`; document.head.appendChild(script);
  }
  private referrer(): string { try { return new URL(document.referrer).origin; } catch { return ''; } }
  private pageView(): void {
    const path = window.location.pathname;
    if (!this.allowed || /^\/(admin|login|account|checkout|cart)(\/|$)/.test(path) || path === this.lastPage) return;
    this.lastPage = path;
    this.event('page_view');
  }
  event(name: 'page_view' | 'view_item' | 'begin_checkout' | 'whatsapp_click', product?: Product): void {
    if (!this.allowed) return;
    const target = window as any;
    const details: Record<string, unknown> = { page_location: 'https://premiumdukan.com' + window.location.pathname, page_referrer: this.referrer() };
    if (name === 'begin_checkout') details['checkout_type'] = 'whatsapp_enquiry';
    if (product) Object.assign(details, { currency: 'USD', value: product.price, items: [{ item_id: product.id, item_name: product.name, item_category: product.category, price: product.price, quantity: 1 }] });
    target.gtag?.('event', name, details);
  }
  // Purchase is deliberately absent: only a verified server-side payment can record it.
}
