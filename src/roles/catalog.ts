import { RoleConfig } from '../types/index.js';
import { CORE_ROLES, ALL_ROLES, toRoleConfig } from './unifiedCatalog.js';

export const DEFAULT_ROLES: RoleConfig[] = CORE_ROLES.map(toRoleConfig);
export const EXTENDED_ROLES: RoleConfig[] = ALL_ROLES.map(toRoleConfig);

