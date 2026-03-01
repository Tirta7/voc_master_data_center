import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings')
export class Setting {
    @PrimaryGeneratedColumn()
    id: number;

    // Identity
    @Column({ default: 'My Billiard & Cafe' })
    businessName: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ nullable: true })
    contact: string;

    @Column({ nullable: true })
    socialMediaLink: string;

    @Column({ nullable: true })
    logoPath: string;

    // Policy
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    ppnPercentage: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    serviceChargePercentage: number;

    @Column({ type: 'int', default: 100 })
    roundingKelipatan: number; // e.g., 100, 500

    // Operational
    @Column({ default: '00:00' })
    businessDayOffset: string; // e.g., '02:00' for 2 AM closing

    // Hardware/System
    @Column({ type: 'json', nullable: true })
    printerMapping: {
        cashier?: string;
        kitchen?: string;
        bar?: string;
    };

    @Column({ type: 'json', nullable: true })
    availablePaymentMethods: string[]; // e.g., ['Cash', 'QRIS', 'Transfer']

    @Column({ default: '127.0.0.1' })
    mqttBrokerAddress: string;

    // Invoice Specific
    @Column({ nullable: true })
    invoiceBusinessName: string;

    @Column({ type: 'text', nullable: true })
    invoiceAddress: string;

    @Column({ nullable: true })
    invoiceContact: string;

    @Column({ nullable: true })
    invoiceSocialMedia: string;

    @Column({ type: 'text', nullable: true })
    invoiceFooterNote: string;

    // Custom Duration Pricing (Global)
    @Column({ type: 'json', nullable: true })
    customDurationPricingRegular: { basePrice: number; timeSlots: { start: string; end: string; price: number }[] };

    @Column({ type: 'json', nullable: true })
    customDurationPricingVip: { basePrice: number; timeSlots: { start: string; end: string; price: number }[] };

    @Column({ type: 'json', nullable: true })
    availableShifts: { name: string; startTime: string; endTime: string }[];

    @Column({ type: 'int', default: 5 })
    endingSoonThreshold: number;

    @Column({ type: 'int', default: 2000 })
    balanceBuffer: number;
}
