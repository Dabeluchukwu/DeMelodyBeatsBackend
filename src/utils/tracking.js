import prisma from '../lib/prisma.js';

// Helper to create audit log entries
export const createAuditLog = async (action, entity, entityId, user, changes = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        changes: changes ? JSON.stringify(changes) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

// Helper to get user info for tracking
export const getUserInfo = (req) => {
  return req.user || null;
};

// Helper to add createdBy/updatedBy to create operations
export const withCreatedBy = (data, user) => {
  return {
    ...data,
    createdById: user.id,
  };
};

// Helper to add updatedBy to update operations
export const withUpdatedBy = (data, user) => {
  return {
    ...data,
    updatedById: user.id,
  };
};