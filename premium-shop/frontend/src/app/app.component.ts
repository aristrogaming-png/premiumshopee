import { Component, OnInit } from '@angular/core';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

  showCommunityPopup = false;

  currentYear = new Date().getFullYear();

  constructor(
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {

    // Initialize Dark / Light theme
    this.themeService.initTheme();

    // Community popup
    const seen = sessionStorage.getItem(
      'premium_shopee_popup_seen'
    );

    if (!seen) {

      setTimeout(() => {

        this.showCommunityPopup = true;

      }, 2000);
    }
  }

  closePopup(): void {

    this.showCommunityPopup = false;

    sessionStorage.setItem(
      'premium_shopee_popup_seen',
      'true'
    );
  }
}