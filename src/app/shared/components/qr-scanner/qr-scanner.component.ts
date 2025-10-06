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
      this.html5QrCode = new Html5Qrcode('qr-reader');
      
      await this.html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          this.onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Scan failure, usually due to no QR code in view
          // We can ignore these
        }
      );
      
      this.isScanning = true;
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      this.scanError = 'Failed to start camera. Please ensure camera permissions are granted or use manual entry.';
      this.showManualEntry = true;
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

  constructor(private iconService: IconService) {}

  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
    return this.iconService.getIcon(name, size);
  }
}
