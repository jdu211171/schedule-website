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
  channelType: 'UNSPECIFIED' | 'TEACHER' | 'STUDENT'
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

export interface SetChannelTypeInput {
  branchId: string
  channelId: string
  channelType: 'TEACHER' | 'STUDENT'
}

export interface BranchChannelStatus {
  branchId: string
  branchName: string
  teacherChannel?: {
    id: string
    name: string
    isActive: boolean
  }
  studentChannel?: {
    id: string
    name: string
    isActive: boolean
  }
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
    channelType: 'UNSPECIFIED' | 'TEACHER' | 'STUDENT'
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
