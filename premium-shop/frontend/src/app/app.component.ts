
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  showCommunityPopup = false;

  ngOnInit(): void {
    const seen = sessionStorage.getItem('premium_shopee_popup_seen');
    if (!seen) {
      setTimeout(() => {
        this.showCommunityPopup = true;
      }, 2000);
    }
  }
  currentYear = new Date().getFullYear();

  closePopup(): void {
    this.showCommunityPopup = false;
    sessionStorage.setItem('premium_shopee_popup_seen', 'true');
  }
}
