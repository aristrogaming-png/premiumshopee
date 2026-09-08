import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

 login() {
  this.authService.login(this.email, this.password).subscribe(success => {
    if (success) {
      this.router.navigate(['/admin']);
    } else {
      this.errorMessage = 'Invalid credentials';
    }
  });
}

}
