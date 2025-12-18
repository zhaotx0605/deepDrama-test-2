/**
 * 剧本相关API
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
import request, { ApiResult } from './request'

// 类型定义
export interface Script {
  id: number
  scriptId: string
  name: string
  preview: string
  fileUrl: string
  tags: string
  sourceType: string
  team: string
  status: string
  genre: string
  contentType: string
  isProject: number
  projectOwner: string
  projectName: string
  remarks: string
  submitUser: string
  writer: string
  contentTeam: string
  producer: string
  producerTeam: string
  feishuUrl: string
  assignStatus: string
  submitDate: string
  avgScore: number
  ratingCount: number
  createdAt: string
  updatedAt: string
}

export interface ScriptQuery {
  page?: number
  limit?: number
  tab?: string
  unrated?: boolean
  assignStatus?: string
  statuses?: string[]
  sourceType?: string
  genre?: string
  team?: string
  contentTeam?: string
  producerTeam?: string
  isProject?: boolean
  keyword?: string
  sortBy?: string
  sortOrder?: string
  startDate?: string
  endDate?: string
  minScore?: number
  maxScore?: number
}

export interface PageResult<T> {
  total: number
  page: number
  limit: number
  list: T[]
}

/**
 * 获取剧本列表
 */
export const getScriptList = (query: ScriptQuery) => {
  return request.post<ApiResult<PageResult<Script>>>('/scripts', query)
}

/**
 * 获取剧本详情
 */
export const getScriptDetail = (id: number) => {
  return request.get<ApiResult<Script>>(`/scripts/${id}`)
}

/**
 * 创建剧本
 */
export const createScript = (data: Partial<Script>) => {
  return request.post<ApiResult<Script>>('/scripts/create', data)
}

/**
 * 更新剧本
 */
export const updateScript = (id: number, data: Partial<Script>) => {
  return request.put<ApiResult<Script>>(`/scripts/${id}`, data)
}

/**
 * 删除剧本
 */
export const deleteScript = (id: number) => {
  return request.delete<ApiResult<void>>(`/scripts/${id}`)
}

/**
 * 获取剧本排行
 */
export const getRankings = (limit: number = 50) => {
  return request.get<ApiResult<Script[]>>('/scripts/rankings', { params: { limit } })
}

/**
 * 获取筛选选项
 */
export const getOptions = () => {
  return request.get<ApiResult<Record<string, string[]>>>('/scripts/options')
}
