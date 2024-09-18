<script setup lang="tsx">
import type { UploadFileInfo } from 'naive-ui'
import type {Resource} from "~/store";
import { useDialog, useMessage } from 'naive-ui'
import {useStore} from "~/store";
import {filesize} from "filesize";
import {urlBase} from "~/backend";
import {CopyDocument, Delete, Download, Search, Upload} from "@element-plus/icons-vue";
import ClipboardJS from 'clipboard'

const dialog = useDialog()
const message = useMessage()
const store = useStore();

const loading = ref(true);
const images = ref<Resource[]>([]);

const drawer = ref(false)
const currentResource = ref<Resource>({} as Resource)

const fileList = ref<any[]>([])

const refreshResources = async () => {
  loading.value = true
  const imagesRes = await store.resourceList("image");
  if (imagesRes.result) {
    images.value = imagesRes.data
  } else {
    ElMessage.error(imagesRes.err)
  }
  loading.value = false
}

const deleteResource = async (resource: Resource) => {
  dialog.warning({
    title: '删除',
    content: () => <n-flex size="small">
      {`确认删除`}
      <n-tag type="info" size="small">{resource.path}</n-tag>
      {`吗？`}
      <n-text type="error" strong>{`删除后将无法找回！`}</n-text>
    </n-flex>,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      const res = await store.resourceDelete(resource.path);
      if (res.result) {
        message.success("删除成功")
      } else {
        message.error(res.err)
      }
      await nextTick(async () => {
        await refreshResources()
      })
    }
  })
}

const handleShow = async (resource: Resource) => {
  currentResource.value = resource
  drawer.value = true
}

const beforeUpload = async (data: {
  file: UploadFileInfo
  fileList: UploadFileInfo[]
}) => { // UploadRawFile
  const file = data.file.file
  if (file?.type !== 'image/jpeg'
      && file?.type !== 'image/png'
      && file?.type !== 'image/gif') {
    ElMessage.error('上传的文件不是图片！')
    return false
  }
  let fd = new FormData()
  fd.append('files', file)
  try {
    const resp = await store.resourceUpload({form: fd});
    if (resp.result) {
      ElMessage.success('上传完成');
    } else {
      ElMessage.error(resp.err);
    }
  } catch (e: any) {
    ElMessage.error(e.toString());
  } finally {
    await nextTick(async () => {
      await refreshResources()
    })
  }
}

const copySealCode = async () => {
  ElMessage.success('复制海豹码成功！')
}

onBeforeMount(async () => {
  loading.value = true
  await refreshResources()
  new ClipboardJS('.resource-seal-code-copy-btn')
})

</script>

<template>
  <h2>资源管理</h2>
  <div class="tip">
    <n-collapse class="helptips">
      <n-collapse-item title="查看帮助" name="1">
        <n-text tag="p">
          <div>此处可以上传图片等资源，方便引用。</div>
        </n-text>
      </n-collapse-item>
    </n-collapse>
  </div>

  <main>
    <h3>
      <n-flex align="center" justify="space-between">
        <span>图片列表</span>
        <span>
          <n-upload action="" multiple accept=".png, .jpg, jpeg, .gif"
                    @before-upload="beforeUpload" v-model:file-list="fileList">
            <n-button type="primary" :icon="Upload">上传图片</n-button>
          </n-upload>
        </span>
      </n-flex>
    </h3>
    <el-table v-loading="loading" :data="images" table-layout="auto">
      <el-table-column align="center" min-width="64px">
        <template #default="scope">
          <resource-render class="min-w-10" :key="scope.row.path" :data="scope.row" mini/>
        </template>
      </el-table-column>
      <el-table-column prop="path" label="路径"/>
      <el-table-column align="center" prop="size" label="大小">
        <template #default="scope">
          {{ filesize(scope.row.size) }}
        </template>
      </el-table-column>
      <el-table-column fixed="right">
        <template #default="scope">
          <n-flex size="small" vertical>
            <n-button type="default" text size="tiny"
                       v-if="scope.row.type === 'image'"
                       class="resource-seal-code-copy-btn" :data-clipboard-text="`[图:${scope.row.path}]`"
                       @click="copySealCode()">
              <template #icon>
                <CopyDocument/>
              </template>
              复制海豹码
            </n-button>
            <n-button type="info" text size="tiny"
                       @click="handleShow(scope.row)">
              <template #icon>
                <Search/>
              </template>
              详情
            </n-button>
            <n-button type="success" text size="tiny" tag="a" style="text-decoration: none;"
                       :href="`${urlBase}/sd-api/resource/download?path=${encodeURIComponent(scope.row.path)}&token=${encodeURIComponent(store.token)}`">
              <template #icon>
                <Download/>
              </template>
              下载
            </n-button>
            <n-button type="error" text size="tiny"
                       @click="deleteResource(scope.row)">
              <template #icon>
                <Delete/>
              </template>
              删除
            </n-button>
          </n-flex>
        </template>
      </el-table-column>
    </el-table>
  </main>

  <n-drawer
      v-model:show="drawer"
      class="resource-detail-drawer"
      placement="right">
    <n-drawer-content title="详情">
      <div class="max-w-xs">
        <resource-render :data="currentResource"/>
      </div>
       <n-descriptions label-placement="left" title="" :column="1">
        <n-descriptions-item label="文件名">{{ currentResource.name }}</n-descriptions-item>
        <n-descriptions-item label="路径">{{ currentResource.path }}</n-descriptions-item>
        <n-descriptions-item label="大小">{{ filesize(currentResource.size) }}</n-descriptions-item>
      </n-descriptions>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped lang="css">
@media screen and (max-width: 700px) {
  .resource-detail-drawer {
    width: 50% !important;
  }
}

@media screen and (min-width: 700px) and (max-width: 1100px) {
  .resource-detail-drawer {
    width: 40% !important;
  }
}

@media screen and (min-width: 1100px) {
  .resource-detail-drawer {
    width: 30% !important;
  }
}
</style>