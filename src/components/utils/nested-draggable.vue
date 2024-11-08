<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <draggable
    class="dragArea"
    tag="div"
    :list="tasks"
    handle=".handle"
    :group="{ name: 'g1' }"
    item-key="name">
    <template #item="{ element: el, index }">
      <li class="reply-item mb-2 list-none">
        <foldable-card type="div" :default-fold="true" compact>
          <template #title>
            <el-checkbox v-model="el.enable">开启</el-checkbox>
          </template>
          <template #title-extra>
            <el-space size="large" alignment="center">
              <el-icon class="handle">
                <i-carbon-move />
              </el-icon>
              <el-button plain type="danger" size="small" @click="deleteItem(index)">
                <template #icon>
                  <i-carbon-row-delete />
                </template>
                删除
              </el-button>
            </el-space>
          </template>

          <template #unfolded-extra>
            <div class="border-l-4 border-orange-500 pl-4">
              <div v-for="(cond, index2) in el.conditions || []" :key="index2">
                <el-text
                  v-if="cond.condType === 'textMatch'"
                  size="large"
                  style="display: flex"
                  class="mobile-changeline">
                  文本匹配：{{ cond.value }}
                </el-text>
                <el-text
                  v-else-if="cond.condType === 'exprTrue'"
                  size="large"
                  style="display: flex"
                  class="mobile-changeline">
                  <div style="flex: 1">表达式：{{ cond.value }}</div>
                </el-text>
                <el-text
                  v-else-if="cond.condType === 'textLenLimit'"
                  size="large"
                  style="display: flex"
                  class="mobile-changeline">
                  <div style="flex: 1">
                    长度：{{ cond.matchOp === 'ge' ? '大于等于' : ''
                    }}{{ cond.matchOp === 'le' ? '小于等于' : '' }}
                    {{ cond.value }}
                  </div>
                </el-text>
              </div>
            </div>
          </template>

          <el-text class="mb-2 block" size="large">条件（需同时满足，即 and）</el-text>
          <div class="border-l-4 border-orange-500 pl-4">
            <custom-reply-conditions v-model="el.conditions" />
            <el-button type="success" size="small" @click="addCond(el.conditions)">
              <template #icon>
                <i-carbon-add-large />
              </template>
              增加
            </el-button>
          </div>

          <el-text class="my-2 block" size="large">结果（顺序执行）</el-text>
          <div class="border-l-4 border-blue-500 pl-4">
            <div
              v-for="(i, index) in el.results || []"
              :key="index"
              class="mb-3 border-l-2 border-blue-500 pl-2">
              <div style="display: flex; justify-content: space-between">
                <el-space>
                  <el-text>模式</el-text>
                  <el-radio-group v-model="i.resultType" size="small">
                    <el-radio-button value="replyToSender" label="回复" />
                    <el-radio-button value="replyPrivate" label="私聊回复" />
                    <el-radio-button value="replyGroup" label="群内回复" />
                  </el-radio-group>
                </el-space>

                <el-button
                  type="danger"
                  size="small"
                  plain
                  @click="deleteAnyItem(el.results, index)">
                  <template #icon>
                    <i-carbon-row-delete />
                  </template>
                  <template v-if="notMobile" #default>删除结果</template>
                </el-button>
              </div>

              <div v-if="['replyToSender', 'replyPrivate', 'replyGroup'].includes(i.resultType)">
                <div class="mobile-changeline my-2 flex justify-between">
                  <div style="display: flex; align-items: center">
                    <el-text>回复文本（随机选择）</el-text>
                  </div>
                  <el-space>
                    <el-text>
                      延迟
                      <el-tooltip
                        raw-content
                        content="文本将在此延迟后发送，单位秒，可小数。<br />注意随机延迟仍会被加入，如果你希望保证发言顺序，记得考虑这点。">
                        <el-icon><i-carbon-help-filled /></el-icon>
                      </el-tooltip>
                    </el-text>
                    <el-input
                      v-model="i.delay"
                      size="small"
                      type="number"
                      style="width: 4rem"></el-input>
                  </el-space>
                </div>

                <div v-for="(k2, index) in i.message" :key="index" class="my-2 w-full">
                  <!-- 这里面是单条修改项 -->
                  <div style="display: flex">
                    <div
                      style="
                        display: flex;
                        align-items: center;
                        width: 1.3rem;
                        margin-left: 0.2rem;
                      ">
                      <el-tooltip
                        :content="
                          index === 0
                            ? '点击添加一个回复语，海豹将会随机抽取一个回复'
                            : '点击删除你不想要的回复语'
                        "
                        placement="bottom-start">
                        <el-icon>
                          <i-carbon-add-filled v-if="index == 0" @click="addItem(i.message)" />
                          <i-carbon-close-outline v-else @click="removeItem(i.message, index)" />
                        </el-icon>
                      </el-tooltip>
                    </div>
                    <div style="flex: 1">
                      <el-input
                        v-model="k2[0]"
                        type="textarea"
                        class="reply-text"
                        autosize></el-input>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <el-button type="success" size="small" @click="addResult(el.results)">
              <template #icon>
                <i-carbon-add-large />
              </template>
              增加
            </el-button>
          </div>
        </foldable-card>
      </li>
    </template>
  </draggable>
</template>

<script lang="ts" setup>
import draggable from 'vuedraggable';
import { breakpointsTailwind } from '@vueuse/core';

const props = defineProps<{ tasks: Array<any> }>();

const breakpoints = useBreakpoints(breakpointsTailwind);
const notMobile = breakpoints.greater('sm');

const deleteItem = (index: number) => {
  ElMessageBox.confirm('确认删除此项？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    // eslint-disable-next-line vue/no-mutating-props
    props.tasks.splice(index, 1);
  });
};

const deleteAnyItem = (lst: any[], index: number) => {
  lst.splice(index, 1);
};

const addCond = (i: any) => {
  i.push({
    condType: 'textMatch',
    matchType: 'matchExact',
    value: '要匹配的文本',
  });
};

const addResult = (i: any) => {
  i.push({ resultType: 'replyToSender', delay: 0, message: [['说点什么', 1]] });
};

const addItem = (k: any) => {
  k.push(['怎么辉石呢', 1]);
};

const removeItem = (v: any[], index: number | any) => {
  v.splice(index, 1);
};
</script>

<style scoped lang="css">
.dragArea {
  min-height: 50px;
  /* outline: 1px dashed; */
  padding-top: 1rem;
  padding-bottom: 1rem;

  .reply-item:not(:last-child) {
    border-bottom: 1px solid var(--el-border-color);
    padding-bottom: 1rem;
  }
}

@media screen and (max-width: 700px) {
  .mobile-changeline {
    flex-direction: column;
  }
}
</style>
