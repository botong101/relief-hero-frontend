import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { IconService } from '../../../services/icon.service';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeHtmlPipe],
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.css']
})
export class QrScannerComponent implements OnInit, OnDestroy {
  @Output() scanned = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  private html5QrCode?: Html5Qrcode;
  isScanning = false;
  scanError = '';
  manualCode = '';
  showManualEntry = false;

  ngOnInit(): void {
    this.startScanner();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  async startScanner(): Promise<void> {
    try {
      // Feature detection
      if (!navigator || !('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
        this.scanError = 'Camera not supported in this browser. Try opening in Safari/Chrome.';
        this.showManualEntry = true;
        return;
      }

      // Specific iOS in-app webviews are frequently problematic. Detect and warn early.
      if (this.isIosInAppBrowser()) {
        this.scanError = 'This in-app browser on iOS may block camera access. Please open this page in Safari for best results.';
        this.showManualEntry = true;
        // Continue to attempt start in case the webview supports getUserMedia
      } else if (this.isInAppBrowser()) {
        // Other in-app browsers (Facebook/Instagram) often restrict getUserMedia
        this.scanError = 'Your browser may not allow camera access (in-app browser). Please open this page in Safari or Chrome to scan.';
        this.showManualEntry = true;
        // We don't return here; still try to start — some in-app browsers may work.
      }

      // Do a lightweight preflight getUserMedia call. This forces the permission prompt
      // in some webviews and makes failures easier to catch and explain.
      try {
        const preflightStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } as any });
        // Immediately stop the tracks; html5-qrcode will request its own stream when starting.
        preflightStream.getTracks().forEach(t => t.stop());
      } catch (preErr: any) {
        // If preflight fails with a permission error or not readable, include helpful message but still attempt to start with html5-qrcode.
        console.warn('Camera preflight failed:', preErr);
        if (preErr && preErr.name === 'NotAllowedError') {
          this.scanError = 'Camera permission was denied. Please enable camera access for this site and try again.';
          this.showManualEntry = true;
        }
      }

      this.html5QrCode = new Html5Qrcode('qr-reader');

      const qrConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        // Try to give the browser good video constraints for mobile devices
        videoConstraints: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        // experimental feature if supported
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      } as any;

      await this.html5QrCode.start(
        { facingMode: 'environment' }, // ask for back camera
        qrConfig,
        (decodedText: string) => this.onScanSuccess(decodedText),
        (_errorMessage: string) => {
          // scan failure (no QR in view) — ignore silently
        }
      );

      // Ensure video element uses playsinline/muted/autoplay to allow iOS to start camera
      try {
        const video = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
        if (video) {
          video.setAttribute('playsinline', '');
          video.setAttribute('muted', '');
          video.setAttribute('autoplay', '');
          // also set muted property so some browsers allow autoplay
          try { video.muted = true; } catch (e) {}
        }
      } catch (e) {
        // non-critical
      }

      this.isScanning = true;
    } catch (err: any) {
      console.error('Error starting scanner:', err);

      // Give user a helpful error message
      if (err && err.name) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.scanError = 'Camera permission was denied. Please enable camera access for this site and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
          this.scanError = 'No suitable camera found on this device.';
        } else {
          this.scanError = `Failed to start camera: ${err.message || err.toString()}`;
        }
      } else if (typeof err === 'string') {
        this.scanError = err;
      } else {
        this.scanError = 'Failed to start camera. Please ensure camera permissions are granted or use manual entry.';
      }

      this.showManualEntry = true;
    }
  }

  // Detect iOS Safari vs in-app webviews. iOS webviews often don't include 'Safari' in UA
  private isIosInAppBrowser(): boolean {
    try {
      const ua = navigator.userAgent || '';
      const isIOS = /iP(hone|od|ad)/.test(ua);
      if (!isIOS) return false;
      // If it's iOS but doesn't advertise Safari and contains known app tokens, it's likely an in-app webview
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
      const inAppTokens = /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|WhatsApp|FB_IAB/i;
      return !isSafari || inAppTokens.test(ua);
    } catch (e) {
      return false;
    }
  }

  // Detect common in-app browsers which often block getUserMedia
  private isInAppBrowser(): boolean {
    try {
      const ua = navigator.userAgent || '';
      const inAppRegex = /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|WhatsApp|FB_IAB/i;
      return inAppRegex.test(ua);
    } catch (e) {
      return false;
    }
  }

  async stopScanner(): Promise<void> {
    if (this.html5QrCode && this.isScanning) {
      try {
        const state = this.html5QrCode.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await this.html5QrCode.stop();
        }
        this.html5QrCode.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      this.isScanning = false;
    }
  }

  onScanSuccess(decodedText: string): void {
    this.stopScanner();
    this.scanned.emit(decodedText);
  }

  toggleManualEntry(): void {
    this.showManualEntry = !this.showManualEntry;
  }

  submitManualCode(): void {
    if (this.manualCode.trim()) {
      this.scanned.emit(this.manualCode.trim());
    }
  }

  closeScanner(): void {
    this.stopScanner();
    this.closed.emit();
  }

  openInExternalBrowser(): void {
    // Attempt to open the app in the system browser. On iOS in-app browsers this will
    // usually prompt the user, or they can long-press the link. We open the current
    // location href which encourages the OS to switch to an external browser.
    try {
      const url = window.location.href;
      // Use target _blank to try to open externally. Some in-app browsers will block popups.
      window.open(url, '_blank');
    } catch (e) {
      // no-op
    }
  }

  constructor(private iconService: IconService) {}

  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
    return this.iconService.getIcon(name, size);
  }

  copyPageLink(): void {
    try {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
      } else {
        // Fallback
        const el = document.createElement('textarea');
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
    } catch (e) {
      console.warn('Failed to copy link', e);
    }
  }
}
