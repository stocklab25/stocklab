import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  });

  // Add retry logic for database operations
  const originalQuery = client.$queryRaw;
  const originalExecute = client.$executeRaw;

  client.$queryRaw = async (...args: any[]) => {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await originalQuery.apply(client, args);
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error
        const isRetryable = 
          error.code === 'P2034' || // Transaction error
          error.code === 'P2037' || // Prepared statement conflict
          error.code === 'P1001' || // Connection error
          error.code === 'P1017';   // Authentication error

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    throw lastError;
  };

  client.$executeRaw = async (...args: any[]) => {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await originalExecute.apply(client, args);
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error
        const isRetryable = 
          error.code === 'P2034' || // Transaction error
          error.code === 'P2037' || // Prepared statement conflict
          error.code === 'P1001' || // Connection error
          error.code === 'P1017';   // Authentication error

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    throw lastError;
  };

  return client;
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma; 
