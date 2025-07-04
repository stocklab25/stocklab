import { PrismaClient } from '@prisma/client'

// Add query parameter to disable prepared statements in production
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL
  if (process.env.NODE_ENV === 'production' && baseUrl) {
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}prepared_statements=false`
  }
  return baseUrl
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

export { prisma } 