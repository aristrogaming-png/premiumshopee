import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductListComponent } from './pages/product-list/product-list.component';
import { AuthGuard } from './guards/auth.guard';
import { informationPaths } from './shared/seo-content';

const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'category/:category', component: ProductListComponent },
  { path: 'buying-from-india-usa-uk', redirectTo: 'buying-guide', pathMatch: 'full' },
  ...informationPaths.map(page => ({ path: page, data: { page }, loadComponent: () => import('./pages/information/information.component').then(m => m.InformationComponent) })),
  {
    path: 'admin/banners', canActivate: [AuthGuard],
    loadComponent: () => import('./pages/admin-banners/admin-banners.component').then(m => m.AdminBannersComponent)
  },
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
  { path: '**', loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
