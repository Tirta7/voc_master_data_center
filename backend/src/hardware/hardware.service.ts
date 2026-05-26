import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import { SerialPort } from 'serialport';
import { PrinterConnectionType } from '../settings/entities/printer.entity';

@Injectable()
export class HardwareService {
  private readonly logger = new Logger(HardwareService.name);

  /**
   * Check if a printer is reachable via TCP or Serial
   */
  async pingPrinter(address: string, port: number = 9100, type: PrinterConnectionType = PrinterConnectionType.IP): Promise<boolean> {
    if (type === PrinterConnectionType.SERIAL_COM) {
      return new Promise((resolve) => {
        const serialPort = new SerialPort({ path: address, baudRate: port || 9600, autoOpen: false });
        serialPort.open((err) => {
          if (err) {
            resolve(false);
          } else {
            serialPort.close();
            resolve(true);
          }
        });
      });
    }

    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(2000); // 2 seconds timeout for status check

      client.connect(port, address, () => {
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
   * Send raw data to a network or serial thermal printer
   */
  async printRaw(address: string, port: number, data: string, type: PrinterConnectionType = PrinterConnectionType.IP): Promise<boolean> {
    if (type === PrinterConnectionType.SERIAL_COM) {
      return new Promise((resolve, reject) => {
        const serialPort = new SerialPort({ path: address, baudRate: port || 9600, autoOpen: false });
        serialPort.open((err) => {
          if (err) {
            this.logger.error(`Serial connection error to ${address}:`, err);
            return reject(err);
          }
          this.logger.log(`Connected to Serial Printer at ${address}`);
          serialPort.write(data, (writeErr) => {
            if (writeErr) {
              this.logger.error('Serial print failed:', writeErr);
              serialPort.close();
              reject(writeErr);
            } else {
              this.logger.log('Serial print job sent successfully');
              // Give it some time to write out buffer before closing
              setTimeout(() => {
                serialPort.close();
                resolve(true);
              }, 100);
            }
          });
        });
      });
    }

    return new Promise((resolve, reject) => {
      const client = new net.Socket();

      client.connect(port, address, () => {
        this.logger.log(`Connected to printer at ${address}:${port}`);
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
