import type { Branch } from '@/hooks/useBranchQuery'

export interface LineChannel {
  id: string
  name: string
  description: string | null
  channelAccessToken: string
  channelSecret: string
  webhookUrl: string | null
  isActive: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
  branches: BranchLineChannel[]
}

export interface BranchLineChannel {
  id: string
  branchId: string
  lineChannelId: string
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
  branch?: Branch
  lineChannel?: LineChannel
}

export interface CreateLineChannelInput {
  name: string
  description?: string
  channelAccessToken: string
  channelSecret: string
  isActive?: boolean
  branchIds?: string[]
}

export interface UpdateLineChannelInput {
  name?: string
  description?: string | null
  channelAccessToken?: string
  channelSecret?: string
  isActive?: boolean
  isDefault?: boolean
}

export interface AssignBranchesInput {
  branchIds: string[]
}

export interface TestChannelInput {
  channelAccessToken: string
  channelSecret: string
}

export interface LineChannelResponse {
  id: string
  name: string
  description: string | null
  webhookUrl: string | null
  isActive: boolean
  isDefault: boolean
  channelAccessTokenPreview: string
  channelSecretPreview: string
  createdAt: string
  updatedAt: string
  branches: {
    id: string
    branchId: string
    isPrimary: boolean
    branch: {
      id: string
      name: string
    }
  }[]
}

export interface LineChannelListResponse {
  data: LineChannelResponse[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}