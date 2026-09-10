import { Component, DestroyRef, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ProductService } from "../../services/product.service";
import { Product } from "../../models/product";
import { ImageValue } from "../../models/banner";
import { ImageInputComponent } from "../../shared/image-input.component";
import { validImageUrl } from "../../shared/catalog";

@Component({
  selector: "app-add-edit-product",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ImageInputComponent,
  ],
  templateUrl: "./add-edit-product.component.html",
})
export class AddEditProductComponent implements OnInit {
  productForm: FormGroup;
  isEdit = false;
  productId: string | null = null;
  image: ImageValue = { imageUrl: "" };
  mediaBusy = false;
  saving = false;
  loading = false;
  error = "";
  loadError = false;
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private destroyRef: DestroyRef,
  ) {
    this.productForm = this.fb.group({
      name: ["", Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ["", Validators.required],
      description: [""],
      stock: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.pattern(/^[0-9]+$/),
        ],
      ],
      planLabel: [""],
      durationMonths: [
        null,
        [
          Validators.min(1),
          Validators.max(1200),
          Validators.pattern(/^[0-9]+$/),
        ],
      ],
    });
  }
  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get("id");
    this.isEdit = !!this.productId;
    if (this.isEdit) this.load();
  }
  load(): void {
    this.loading = true;
    this.error = "";
    this.loadError = false;
    this.productService
      .getProduct(this.productId!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.productForm.patchValue(product);
          this.image = {
            imageUrl: product.imageUrl || "",
            imagePublicId: product.imagePublicId || "",
            imageWidth: product.imageWidth ?? null,
            imageHeight: product.imageHeight ?? null,
          };
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = true;
          this.error = "Unable to load product. Retry before editing.";
        },
      });
  }
  save(): void {
    if (this.saving || this.loading || this.loadError || this.mediaBusy) return;
    if (this.productForm.invalid || !validImageUrl(this.image.imageUrl)) {
      this.productForm.markAllAsTouched();
      this.error =
        "Complete the required fields, use valid non-negative numbers and a valid image URL.";
      return;
    }
    this.saving = true;
    this.error = "";
    const values = this.productForm.value;
    const product: Product = {
      ...values,
      ...this.image,
      id: this.productId || "",
      durationMonths:
        values.durationMonths === "" ? null : values.durationMonths,
    };
    const request = this.isEdit
      ? this.productService.updateProduct(product)
      : this.productService.createProduct(product);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(["/admin"]);
      },
      error: (error) => {
        this.saving = false;
        this.error =
          (error.error?.message ||
            "Product could not be saved. Please retry.") +
          (this.image.imagePublicId
            ? " A new upload may remain unlinked until this record saves. No hosted image was deleted."
            : "");
      },
    });
  }
}
