import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product';

@Component({
  selector: 'app-add-edit-product',
  templateUrl: './add-edit-product.component.html',
  styleUrls: ['./add-edit-product.component.css']
})
export class AddEditProductComponent implements OnInit {
  productForm: FormGroup;
  isEdit = false;
  productId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      imageUrl: [''],
      description: [''],
      stock: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEdit = true;
      this.productService.getProduct(this.productId).subscribe(prod => {
        this.productForm.patchValue(prod);
      });
    }
  }

  save(): void {
    if (this.productForm.invalid) {
      return;
    }
    const formValue = this.productForm.value;
    const product: Product = {
      id: this.productId || '',
      name: formValue.name,
      price: Number(formValue.price),
      category: formValue.category,
      imageUrl: formValue.imageUrl,
      description: formValue.description,
      stock: Number(formValue.stock)
    };
    if (this.isEdit) {
      this.productService.updateProduct(product).subscribe(() => {
        this.router.navigate(['/admin']);
      });
    } else {
      this.productService.createProduct(product).subscribe(() => {
        this.router.navigate(['/admin']);
      });
    }
  }
}