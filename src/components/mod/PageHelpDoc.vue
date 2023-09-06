<template>
  <div>
    <el-button type="primary" :icon="Refresh" @click="reload" :loading="reloadLoading"
      :disabled="reloadLoading">重载帮助文档</el-button>
  </div>

  <el-alert v-show="needReload" title="存在修改，需要重载后生效" type="error" effect="dark" :closable="false"
    style="margin-top: 10px" />

  <el-tabs v-model="tab" :stretch=true>
    <el-tab-pane label="文件" name="file">
      <el-space class="file-control">
        <el-button type="danger" :icon="Delete" v-show="showDeleteFile" @click="deleteFiles">删除所选</el-button>
        <el-button type="primary" :icon="Upload" @click="uploadDialogVisible = true">上传</el-button>
      </el-space>

      <el-dialog v-model="uploadDialogVisible" title="上传帮助文档">
        <el-alert v-show="uploadForm.group === 'default'" style="margin-bottom: 20px;" type="warning" :closable="false">
          更具体的分组能提供组内搜索命令 <el-tag size="small" type="info">.find#&lt;分组&gt; &lt;搜索内容&gt;</el-tag>，是否一定要选择默认分组？
        </el-alert>
        <el-form label-position="top" :model="uploadForm" :rules="uploadRules" ref="uploadFormRef">
          <el-form-item label="分组" prop="group">
            <el-select v-model="uploadForm.group" placeholder="选择分组" filterable clearable allow-create>
              <el-option v-for="group in docGroups" :key="group.key" :label="group.lable" :value="group.key" />
            </el-select>
          </el-form-item>
          <el-form-item label="帮助文档" prop="files">
            <el-upload :on-change="fileChange" :file-list="uploadForm.files" multiple accept=".json, .xlsx"
              :auto-upload="false">
              <template #trigger>
                <el-button type="primary" :icon="Upload">选择文件</el-button>
              </template>
            </el-upload>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-space>
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitUpload(uploadFormRef)">上传</el-button>
          </el-space>
        </template>
      </el-dialog>

      <main>
        <header class="file-tree-title">
          <el-text size="large" tag="b">文件名</el-text>
          <el-text size="large" tag="b">分组</el-text>
        </header>
        <el-tree class="file-tree" :data="docTree" :props="treeNodeProps" node-key="key" ref="fileTreeRef"
          default-expand-all show-checkbox>
          <template #default="{ node, data }">
            <div class="file-line">
              <div class="file-info">
                <span style="margin-right: 2px;">
                  <i-bi-folder2 color="#303133" v-if="data.isDir" />
                  <i-bi-filetype-json color="#E6A23C" v-else-if="data.type === '.json'" />
                  <i-bi-filetype-xlsx color="#67C23A" v-else-if="data.type === '.xlsx'" />
                  <i-bi-file-break v-else />
                </span>
                <span :class="{ 'del-line': data.deleted }" truncated>
                  {{ node.label }}
                </span>
              </div>
              <div v-if="!data.isDir" class="file-tag">
                <el-tag :type="getHelpDocTag(data.loadStatus, data.deleted, data.group).type" size="small">
                  {{ getHelpDocTag(data.loadStatus, data.deleted, data.group).lable }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-tree>
      </main>
    </el-tab-pane>

    <el-tab-pane label="词条" name="item">
      <main class="item-list-container">
        <header>
          <el-form :inline="true" :model="textItemQuery">
            <el-form-item label="序号">
              <el-input v-model="textItemQuery.id" clearable />
            </el-form-item>
            <el-form-item label="分组">
              <el-select v-model="textItemQuery.group" placeholder="选择分组" filterable clearable>
                <el-option v-for="group in [{ key: 'builtin', lable: '内置' }, ...docGroups]" :key="group.key"
                  :label="group.lable" :value="group.key" />
              </el-select>
              <!-- <el-input v-model="textItemQuery.group" clearable /> -->
            </el-form-item>
            <el-form-item label="来源文件">
              <el-input v-model="textItemQuery.from" clearable />
            </el-form-item>
            <el-form-item label="词条名">
              <el-input v-model="textItemQuery.title" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="refreshTextItems">搜索</el-button>
            </el-form-item>
          </el-form>
        </header>
        <el-table class="item-list" table-layout="auto" :header-cell-style="{ 'text-align': 'center' }" :data="textItems">
          <el-table-column prop="id" label="序号" />
          <el-table-column prop="group" label="分组">
            <template #default="scope">
              <el-tag type="success" size="small">{{ scope.row.group }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="from" label="来源文件" />
          <el-table-column prop="title" label="词条名" />
          <el-table-column prop="content" label="内容">
            <template #default="scope">
              <el-tooltip :content="getHelpTextTooltip(scope.row.content)" raw-content>
                {{ getHelpText(scope.row.content) }}
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="packageName" label="分类" />
        </el-table>
        <footer>
          <el-pagination class="item-list-pagination" :page-size="20" :current-page="textItemQuery.pageNum"
            :total="textItemQuery.total" :pager-count="6" @current-change="handleCurrentPageChange"
            layout="prev, pager, next" background hide-on-single-page />
        </footer>
      </main>
    </el-tab-pane>
  </el-tabs>
</template>

<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormRules, FormInstance, ElTree } from 'element-plus';
import { onBeforeMount, reactive, ref } from 'vue';
import { useStore } from '~/store';
import { Delete, Refresh, Upload } from '@element-plus/icons-vue'
import { trim } from 'lodash-es';
import { computed } from 'vue';

interface Group {
  key: string,
  lable: string,
}

const store = useStore()

const tab = ref('file')

const needReload = ref<boolean>(false)

interface UploadForm {
  group: string,
  files: any[]
}

const treeNodeProps = {
  label: 'name',
  disabled: 'deleted'
}
const docTree = ref<HelpDoc[]>([] as any)
const docGroups = ref<Group[]>([])
const uploadDialogVisible = ref<boolean>(false)
const uploadFormRef = ref<FormInstance>()
const uploadForm = reactive<UploadForm>({
  group: '',
  files: [] as any[]
})
const uploadRules = reactive<FormRules>({
  group: [
    { required: true, message: '请选择分组', trigger: 'blur' },
    { pattern: '^(?!builtin).*', message: '不能为内置分组', trigger: 'blur' },
  ],
  files: [
    { required: true, message: '请选择文件', trigger: 'blur' },
  ]
})

const fileChange = (_f: any, newFiles: any) => {
  uploadForm.files = newFiles
}

const submitUpload = async (formData: FormInstance | undefined) => {
  if (!formData) return
  await formData.validate(async (valid, _) => {
    if (valid) {
      const fd = new FormData();
      fd.append("group", uploadForm.group)
      uploadForm.files.forEach(f => {
        fd.append("files", f.raw)
      })

      const res = await store.helpDocUpload(fd)
      if (res.result) {
        ElMessage.success('上传完成，请在全部操作完成后，手动重载帮助文件')
      } else {
        ElMessage.error(res.err ?? '上传失败')
      }
      formData.resetFields();
      needReload.value = true
      await refreshFileTree()
      uploadDialogVisible.value = false
    }
  })
}

const fileTreeRef = ref<InstanceType<typeof ElTree>>()
const showDeleteFile = computed(() => {
  const checkedFileKeys = fileTreeRef.value!.getCheckedKeys(false) as string[]
  return checkedFileKeys.length !== 0
})
const deleteFiles = async () => {
  const checkedFileKeys = fileTreeRef.value!.getCheckedKeys(false) as string[]
  if (checkedFileKeys && checkedFileKeys.length !== 0) {
    ElMessageBox.confirm(
      '确认删除选择的文件吗？',
      '删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(() => {
        store.helpDocDelete(checkedFileKeys).then((res) => {
          if (res.result) {
            ElMessage({
              type: 'success',
              message: '删除文件成功',
            })
            refreshFileTree()
          } else {
            ElMessage({
              type: 'success',
              message: res.err ?? '删除文件失败',
            })
          }
        })
        needReload.value = true
      })
  } else {
    ElMessage({
      type: 'error',
      message: '未选择文件',
    })
  }
}

const getHelpDocTag = (loadStatus: number, deleted: boolean, group: string): { type: "" | "success" | "warning" | "info" | "danger", lable: string } => {
  if (loadStatus === 0) {
    return {
      type: "warning",
      lable: "未加载"
    }
  } else if (loadStatus === 2) {
    return {
      type: "danger",
      lable: "格式有误"
    }
  } else if (deleted) {
    return {
      type: "warning",
      lable: group
    }
  } else {
    return {
      type: "success",
      lable: group
    }
  }
}

const refreshFileTree = async () => {
  const resp = await store.helpDocTree()
  if (resp?.result) {
    docTree.value = resp.data.map((entry) => {
      const e: any = { ...entry }
      if (entry.loadStatus === 0) {
        e.groupLableType = "warning"
        e.groupLable = "未加载"
      } else if (entry.loadStatus === 2) {
        e.groupLableType = "error"
        e.groupLable = "加载失败"
      } else if (entry.deleted) {
        e.groupLableType = "warning"
        e.groupLable = entry.group
      } else {
        e.groupLableType = "success"
        e.groupLable = entry.group
      }
      return e
    })
    docGroups.value = [{ lable: "默认", key: "default" }, ...resp.data.filter((entry) => {
      return entry.isDir
    }).map((entry) => {
      return { lable: entry.name, key: entry.name }
    })]
  } else {
    ElMessage.error('无法获取帮助文件信息')
  }
}

const textItems = ref<HelpTextItem[]>([])
const textItemQuery = ref<HelpTextItemQuery>({ pageNum: 1, pageSize: 20, total: 20 })
const getHelpText = (row: string) => {
  let temp = trim(row)
  if (temp.length <= 200) {
    return temp
  } else {
    return temp.substring(0, 151) + '...'
  }
}
const getHelpTextTooltip = (row: string) => {
  return trim(row).replaceAll("\n", "<br />")
}
const handleCurrentPageChange = async (val: number) => {
  textItemQuery.value.pageNum = val
  await refreshTextItems()
}
const refreshTextItems = async () => {
  const resp = await store.helpGetTextItemPage(textItemQuery.value)
  if (resp?.result) {
    textItems.value = resp.data
    textItemQuery.value.total = resp.total
  } else {
    ElMessage.error('无法获取帮助词条信息')
  }
}

const reloadLoading = ref<boolean>(false)
const reload = async () => {
  reloadLoading.value = true
  const resp = await store.helpDocReload()
  if (resp?.result) {
    ElMessage.success('重载帮助文件成功')
    needReload.value = false
    await refreshFileTree()
    await refreshTextItems()
  } else {
    ElMessage.error(resp.err ?? '重载帮助文件失败')
  }
  reloadLoading.value = false
}

onBeforeMount(async () => {
  await refreshFileTree()
  await refreshTextItems()
})


</script>

<style lang="scss">
@media screen and (max-width: 700px) {
  .bak-item {
    flex-direction: column;

    &>span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}

.file-control {
  margin-bottom: 20px;
  flex: 1;
  display: flex;
  justify-content: right;
}

.file-tree-title {
  padding: 0 23px 6px 50px;
  border-bottom: #DCDFE6 solid 1px;
  margin-bottom: 10px;

  flex: 1;
  display: flex;
  justify-content: space-between;
}

.file-tree {
  background-color: #f3f5f7;
}

.file-line {
  flex: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-info {
  flex: auto;
  width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.item-list-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.item-list {
  background-color: #f3f5f7;
}

.el-table .cell {
  white-space: pre-line;
}

.item-list-pagination {
  margin-top: 10px;
  background-color: #f3f5f7;
}

.del-line {
  text-decoration: line-through;
}
</style>