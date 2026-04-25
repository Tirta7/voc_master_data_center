import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class HardwareService {
  private readonly logger = new Logger(HardwareService.name);

  /**
   * Check if a printer is reachable via TCP
   */
  async pingPrinter(ip: string, port: number = 9100): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(2000); // 2 seconds timeout for status check

      client.connect(port, ip, () => {
        client.destroy();
        resolve(true);
      });

      client.on('error', () => {
        client.destroy();
        resolve(false);
      });

      client.on('timeout', () => {
        client.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Send raw data to a network thermal printer (TCP)
   */
  async printRaw(ip: string, port: number, data: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();

      client.connect(port, ip, () => {
        this.logger.log(`Connected to printer at ${ip}:${port}`);
        client.write(data, (err) => {
          if (err) {
            this.logger.error('Print failed:', err);
            reject(err);
          } else {
            this.logger.log('Print job sent successfully');
            client.destroy();
            resolve(true);
          }
        });
      });

      client.on('error', (err) => {
        this.logger.error('Printer connection error:', err);
        client.destroy();
        reject(err);
      });

      // Timeout after 5 seconds
      client.setTimeout(5000, () => {
        this.logger.warn('Printer connection timeout');
        client.destroy();
        reject(new Error('Printer timeout'));
      });
    });
  }

  /**
   * ESC/POS Formatting Helpers
   */
  get ESC(): string {
    return '\x1B';
  }
  get GS(): string {
    return '\x1D';
  }

  formatBold(text: string): string {
    return `${this.ESC}E\x01${text}${this.ESC}E\x00`;
  }

  formatDoubleSize(text: string): string {
    return `${this.GS}!\x11${text}${this.GS}!\x00`;
  }

  get cut(): string {
    return `${this.GS}V\x42\x00`;
  }
}
