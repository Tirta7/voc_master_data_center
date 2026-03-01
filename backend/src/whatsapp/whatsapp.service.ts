import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);
    private readonly fonnteToken: string;
    private readonly fonnteUrl = 'https://api.fonnte.com/send';

    constructor(private configService: ConfigService) {
        this.fonnteToken = this.configService.get<string>('FONNTE_TOKEN') || 'PLACEHOLDER_TOKEN';
    }

    getAppUrl(): string {
        return this.configService.get<string>('APP_URL') || 'http://localhost:4000';
    }

    async sendMessage(target: string, message: string) {
        try {
            const response = await axios.post(
                this.fonnteUrl,
                {
                    target,
                    message,
                },
                {
                    headers: {
                        Authorization: this.fonnteToken,
                    },
                },
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send WA message to ${target}: ${error.message}`);
            return null;
        }
    }

    async sendImage(target: string, message: string, url: string) {
        try {
            const response = await axios.post(
                this.fonnteUrl,
                {
                    target,
                    message,
                    url, // Can be a direct URL or base64 if Fonnte supports it (usually direct URL)
                },
                {
                    headers: {
                        Authorization: this.fonnteToken,
                    },
                },
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send WA image to ${target}: ${error.message}`);
            return null;
        }
    }
}
