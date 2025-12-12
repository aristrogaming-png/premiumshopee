import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { AppModule } from './app/app.module';

// In a production environment you might enable production mode by calling
// enableProdMode() to disable assertions and other checks within Angular.

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));