import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DIRECT_URL,
      },
    },
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DIRECT_URL,
        },
      },
    });
  }

  prisma = global.prisma;
}

// Enhanced error handling and connection management
prisma.$use(async (params, next) => {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    return await next(params);
  } catch (error: any) {
      lastError = error;
      
    // Handle prepared statement conflicts
    if (error?.code === '42P05' || error?.message?.includes('prepared statement')) {
        console.warn(`Prepared statement conflict detected, retrying... (attempt ${attempt}/${maxRetries})`);
      // Disconnect and reconnect to clear prepared statements
      await prisma.$disconnect();
      await prisma.$connect();
        continue;
      }
      
      // Handle connection errors
      if (error?.code === 'P1001' && attempt < maxRetries) {
        console.warn(`Database connection failed, retrying... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      
    throw error;
  }
  }
  
  throw lastError;
});

// Handle connection errors and reconnect
prisma.$connect()
  .then(() => {
    console.log('Database connected successfully (using direct connection)');
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma; 