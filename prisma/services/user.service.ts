import { PrismaClient, User, UserRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
}

export interface GetUsersOptions {
  page?: number;
  limit?: number;
  role?: UserRole;
  search?: string;
  showDeleted?: boolean;
}

export interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class UserService {
  /**
   * Get users with pagination and filtering
   */
  static async getUsers(options: GetUsersOptions = {}): Promise<UsersResponse> {
    const {
      page = 1,
      limit = 10,
      role,
      search = '',
      showDeleted = false
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {};

    if (!showDeleted) {
      whereClause.deletedAt = null;
    }

    if (role) {
      whereClause.role = role;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users with pagination
    const users = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Get total count for pagination
    const total = await prisma.user.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get a single user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });
  }

  /**
   * Get a user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { email, deletedAt: null }
    });
  }

  /**
   * Create a new user
   */
  static async createUser(data: CreateUserData): Promise<User> {
    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null }
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role || 'USER',
      },
    });
  }

  /**
   * Update a user
   */
  static async updateUser(id: string, data: UpdateUserData): Promise<User> {
    // Check if email already exists (if updating email)
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: { 
          email: data.email, 
          deletedAt: null,
          id: { not: id }
        }
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    // Hash password if provided
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Soft delete a user
   */
  static async softDeleteUser(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Hard delete a user (use with caution)
   */
  static async hardDeleteUser(id: string): Promise<User> {
    return await prisma.user.delete({
      where: { id }
    });
  }

  /**
   * Verify user password
   */
  static async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return false;
    }

    return await bcrypt.compare(password, user.password);
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    return await prisma.user.findMany({
      where: { 
        role,
        deletedAt: null 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get total user count
   */
  static async getUserCount(includeDeleted: boolean = false): Promise<number> {
    const whereClause = includeDeleted ? {} : { deletedAt: null };
    return await prisma.user.count({ where: whereClause });
  }

  /**
   * Get user statistics
   */
  static async getUserStats() {
    const totalUsers = await prisma.user.count({
      where: { deletedAt: null }
    });

    const adminUsers = await prisma.user.count({
      where: { 
        role: 'ADMIN',
        deletedAt: null 
      }
    });

    const regularUsers = await prisma.user.count({
      where: { 
        role: 'USER',
        deletedAt: null 
      }
    });

    return {
      total: totalUsers,
      admins: adminUsers,
      users: regularUsers,
    };
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    return user?.role === 'ADMIN';
  }

  /**
   * Get user with their transactions
   */
  static async getUserWithTransactions(userId: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        stockTransactions: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
          include: {
            product: true,
          },
        },
      },
    });
  }
} 