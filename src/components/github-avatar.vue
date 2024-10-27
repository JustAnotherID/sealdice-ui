<script setup lang="ts">
import { urlBase } from '~/backend';
import imgHaibao from '~/assets/haibao1.png';

const props = withDefaults(
  defineProps<{
    username: string;
    user?: string;
    src?: string;
    onlyName?: boolean;
  }>(),
  {
    onlyName: false,
  },
);

const names = new Map<string, string>([
  ['木落', 'fy0'],
  ['逐风', 'MintCider'],
  ['暮星', 'MX-fox'],
  ['JohNSoN', 'Xiangze-Li'],
  ['Bugtower100', 'bugtower100'],
  ['只是另一个 ID', 'JustAnotherID'],
  ['檀轶步棋', 'oissevalt'],
  ['脑', 'f44r'],
]);

const getUser = () => {
  return props.user ?? names.get(props.username) ?? props.username;
};

const getAvatarSrc = () => {
  if (props.src) {
    return props.src;
  }
  return `${urlBase}/sd-api/utils/ga/${getUser()}`;
};

const getHref = () => {
  return props.onlyName ? 'javascript:void(0)' : `https://github.com/${getUser()}`;
};
</script>

<template>
  <n-button v-if="!props.onlyName" text tag="a" :href="getHref()" target="_blank">
    <n-flex size="small" align="center">
      <n-avatar round size="large" :src="getAvatarSrc()" :fallback-src="imgHaibao" />
      {{ props.username ?? getUser() }}
    </n-flex>
  </n-button>
  <n-flex v-else size="small" align="center">
    <n-avatar round size="large" :src="imgHaibao" />
    {{ props.username ?? getUser() }}
  </n-flex>
</template>
