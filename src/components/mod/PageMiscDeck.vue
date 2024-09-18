<template>
  <header class="page-header">
    <n-button type="primary" :icon="Refresh" @click="doBackup">
      <template #icon>
        <n-icon><Refresh /></n-icon>
      </template>
      重载牌堆
    </n-button>
  </header>

  <n-tabs v-model:value="mode" type="line" size="large" animated>
    <n-tab-pane tab="牌堆列表" name="list">
      <header class="deck-list-header">
        <n-flex align="center">
          <span>
            <n-upload class="upload" action="" multiple @before-upload="beforeUpload" v-model:file-list="fileList">
              <n-button type="primary" :icon="Upload">上传牌堆</n-button>
            </n-upload>
          </span>
          <span>
            <n-input v-model:value="filter" size="small" clearable placeholder="">
              <template #prefix>
                <n-icon><Search /></n-icon>
              </template>
            </n-input>
          </span>
          <n-button size="small" type="info" text tag="a" target="_blank" class="link-button"
            href="https://github.com/sealdice/draw">
            <template #icon>
              <n-icon><Link /></n-icon>
            </template>
            获取牌堆
          </n-button>
        </n-flex>
        <n-flex align="center">
          <n-text type="info" size="small">目前支持 json/yaml/deck/toml 格式的牌堆</n-text>
          <n-tooltip>
            <template #trigger>
              <n-icon><question-filled /></n-icon>
            </template>
            deck牌堆: 一种单文件带图的牌堆格式<br />
            在牌堆文件中使用./images/xxx.png的相对路径引用图片。并连同图片目录一起打包成zip，修改扩展名为deck即可制作<br />
            <br />
            toml牌堆：海豹支持的新牌堆格式。格式更加友好，还提供了包括云牌组在内的更多功能支持。
          </n-tooltip>
        </n-flex>
      </header>
      <aside v-if="filterCount > 0" class="mb-4">
        <n-text type="info">已过滤 {{ filterCount }} 条</n-text>
      </aside>
      <n-list class="deck-list-main" hoverable>
        <n-list-item class="deck-item hover:light:bg-gray-100" v-for="(i, index) in filtered" :key="index">
          <foldable-card :err-title="i.filename" :err-text="i.errText">
            <template #title>
              <n-flex size="small" align="center">
                <n-text tag="b">{{ i.name }}</n-text>
                <n-text>{{ i.version }}</n-text>
                <n-tag size="small" :type="i.fileFormat === 'toml' ? 'primary' : 'info'" :bordered="false">{{ i.fileFormat }}</n-tag>
              </n-flex>
            </template>

            <template #title-extra>
              <n-flex size="small">
                <n-popconfirm v-if="i.updateUrls && i.updateUrls.length > 0"
                              positive-text="确认"
                              negative-text="取消"
                              @positive-click="doCheckUpdate(i, index)">
                  <template #trigger>
                    <n-button :icon="Download" type="success" size="small" secondary :loading="diffLoading">更新</n-button>
                  </template>
                  更新地址由牌堆作者提供，是否确认要检查该牌堆更新？
                </n-popconfirm>
                <n-button :icon="Delete" type="error" size="small" secondary @click="doDelete(i, index)">删除</n-button>
              </n-flex>
            </template>

            <template #title-extra-error>
              <n-button :icon="Delete" type="error" size="small" secondary @click="doDelete(i, index)">删除</n-button>
            </template>

            <template #description>
              <n-flex size="small" direction="vertical" alignment="normal">
                <n-text v-if="i.cloud" type="info" size="small">
                  <n-icon><MostlyCloudy /></n-icon>
                  作者提供云端内容，请自行鉴别安全性
                </n-text>
                <n-text v-if="i.fileFormat === 'jsonc'" type="warning" size="small">
                  <n-icon><Warning /></n-icon>
                  注意：该牌堆的格式并非标准 JSON ，而是允许尾逗号与注释语法的扩展 JSON
                </n-text>
              </n-flex>
            </template>

            <n-descriptions label-placement="left" style="white-space: pre-line;">
              <n-descriptions-item :span="3" label="作者">{{ i.author || '&lt;佚名>' }}</n-descriptions-item>
              <n-descriptions-item :span="3" v-if="i.desc" label="简介">{{ i.desc }}</n-descriptions-item>
              <n-descriptions-item :span="3" label="牌组列表">
                <n-tag :bordered="false" v-for="(visible, c) of i.command" :key="c" size="small" :type="visible ? 'primary' : 'info'" style="margin-right: 0.5rem;">
                  {{ c }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item v-if="i.license" label="许可协议">{{ i.license }}</n-descriptions-item>
              <n-descriptions-item v-if="i.date" label="发布时间">{{ i.date }}</n-descriptions-item>
              <n-descriptions-item v-if="i.updateDate" label="更新时间">{{ i.updateDate }}</n-descriptions-item>
            </n-descriptions>

            <template #unfolded-extra>
              <n-descriptions label-placement="left">
                <n-descriptions-item :span="3" label="可见牌组列表">
                  <n-tag :bordered="false" v-for="(visible, c) of i.command" :key="c" size="small" :type="visible ? 'primary' : 'info'" :style="{marginRight: '0.5rem', display: visible ? '' : 'none'}">
                    {{ c }}
                  </n-tag>
                </n-descriptions-item>
              </n-descriptions>
            </template>
          </foldable-card>
        </n-list-item>
      </n-list>
    </n-tab-pane>

    <el-dialog v-model="showDiff" title="牌堆内容对比" class="diff-dialog">
      <diff-viewer :lang="deckCheck.format" :old="deckCheck.old" :new="deckCheck.new"/>
      <template #footer>
        <el-space wrap>
          <n-button @click="showDiff = false">取消</n-button>
          <n-button v-if="!(deckCheck.old === deckCheck.new)" type="success" :icon="DocumentChecked" @click="deckUpdate">确认更新</n-button>
        </el-space>
      </template>
    </el-dialog>
  </n-tabs>
</template>

<script lang="ts" setup>
import { useStore } from '~/store'
import {
  QuestionFilled,
  Upload,
  Download,
  Refresh,
  Search,
  Link,
  Delete,
  MostlyCloudy,
  DocumentChecked,
  Warning,
} from '@element-plus/icons-vue'
import type {UploadFileInfo} from "naive-ui";

const store = useStore()

const mode = ref<string>('list')

const filter = ref<string>('')
const filterCount = computed(() => data.value.length - filtered.value.length)
const data = ref<any[]>([])
const filtered = computed(() => data.value.filter((deck) => {
  if (filter.value === '') {
    return true
  }
  const val = filter.value.toLowerCase();
  return deck.name?.toLowerCase()?.includes(val)
      || deck.desc?.toLowerCase()?.includes(val)
      || deck.author?.toLowerCase()?.includes(val)
      || Object.keys(deck.command)
          .map(tag => tag?.toLowerCase()?.includes(val))
          .includes(true);
}))

const cfg = ref<any>({})

const refreshList = async () => {
  const lst = await store.deckList()
  data.value = lst
}

const configGet = async () => {
  const data = await store.backupConfigGet()
  cfg.value = data
}

const fileList = ref<any[]>([])

const doBackup = async () => {
  const ret = await store.deckReload()
  if (ret.testMode) {
    ElMessage.success('展示模式无法重载牌堆')
  } else {
    ElMessage.success('已重载')
    await refreshList()
  }
}

const doDelete = async (data: any, index: number) => {
  ElMessageBox.confirm(
    `删除牌堆《${data.name}》，确定吗？`,
    '删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async (data) => {
    await store.deckDelete({ index })
    await store.deckReload()
    await refreshList()
    ElMessage.success('牌堆已删除')
  })
}

let lastSetEnable = 0
const setEnable = async (index: number, enable: boolean) => {
  const now = (new Date()).getTime()
  if (now - lastSetEnable < 100) return
  lastSetEnable = now
  const ret = await store.deckSetEnable({ index, enable })
  ElMessage.success('完成')
}

const doSave = async () => {
  await store.backupConfigSave(cfg.value)
  ElMessage.success('已保存')
}

const beforeUpload = async (data: {
  file: UploadFileInfo
  fileList: UploadFileInfo[]
}) => { // UploadRawFile
  const file = data.file.file
  let fd = new FormData()
  fd.append('file', file)
  await store.deckUpload({ form: fd })
  ElMessage.success('上传完成，即将自动重载牌堆')
  await store.deckReload()
  await refreshList()
}

onBeforeMount(async () => {
  await configGet()
  await refreshList()
})

const showDiff = ref<boolean>(false)
const diffLoading = ref<boolean>(false)

interface DeckCheckResult {
  old: string,
  new: string,
  format: 'json' | 'yaml' | 'toml',
  tempFileName: string,
  index: number,
}

const deckCheck = ref<DeckCheckResult>({
  old: "",
  new: "",
  format: "json",
  tempFileName: "",
  index: -1
})

const doCheckUpdate = async (data: any, index: number) => {
  diffLoading.value = true
  const checkResult = await store.deckCheckUpdate({ index });
  diffLoading.value = false
  if (checkResult.result) {
    deckCheck.value = { ...checkResult, index }
    showDiff.value = true
  } else {
    ElMessage.error('检查更新失败！' + checkResult.err)
  }
}

const deckUpdate = async () => {
  const res = await store.deckUpdate(deckCheck.value);
  if (res.result) {
    showDiff.value = false
    ElMessage.success('更新成功，即将自动重载牌堆')
    await store.deckReload()
    await refreshList()
  } else {
    showDiff.value = false
    ElMessage.error('更新失败！' + res.err)
  }
}

</script>

<style lang="css">
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

@media screen and (max-width: 700px){
  .diff-dialog {
    width: 90% !important;
  }
}

@media screen and (min-width: 700px) and (max-width: 900px){
  .diff-dialog {
    width: 80% !important;
  }
}

@media screen and (min-width: 900px) and (max-width: 1100px){
  .diff-dialog {
    width: 65% !important;
  }
}

@media screen and (min-width: 1100px){
  .diff-dialog {
    width: 50% !important;
  }
}

.deck-keys {
  display: flex;
  flex-flow: wrap;

  &>span {
    margin-right: 1rem;
    /* width: fit-content; */
  }
}

.deck-control {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
}

.deck-list-header {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}

.deck-list-main {
  /*
  display: flex;
  flex-wrap: wrap;
  gap: 1rem
   */
}

.deck-item-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}

.deck-item {
  width: 100%;
}

.edit-operation {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}

.upload {
  >ul {
    display: none;
  }
}

.link-button {
  text-decoration: none;
}
</style>
