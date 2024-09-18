<script setup lang="ts">
import type { Resource } from "~/store";
import { useStore } from "~/store";

const store = useStore();
const url = ref<string>("");

const getImageUrl = async (path: string) => {
  const blob = await store.resourceData(path, props.mini);
  return window.URL.createObjectURL(blob);
};

onMounted(async () => {
  url.value = await getImageUrl(props.data.path);
});

const props = withDefaults(
  defineProps<{
    mini?: boolean;
    data: Resource;
  }>(),
  {
    mini: false,
  }
);
</script>

<template>
  <template v-if="data.type === 'image'">
    <n-image :alt="data.name" :src="url" object-fit="contain">
      <template #placeholder>
        <n-icon size="32px"><i-bi-image /></n-icon>
      </template>
    </n-image>
  </template>
  <template v-else-if="data.type === 'audio'">
    <n-icon size="32px"><i-bi-mic /></n-icon>
  </template>
  <template v-else-if="data.type === 'video'">
    <n-icon size="32px"><i-bi-camera-video /></n-icon>
  </template>
  <template v-else>
    <el-text type="warning">未知格式</el-text>
  </template>
</template>

<style scoped lang="css"></style>
