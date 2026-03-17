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

  @Column({ default: '03:00' })
  autoMaintenanceTime: string; // e.g., '03:00'

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
  customDurationPricingRegular: {
    basePrice: number;
    timeSlots: { start: string; end: string; price: number }[];
  };

  @Column({ type: 'json', nullable: true })
  customDurationPricingVip: {
    basePrice: number;
    timeSlots: { start: string; end: string; price: number }[];
  };

  @Column({ type: 'json', nullable: true })
  availableShifts: { name: string; startTime: string; endTime: string }[];

  @Column({ type: 'int', default: 5 })
  endingSoonThreshold: number;

  @Column({ type: 'int', default: 2000 })
  balanceBuffer: number;

  @Column({ type: 'int', default: 15 })
  balanceWarningMinutes: number;

  @Column({ type: 'int', default: 1000 })
  royaltyPointsPerAmount: number; // e.g., 1000 means 1 point per Rp 1.000 spent

  @Column({ type: 'int', default: 200 })
  royaltyPointRedeemValue: number; // e.g., 200 means 1 point is worth Rp 200 when redeemed

  @Column({ type: 'int', default: 5 })
  scratchBombWinRate: number; // Win percentage for the scratch card game (e.g. 5 for 5%)

  @Column({ type: 'varchar', default: '1,2,5,10,20,50,100' })
  scratchBombRewards: string; // Dynamic list of game rewards, comma separated

  @Column({ type: 'int', default: 25 })
  scratchBombAvgWinPts: number; // Set average jackpot value manually

  @Column({ type: 'boolean', default: false })
  gamificationAutoPilot: boolean; // Flag to enable autonomous AI AI

  @Column({ type: 'int', default: 5000000 })
  gamificationTargetSurplus: number; // The target surplus you want for auto pilot

  @Column({ type: 'int', default: 2 })
  scratchBombPlayCost: number; // Cost in points to play the scratch card game //
  @Column({ type: 'int', default: 90 })
  pointExpiryDays: number; // Duration in days before points expire

  @Column({ type: 'int', default: 0 })
  scratchBombPool: number; // The "Treasury" or budget pool for game wins

  @Column({ type: 'int', default: 15 })
  mahjongSlotWinRate: number; // Win percentage for Mahjong slot (e.g. 15 for 15% high-win chance)

  @Column({ type: 'int', default: 0 })
  mahjongSlotPool: number; // Dedicated pool for Mahjong slot

  @Column({ type: 'boolean', default: false })
  isEmergencyMode: boolean;

  @Column({ type: 'int', default: 80 })
  printerWidth: number; // e.g., 80, 58, 75

  @Column({ type: 'json', nullable: true })
  displayPromotions: {
    title: string;
    desc: string;
    tag: string;
    color: string;
    image: string;
  }[];

  @Column({ nullable: true })
  ownerPhone: string;

  @Column({ default: false })
  autoReportEnabled: boolean;

  @Column({ default: '23:55' })
  reportSchedule: string; // HH:mm

  @Column({ type: 'text', nullable: true })
  waTemplateWelcome: string;

  @Column({ type: 'int', default: 5 })
  aiStaffingRatio: number;

  @Column({ default: false })
  aiAutoPromote: boolean;

  @Column({ type: 'text', nullable: true })
  waTemplateSessionEnd: string;
}
