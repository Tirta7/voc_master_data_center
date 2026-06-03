/* eslint-disable @typescript-eslint/no-explicit-any */

class EscPosEncoder {
    buffer: number[] = [];

    initialize() {
        this.buffer.push(0x1B, 0x40);
    }
    
    alignCenter() {
        this.buffer.push(0x1B, 0x61, 0x01);
    }
    
    alignLeft() {
        this.buffer.push(0x1B, 0x61, 0x00);
    }
    
    alignRight() {
        this.buffer.push(0x1B, 0x61, 0x02);
    }
    
    bold(on: boolean) {
        this.buffer.push(0x1B, 0x45, on ? 1 : 0);
    }
    
    doubleSize() {
        this.buffer.push(0x1D, 0x21, 0x11);
    }

    normalSize() {
        this.buffer.push(0x1D, 0x21, 0x00);
    }

    text(str: string) {
        for (let i = 0; i < str.length; i++) {
            // Very simple ASCII encode
            this.buffer.push(str.charCodeAt(i) & 0xFF);
        }
    }
    
    line(str: string) {
        this.text(str);
        this.newline();
    }
    
    newline() {
        this.buffer.push(0x0A);
    }

    separator(width: number) {
        this.line('-'.repeat(width));
    }

    cut() {
        this.buffer.push(0x1D, 0x56, 0x41, 0x10);
    }

    feed(lines: number) {
        for(let i=0; i<lines; i++) this.newline();
    }

    build() {
        return new Uint8Array(this.buffer);
    }

    /**
     * Set left margin in characters (ESC l command).
     * ESC l n — sets leftmost column for printing to n chars from left edge.
     * Most thermal printers support this.
     */
    setLeftMarginChars(n: number) {
        this.buffer.push(0x1B, 0x6C, n);
    }

    /**
     * Alternative: Pad every line manually with spaces (universal fallback)
     * if ESC l is not supported by the printer.
     */
    padLeft(str: string, marginChars: number) {
        return ' '.repeat(marginChars) + str;
    }
}

function formatLine(left: string, right: string, width: number) {
    const spaceCount = width - left.length - right.length;
    if (spaceCount > 0) {
        return left + ' '.repeat(spaceCount) + right;
    } else {
        return left.substring(0, width - right.length - 1) + ' ' + right;
    }
}

export async function printReceiptBluetooth(
    tx: any, 
    settings: any, 
    paperSize: 58 | 80,
    paymentMethod: string,
    payAmount: number,
    change: number
) {
    if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth tidak didukung di browser/perangkat ini. Pastikan Anda menggunakan Chrome di Android/PC.');
    }

    // Paper width in characters & margin settings
    // 58mm ≈ 32 chars, 80mm ≈ 48 chars
    // Left margin: 1 char on each side to prevent text touching the paper edge
    const MARGIN = 1;
    const width = (paperSize === 58 ? 32 : 48) - MARGIN * 2;
    const encoder = new EscPosEncoder();

    // 1. GENERATE RECEIPT DATA
    encoder.initialize();

    // Set left margin via ESC l (hardware margin, 1 char = ~2.5mm on 58mm)
    encoder.setLeftMarginChars(MARGIN);
    
    // Header
    encoder.alignCenter();
    encoder.bold(true);
    encoder.doubleSize();
    encoder.line((settings?.cafeName || 'VOC SYSTEM').toUpperCase());
    encoder.normalSize();
    encoder.bold(false);
    
    if (settings?.address) {
        encoder.line(settings.address);
    }
    if (settings?.phone) {
        encoder.line(`Telp: ${settings.phone}`);
    }
    encoder.feed(1);

    // Info
    encoder.alignLeft();
    encoder.line(`No    : ${tx?.transactionId || tx?.id || '-'}`);
    encoder.line(`Tgl   : ${new Date().toLocaleString('id-ID')}`);
    encoder.line(`Kasir : ${tx?.cashierName || tx?.createdBy || 'System'}`);
    encoder.line(`Meja  : ${tx?.table?.tableName || tx?.cafeTable?.tableName || 'Order Cabinet'}`);
    encoder.separator(width);

    // Billiard Session
    if (Number(tx?.billiardTotal) > 0) {
        encoder.line('BILLIARD');
        encoder.line(`${tx.fareName || 'Tarif'} x ${tx.sessionDuration}`);
        encoder.alignRight();
        encoder.line(Number(tx.billiardTotal).toLocaleString('id-ID'));
        encoder.alignLeft();
    }

    // Cafe Items
    if (tx?.orders?.length > 0 || tx?.cafeItems?.length > 0) {
        const items = tx.orders || tx.cafeItems;
        encoder.line('F&B ITEMS');
        items.forEach((item: any) => {
            const name = item?.menuItem?.name || item?.name || 'Item';
            const qty = item?.quantity || 1;
            const price = Number(item?.price || 0);
            const total = qty * price;
            
            encoder.line(name);
            encoder.line(formatLine(`  ${qty} x ${price.toLocaleString('id-ID')}`, total.toLocaleString('id-ID'), width));
        });
    }
    encoder.separator(width);

    // Summary
    const subtotal = (Number(tx.billiardTotal)||0) + (Number(tx.cafeTotal)||0);
    const disc = Number(tx.discountAmount || tx.sessionTotals?.discountAmount || 0);
    const tax = Number(tx.vatAmount || 0) + Number(tx.serviceChargeAmount || 0);
    const grand = Number(tx.grandTotal || 0);

    encoder.line(formatLine('Subtotal', subtotal.toLocaleString('id-ID'), width));
    if (disc > 0) {
        encoder.line(formatLine('Discount', `-${disc.toLocaleString('id-ID')}`, width));
    }
    if (tax > 0) {
        encoder.line(formatLine('Tax+Svc', tax.toLocaleString('id-ID'), width));
    }
    
    encoder.bold(true);
    encoder.line(formatLine('TOTAL', grand.toLocaleString('id-ID'), width));
    encoder.bold(false);
    
    encoder.separator(width);
    
    encoder.line(formatLine('DIBAYAR', payAmount.toLocaleString('id-ID'), width));
    encoder.line(formatLine('METODE', paymentMethod.toUpperCase(), width));
    if (change > 0) {
        encoder.line(formatLine('KEMBALI', change.toLocaleString('id-ID'), width));
    }

    // Footer
    encoder.feed(1);
    encoder.alignCenter();
    encoder.line('Terima Kasih Atas Kunjungan Anda');
    encoder.feed(3);
    encoder.cut();

    const payload = encoder.build();

    // 2. BLUETOOTH TRANSFER
    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                '000018f0-0000-1000-8000-00805f9b34fb', // Thermal printer common service
                'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
                '00001101-0000-1000-8000-00805f9b34fb'  // Generic Serial Port Profile
            ]
        });

        if (!device.gatt) throw new Error('Bluetooth GATT not supported');

        const server = await device.gatt.connect();
        
        // Coba cari service thermal printer
        const services = await server.getPrimaryServices();
        if (services.length === 0) throw new Error('No services found on device');

        // Pilih service pertama yang valid, lalu cari characteristic yang bisa di-write
        let writeCharacteristic: any = null;
        for (const service of services) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                    writeCharacteristic = char;
                    break;
                }
            }
            if (writeCharacteristic) break;
        }

        if (!writeCharacteristic) {
            throw new Error('Tidak menemukan characteristic printer yang bisa ditulisi.');
        }

        // Kirim data menggunakan Chunk (MTU biasanya kecil, misal 200 bytes)
        const chunkSize = 200;
        for (let i = 0; i < payload.length; i += chunkSize) {
            const chunk = payload.slice(i, i + chunkSize);
            await writeCharacteristic.writeValue(chunk);
            // Tunggu sebentar agar printer tidak kewalahan
            await new Promise(r => setTimeout(r, 20)); 
        }

        // Jangan lupa diskonek
        if (device.gatt.connected) {
            device.gatt.disconnect();
        }

    } catch (error: any) {
        console.error('Bluetooth Print Error:', error);
        throw error;
    }
}
