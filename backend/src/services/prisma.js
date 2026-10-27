// Use the root-level Prisma client to ensure the latest generated schema is used.
// The backend's own node_modules/.prisma may be stale; the root client is always current.
// prisma.js is in backend/src/services/, so root is ../../../
let PrismaClient;
try {
  // Try root-level client first (most up-to-date, matches current schema.prisma)
  PrismaClient = require('../../../node_modules/@prisma/client').PrismaClient;
} catch {
  // Fallback to backend's own client if root not accessible
  PrismaClient = require('@prisma/client').PrismaClient;
}

// Singleton Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
