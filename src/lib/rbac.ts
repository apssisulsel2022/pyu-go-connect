export type Permission = 
  | "ride:create" | "ride:read" | "ride:update" | "ride:delete"
  | "shuttle:create" | "shuttle:read" | "shuttle:update" | "shuttle:delete"
  | "hotel:create" | "hotel:read" | "hotel:update" | "hotel:delete"
  | "driver:status:toggle" | "driver:location:update"
  | "wallet:view" | "wallet:topup" | "wallet:pay"
  | "admin:dashboard:view" | "admin:user:manage" | "admin:driver:manage"
  | "admin:payment:manage" | "admin:settings:manage";

export type Role = "admin" | "driver" | "user" | "moderator";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "ride:create", "ride:read", "ride:update", "ride:delete",
    "shuttle:create", "shuttle:read", "shuttle:update", "shuttle:delete",
    "hotel:create", "hotel:read", "hotel:update", "hotel:delete",
    "driver:status:toggle", "driver:location:update",
    "wallet:view", "wallet:topup", "wallet:pay",
    "admin:dashboard:view", "admin:user:manage", "admin:driver:manage",
    "admin:payment:manage", "admin:settings:manage"
  ],
  driver: [ // Driver role
    "ride:read", "ride:update",
    "shuttle:read",
    "driver:status:toggle", "driver:location:update",
    "wallet:view", "wallet:pay"
  ],
  moderator: [ // Legacy Driver role (backward compatibility)
    "ride:read", "ride:update",
    "shuttle:read",
    "driver:status:toggle", "driver:location:update",
    "wallet:view", "wallet:pay"
  ],
  user: [
    "ride:create", "ride:read",
    "shuttle:read",
    "hotel:read",
    "wallet:view", "wallet:topup", "wallet:pay"
  ]
};

export const hasPermission = (userRole: Role, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

export const hasAnyPermission = (userRole: Role, permissions: Permission[]): boolean => {
  return permissions.some(p => hasPermission(userRole, p));
};
