import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Role } from '@repo/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: Role;
}

@WebSocketGateway({
  cors: {
    origin: '*', // sesuaikan di production
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  // Map userId → Set<socketId> (1 user bisa multi-tab)
  private connectedUsers = new Map<string, Set<string>>();
  // Map role → Set<socketId>
  private roleMap = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  afterInit() {
    this.logger.log('NotificationsGateway initialized ✅', 'WS');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Ambil token dari handshake auth atau query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token) {
        client.emit('error', { message: 'No token provided' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.userRole = payload.role;

      // Hanya ADMIN dan MODERATOR yang bisa connect ke namespace ini
      // if (![Role.ADMIN, Role.MODERATOR].includes(payload.role)) {
      if (![Role.ADMIN].includes(payload.role)) {
        client.emit('error', { message: 'Insufficient permissions' });
        client.disconnect();
        return;
      }

      // Daftarkan ke map userId
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      const userIdSet = this.connectedUsers.get(payload.sub);
      if (userIdSet) {
        userIdSet.add(client.id);
      }

      // Daftarkan ke map role
      const role = payload.role as string;
      if (!this.roleMap.has(role)) {
        this.roleMap.set(role, new Set());
      }
      const roleSet = this.roleMap.get(role);
      if (roleSet) {
        roleSet.add(client.id);
      }

      // Masukkan ke room role (mudah untuk broadcast)
      client.join(`role:${role}`);
      client.join(`user:${payload.sub}`);

      this.logger.log(
        `WS connected: userId=${payload.sub} role=${role} socketId=${client.id}`,
        'WS',
      );

      client.emit('connected', {
        message: 'Connected to notification stream',
        userId: payload.sub,
        role,
      });
    } catch (err) {
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.connectedUsers.get(client.userId);
      sockets?.delete(client.id);
      if (sockets?.size === 0) this.connectedUsers.delete(client.userId);
    }
    if (client.userRole) {
      const roleSockets = this.roleMap.get(client.userRole);
      roleSockets?.delete(client.id);
    }
    this.logger.log(`WS disconnected: socketId=${client.id}`, 'WS');
  }

  /**
   * Broadcast notifikasi ke semua user dengan role tertentu
   */
  broadcastToRoles(roles: Role[], payload: any) {
    roles.forEach((role) => {
      this.server.to(`role:${role}`).emit('notification', payload);
    });
  }

  /**
   * Kirim notifikasi ke user spesifik (semua tab-nya)
   */
  sendToUser(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  /**
   * Client ping — untuk test koneksi
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Client minta unread count terbaru
   */
  @SubscribeMessage('get_unread_count')
  handleGetUnread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    // NotificationsService akan handle via HTTP endpoint
    client.emit('ack', { event: 'get_unread_count', received: true });
  }

  getConnectedCount(): number {
    return this.server?.sockets?.sockets?.size ?? 0;
  }
}
