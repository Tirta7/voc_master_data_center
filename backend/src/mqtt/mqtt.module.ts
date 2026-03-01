import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MqttService } from './mqtt.service';

@Global()
@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'MQTT_CLIENT',
                transport: Transport.MQTT,
                options: {
                    url: process.env.MQTT_URL || 'mqtt://localhost:1883',
                },
            },
        ]),
    ],
    providers: [MqttService],
    exports: [MqttService],
})
export class MqttModule { }
