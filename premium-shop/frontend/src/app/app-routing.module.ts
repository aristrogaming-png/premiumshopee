import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductListComponent } from './pages/product-list/product-list.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', component: ProductListComponent },
  {
    path: 'product/:id',
    loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin/add', canActivate: [AuthGuard],
    loadComponent: () => import('./pages/add-edit-product/add-edit-product.component').then(m => m.AddEditProductComponent)
  },
  {
    path: 'admin/edit/:id', canActivate: [AuthGuard],
    loadComponent: () => import('./pages/add-edit-product/add-edit-product.component').then(m => m.AddEditProductComponent)
  },
  {
    path: 'admin', canActivate: [AuthGuard],
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
