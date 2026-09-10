import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpEventType } from "@angular/common/http";
import { Subscription } from "rxjs";
import { ImageValue } from "../models/banner";
import { MediaService } from "../services/media.service";
import { validImageUrl } from "./catalog";
import { ProductImageDirective } from "./product-image.directive";

@Component({
  selector: "app-image-input",
  standalone: true,
  imports: [CommonModule, FormsModule, ProductImageDirective],
  template: `
    <fieldset class="image-input" [disabled]="disabled || uploading">
      <legend>Artwork</legend>
      <div class="image-preview">
        <img
          *ngIf="preview || value.imageUrl; else empty"
          appProductImage
          [src]="preview || value.imageUrl"
          alt="Selected artwork preview"
          width="600"
          height="300"
        />
        <ng-template #empty><span>No image selected</span></ng-template>
      </div>
      <label class="field"
        >{{ value.imageUrl ? "Replace image" : "Upload image" }}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          (change)="selectFile($event)"
        />
      </label>
      <p class="muted text-sm">
        JPEG, PNG or WebP · Maximum
        {{ maxBytes / 1048576 | number: "1.0-1" }} MB.
        {{
          purpose === "banner"
            ? "Suggested: 1200 × 600, under 500 KB."
            : "Aim for 100–300 KB when possible."
        }}
      </p>
      <div *ngIf="selected" class="action-row">
        <span class="text-sm"
          >{{ selected.name }} ({{
            selected.size / 1024 | number: "1.0-0"
          }}
          KB)</span
        >
        <button type="button" class="btn-primary" (click)="upload()">
          Upload selected image
        </button>
        <button type="button" class="btn-secondary" (click)="cancelSelection()">
          Cancel selection
        </button>
      </div>
      <label class="field"
        >Or paste image URL
        <input
          type="url"
          [ngModel]="urlDraft"
          (ngModelChange)="editUrl($event)"
          [ngModelOptions]="{ standalone: true }"
          placeholder="https://…"
        />
      </label>
      <div class="action-row" *ngIf="urlDraft !== value.imageUrl">
        <button type="button" class="btn-secondary" (click)="applyUrl()">
          Use this URL
        </button>
        <button type="button" class="btn-secondary" (click)="restoreUrl()">
          Keep current image
        </button>
      </div>
    </fieldset>
    <div *ngIf="uploading" role="status" class="notice">
      {{
        progress < 100 ? "Uploading: " + progress + "%" : "Processing image…"
      }}
      <progress
        [value]="progress"
        max="100"
        aria-label="Image upload progress"
      ></progress>
    </div>
    <p *ngIf="error" role="alert" class="error-message">{{ error }}</p>
    <p *ngIf="uploadedIds.length" class="notice text-sm">
      New uploads are linked only when you save the record. Cancelling or
      replacing them can leave unlinked assets; no hosted images are deleted
      automatically.
    </p>
  `,
})
export class ImageInputComponent implements OnInit, OnChanges, OnDestroy {
  @Input() value: ImageValue = { imageUrl: "" };
  @Input() purpose: "product" | "banner" = "product";
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<ImageValue>();
  @Output() busyChange = new EventEmitter<boolean>();
  urlDraft = "";
  selected?: File;
  preview = "";
  error = "";
  uploading = false;
  progress = 0;
  maxBytes = 2 * 1024 * 1024;
  uploadedIds: string[] = [];
  private subscription = new Subscription();
  constructor(private media: MediaService) {}
  ngOnInit(): void {
    this.subscription.add(
      this.media
        .limits()
        .subscribe({
          next: (config) => (this.maxBytes = config.maxBytes),
          error: () => {},
        }),
    );
  }
  ngOnChanges(): void {
    this.urlDraft = this.value.imageUrl || "";
  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.releasePreview();
  }
  private releasePreview(): void {
    if (this.preview) URL.revokeObjectURL(this.preview);
    this.preview = "";
  }
  private emitBusy(): void {
    this.busyChange.emit(
      this.uploading ||
        !!this.selected ||
        this.urlDraft !== (this.value.imageUrl || ""),
    );
  }
  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || this.uploading || this.disabled) return;
    this.error = "";
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > this.maxBytes
    ) {
      this.error =
        "Choose one JPEG, PNG or WebP within the upload limit. Your current image is unchanged.";
      return;
    }
    this.releasePreview();
    this.selected = file;
    this.preview = URL.createObjectURL(file);
    this.emitBusy();
  }
  cancelSelection(): void {
    this.selected = undefined;
    this.releasePreview();
    this.error = "";
    this.emitBusy();
  }
  editUrl(value: string): void {
    this.urlDraft = value;
    this.emitBusy();
  }
  restoreUrl(): void {
    this.urlDraft = this.value.imageUrl || "";
    this.error = "";
    this.emitBusy();
  }
  applyUrl(): void {
    if (!validImageUrl(this.urlDraft, this.purpose === "banner")) {
      this.error = "Use a valid HTTP or HTTPS image URL.";
      return;
    }
    this.value = {
      imageUrl: this.urlDraft.trim(),
      imagePublicId: "",
      imageWidth: null,
      imageHeight: null,
    };
    this.urlDraft = this.value.imageUrl;
    this.valueChange.emit(this.value);
    this.cancelSelection();
  }
  upload(): void {
    if (!this.selected || this.uploading || this.disabled) return;
    this.uploading = true;
    this.progress = 0;
    this.error = "";
    this.emitBusy();
    this.subscription.add(
      this.media.upload(this.selected, this.purpose).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress)
            this.progress = Math.round(
              (100 * event.loaded) / (event.total || this.selected!.size),
            );
          if (event.type === HttpEventType.Response && event.body) {
            const result = event.body;
            this.value = {
              imageUrl: result.secureUrl,
              imagePublicId: result.publicId,
              imageWidth: result.width,
              imageHeight: result.height,
            };
            this.uploadedIds.push(result.publicId);
            this.urlDraft = result.secureUrl;
            this.valueChange.emit(this.value);
            this.uploading = false;
            this.cancelSelection();
          }
        },
        error: (error) => {
          this.uploading = false;
          this.error =
            error.status === 503 && error.error?.message?.includes("not configured")
              ? "Uploads are not configured on the hosted backend. In Render, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, then redeploy. Your selected image is kept for retry."
              : error.error?.message ||
            "Upload failed. Retry or cancel the selection; the saved image is unchanged.";
          this.emitBusy();
        },
      }),
    );
  }
}
