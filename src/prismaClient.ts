import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const client = global.prisma || new PrismaClient();
 

export default client;
