import prisma from "../database/prisma.js";

export interface PermissionScope {
  hospitalId?: string | null;
  branchId?: string | null;
}

export interface ResolvedUserRole {
  userRoleId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  level: number;
  hospitalId: string | null;
  branchId: string | null;
}

export interface EffectivePermissionsResult {
  userId: string;
  scope: PermissionScope;
  grantedPermissions: Set<string>;
  deniedPermissions: Set<string>;
  roles: ResolvedUserRole[];
  evaluatedAt: Date;
}

export class PermissionService {
  /**
   * Resolves the complete effective permissions result for a user within a target tenant scope.
   * Mandated 4-Step Resolution Algorithm:
   * 1. Explicit DENY overrides (UserPermissionOverride with isGranted = false) -> Absolute Priority
   * 2. Explicit GRANT overrides (UserPermissionOverride with isGranted = true)
   * 3. Role-Based Permissions (UserRole -> RoleDefinition -> RolePermission -> Permission + Parent Role Inheritance)
   * 4. Default DENY for any unlisted permission.
   */
  async getEffectivePermissionsResult(
    userId: string,
    scope: PermissionScope = {}
  ): Promise<EffectivePermissionsResult> {
    const now = new Date();

    // Step 1: Query User Permission Overrides (Filtering out deleted or expired overrides)
    const overrides = await prisma.userPermissionOverride.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        permission: true,
      },
    });

    const explicitDenies = new Set<string>();
    const explicitGrants = new Set<string>();

    for (const override of overrides) {
      // Scope matching check: override scope must match global or requested scope
      const matchesHospital =
        !override.hospitalId || !scope.hospitalId || override.hospitalId === scope.hospitalId;
      const matchesBranch =
        !override.branchId || !scope.branchId || override.branchId === scope.branchId;

      if (matchesHospital && matchesBranch && override.permission?.code) {
        if (!override.isGranted) {
          explicitDenies.add(override.permission.code);
        } else {
          explicitGrants.add(override.permission.code);
        }
      }
    }

    // Step 2 & 3: Query active User Roles & Role Hierarchy Traversal
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: { deletedAt: null },
              include: {
                permission: true,
              },
            },
            parentRole: {
              include: {
                rolePermissions: {
                  where: { deletedAt: null },
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    const rolePermissionsSet = new Set<string>();
    const resolvedRoles: ResolvedUserRole[] = [];

    for (const userRoleAssignment of userRoles) {
      // Tenant Scope Check: assignment must match global or target scope
      const matchesHospital =
        !userRoleAssignment.hospitalId ||
        !scope.hospitalId ||
        userRoleAssignment.hospitalId === scope.hospitalId;
      const matchesBranch =
        !userRoleAssignment.branchId ||
        !scope.branchId ||
        userRoleAssignment.branchId === scope.branchId;

      if (matchesHospital && matchesBranch && userRoleAssignment.role) {
        const role = userRoleAssignment.role;
        if (role.isActive && !role.deletedAt) {
          resolvedRoles.push({
            userRoleId: userRoleAssignment.id,
            roleId: role.id,
            roleCode: role.code,
            roleName: role.name,
            level: role.level || 0,
            hospitalId: userRoleAssignment.hospitalId,
            branchId: userRoleAssignment.branchId,
          });

          // Direct role permissions
          for (const rp of role.rolePermissions) {
            if (rp.permission?.code && rp.permission.isActive && !rp.permission.deletedAt) {
              rolePermissionsSet.add(rp.permission.code);
            }
          }

          // Inherited parent role permissions
          let parent = role.parentRole;
          while (parent) {
            if (parent.isActive && !parent.deletedAt) {
              for (const prp of parent.rolePermissions) {
                if (prp.permission?.code && prp.permission.isActive && !prp.permission.deletedAt) {
                  rolePermissionsSet.add(prp.permission.code);
                }
              }
            }
            parent = null; // Recursion limit guard for depth 1
          }
        }
      }
    }

    // Combine Role Permissions + Explicit Grants, then subtract Explicit Denies
    const grantedPermissions = new Set<string>();

    for (const permCode of rolePermissionsSet) {
      if (!explicitDenies.has(permCode)) {
        grantedPermissions.add(permCode);
      }
    }

    for (const permCode of explicitGrants) {
      if (!explicitDenies.has(permCode)) {
        grantedPermissions.add(permCode);
      }
    }

    return {
      userId,
      scope,
      grantedPermissions,
      deniedPermissions: explicitDenies,
      roles: resolvedRoles,
      evaluatedAt: now,
    };
  }

  /**
   * Retrieves the Set of granted permission codes for a user.
   */
  async getEffectivePermissions(
    userId: string,
    scope: PermissionScope = {}
  ): Promise<Set<string>> {
    const result = await this.getEffectivePermissionsResult(userId, scope);
    return result.grantedPermissions;
  }

  /**
   * Evaluates if a user possesses a specific permission code under target scope.
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
    scope: PermissionScope = {}
  ): Promise<boolean> {
    const permissions = await this.getEffectivePermissions(userId, scope);
    return permissions.has(permissionCode);
  }

  /**
   * Evaluates if a user possesses ANY of the listed permission codes under target scope.
   */
  async hasAnyPermission(
    userId: string,
    permissionCodes: string[],
    scope: PermissionScope = {}
  ): Promise<boolean> {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    const permissions = await this.getEffectivePermissions(userId, scope);
    return permissionCodes.some((code) => permissions.has(code));
  }

  /**
   * Evaluates if a user possesses ALL of the listed permission codes under target scope.
   */
  async hasAllPermissions(
    userId: string,
    permissionCodes: string[],
    scope: PermissionScope = {}
  ): Promise<boolean> {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    const permissions = await this.getEffectivePermissions(userId, scope);
    return permissionCodes.every((code) => permissions.has(code));
  }

  /**
   * Retrieves active resolved user roles under target scope.
   */
  async getUserRoles(
    userId: string,
    scope: PermissionScope = {}
  ): Promise<ResolvedUserRole[]> {
    const result = await this.getEffectivePermissionsResult(userId, scope);
    return result.roles;
  }
}

export const permissionService = new PermissionService();
export default permissionService;
