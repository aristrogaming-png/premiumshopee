import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
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
    >
      <div
        #track
        class="banner-track"
        (scroll)="onScroll()"
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
            sizes="(min-width: 900px) 880px, 90vw"
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
          class="icon-button"
          aria-label="Previous banner"
          (click)="step(-1)"
          [disabled]="active === 0"
        >
          ‹
        </button>
        <button
          *ngFor="let banner of banners; let i = index"
          class="carousel-dot"
          type="button"
          [class.selected]="i === active"
          [attr.aria-label]="'Show banner ' + (i + 1)"
          [attr.aria-current]="i === active ? 'true' : null"
          (click)="go(i)"
        ></button>
        <button
          type="button"
          class="icon-button"
          aria-label="Next banner"
          (click)="step(1)"
          [disabled]="active === banners.length - 1"
        >
          ›
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
        flex: 0 0 90%;
        min-width: 0;
        scroll-snap-align: start;
        border-radius: 20px;
        overflow: hidden;
        background: var(--surface-raised);
        aspect-ratio: 2/1;
      }
      .banner-slide:only-child {
        flex-basis: 100%;
      }
      .banner-slide img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .carousel-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 8px;
      }
      .carousel-dot {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
      }
      .carousel-dot:after {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--border);
      }
      .carousel-dot.selected:after {
        background: var(--accent);
      }
      .banner-error {
        padding: 12px;
        color: var(--muted);
      }
      @media (min-width: 900px) {
        .banner-slide {
          flex-basis: 75%;
        }
      }
    `,
  ],
})
export class BannerCarouselComponent implements OnInit {
  @ViewChild("track") track?: ElementRef<HTMLElement>;
  banners: Banner[] = [];
  active = 0;
  error = false;
  loading = false;
  constructor(
    private service: BannerService,
    private router: Router,
    private destroyRef: DestroyRef,
  ) {}
  ngOnInit(): void {
    this.load();
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
  }
  onScroll(): void {
    const track = this.track?.nativeElement;
    if (track?.children.length)
      this.active = Math.min(
        this.banners.length - 1,
        Math.round(
          track.scrollLeft /
            ((track.children[0] as HTMLElement).offsetWidth + 12),
        ),
      );
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
