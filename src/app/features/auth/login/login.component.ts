import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SocialAuthService, GoogleLoginProvider, FacebookLoginProvider } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  socialLoginReady = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private socialAuthService: SocialAuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Wait for social auth service to be ready
    this.socialAuthService.initState.subscribe(() => {
      this.socialLoginReady = true;
      console.log('Social login providers are ready');
    });

    // Listen for social auth state changes
    this.socialAuthService.authState.subscribe((user) => {
      if (user) {
        this.handleSocialLogin(user);
      }
    });
  }

  private handleSocialLogin(user: any): void {
    this.loading = true;
    this.error = '';

    // Determine the token based on provider
    const token = user.provider === 'GOOGLE' ? user.idToken : user.authToken;
    const provider = user.provider === 'GOOGLE' ? 'google' : 'facebook';

    this.authService.socialLogin(provider, token).subscribe({
      next: () => {
        this.router.navigate(['/map']);
      },
      error: (err) => {
        this.error = err.error?.error || `${provider} login failed. Please try again.`;
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.error = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          this.router.navigate(['/map']);
        },
        error: (err) => {
          this.error = err.error?.error || 'Login failed. Please check your credentials.';
          this.loading = false;
        }
      });
    }
  }

  /**
   * Sign in with Google
   */
  signInWithGoogle(): void {
    if (!this.socialLoginReady) {
      this.error = 'Social login is still initializing. Please wait a moment and try again.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID)
      .catch(err => {
        console.error('Google sign in error:', err);
        this.error = 'Google login was cancelled or failed.';
        this.loading = false;
      });
  }

  /**
   * Sign in with Facebook
   */
  signInWithFacebook(): void {
    if (!this.socialLoginReady) {
      this.error = 'Social login is still initializing. Please wait a moment and try again.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.socialAuthService.signIn(FacebookLoginProvider.PROVIDER_ID)
      .catch(err => {
        console.error('Facebook sign in error:', err);
        this.error = 'Facebook login was cancelled or failed.';
        this.loading = false;
      });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
