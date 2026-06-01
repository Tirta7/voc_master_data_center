const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default ?? baileys;
const {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} = baileys;

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';
import pino from 'pino';
import { WASocket } from '@whiskeysockets/baileys';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private sock: WASocket | null = null;
  private qr: string | null = null;
  private connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' =
    'DISCONNECTED';
  private isBroadcasting = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Non-blocking initialization
    this.connectToWhatsApp().catch((err) => {
      this.logger.error('Initial WhatsApp connection failed:', err);
    });
  }

  getAppUrl(): string {
    return this.configService.get<string>('APP_URL') || 'http://localhost:4000';
  }

  async connectToWhatsApp() {
    if (this.sock) {
      this.logger.log(
        'Closing existing WhatsApp connection before reconnecting...',
      );
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.end(undefined);
        this.sock = null;
      } catch (e) {
        this.logger.error('Error closing old socket:', e.message);
      }
    }

    this.logger.log('Initializing WhatsApp Baileys connection...');
    this.connectionStatus = 'CONNECTING';
    this.qr = null;

    const authPath = path.join(process.cwd(), 'auth_info_baileys');
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    this.logger.log(
      `Using Baileys version ${version.join('.')} (latest: ${isLatest})`,
    );

    this.sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      shouldSyncHistoryMessage: () => false,
      browser: Browsers.ubuntu('Chrome'),
      logger: pino({ level: 'silent' }) as any,
      connectTimeoutMs: 60000,
    });

    this.sock!.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qr = qr;
        this.logger.log('New QR Code generated and ready for scan.');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.logger.warn(
          `Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`,
        );
        this.connectionStatus = 'DISCONNECTED';

        if (shouldReconnect) {
          // Prevent rapid reconnect loops
          setTimeout(() => {
            if (this.connectionStatus === 'DISCONNECTED') {
              this.connectToWhatsApp();
            }
          }, 10000);
        } else {
          this.qr = null;
          this.logger.log('Logged out (401). Clearing auth info and restarting to generate new QR...');
          const authPath = path.join(process.cwd(), 'auth_info_baileys');
          setTimeout(() => {
            try {
              fs.rmSync(authPath, { recursive: true, force: true });
              this.logger.log('Auth folder cleared successfully.');
            } catch (e) {
              this.logger.error(`Failed to clear auth folder: ${e.message}`);
            }
            this.connectToWhatsApp();
          }, 2000);
        }
      } else if (connection === 'open') {
        this.logger.log('WhatsApp connection successfully opened!');
        this.connectionStatus = 'CONNECTED';
        this.qr = null;
      }
    });

    this.sock!.ev.on('creds.update', saveCreds);
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      qr: this.qr,
    };
  }

  async sendMessage(target: string, message: string) {
    if (this.connectionStatus !== 'CONNECTED' || !this.sock) {
      this.logger.warn(`WhatsApp not connected. Message to ${target} aborted.`);
      return null;
    }

    try {
      // Ensure target format is correct for Baileys
      const formattedTarget = target.includes('@s.whatsapp.net')
        ? target
        : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

      // 🛡️ TIMEOUT GUARD (v1.2): Prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WhatsApp sendMessage timeout')), 10000),
      );

      await Promise.race([
        this.sock.sendMessage(formattedTarget, { text: message }),
        timeoutPromise,
      ]);

      return { status: 'success' };
    } catch (error) {
      this.logger.error(
        `Failed to send message to ${target}: ${error.message}`,
      );
      return null;
    }
  }

  async sendImage(target: string, caption: string, url: string) {
    if (this.connectionStatus !== 'CONNECTED' || !this.sock) {
      this.logger.warn(`WhatsApp not connected. Image to ${target} aborted.`);
      return null;
    }

    try {
      const formattedTarget = target.includes('@s.whatsapp.net')
        ? target
        : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

      await this.sock.sendMessage(formattedTarget, {
        image: { url },
        caption,
      });
      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Failed to send image to ${target}: ${error.message}`);
      return null;
    }
  }

  async sendDocument(
    target: string,
    document: Buffer,
    fileName: string,
    caption?: string,
  ) {
    if (this.connectionStatus !== 'CONNECTED' || !this.sock) {
      this.logger.warn(
        `WhatsApp not connected. Document to ${target} aborted.`,
      );
      return null;
    }

    try {
      const formattedTarget = target.includes('@s.whatsapp.net')
        ? target
        : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

      await this.sock.sendMessage(formattedTarget, {
        document,
        mimetype: 'application/pdf',
        fileName,
        caption,
      });
      return { status: 'success' };
    } catch (error) {
      this.logger.error(
        `Failed to send document to ${target}: ${error.message}`,
      );
      return null;
    }
  }

  async logout() {
    try {
      if (this.sock) {
        try {
          await this.sock.logout('User initiated logout');
        } catch (e) {
          this.logger.error(`Socket logout error: ${e.message}`);
        }
        this.sock = null;
      }
      this.connectionStatus = 'DISCONNECTED';
      this.qr = null;

      const authPath = path.join(process.cwd(), 'auth_info_baileys');
      if (fs.existsSync(authPath)) {
        // Use recursive rm with delay to ensure file locks are released
        setTimeout(() => {
          try {
            fs.rmSync(authPath, { recursive: true, force: true });
            this.logger.log('WhatsApp session folder cleared.');
          } catch (e) {
            this.logger.error(`Failed to clear auth folder: ${e.message}`);
          }
        }, 1000);
      }

      return { message: 'Logged out' };
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`);
      return { error: error.message };
    }
  }

  async broadcastMessage(targets: string[], message: string) {
    if (this.connectionStatus !== 'CONNECTED') {
      throw new Error('WhatsApp is not connected');
    }
    if (this.isBroadcasting) {
      throw new Error('A broadcast is already in progress');
    }

    this.isBroadcasting = true;
    const total = targets.length;

    // Background execution
    (async () => {
      this.logger.log(`Starting broadcast to ${total} numbers...`);
      let successCount = 0;

      for (const target of targets) {
        if (this.connectionStatus !== 'CONNECTED') break;

        try {
          const res = await this.sendMessage(target, message);
          if (res) successCount++;
        } catch (e) {
          this.logger.error(
            `Failed to send broadcast to ${target}: ${e.message}`,
          );
        }

        // Wait 2-4 seconds per message to mimic human behavior
        const delay = 2000 + Math.random() * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      this.isBroadcasting = false;
      this.logger.log(`Broadcast finished. Success: ${successCount}/${total}`);
    })().catch((err) => {
      this.isBroadcasting = false;
      this.logger.error(`Broadcast process error: ${err.message}`);
    });

    return { status: 'started', total };
  }
}
