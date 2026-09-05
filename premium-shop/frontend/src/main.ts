import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { AppModule } from './app/app.module';
import { inject } from '@vercel/analytics';

// In a production environment you might enable production mode by calling
// enableProdMode() to disable assertions and other checks within Angular.

// Initialize Vercel Web Analytics
inject();

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));