import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./login.component.html",
})
export class LoginComponent {
  email = "";
  password = "";
  errorMessage = "";
  busy = false;
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}
  login(): void {
    if (this.busy || !this.email || !this.password) return;
    this.busy = true;
    this.errorMessage = "";
    this.auth.login(this.email, this.password).subscribe({
      next: (success) => {
        this.busy = false;
        if (success) this.router.navigate(["/admin"]);
        else this.errorMessage = "Invalid credentials";
      },
      error: (error) => {
        this.busy = false;
        this.errorMessage =
          error.status === 401
            ? "The server rejected this email or password."
            : error.status === 0
              ? "Cannot reach the login server. Check your connection and try again."
              : error.status >= 500
                ? "The login server is unavailable or misconfigured. Please try again later."
                : "Login could not complete. Please try again.";
      },
    });
  }
}
