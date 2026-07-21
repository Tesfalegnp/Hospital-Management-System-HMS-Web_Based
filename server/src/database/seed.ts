import bcrypt from "bcrypt";
import prisma from "./prisma.js";
import { Role } from "@prisma/client";

const SYSTEM_PERMISSIONS = [
  {
    code: "system:permission:view",
    name: "View System Permissions",
    description: "Allows viewing permission registry list and details",
    module: "system",
    resource: "permission",
    action: "view",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:permission:create",
    name: "Create System Permission",
    description: "Allows defining new atomic system permissions",
    module: "system",
    resource: "permission",
    action: "create",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:permission:update",
    name: "Update System Permission",
    description: "Allows updating permission metadata and descriptions",
    module: "system",
    resource: "permission",
    action: "update",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:permission:disable",
    name: "Disable / Enable System Permission",
    description: "Allows toggling active and disabled status of system permissions",
    module: "system",
    resource: "permission",
    action: "disable",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:user:view",
    name: "View System Users",
    description: "Allows viewing system user accounts",
    module: "system",
    resource: "user",
    action: "view",
    category: "User Management",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:user:create",
    name: "Create System User",
    description: "Allows creating new user accounts",
    module: "system",
    resource: "user",
    action: "create",
    category: "User Management",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:user:edit",
    name: "Edit System User",
    description: "Allows modifying user account details",
    module: "system",
    resource: "user",
    action: "edit",
    category: "User Management",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:role:view",
    name: "View System Roles",
    description: "Allows viewing enterprise role definitions and role permissions",
    module: "system",
    resource: "role",
    action: "view",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:role:create",
    name: "Create System Role",
    description: "Allows defining new enterprise roles and hierarchies",
    module: "system",
    resource: "role",
    action: "create",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:role:update",
    name: "Update System Role",
    description: "Allows updating role metadata and parent hierarchy",
    module: "system",
    resource: "role",
    action: "update",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:role:disable",
    name: "Disable / Delete System Role",
    description: "Allows toggling role active status and soft deleting custom roles",
    module: "system",
    resource: "role",
    action: "disable",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:role:permission",
    name: "Manage Role Permissions",
    description: "Allows assigning and revoking permissions on enterprise roles",
    module: "system",
    resource: "role",
    action: "permission",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:user-role:view",
    name: "View User Roles",
    description: "Allows viewing user role assignments",
    module: "system",
    resource: "user-role",
    action: "view",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:user-role:create",
    name: "Assign User Roles",
    description: "Allows assigning enterprise roles to system users",
    module: "system",
    resource: "user-role",
    action: "create",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:user-role:update",
    name: "Modify User Roles",
    description: "Allows modifying or revoking user role assignments",
    module: "system",
    resource: "user-role",
    action: "update",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
  {
    code: "system:user-role:permission-preview",
    name: "Preview User Effective Permissions",
    description: "Allows previewing dynamic computed permissions for a system user",
    module: "system",
    resource: "user-role",
    action: "permission-preview",
    category: "System Administration",
    isSystem: true,
    isActive: true,
  },
];

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed Core System Permissions (Idempotent upserts)
  console.log("🔐 Seeding system permissions...");
  const createdPermissions = [];
  for (const permData of SYSTEM_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code: permData.code },
      update: {
        name: permData.name,
        description: permData.description,
        module: permData.module,
        resource: permData.resource,
        action: permData.action,
        category: permData.category,
        isSystem: permData.isSystem,
        isActive: permData.isActive,
      },
      create: permData,
    });
    createdPermissions.push(perm);
  }
  console.log(`✅ ${createdPermissions.length} System permissions seeded.`);

  // 2. Seed Default Super Administrator RoleDefinition
  console.log("👑 Seeding Super Administrator RoleDefinition...");
  const superAdminRole = await prisma.roleDefinition.upsert({
    where: { code: "SUPER_ADMIN_ROLE" },
    update: {
      name: "Super Administrator",
      description: "Full system access across all hospitals, branches, and security modules",
      level: 100,
      isSystem: true,
      isBuiltIn: true,
      isActive: true,
    },
    create: {
      code: "SUPER_ADMIN_ROLE",
      name: "Super Administrator",
      description: "Full system access across all hospitals, branches, and security modules",
      level: 100,
      isSystem: true,
      isBuiltIn: true,
      isActive: true,
    },
  });

  // 3. Link Permissions to Super Admin RoleDefinition
  for (const perm of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: { deletedAt: null },
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // 4. Seed Default Super Administrator Account
  const adminEmail = "admin@hospital.local";
  const defaultPassword = "Admin@12345";

  let superAdminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!superAdminUser) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    superAdminUser = await prisma.user.create({
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
    console.log(`✅ Default Super Administrator user created (${superAdminUser.email}).`);
  } else {
    console.log(`ℹ️ Default Super Administrator user already exists (${superAdminUser.email}).`);
  }

  // 5. Link User to Super Admin RoleDefinition via UserRole
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
      deletedAt: null,
    },
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
      },
    });
    console.log(`✅ UserRole assignment created linking ${superAdminUser.email} to ${superAdminRole.name}.`);
  }

  console.log("🌱 Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
