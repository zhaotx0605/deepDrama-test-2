<script setup lang="ts">
/**
 * 剧本管理页面
 * 严格按照Vue3 Composition API规范编写
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { 
  getScriptList, 
  deleteScript,
  getOptions,
  type Script, 
  type ScriptQuery,
  type PageResult 
} from '@/api/script'

// ========== 状态管理 ==========
const loading = ref(false)
const tableData = ref<Script[]>([])
const total = ref(0)

// 查询条件(使用ref,避免reactive)
const queryParams = ref<ScriptQuery>({
  page: 1,
  limit: 10,
  tab: undefined,
  keyword: undefined,
  statuses: [],
  sourceType: undefined,
  genre: undefined,
  sortBy: 'createdAt',
  sortOrder: 'desc'
})

// 筛选选项
const filterOptions = reactive({
  contentTeams: [] as string[],
  writers: [] as string[],
  producers: [] as string[]
})

// ========== 表格列定义 ==========
const columns = [
  {
    title: '剧本',
    dataIndex: 'name',
    width: 220,
    fixed: 'left'
  },
  {
    title: '综合评分',
    dataIndex: 'avgScore',
    width: 100,
    align: 'center'
  },
  {
    title: '评分人数',
    dataIndex: 'ratingCount',
    width: 90,
    align: 'center'
  },
  {
    title: '剧本状态',
    dataIndex: 'status',
    width: 100,
    align: 'center'
  },
  {
    title: '立项',
    dataIndex: 'isProject',
    width: 80,
    align: 'center'
  },
  {
    title: '编剧',
    dataIndex: 'writer',
    width: 90
  },
  {
    title: '内容团队',
    dataIndex: 'contentTeam',
    width: 100
  },
  {
    title: '制片',
    dataIndex: 'producer',
    width: 90
  },
  {
    title: '类型',
    dataIndex: 'genre',
    width: 80,
    align: 'center'
  },
  {
    title: '提交日期',
    dataIndex: 'submitDate',
    width: 110,
    align: 'center'
  },
  {
    title: '操作',
    slotName: 'actions',
    width: 160,
    fixed: 'right'
  }
]

// ========== 计算属性 ==========
const showResetButton = computed(() => {
  return queryParams.value.statuses?.length! > 0 
    || queryParams.value.sourceType 
    || queryParams.value.genre
})

// ========== 方法 ==========

// 加载数据列表
const loadData = async () => {
  loading.value = true
  try {
    const res = await getScriptList(queryParams.value)
    if (res.success && res.data) {
      tableData.value = res.data.list
      total.value = res.data.total
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载筛选选项
const loadOptions = async () => {
  try {
    const res = await getOptions()
    if (res.success && res.data) {
      filterOptions.contentTeams = res.data.contentTeams || []
      filterOptions.writers = res.data.writers || []
      filterOptions.producers = res.data.producers || []
    }
  } catch (error) {
    console.error('加载选项失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  queryParams.value.page = 1
  loadData()
}

// 重置筛选
const handleReset = () => {
  queryParams.value.statuses = []
  queryParams.value.sourceType = undefined
  queryParams.value.genre = undefined
  queryParams.value.keyword = undefined
  queryParams.value.page = 1
  loadData()
}

// Tab切换
const handleTabChange = (tab: string) => {
  queryParams.value.tab = tab
  queryParams.value.page = 1
  loadData()
}

// 分页变化
const handlePageChange = (page: number) => {
  queryParams.value.page = page
  loadData()
}

const handlePageSizeChange = (size: number) => {
  queryParams.value.limit = size
  queryParams.value.page = 1
  loadData()
}

// 删除剧本
const handleDelete = async (id: number) => {
  try {
    const res = await deleteScript(id)
    if (res.success) {
      Message.success('删除成功')
      loadData()
    }
  } catch (error) {
    console.error('删除失败:', error)
  }
}

// 复制剧本编号
const copyScriptId = (scriptId: string) => {
  navigator.clipboard.writeText(scriptId).then(() => {
    Message.success('已复制剧本编号')
  })
}

// ========== 生命周期 ==========
onMounted(() => {
  loadOptions()
  loadData()
})
</script>

<template>
  <div class="script-management">
    <!-- 顶部Tab切换 -->
    <a-radio-group 
      :model-value="queryParams.tab" 
      type="button" 
      @change="handleTabChange"
      style="margin-bottom: 16px"
    >
      <a-radio value="">全部</a-radio>
      <a-radio value="pending">待评分</a-radio>
      <a-radio value="claimed">待认领</a-radio>
      <a-radio value="project">已立项</a-radio>
      <a-radio value="abandoned">已废弃</a-radio>
    </a-radio-group>

    <!-- 搜索和筛选区域 -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-space direction="vertical" :size="16" fill>
        <!-- 快速搜索 -->
        <a-input-search
          v-model="queryParams.keyword"
          placeholder="搜索剧本名称或编号"
          :style="{ width: '320px' }"
          @search="handleSearch"
          allow-clear
        >
          <template #button-icon>
            <icon-search />
          </template>
        </a-input-search>

        <!-- 高级筛选 -->
        <a-space :size="16" wrap>
          <a-select
            v-model="queryParams.statuses"
            placeholder="剧本状态"
            :style="{ width: '200px' }"
            multiple
            allow-clear
          >
            <a-option value="一卡初稿">一卡初稿</a-option>
            <a-option value="改稿中">改稿中</a-option>
            <a-option value="完整剧本">完整剧本</a-option>
            <a-option value="终稿">终稿</a-option>
            <a-option value="已废弃">已废弃</a-option>
          </a-select>

          <a-select
            v-model="queryParams.sourceType"
            placeholder="投稿类型"
            :style="{ width: '180px' }"
            allow-clear
          >
            <a-option value="外部投稿">外部投稿</a-option>
            <a-option value="内部团队">内部团队</a-option>
            <a-option value="合作剧组">合作剧组</a-option>
            <a-option value="版权购买">版权购买</a-option>
          </a-select>

          <a-select
            v-model="queryParams.genre"
            placeholder="剧本分类"
            :style="{ width: '150px' }"
            allow-clear
          >
            <a-option value="男频">男频</a-option>
            <a-option value="女频">女频</a-option>
            <a-option value="皆可">皆可</a-option>
          </a-select>

          <a-button v-if="showResetButton" @click="handleReset">
            重置
          </a-button>
        </a-space>
      </a-space>
    </a-card>

    <!-- 数据表格 -->
    <a-table
      :data="tableData"
      :columns="columns"
      :loading="loading"
      :pagination="{
        total,
        current: queryParams.page,
        pageSize: queryParams.limit,
        showTotal: true,
        showJumper: true,
        showPageSize: true,
        pageSizeOptions: [10, 20, 50, 100]
      }"
      :bordered="{ cell: true }"
      :stripe="true"
      :scroll="{ x: 1600 }"
      row-key="id"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <!-- 剧本名称列 -->
      <template #name="{ record }">
        <div>
          <div>{{ record.name }}</div>
          <div style="font-size: 12px; color: #86909c; cursor: pointer" @click="copyScriptId(record.scriptId)">
            {{ record.scriptId }}
            <icon-copy />
          </div>
        </div>
      </template>

      <!-- 操作列 -->
      <template #actions="{ record }">
        <a-space>
          <a-button type="text" size="small">看剧本</a-button>
          <a-button type="text" size="small">去评分</a-button>
          <a-popconfirm content="确认删除该剧本吗?" @ok="handleDelete(record.id)">
            <a-button type="text" size="small" status="danger">删除</a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
.script-management {
  padding: 16px;
}
</style>
