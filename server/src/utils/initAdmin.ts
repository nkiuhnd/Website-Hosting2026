import bcrypt from 'bcryptjs';
import prisma from '../prisma';

export const createDefaultAdmin = async () => {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.warn('Warning: ADMIN_USERNAME or ADMIN_PASSWORD not found in .env. Skipping admin account creation.');
    return;
  }

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
      // Ensure the existing admin has ADMIN role and sync password from env
      console.log(`Checking existing admin user ${adminUsername}...`);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      // We update the password to match .env to ensure the environment variable is the source of truth
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { 
            role: 'ADMIN',
            password: hashedPassword
        }
      });
      console.log(`Admin user ${adminUsername} updated (role and password synced).`);
    }

    // Security Cleanup: Delete ANY other admin users that do not match the current ADMIN_USERNAME
    // This prevents old admin accounts (with potentially weak passwords) from lingering.
    const otherAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        username: { not: adminUsername }
      }
    });

    if (otherAdmins.length > 0) {
      console.log(`Found ${otherAdmins.length} redundant admin account(s). Executing security cleanup...`);
      for (const oldAdmin of otherAdmins) {
        console.warn(`[Security] Deleting old admin account: ${oldAdmin.username}`);
        await prisma.user.delete({ where: { id: oldAdmin.id } });
      }
      console.log('Security cleanup completed. Only the current env-configured admin remains.');
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
