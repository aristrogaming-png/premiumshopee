import { Component } from "@angular/core";
import { ThemeService } from "../services/theme.service";

@Component({
  selector: "app-theme-toggle",
  standalone: true,
  template: `<button
    type="button"
    class="theme-toggle"
    role="switch"
    aria-label="Dark mode"
    [attr.aria-checked]="theme.isDark"
    [attr.title]="theme.isDark ? 'Switch to Light mode' : 'Switch to Dark mode'"
    (click)="theme.toggleTheme()"
  >
    <span class="theme-track" [class.is-dark]="theme.isDark" aria-hidden="true">
      <span class="theme-knob">{{ theme.isDark ? '\u{1F319}' : '\u{2600}\u{FE0F}' }}</span>
    </span>
    <span>{{ theme.isDark ? "Dark" : "Light" }}</span>
  </button>`,
})
export class ThemeToggleComponent {
  constructor(public theme: ThemeService) {}
}
