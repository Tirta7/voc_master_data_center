import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  AccessRequest,
  AccessRequestStatus,
} from './entities/access-request.entity';
import { SettingsService } from '../settings/settings.service';
import { EventsGateway } from '../socket/events.gateway';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRepository(AccessRequest)
    private accessRequestRepository: Repository<AccessRequest>,
    private settingsService: SettingsService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userService.findByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      if (user.isVerified === false) {
        throw new UnauthorizedException(
          'Akun Anda sedang dinonaktifkan (Unverified). Hubungi Admin.',
        );
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async createAccessRequest(user: any, socketId?: string) {
    // 1. Check if user already has a pending or recently approved request (within 5 mins)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await this.accessRequestRepository.findOne({
      where: {
        userId: user.id,
        status: AccessRequestStatus.PENDING,
        createdAt: MoreThan(fiveMinsAgo),
      },
    });

    if (existing) return existing;

    // 2. Validate Shift
    const settings = await this.settingsService.getSettings();
    const baseShift = settings.availableShifts?.find(
      (s) => s.name === user.baseShift,
    );

    let isOutOfShift = false;
    let shiftTimeRange = '';

    if (baseShift) {
      shiftTimeRange = `${baseShift.startTime} - ${baseShift.endTime}`;
      const now = new Date();
      const currentTime =
        now.getHours().toString().padStart(2, '0') +
        ':' +
        now.getMinutes().toString().padStart(2, '0');

      // Basic wrap-around check for shifts like 22:00 - 06:00
      if (baseShift.startTime < baseShift.endTime) {
        isOutOfShift =
          currentTime < baseShift.startTime || currentTime > baseShift.endTime;
      } else {
        // Night shift
        isOutOfShift =
          currentTime < baseShift.startTime && currentTime > baseShift.endTime;
      }
    }

    const request = this.accessRequestRepository.create({
      userId: user.id,
      username: user.username,
      employeeName: user.name,
      roleName: (user.role?.name?.toUpperCase() ||
        user.role?.toUpperCase() ||
        'USER') as string,
      isOutOfShift,
      shiftName: user.baseShift || undefined,
      shiftTimeRange: shiftTimeRange || undefined,
      status: AccessRequestStatus.PENDING,
      socketId: socketId || undefined,
    });

    const saved = await this.accessRequestRepository.save(request);

    // Notify Admins
    if (this.eventsGateway.server) {
      this.eventsGateway.server.emit('new_access_request', saved);
    }

    return saved;
  }

  async getPendingAccessRequests() {
    return this.accessRequestRepository.find({
      where: { status: AccessRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async approveAccessRequest(
    requestId: number,
    adminId: number,
    adminName: string,
    note?: string,
  ) {
    const request = await this.accessRequestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) throw new BadRequestException('Request not found');

    request.status = AccessRequestStatus.APPROVED;
    request.approvedBy = adminId;
    request.approvedByName = adminName;
    request.note = note || undefined;
    const saved = await this.accessRequestRepository.save(request);

    // Generate full token for the user now
    const user = await this.userService.findById(request.userId);
    if (!user) throw new BadRequestException('User not found');
    const tokenData = await this.login(user);

    // Notify Waiter via socket if socketId exists
    if (request.socketId && this.eventsGateway.server) {
      this.eventsGateway.server.to(request.socketId).emit('access_approved', {
        requestId: saved.id,
        ...tokenData,
      });
    } else if (this.eventsGateway.server) {
      // Fallback for polling or general broadcast
      this.eventsGateway.server.emit('access_approved_global', {
        userId: request.userId,
        requestId: saved.id,
        ...tokenData,
      });
    }

    // Notify other Admins to remove this request from UI
    if (this.eventsGateway.server) {
      this.eventsGateway.server.emit('access_request_handled', {
        requestId: saved.id,
      });
    }

    return saved;
  }

  async denyAccessRequest(
    requestId: number,
    adminId: number,
    adminName: string,
    note?: string,
  ) {
    const request = await this.accessRequestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) throw new BadRequestException('Request not found');

    request.status = AccessRequestStatus.DENIED;
    request.approvedBy = adminId;
    request.approvedByName = adminName;
    request.note = note || undefined;
    const saved = await this.accessRequestRepository.save(request);

    if (request.socketId && this.eventsGateway.server) {
      this.eventsGateway.server.to(request.socketId).emit('access_denied', {
        requestId: saved.id,
        note: note || undefined,
      });
    }

    // Notify other Admins to remove this request from UI
    if (this.eventsGateway.server) {
      this.eventsGateway.server.emit('access_request_handled', {
        requestId: saved.id,
      });
    }

    return saved;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role?.name || user.role,
        permissions: user.role?.permissions || user.permissions,
        assignedTableIds: user.assignedTableIds,
      },
    };
  }
}
