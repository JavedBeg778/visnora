// Visnora — Core Request Validation Schemas (Zod)

import { z } from 'zod';

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  orgType: z.enum(['business', 'agency', 'other']).default('business'),
  countryCode: z.string().length(2).default('IN'),
  billingEmail: z.string().email('Invalid billing email address').optional(),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  orgType: z.enum(['business', 'agency', 'other']).optional(),
  billingEmail: z.string().email('Invalid email address').optional(),
  countryCode: z.string().length(2).optional(),
});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  isArchived: z.boolean().optional(),
});

export const CreateProjectSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  name: z.string().min(2, 'Project/brand name must be at least 2 characters').max(100),
  primaryWebsite: z.string().url('Must be a valid URL (e.g. https://example.com)'),
  description: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  targetCountry: z.string().length(2).default('IN'),
  defaultLanguage: z.string().min(2).max(5).default('en'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  primaryWebsite: z.string().url('Must be a valid URL').optional(),
  description: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  targetCountry: z.string().length(2).optional(),
  defaultLanguage: z.string().min(2).max(5).optional(),
  isArchived: z.boolean().optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER', 'ANALYST', 'VIEWER']).default('MEMBER'),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'ANALYST', 'VIEWER']),
});

export const OnboardingSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  organizationWebsite: z.string().url('Invalid website URL').optional().or(z.literal('')),
  orgType: z.enum(['business', 'agency', 'other']).default('business'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters').max(100).default('Primary Workspace'),
  projectName: z.string().min(2, 'Brand/project name must be at least 2 characters').max(100),
  primaryWebsite: z.string().url('Must be a valid URL (e.g. https://example.com)'),
  industry: z.string().max(100).optional(),
});

export const CreateTrackedPromptSchema = z.object({
  projectId: z.string().uuid().optional(),
  promptText: z.string().min(5, 'Prompt must be at least 5 characters').max(1000),
  category: z.string().max(100).default('General Discovery'),
  stage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION', 'GENERAL']).default('CONSIDERATION'),
  groupId: z.string().uuid().optional().nullable(),
  topicTags: z.array(z.string().max(50)).max(10).default([]),
  targetProvider: z.enum(['google-gemini', 'openai']).default('google-gemini'),
  targetModel: z.string().min(1).max(100).default('gemini-3.8-flash'),
  targetLocale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Must be formatted as ll-CC (e.g. en-IN)').default('en-IN'),
  cadence: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL']).default('DAILY'),
  isActive: z.boolean().default(true),
});

export const UpdateTrackedPromptSchema = z.object({
  promptText: z.string().min(5).max(1000).optional(),
  category: z.string().max(100).optional(),
  stage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION', 'GENERAL']).optional(),
  groupId: z.string().uuid().optional().nullable(),
  topicTags: z.array(z.string().max(50)).max(10).optional(),
  targetProvider: z.enum(['google-gemini', 'openai']).optional(),
  targetModel: z.string().min(1).max(100).optional(),
  targetLocale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).optional(),
  cadence: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL']).optional(),
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const CreateBrandSchema = z.object({
  canonicalName: z.string().min(2, 'Brand name must be at least 2 characters').max(100),
  domain: z.string().min(2).max(100),
  aliases: z.array(z.string().max(100)).default([]),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  country: z.string().length(2).default('IN'),
  primaryLanguage: z.string().min(2).max(10).default('en'),
  additionalLanguages: z.array(z.string().max(10)).default([]),
  productsServices: z.array(z.string().max(100)).default([]),
  brandKeywords: z.array(z.string().max(100)).default([]),
  targetAudience: z.string().max(500).optional(),
  brandContext: z.string().max(2000).optional(),
  isPrimary: z.boolean().default(false),
});

export const UpdateBrandSchema = z.object({
  canonicalName: z.string().min(2).max(100).optional(),
  domain: z.string().min(2).max(100).optional(),
  aliases: z.array(z.string().max(100)).optional(),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  primaryLanguage: z.string().min(2).max(10).optional(),
  additionalLanguages: z.array(z.string().max(10)).optional(),
  productsServices: z.array(z.string().max(100)).optional(),
  brandKeywords: z.array(z.string().max(100)).optional(),
  targetAudience: z.string().max(500).optional(),
  brandContext: z.string().max(2000).optional(),
  isPrimary: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const CreateCompetitorSchema = z.object({
  canonicalName: z.string().min(2, 'Competitor name must be at least 2 characters').max(100),
  domain: z.string().min(2).max(100),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  productsServices: z.array(z.string().max(100)).default([]),
  keywords: z.array(z.string().max(100)).default([]),
  aliases: z.array(z.string().max(100)).default([]),
});

export const UpdateCompetitorSchema = z.object({
  canonicalName: z.string().min(2).max(100).optional(),
  domain: z.string().min(2).max(100).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  productsServices: z.array(z.string().max(100)).optional(),
  keywords: z.array(z.string().max(100)).optional(),
  aliases: z.array(z.string().max(100)).optional(),
  isArchived: z.boolean().optional(),
});

export const CreatePromptGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
});

export const StartTrackingRunSchema = z.object({
  promptIds: z.array(z.string().uuid()).optional(),
  groupId: z.string().uuid().optional(),
  provider: z.enum(['google-gemini', 'openai']).default('google-gemini'),
  model: z.string().min(1).max(100).default('gemini-3.8-flash'),
  enableGrounding: z.boolean().default(false),
});

export const UpdateRecommendationSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED']),
});

export const SaveTrackingScheduleSchema = z.object({
  frequency: z.enum(['HOURLY', 'DAILY', 'WEEKLY']).default('DAILY'),
  provider: z.enum(['google-gemini', 'openai']).default('google-gemini'),
  model: z.string().min(1).max(100).default('gemini-3.8-flash'),
  groupId: z.string().uuid().optional().nullable(),
  isEnabled: z.boolean().default(true),
});

export const GeneratePromptsSchema = z.object({
  count: z.number().int().min(1).max(20).default(5),
  categories: z.array(z.string()).optional(),
});

export const ConnectAdAccountSchema = z.object({
  projectId: z.string().uuid(),
  platform: z.enum(['GOOGLE_ADS', 'META_ADS', 'OPENAI_ADS']),
  accountIdExternal: z.string().min(3).max(100),
  credentialSecret: z.string().min(8),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
export type OnboardingInput = z.infer<typeof OnboardingSchema>;
export type CreateTrackedPromptInput = z.infer<typeof CreateTrackedPromptSchema>;
export type UpdateTrackedPromptInput = z.infer<typeof UpdateTrackedPromptSchema>;
export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>;
export type CreateCompetitorInput = z.infer<typeof CreateCompetitorSchema>;
export type UpdateCompetitorInput = z.infer<typeof UpdateCompetitorSchema>;
export type StartTrackingRunInput = z.infer<typeof StartTrackingRunSchema>;
export type UpdateRecommendationInput = z.infer<typeof UpdateRecommendationSchema>;
export type SaveTrackingScheduleInput = z.infer<typeof SaveTrackingScheduleSchema>;
export type ConnectAdAccountInput = z.infer<typeof ConnectAdAccountSchema>;

