import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BilliardGateway } from '../socket/billiard.gateway';

const execPromise = promisify(exec);

@Injectable()
export class FirmwareService {
  private readonly logger = new Logger(FirmwareService.name);
  private get cliPath(): string {
    // Check both ./bin (if started from root) and ../bin (if started from backend)
    const rootBin = path.join(process.cwd(), 'bin', 'arduino-cli.exe');
    const parentBin = path.join(process.cwd(), '..', 'bin', 'arduino-cli.exe');

    if (fs.existsSync(rootBin)) return rootBin;
    if (fs.existsSync(parentBin)) return parentBin;

    // Fallback/Legacy
    return rootBin;
  }
  private readonly fqbn = 'esp32:esp32:esp32';

  constructor(private readonly billiardGateway: BilliardGateway) {}

  async compileIno(
    code: string,
  ): Promise<{ success: boolean; log: string; binPath?: string }> {
    const projectRoot = path.join(this.cliPath, '..', '..');
    const buildRoot = path.join(projectRoot, 'firmware_builds');
    if (!fs.existsSync(buildRoot)) fs.mkdirSync(buildRoot, { recursive: true });

    const sketchName = 'SpotOn_Firmware';
    const sketchDir = path.join(buildRoot, sketchName);
    if (!fs.existsSync(sketchDir)) fs.mkdirSync(sketchDir, { recursive: true });

    const inoPath = path.join(sketchDir, `${sketchName}.ino`);
    fs.writeFileSync(inoPath, code);

    const buildDir = path.join(sketchDir, 'build');
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

    try {
      this.logger.log(`Compiling FIRMWARE for ${this.fqbn}...`);
      this.billiardGateway.server.emit('firmwareLog', {
        message: 'Inisialisasi kompilasi...',
      });

      const command = `"${this.cliPath}" compile --fqbn ${this.fqbn} --output-dir "${buildDir}" "${sketchDir}"`;

      const { stdout, stderr } = await execPromise(command);
      const fullLog = stdout + stderr;

      this.billiardGateway.server.emit('firmwareLog', {
        message: 'Kompilasi sukses!',
        success: true,
      });

      // Find the .bin file
      const binFile = path.join(buildDir, `${sketchName}.ino.bin`);
      if (fs.existsSync(binFile)) {
        // Move to a more stable location if needed, but for now return temp path
        return { success: true, log: fullLog, binPath: binFile };
      } else {
        throw new Error('Binary file not found after compilation.');
      }
    } catch (error) {
      const errorLog = error.stdout + error.stderr + (error.message || '');
      this.logger.error(`Compilation failed: ${errorLog}`);
      this.billiardGateway.server.emit('firmwareLog', {
        message: 'Kompilasi GAGAL!',
        error: errorLog,
      });
      return { success: false, log: errorLog };
    }
  }

  async flashTable(
    ip: string,
    binPath: string,
  ): Promise<{ success: boolean; log: string }> {
    if (!fs.existsSync(binPath)) {
      throw new InternalServerErrorException('Firmware binary file missing.');
    }

    try {
      this.logger.log(`Flashing to ${ip} via OTA...`);
      this.billiardGateway.server.emit('firmwareLog', {
        message: `Menghubungi ${ip} untuk injeksi firmware...`,
      });

      // arduino-cli upload -p IP --fqbn FQBN --protocol network
      const command = `"${this.cliPath}" upload -p ${ip} --fqbn ${this.fqbn} --protocol network --input-file "${binPath}"`;

      const { stdout, stderr } = await execPromise(command);
      const fullLog = stdout + stderr;

      this.billiardGateway.server.emit('firmwareLog', {
        message: `Injeksi ke ${ip} BERHASIL!`,
        success: true,
      });
      return { success: true, log: fullLog };
    } catch (error) {
      const errorLog = error.stdout + error.stderr + (error.message || '');
      this.logger.error(`Flashing failed for ${ip}: ${errorLog}`);
      this.billiardGateway.server.emit('firmwareLog', {
        message: `Injeksi ke ${ip} GAGAL!`,
        error: errorLog,
      });
      return { success: false, log: errorLog };
    }
  }
}
