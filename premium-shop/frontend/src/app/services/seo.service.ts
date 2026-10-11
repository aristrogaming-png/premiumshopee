import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationStart, Router } from '@angular/router';
import { SITE, organizationData } from '../shared/seo-content';

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(private title: Title, private meta: Meta, router: Router) {
    router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // Never carry a previous product's metadata into login, errors or the next route.
        this.set('Premium Dukan', 'Digital subscriptions and software offers.', event.url.split('?')[0], true, []);
      }
    });
  }
  set(title: string, description: string, path: string, noindex = false, data: object = organizationData(), image?: string): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: SITE + path });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    if (image) this.meta.updateTag({ property: 'og:image', content: image });
    else this.meta.removeTag('property="og:image"');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = SITE + path;
    let script = document.getElementById('structured-data');
    if (!script) { script = document.createElement('script'); script.id = 'structured-data'; script.setAttribute('type', 'application/ld+json'); document.head.appendChild(script); }
    script.textContent = JSON.stringify(data);
  }
}
