import bcrypt from 'bcryptjs';
import prisma from '../prisma';

export const createDefaultAdmin = async () => {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'hanshuai1987';

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { username: adminUsername }
    });

    if (!existingAdmin) {
      console.log('Creating default admin account...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      try {
        await prisma.user.create({
          data: {
            username: adminUsername,
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE'
          }
        });
        console.log(`Default admin created: ${adminUsername}`);
      } catch (createError: any) {
        // Handle race condition where user might be created between check and create
        if (createError.code === 'P2002') {
            console.log('Admin account already exists (race condition handled).');
        } else {
            throw createError;
        }
      }
    } else {
      // Optional: Ensure the existing admin has ADMIN role
      if (existingAdmin.role !== 'ADMIN') {
        console.log('Updating existing admin user to ADMIN role...');
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: 'ADMIN' }
        });
      }
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

export const setupTestUsers = async () => {
  const testUsers = [
    { username: 'a1', password: '12345', phone: '15169378878' },
    { username: 'a2', password: '12345', phone: '15169378870' } // Modified phone to ensure uniqueness
  ];

  console.log('Checking for test users...');

  for (const userData of testUsers) {
    try {
      const existingUser = await prisma.user.findUnique({ where: { username: userData.username } });
      if (!existingUser) {
        // Check if phone number is already taken
        if (userData.phone) {
            const phoneUser = await prisma.user.findUnique({ where: { phone: userData.phone } });
            if (phoneUser) {
                console.warn(`[TestUser] Phone ${userData.phone} already taken by ${phoneUser.username}. Skipping phone for ${userData.username}.`);
                userData.phone = undefined as any; 
            }
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await prisma.user.create({
          data: {
            username: userData.username,
            password: hashedPassword,
            phone: userData.phone,
            status: 'ACTIVE',
            role: 'USER'
          }
        });
        console.log(`[TestUser] Created user: ${userData.username}`);
      }
    } catch (error) {
      console.error(`[TestUser] Error creating user ${userData.username}:`, error);
    }
  }
};
