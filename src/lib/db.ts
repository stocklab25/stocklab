import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// Enhanced configuration with better error handling
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  });

  return client;
};

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
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
      
      console.error(`Database operation failed (attempt ${attempt}/${maxRetries}):`, {
        operation: params.action,
        model: params.model,
        error: error.message,
        code: error.code
      });
      
      // Handle transaction errors
      if (error?.code === 'P2028' || error?.message?.includes('Transaction not found')) {
        console.warn(`Transaction error detected, retrying... (attempt ${attempt}/${maxRetries})`);
        // Disconnect and reconnect to clear transaction state
        await prisma.$disconnect();
        await prisma.$connect();
        await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Short delay
        continue;
      }
      
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
      
      // Handle authentication errors
      if (error?.code === 'P1017' && attempt < maxRetries) {
        console.warn(`Database authentication failed, retrying... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
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
    console.log('✅ Database connected successfully');
    console.log('🔗 Using connection:', process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    console.error('🔧 Please check your environment variables:');
    console.error('   - DIRECT_URL or DATABASE_URL should be set');
    console.error('   - Make sure the database credentials are correct');
    console.error('   - Verify the database server is accessible');
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma; 