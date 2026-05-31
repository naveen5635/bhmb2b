import { PrismaClient } from '@prisma/client';
import { comparePassword, hashPassword } from '../utils/password.utils';
import { signToken } from '../utils/jwt.utils';

const prisma = new PrismaClient();

export class AuthService {
  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive || user.deletedAt) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }
    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    const { password: _pwd, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name  !== undefined ? { name:  data.name }  : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
      },
      select: { id: true, username: true, role: true, name: true, email: true, isActive: true, createdAt: true },
    });
    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }
    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      throw Object.assign(new Error('Current password is incorrect'), {
        status: 400,
      });
    }
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }
}
