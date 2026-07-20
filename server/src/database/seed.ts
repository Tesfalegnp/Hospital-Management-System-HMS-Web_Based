import bcrypt from "bcrypt";
import prisma from "./prisma.js";
import { Role } from "@prisma/client";

async function main() {
  console.log("🌱 Starting database seeding...");

  const adminEmail = "admin@hospital.local";
  const defaultPassword = "Admin@12345";

  // Check if a super admin already exists to keep operations idempotent
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: Role.SUPER_ADMIN,
    },
  });

  if (existingAdmin) {
    console.log(`ℹ️ Super Administrator already exists (${existingAdmin.email}). Skipping creation.`);
  } else {
    // Check if the specific admin email is occupied by another role
    const emailConflict = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (emailConflict) {
      console.log(`⚠️ Email ${adminEmail} is already taken by user with role ${emailConflict.role}. Seeding aborted.`);
      return;
    }

    // Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    // Create the system super administrator account
    const superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        role: Role.SUPER_ADMIN,
        isActive: true,
        isEmailVerified: true,
      },
    });

    console.log(`✅ Default Super Administrator seeded successfully:`);
    console.log(`   - Email: ${superAdmin.email}`);
    console.log(`   - Role: ${superAdmin.role}`);
  }

  console.log("🌱 Seeding completed.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
