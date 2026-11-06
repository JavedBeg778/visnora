// Visnora — User Profile Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/SECURITY.md

import { prisma } from '../../database/src/client';

export async function syncUserProfile(user: {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}) {
  return await prisma.userProfile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email.toLowerCase().trim(),
      fullName: user.fullName || user.email.split('@')[0],
      avatarUrl: user.avatarUrl,
    },
    update: {
      email: user.email.toLowerCase().trim(),
      ...(user.fullName ? { fullName: user.fullName } : {}),
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    },
  });
}

export async function getUserProfile(userId: string) {
  return await prisma.userProfile.findUnique({
    where: { id: userId },
  });
}

export async function updateUserProfile(
  userId: string,
  data: {
    fullName?: string;
    avatarUrl?: string;
    company?: string;
  }
) {
  return await prisma.userProfile.update({
    where: { id: userId },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      ...(data.company !== undefined ? { company: data.company } : {}),
    },
  });
}

