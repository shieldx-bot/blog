import bcrypt from 'bcryptjs';
import { getDatabase } from './mongodb';

export interface AdminSession {
  id: string;
  email: string;
  role: string;
}

export interface AdminRecord {
  email: string;
  password?: string;
  role?: string;
  enabled?: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function getAdminByEmail(email: string): Promise<AdminRecord | null> {
  try {
    const db = await getDatabase();
    const admin = await db.collection<AdminRecord>('admins').findOne({ 
      email: email.toLowerCase().trim(),
      enabled: { $ne: false }
    });
    return admin;
  } catch (error) {
    console.error('Error getting admin:', error);
    return null;
  }
}

export async function createAdmin(email: string, password: string, role: string = 'owner') {
  try {
    const db = await getDatabase();
    const hashedPassword = await hashPassword(password);
    
    const result = await db.collection('admins').insertOne({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result;
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  }
}

export async function resetAdminPassword(email: string, password: string) {
  try {
    const db = await getDatabase();
    const hashedPassword = await hashPassword(password);

    await db.collection('admins').updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
          enabled: true,
        },
        $setOnInsert: {
          email: email.toLowerCase().trim(),
          role: process.env.ADMIN_ROLE || 'owner',
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error resetting admin password:', error);
    throw error;
  }
}

export async function ensureAdminExists() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    
    if (!email || !password) {
      return false;
    }

    const existingAdmin = await getAdminByEmail(email);
    
    if (!existingAdmin) {
      await createAdmin(email, password, process.env.ADMIN_ROLE || 'owner');
      console.log('Admin user created');
    } else if (!existingAdmin.password) {
      await resetAdminPassword(email, password);
      console.log('Admin password repaired');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring admin exists:', error);
    return false;
  }
}
