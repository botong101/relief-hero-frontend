import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip adding token for login and register endpoints
  // Also skip for GET/POST to anonymous-locations list (affected users can view without auth)
  // But DO NOT skip for mark_on_the_way and scan_qr_code (require donator auth)
  const isAuthEndpoint = req.url.includes('/api/auth/login') || 
                         req.url.includes('/api/auth/register') ||
                         (req.url.includes('/api/anonymous-locations') && 
                          !req.url.includes('mark_on_the_way') && 
                          !req.url.includes('scan_qr_code'));
  
  if (isAuthEndpoint) {
    return next(req);
  }
  
  const token = localStorage.getItem('access_token');
  
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return next(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // If token is invalid, clear it from storage
        if (error.status === 401 && error.error?.code === 'token_not_valid') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        }
        return throwError(() => error);
      })
    );
  }
  
  return next(req);
};
