import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    username: true,
    role: true,
    isActive: true,
    isVerified: true,
    createdAt: true,
    updatedAt: true,
  };

  async create(createUserDto: CreateUserDto) {
    const { password, ...rest } = createUserDto;
    
    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    return this.prisma.user.create({
      data: {
        ...rest,
        password: hashedPassword,
      },
      select: this.userSelect,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: this.userSelect,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const { password, ...rest } = updateUserDto;
    
    const data: any = { ...rest };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure user exists
    return this.prisma.user.delete({
      where: { id },
      select: { id: true, email: true },
    });
  }
}
