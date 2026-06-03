import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  const status: any = {
    mongodb: false,
    admin: false,
    env: {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasMongoDb: !!process.env.MONGODB_DB,
      hasAdminEmail: !!process.env.ADMIN_EMAIL,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD
    }
  };

  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    status.mongodb = true;

    const adminCount = await db.collection('admins').countDocuments();
    status.admin = adminCount > 0;
    status.adminCount = adminCount;
  } catch (error: any) {
    status.mongodbError = error.message;
  }

  return NextResponse.json(status);
}
