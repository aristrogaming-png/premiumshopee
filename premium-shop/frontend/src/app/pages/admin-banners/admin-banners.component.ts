import { Component, DestroyRef, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Banner, ImageValue } from "../../models/banner";
import { BannerService } from "../../services/banner.service";
import { ImageInputComponent } from "../../shared/image-input.component";
import { ProductImageDirective } from "../../shared/product-image.directive";
import { validBannerTarget, validImageUrl } from "../../shared/catalog";

@Component({
  selector: "app-admin-banners",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ImageInputComponent,
    ProductImageDirective,
  ],
  templateUrl: "./admin-banners.component.html",
})
export class AdminBannersComponent implements OnInit {
  banners: Banner[] = [];
  editing: Banner | null = null;
  image: ImageValue = { imageUrl: "" };
  loading = false;
  saving = false;
  mediaBusy = false;
  error = "";
  constructor(
    private service: BannerService,
    private destroyRef: DestroyRef,
  ) {}
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading = true;
    this.service
      .getAdminBanners()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (banners) => {
          this.banners = banners;
          this.loading = false;
        },
        error: () => {
          this.error = "Unable to load banners. Please retry.";
          this.loading = false;
        },
      });
  }
  edit(banner?: Banner): void {
    this.error = "";
    this.mediaBusy = false;
    this.editing = banner
      ? { ...banner }
      : {
          id: "",
          title: "",
          imageUrl: "",
          altText: "",
          targetUrl: "",
          sortOrder: 0,
          isActive: false,
        };
    this.image = {
      imageUrl: this.editing.imageUrl,
      imagePublicId: this.editing.imagePublicId || "",
      imageWidth: this.editing.imageWidth ?? null,
      imageHeight: this.editing.imageHeight ?? null,
    };
  }
  cancel(): void {
    if (this.saving) return;
    if (
      this.image.imagePublicId &&
      !confirm(
        "Discard unsaved changes? Any new upload may remain unlinked; hosted images will be kept.",
      )
    )
      return;
    this.editing = null;
    this.mediaBusy = false;
    this.error = "";
  }
  save(): void {
    if (!this.editing || this.saving || this.mediaBusy) return;
    const banner = { ...this.editing, ...this.image };
    if (
      !banner.title?.trim() ||
      !banner.altText.trim() ||
      !validImageUrl(banner.imageUrl, true) ||
      !validBannerTarget(banner.targetUrl) ||
      !Number.isInteger(banner.sortOrder) ||
      banner.sortOrder! < 0
    ) {
      this.error =
        "Add a title, descriptive alt text, image, valid destination and a non-negative whole display order.";
      return;
    }
    this.persist(banner, true);
  }
  toggle(banner: Banner): void {
    if (!this.saving) this.persist({ ...banner, isActive: !banner.isActive });
  }
  private persist(banner: Banner, close = false): void {
    this.saving = true;
    this.error = "";
    this.service
      .save(banner)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          if (close) this.editing = null;
          this.load();
        },
        error: (error) => {
          this.saving = false;
          this.error =
            (error.error?.message ||
              "Banner could not be saved. Please retry.") +
            (banner.imagePublicId
              ? " A new upload may remain unlinked. No hosted images have been deleted."
              : "");
        },
      });
  }
  remove(banner: Banner): void {
    if (
      this.saving ||
      !confirm(
        `Delete banner "${banner.title}"? Only the record will be removed; its hosted image will be kept.`,
      )
    )
      return;
    this.saving = true;
    this.error = "";
    this.service
      .delete(banner.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.load();
        },
        error: () => {
          this.saving = false;
          this.error = "Unable to delete banner. Please retry.";
        },
      });
  }
}
