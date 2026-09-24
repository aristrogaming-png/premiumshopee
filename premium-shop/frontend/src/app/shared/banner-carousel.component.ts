import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BannerService } from "../services/banner.service";
import { Banner } from "../models/banner";
import { ProductImageDirective } from "./product-image.directive";
import { ProductImagePipe, ProductImageSrcsetPipe } from "./product-image.pipe";
import { validBannerTarget } from "./catalog";

@Component({
  selector: "app-banner-carousel",
  standalone: true,
  imports: [
    CommonModule,
    ProductImageDirective,
    ProductImagePipe,
    ProductImageSrcsetPipe,
  ],
  template: `
    <section
      *ngIf="banners.length"
      class="banner-section"
      aria-label="Featured offers"
      aria-roledescription="carousel"
      (pointerenter)="hovered = $event.pointerType === 'mouse'"
      (pointerleave)="hovered = false"
    >
      <div
        #track
        class="banner-track"
        (focusin)="focused = true"
        (focusout)="focused = false"
        (scroll)="onScroll()"
        (pointerdown)="interacting = true"
        (pointerup)="endInteraction()"
        (pointercancel)="endInteraction()"
        (pointerleave)="endInteraction()"
        (keydown.arrowright)="step(1, $event)"
        (keydown.arrowleft)="step(-1, $event)"
      >
        <a
          *ngFor="let banner of banners; let i = index"
          class="banner-slide"
          [href]="banner.targetUrl"
          (click)="navigate($event, banner)"
          [attr.target]="
            banner.targetUrl.startsWith('https:') ? '_blank' : null
          "
          rel="noopener noreferrer"
          [attr.aria-label]="
            banner.altText + ' (' + (i + 1) + ' of ' + banners.length + ')'
          "
        >
          <img
            [appProductImage]="banner.imageUrl"
            [src]="banner.imageUrl | productImage: 960"
            [attr.srcset]="banner.imageUrl | productImageSrcset"
            sizes="(min-width: 1212px) 1180px, calc(100vw - 32px)"
            [alt]="banner.altText"
            [attr.loading]="i === 0 ? 'eager' : 'lazy'"
            [attr.fetchpriority]="i === 0 ? 'high' : 'auto'"
            width="1200"
            height="600"
            decoding="async"
          />
        </a>
      </div>
      <div *ngIf="banners.length > 1" class="carousel-controls">
        <button
          type="button"
          class="icon-button carousel-previous"
          aria-label="Previous banner"
          (click)="step(-1)"
          [disabled]="active === 0"
        >
          ‹
        </button>
        <button
          type="button"
          class="icon-button carousel-next"
          aria-label="Next banner"
          (click)="step(1)"
          [disabled]="active === banners.length - 1"
        >
          ›
        </button>
        <button
          type="button"
          class="carousel-pause"
          [attr.aria-label]="paused ? 'Play banner slideshow' : 'Pause banner slideshow'"
          (click)="paused = !paused"
        >
          <span aria-hidden="true">{{ paused ? '▶' : 'Ⅱ' }}</span>
        </button>
      </div>
    </section>
    <div *ngIf="error" class="banner-error text-sm" role="status">
      Offers are temporarily unavailable.
      <button
        type="button"
        class="text-link"
        (click)="load()"
        [disabled]="loading"
      >
        Retry offers
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .banner-section {
        position: relative;
      }
      .banner-track {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        border-radius: 20px;
      }
      .banner-track::-webkit-scrollbar {
        display: none;
      }
      .banner-slide {
        flex: 0 0 100%;
        min-width: 0;
        scroll-snap-align: start;
        scroll-snap-stop: always;
        border-radius: 20px;
        overflow: hidden;
        background: var(--surface-raised);
        aspect-ratio: 2/1;
      }
      .banner-slide img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .carousel-controls {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .carousel-controls button {
        position: absolute;
        pointer-events: auto;
        background: var(--surface);
        color: var(--text);
        box-shadow: 0 2px 8px #0002;
      }
      .carousel-controls .icon-button {
        top: 50%;
        transform: translateY(-50%);
        border-radius: 50%;
      }
      .carousel-previous {
        left: 8px;
      }
      .carousel-next {
        right: 8px;
      }
      .carousel-controls button:disabled {
        visibility: hidden;
      }
      .carousel-pause {
        right: 8px;
        bottom: 8px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 12px;
      }
      .banner-error {
        padding: 12px;
        color: var(--muted);
      }
    `,
  ],
})
export class BannerCarouselComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("track") track?: ElementRef<HTMLElement>;
  banners: Banner[] = [];
  active = 0;
  error = false;
  loading = false;
  paused = false;
  hovered = false;
  focused = false;
  interacting = false;
  private direction = 1;
  private autoplay?: ReturnType<typeof setInterval>;
  constructor(
    private service: BannerService,
    private router: Router,
    private destroyRef: DestroyRef,
  ) {}
  ngOnInit(): void {
    this.paused = typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.load();
  }
  ngAfterViewInit(): void {
    this.startAutoplay();
  }
  ngOnDestroy(): void {
    clearInterval(this.autoplay);
  }
  private startAutoplay(): void {
    clearInterval(this.autoplay);
    this.autoplay = setInterval(() => {
      if (this.paused || this.hovered || this.focused || this.interacting ||
          document.hidden || this.banners.length < 2) return;
      const bounds = this.track?.nativeElement.getBoundingClientRect();
      if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      if (this.active === this.banners.length - 1) this.direction = -1;
      else if (this.active === 0) this.direction = 1;
      this.go(this.active + this.direction);
    }, 2000);
  }
  endInteraction(): void {
    if (!this.interacting) return;
    this.interacting = false;
    this.startAutoplay();
  }
  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.error = false;
    this.service
      .getBanners()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (banners) => {
          this.banners = banners.filter((banner) =>
            validBannerTarget(banner.targetUrl),
          );
          this.loading = false;
          this.active = 0;
          this.direction = 1;
        },
        error: () => {
          this.error = true;
          this.loading = false;
        },
      });
  }
  go(index: number): void {
    const track = this.track?.nativeElement;
    const item = track?.children[index] as HTMLElement;
    if (track && item)
      track.scrollTo({
        left: item.offsetLeft - (track.children[0] as HTMLElement).offsetLeft,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }
  step(change: number, event?: Event): void {
    event?.preventDefault();
    this.go(
      Math.max(0, Math.min(this.banners.length - 1, this.active + change)),
    );
    this.startAutoplay();
  }
  onScroll(): void {
    const track = this.track?.nativeElement;
    if (!track?.children.length) return;
    const origin = (track.children[0] as HTMLElement).offsetLeft;
    const maxScroll = track.scrollWidth - track.clientWidth;
    let nearest = 0;
    let distance = Infinity;
    Array.from(track.children).forEach((child, index) => {
      const target = Math.min((child as HTMLElement).offsetLeft - origin, maxScroll);
      const delta = Math.abs(track.scrollLeft - target);
      if (delta < distance) {
        nearest = index;
        distance = delta;
      }
    });
    this.active = nearest;
  }
  navigate(event: MouseEvent, banner: Banner): void {
    if (
      banner.targetUrl.startsWith("/") &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      event.button === 0
    ) {
      event.preventDefault();
      this.router.navigateByUrl(banner.targetUrl);
    }
  }
}
