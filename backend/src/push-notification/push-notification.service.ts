import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscriptionEntity } from './entities/push-subscription.entity';
import * as webpush from 'web-push';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly subRepository: Repository<PushSubscriptionEntity>,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService
  ) {
    const pubKey = this.configService.get<string>('VAPID_PUBLIC_KEY') || process.env.VAPID_PUBLIC_KEY;
    const privKey = this.configService.get<string>('VAPID_PRIVATE_KEY') || process.env.VAPID_PRIVATE_KEY;
    const sub = this.configService.get<string>('VAPID_SUBJECT') || process.env.VAPID_SUBJECT || 'mailto:owner@voc-billiard.com';

    if (pubKey && privKey) {
      webpush.setVapidDetails(sub, pubKey, privKey);
    } else {
      this.logger.warn('VAPID keys not configured in environment.');
    }
  }

  async saveSubscription(userId: number, subscriptionDto: any) {
    let sub = await this.subRepository.findOne({ where: { endpoint: subscriptionDto.endpoint } });
    
    if (!sub) {
      sub = this.subRepository.create({
        endpoint: subscriptionDto.endpoint,
        keys: subscriptionDto.keys,
        userId: userId,
      });
    } else {
      sub.userId = userId; 
    }
    
    return await this.subRepository.save(sub);
  }

  async sendNotificationToOwner(title: string, body: string, url: string = '/') {
    // Find all subscriptions belonging to users with OWNER role
    const ownerSubscriptions = await this.subRepository.find({
      relations: ['user', 'user.role'],
    });

    const targetSubscriptions = ownerSubscriptions.filter(sub => 
      sub.user && sub.user.role && (sub.user.role.name === 'OWNER' || sub.user.role.name === 'SUPERADMIN' || sub.user.role.name === 'ADMIN')
    );

    if (targetSubscriptions.length === 0) {
      this.logger.debug('No active OWNER/SUPERADMIN subscriptions found for push notification.');
      return;
    }

    const payloadObj: any = { title, body, url };
    // We pass icon via arguments but let's check if the signature has it
    if (arguments.length > 3 && arguments[3]) {
        payloadObj.icon = arguments[3];
        payloadObj.badge = arguments[3];
    }
    const payload = JSON.stringify(payloadObj);

    const notificationPromises = targetSubscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };

      return webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.warn(`Subscription expired or invalid (ID: ${sub.id}), deleting from DB...`);
          await this.subRepository.delete(sub.id);
        } else {
          this.logger.error(`Failed to send push to subscription ${sub.id}:`, err);
        }
      });
    });

    await Promise.all(notificationPromises);
  }

  @OnEvent('payment.completed')
  async handlePaymentCompleted(transaction: any) {
    try {
      const amount = Number(transaction.paidAmount || transaction.grandTotal || 0).toLocaleString('id-ID');
      const invoice = transaction.invoiceNumber || 'INV';
      const customerName = transaction.customerName || transaction.member?.name || 'Walk-in Customer';

      const settings = await this.settingsService.getSettings();
      const businessName = settings?.businessName || 'VOC Billiard';
      let iconUrl = undefined;
      
      if (settings?.logoPath) {
        const baseUrl = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3001';
        iconUrl = settings.logoPath.startsWith('http') ? settings.logoPath : `${baseUrl}${settings.logoPath.startsWith('/') ? '' : '/'}${settings.logoPath}`;
      }

      let paymentMethod = 'CASH';
      if (transaction.payments && transaction.payments.length > 0) {
        paymentMethod = transaction.payments[0].paymentMethod || 'CASH';
      } else if (transaction.paymentDetails && transaction.paymentDetails.method) {
        paymentMethod = transaction.paymentDetails.method;
      }

      const title = `${businessName}`;
      const body = `Uang Masuk Dari: ${customerName}\n[${paymentMethod.toUpperCase()}] ${invoice} | Rp ${amount}`;
      const url = `/receipt/${transaction.id}`;
      // const url = `/admin/finance/ledger/invoice/${invoice}`; 

      await (this as any).sendNotificationToOwner(title, body, url, iconUrl);
    } catch (error) {
      this.logger.error('Error handling payment.completed event for push notification', error);
    }
  }

  @OnEvent('inventory.critical')
  async handleInventoryCritical(ingredient: any) {
    try {
      const settings = await this.settingsService.getSettings();
      const businessName = settings?.businessName || 'VOC Billiard';
      let iconUrl = undefined;
      
      if (settings?.logoPath) {
        const baseUrl = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3001';
        iconUrl = settings.logoPath.startsWith('http') ? settings.logoPath : `${baseUrl}${settings.logoPath.startsWith('/') ? '' : '/'}${settings.logoPath}`;
      }

      const title = `🚨 Peringatan Stok Rendah`;
      const stock = Number(ingredient.stockQuantity);
      const minStock = Number(ingredient.minStockLevel);
      const formattedStock = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(stock);
      const formattedMin = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(minStock);
      
      const body = `Bahan: ${ingredient.name}\nSisa Stok: ${formattedStock} ${ingredient.unit} (Min: ${formattedMin})\nMohon segera lakukan pengadaan ulang di ${businessName}.`;
      const url = `/admin/inventory`;

      await (this as any).sendNotificationToOwner(title, body, url, iconUrl);
    } catch (error) {
      this.logger.error('Error handling inventory.critical event for push notification', error);
    }
  }

  @OnEvent('approval.created')
  async handleApprovalCreated(approval: any) {
    try {
      const settings = await this.settingsService.getSettings();
      const businessName = settings?.businessName || 'VOC Billiard';
      let iconUrl = undefined;
      
      if (settings?.logoPath) {
        const baseUrl = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3001';
        iconUrl = settings.logoPath.startsWith('http') ? settings.logoPath : `${baseUrl}${settings.logoPath.startsWith('/') ? '' : '/'}${settings.logoPath}`;
      }

      const title = `Persetujuan Baru - ${businessName}`;
      const moduleType = String(approval.moduleType || 'UMUM').replace('_', ' ');
      const itemName = approval.metadata?.itemName || '';
      const body = `Ada data baru masuk ke Approval Center untuk ${moduleType}.${itemName ? `\nItem: ${itemName}` : ''}`;
      const url = `/admin/approval-center`;

      await (this as any).sendNotificationToOwner(title, body, url, iconUrl);
    } catch (error) {
      this.logger.error('Error handling approval.created event for push notification', error);
    }
  }
}
