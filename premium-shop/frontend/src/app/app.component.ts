import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ThemeService } from "./services/theme.service";
@Component({ selector: "app-root", templateUrl: "./app.component.html" })
export class AppComponent implements OnInit {
  currentYear = new Date().getFullYear();
  constructor(
    public themeService: ThemeService,
    private router: Router,
  ) {}
  get isCatalog(): boolean {
    return (
      this.router.url.split("?")[0] === "/" ||
      this.router.url.startsWith("/category/")
    );
  }
  ngOnInit(): void {
    this.themeService.initTheme();
  }
}
