<template>
  <header class="page-header">
    <n-switch v-model:value="jsEnable">
      <template #checked>
        启用
      </template>
      <template #unchecked>
        关闭
      </template>
    </n-switch>
    <n-button v-show="jsEnable" @click="jsReload" type="primary">
      <template #icon>
        <n-icon><Refresh /></n-icon>
      </template>
      重载JS
    </n-button>
  </header>

  <el-affix :offset="70" v-if="needReload">
    <div class="tip-danger">
      <n-text type="error" strong>存在修改，需要重载后生效！</n-text>
    </div>
  </el-affix>
  <el-affix :offset="70" v-if="jsConfigEdited">
    <div v-if="jsConfigFormatErrKeys.length > 0">
      <div class="tip-danger">
        <n-text type="error" strong>配置内容已修改，但存在格式错误，无法保存！</n-text>
      </div>
    </div>
    <div v-else> 
      <div class="tip-danger">
        <n-text type="error" strong>配置内容已修改，不要忘记保存！</n-text>
        <n-button class="button" type="primary" :icon="DocumentChecked" :disabled="!jsConfigEdited" @click="doJsConfigSave()">点我保存</n-button>
      </div>
    </div>
  </el-affix>
  <el-row>
    <el-col :span="24">
      <n-tabs v-model:value="mode" type="line" size="large" class="demo-tabs">
        <n-tab-pane tab="控制台" name="console">
          <div>
            <div ref="editorBox">
            </div>
            <div>
              <div style="margin-top: 1rem">
                <n-button @click="doExecute" type="success" :disabled="!jsEnable">
                  <template #icon>
                    <n-icon><CaretRight /></n-icon>
                  </template>
                  执行代码
                </n-button>
              </div>
            </div>
            <n-text type="warning" tag="p" style="padding: 1rem 0;">注意：延迟执行的代码，其输出不会立即出现</n-text>
            <div style="word-break: break-all; margin-bottom: 1rem; white-space: pre-line;">
              <n-text code v-for="i in jsLines">{{ i }}</n-text>
            </div>
          </div>
        </n-tab-pane>
        <n-tab-pane tab="插件列表" name="list">
          <header class="js-list-header">
            <n-flex align="center">
              <span>
                <n-upload action="" multiple accept="application/javascript,application/typescript,.js,.ts" class="upload"
                          @before-upload="beforeUpload" v-model:file-list="uploadFileList">
                  <n-button type="primary">
                    <template #icon>
                      <n-icon><Upload /></n-icon>
                    </template>
                    上传插件
                  </n-button>
                </n-upload>
              </span>
              <span>
                <n-input v-model:value="jsFilter" size="small" clearable placeholder="">
                  <template #prefix>
                    <n-icon><Search /></n-icon>
                  </template>
                </n-input>
              </span>
              <n-button type="info" text tag="a" target="_blank" href="https://github.com/sealdice/javascript">
                <template #icon>
                  <n-icon><Link /></n-icon>
                </template>
                获取插件
              </n-button>
            </n-flex>
          </header>
          <aside v-if="jsFilterCount > 0" class="mb-4">
            <n-text type="info">已过滤 {{ jsFilterCount }} 条</n-text>
          </aside>
          <main class="js-list-main">
            <foldable-card class="js-item" v-for="(i, index) of filteredJsList" :key="index"
                           :err-title="i.filename" :err-text="i.errText">
              <template #title>
                <n-flex class="js-item-header">
                  <n-switch v-model:value="i.enable" @change="changejsScriptStatus(i.name, i.enable)" :disabled="i.errText !== ''"/>
                  <n-text strong>{{ i.name }}</n-text>
                  <n-text>{{ i.version || '&lt;未定义>' }}</n-text>
                  <n-tag v-if="i.official" size="small" type="success" :bordered="false">官方</n-tag>

                  <n-tooltip v-if="i?.filename?.toLowerCase()?.endsWith('.ts')" trigger="hover">
                    <template #trigger>
                      <n-tag size="small" type="info" :bordered="false">TS</n-tag>
                    </template>
                    该插件使用 TypeScript 编写
                  </n-tooltip>
                </n-flex>
              </template>

              <template #title-extra>
                <n-flex size="small">
                  <n-button v-if="i.official && i.updateUrls && i.updateUrls.length > 0"
                            type="success" size="tiny" secondary :loading="diffLoading">
                    <template #icon>
                      <n-icon><Download /></n-icon>
                    </template>
                    更新
                  </n-button>
                  <n-popconfirm v-else-if="i.updateUrls && i.updateUrls.length > 0"
                                positive-text="确认"
                                negative-text="取消"
                                @positive-click="doCheckUpdate(i, index)">
                    <template #trigger>
                      <n-button type="success" size="tiny" secondary :loading="diffLoading">
                        <template #icon>
                          <n-icon><Download /></n-icon>
                        </template>
                        更新
                      </n-button>
                    </template>
                    更新地址由插件作者提供，是否确认要检查该插件更新？
                  </n-popconfirm>
                  <n-button v-if="i.builtin && i.builtinUpdated" @click="doDelete(i, index)" type="error" size="tiny" secondary>
                    <template #icon>
                      <n-icon><Delete /></n-icon>
                    </template>
                    卸载更新
                  </n-button>
                  <n-button v-if="!i.builtin" @click="doDelete(i, index)" type="error" size="tiny" secondary>
                    <template #icon>
                      <n-icon><Delete /></n-icon>
                    </template>
                    删除
                  </n-button>
                </n-flex>
              </template>

              <template #title-extra-error>
                <n-flex size="small">
                  <n-button v-if="i.builtin && i.builtinUpdated" @click="doDelete(i, index)" type="error" size="small" secondary>
                    <template #icon>
                      <n-icon><Delete /></n-icon>
                    </template>
                    卸载更新
                  </n-button>
                  <n-button v-else-if="!i.builtin" @click="doDelete(i, index)" :icon="Delete" type="error" size="tiny" secondary>
                    <template #icon>
                      <n-icon><Delete /></n-icon>
                    </template>
                    删除
                  </n-button>
                </n-flex>
              </template>

              <n-descriptions label-placement="left" style="white-space:pre-line;">
                <n-descriptions-item v-if="!i.official" :span="3" label="作者">{{ i.author || '&lt;佚名>' }}</n-descriptions-item>
                <n-descriptions-item :span="3" label="介绍">{{ i.desc || '&lt;暂无>' }}</n-descriptions-item>
                <n-descriptions-item v-if="!i.official" :span="3" label="主页">{{ i.homepage || '&lt;暂无>' }}</n-descriptions-item>
                <n-descriptions-item label="许可协议">{{ i.license || '&lt;暂无>' }}</n-descriptions-item>
                <n-descriptions-item label="安装时间">{{ dayjs.unix(i.installTime).fromNow() }}</n-descriptions-item>
                <n-descriptions-item label="更新时间">
                  {{ i.updateTime ? dayjs.unix(i.updateTime).fromNow() : '' || '&lt;暂无>' }}
                </n-descriptions-item>
              </n-descriptions>

              <template #unfolded-extra>
                <n-text>{{ i.desc || '&lt;暂无>' }}</n-text>
              </template>
            </foldable-card>
          </main>
        </n-tab-pane>

        <n-tab-pane tab="插件设置" name="config">
          <main>
            <div v-if="size(jsConfig as Map<any,any>) === 0" style="display: flex; justify-content: center">
              <el-text size="large" tag="strong">暂无设置项</el-text>
            </div>
            <el-collapse v-else class="js-list-main" style="margin-top: 0.5rem;">
              <el-collapse-item class="js-item" v-for="(config, i) in jsConfig" :key="i">
                <template #title>
                  <div class="js-item-header">
                    <el-space>
                      <el-text size="large" tag="strong" style="margin-left: 1rem">{{ (config as unknown as JsPluginConfig)['pluginName'] }}</el-text>
                    </el-space>
                  </div>
                </template>
                <el-card shadow="never" style="border: 0;">
                  <el-form v-for="(c, index) in (config as unknown as JsPluginConfig)['configs']" :key="index">
                    <template #header>
                      <div class="js-item-header">
                        <el-space>
                          <el-text size="large">{{ (c as unknown as JsPluginConfigItem).key }}</el-text>
                        </el-space>
                      </div>
                    </template>
                    <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'string'" style="width: 100%; margin-bottom: .5rem;">
                      <el-form-item label="字符串配置项:">{{(c as unknown as JsPluginConfigItem).key}}</el-form-item><br/>
                      <div style="width: 100%"><el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text></div>
                      <div style="width: 100%; margin-bottom: .5rem;">
                        <el-input type="textarea" v-model="(c as unknown as JsPluginConfigItem).value" @change="doJsConfigChanged()"></el-input>
                      </div>
                      <template v-if="(c as unknown as JsPluginConfigItem).value !== (c as unknown as JsPluginConfigItem).defaultValue">
                        <el-tooltip content="重置为初始值" placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doResetJsConfig((config as unknown as JsPluginConfig)['pluginName'],(c as unknown as JsPluginConfigItem).key)">
                            <brush-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                        <el-tooltip content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除" raw-content
                                    placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doDeleteUnusedConfig((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, false)">
                            <delete-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                    </el-form-item>
                    <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'int'">
                      <el-form-item label="整数配置项:">{{(c as unknown as JsPluginConfigItem).key}}</el-form-item><br/>
                      <div style="width: 100%"><el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text></div>
                      <el-form-item :span="30">
                        <div style="margin-left: 1rem;">
                          <el-input-number v-model="(c as unknown as JsPluginConfigItem).value" type="number" @change="doJsConfigChanged()"></el-input-number>
                        </div>
                      </el-form-item>
                      <template v-if="(c as unknown as JsPluginConfigItem).value !== (c as unknown as JsPluginConfigItem).defaultValue">
                        <el-tooltip content="重置为初始值" placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doResetJsConfig((config as unknown as JsPluginConfig)['pluginName'],(c as unknown as JsPluginConfigItem).key)">
                            <brush-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                        <el-tooltip content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除" raw-content
                                    placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doDeleteUnusedConfig((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, false)">
                            <delete-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                    </el-form-item>
                    <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'float'">
                      <el-form-item label="浮点数配置项:">{{(c as unknown as JsPluginConfigItem).key}}</el-form-item><br/>
                      <div style="width: 100%"><el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text></div>
                      <el-form-item :span="30">
                        <div style="margin-left: 1rem;">
                          <el-input-number v-model="(c as unknown as JsPluginConfigItem).value" type="number" @change="doJsConfigChanged()"></el-input-number>
                        </div>
                      </el-form-item>
                      <template v-if="(c as unknown as JsPluginConfigItem).value !== (c as unknown as JsPluginConfigItem).defaultValue">
                        <el-tooltip content="重置为初始值" placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doResetJsConfig((config as unknown as JsPluginConfig)['pluginName'],(c as unknown as JsPluginConfigItem).key)">
                            <brush-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                        <el-tooltip content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除" raw-content
                                    placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doDeleteUnusedConfig((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, false)">
                            <delete-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                    </el-form-item>
                    <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'bool'">
                      <el-form-item label="布尔配置项:">{{(c as unknown as JsPluginConfigItem).key}}</el-form-item><br/>
                      <div style="width: 100%"><el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text></div>
                      <el-form-item :span="30" >
                        <div style="margin-left: 1rem;">
                          <el-switch v-model="(c as unknown as JsPluginConfigItem).value" @change="doJsConfigChanged()"></el-switch>
                        </div>
                      </el-form-item>
                      <template v-if="(c as unknown as JsPluginConfigItem).value !== (c as unknown as JsPluginConfigItem).defaultValue">
                        <el-tooltip content="重置为初始值" placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doResetJsConfig((config as unknown as JsPluginConfig)['pluginName'],(c as unknown as JsPluginConfigItem).key)">
                            <brush-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                        <el-tooltip content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除" raw-content
                                    placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doDeleteUnusedConfig((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, false)">
                            <delete-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                    </el-form-item>
                    <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'template'" style="width: 100%; margin-bottom: .5rem;">
                      <el-form-item label="模板配置项:" style="width: 100%; margin-bottom: .5rem;">{{(c as unknown as JsPluginConfigItem).key}}</el-form-item><br/>
                      <div style="width: 100%"><el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text></div>
                      <template v-if="!isEqual((c as unknown as JsPluginConfigItem).value, (c as unknown as JsPluginConfigItem).defaultValue)">
                        <el-tooltip content="重置为初始值" placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doResetJsConfig((config as unknown as JsPluginConfig)['pluginName'],(c as unknown as JsPluginConfigItem).key)">
                            <brush-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                        <el-tooltip content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除" raw-content
                                    placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doDeleteUnusedConfig((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, false)">
                            <delete-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <el-form-item style="width: 100%; margin-bottom: .5rem;">
                        <div v-for="(d, index) in (c as unknown as JsPluginConfigItem).value" :key="index" style="width: 100%; margin-bottom: .5rem;">
                          <!-- 这里面是单条修改项 -->
                          <el-row>
                            <el-col style="width: 100%; margin-bottom: .5rem;">
                            <span style="width: 100%;">
                              <el-input type="textarea" v-model="((c as unknown as JsPluginConfigItem).value)[index]" :autosize="true" @change="doJsConfigChanged()"></el-input>
                            </span>
                            </el-col>
                            <el-col :span="5">
                              <div style="display: flex; align-items: center; width: 1.3rem; margin-left: 1rem; margin-top: .5rem">
                                <el-tooltip :content="index === 0 ? '点击添加一项' : '点击删除你不想要的配置项'" placement="bottom-start">
                                  <el-icon>
                                    <circle-plus-filled v-if="index == 0" @click="doJsConfigAddItem((c as unknown as JsPluginConfigItem).value)" />
                                    <circle-close v-else @click="doJsConfigRemoveItemAt((c as unknown as JsPluginConfigItem).value, index)" />
                                  </el-icon>
                                </el-tooltip>
                              </div>
                            </el-col>
                          </el-row>
                        </div>
                      </el-form-item>
                    </el-form-item>
                    <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'option'">
                      <el-form-item label="选项配置项:" style="width: 100%; margin-bottom: .5rem;">{{(c as unknown as JsPluginConfigItem).key}}</el-form-item>
                      <div style="width: 100%"><el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text></div>
                      <template v-if="(c as unknown as JsPluginConfigItem).value !== (c as unknown as JsPluginConfigItem).defaultValue">
                        <el-tooltip content="重置为初始值" placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doResetJsConfig((config as unknown as JsPluginConfig)['pluginName'],(c as unknown as JsPluginConfigItem).key)">
                            <brush-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                        <el-tooltip content="移除 - 这个配置在新版的默认配置中不被使用，<br />但升级而来时仍可能被使用，请确认无用后删除" raw-content
                                    placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doDeleteUnusedConfig((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, false)">
                            <delete-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <div style="width: 100%; margin-bottom: .5rem;">
                        <el-select v-model="(c as unknown as JsPluginConfigItem).value" @change="doJsConfigChanged()">
                          <el-option v-for="s in (c as unknown as JsPluginConfigItem).option" :key="s" :value="s">{{s}}</el-option>
                        </el-select>
                      </div>
                    </el-form-item>
                    <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'task:cron'" style="width: 100%; margin-bottom: .5rem;">
                      <el-form-item label="Cron 型定时任务:">{{(c as unknown as JsPluginConfigItem).key}}</el-form-item><br/>
                      <div style="width: 100%"><el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text></div>
                      <div style="width: 100%; margin-bottom: .5rem;">
                        <el-input type="textarea" v-model="(c as unknown as JsPluginConfigItem).value" @change="doTaskCronFormatCheck((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, (c as unknown as JsPluginConfigItem).value)"></el-input>
                        <el-text type="danger" v-if="jsConfigFormatErrKeys.indexOf((config as unknown as JsPluginConfig)['pluginName'] + '/' +  (c as unknown as JsPluginConfigItem).key) !== -1">
                          格式错误！
                        </el-text>
                      </div>
                      <template v-if="(c as unknown as JsPluginConfigItem).value !== (c as unknown as JsPluginConfigItem).defaultValue">
                        <el-tooltip content="重置为初始值" placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doResetJsConfig((config as unknown as JsPluginConfig)['pluginName'],(c as unknown as JsPluginConfigItem).key)">
                            <brush-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                        <el-tooltip content="移除 - 这个定时任务在当前版本中不被使用，<br />但未来版本中仍可能被使用，请确认无用后删除" raw-content
                                    placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doDeleteUnusedConfig((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, true)">
                            <delete-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                    </el-form-item>
                    <el-form-item v-if="(c as unknown as JsPluginConfigItem).type == 'task:daily'" style="width: 100%; margin-bottom: .5rem;">
                      <el-form-item label="每日定时任务:">{{(c as unknown as JsPluginConfigItem).key}}</el-form-item><br/>
                      <div style="width: 100%"><el-text>{{ (c as unknown as JsPluginConfigItem).description }}</el-text></div>
                      <div style="width: 100%; margin-bottom: .5rem;">
                        <el-input type="textarea" v-model="(c as unknown as JsPluginConfigItem).value" @change="doTaskDailyFormatCheck((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, (c as unknown as JsPluginConfigItem).value)"></el-input>
                        <el-text type="danger" v-if="jsConfigFormatErrKeys.indexOf((config as unknown as JsPluginConfig)['pluginName'] + '/' + (c as unknown as JsPluginConfigItem).key) !== -1">
                          格式错误！
                        </el-text>
                      </div>
                      <template v-if="(c as unknown as JsPluginConfigItem).value !== (c as unknown as JsPluginConfigItem).defaultValue">
                        <el-tooltip content="重置为初始值" placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doResetJsConfig((config as unknown as JsPluginConfig)['pluginName'],(c as unknown as JsPluginConfigItem).key)">
                            <brush-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                      <template v-if="(c as unknown as JsPluginConfigItem).deprecated">
                        <el-tooltip content="移除 - 这个定时任务在当前版本中不被使用，<br />但未来版本中仍可能被使用，请确认无用后删除" raw-content
                                    placement="bottom-end">
                          <el-icon style="float: right; margin-left: 1rem;" @click="doDeleteUnusedConfig((config as unknown as JsPluginConfig)['pluginName'], (c as unknown as JsPluginConfigItem).key, true)">
                            <delete-filled />
                          </el-icon>
                        </el-tooltip>
                      </template>
                    </el-form-item>

                  </el-form>
                </el-card>
              </el-collapse-item>
            </el-collapse>
          </main>
        </n-tab-pane>
      </n-tabs>
    </el-col>

  </el-row>
</template>

<script lang="ts" setup>
import {useStore} from '~/store'
import {
  BrushFilled,
  CaretRight,
  CircleClose,
  CirclePlusFilled,
  Delete,
  DeleteFilled,
  DocumentChecked,
  Download,
  Link,
  Refresh,
  Search,
  Upload
} from '@element-plus/icons-vue'
import * as dayjs from 'dayjs'
import {basicSetup, EditorView} from "codemirror"
import {javascript} from "@codemirror/lang-javascript"
import {isEqual, size} from "lodash-es";
import type {JsPluginConfig, JsPluginConfigItem, JsScriptInfo} from "~/type.d.ts";
import type {UploadFileInfo} from "naive-ui";
import { useDialog, useMessage } from "naive-ui";

const store = useStore()
const dialog = useDialog()
const message = useMessage()
const jsEnable = ref(false)
const editorBox = ref(null);
const mode = ref('console');
const needReload = ref(false)
let editor: EditorView

const jsLines = ref([] as string[])

const defaultText = [
  "// 学习制作可以看这里：https://github.com/sealdice/javascript/tree/main/examples",
  "// 下载插件可以看这里: https://github.com/sealdice/javascript/tree/main/scripts",
  "// 使用TypeScript，编写更容易 https://github.com/sealdice/javascript/tree/main/examples_ts",
  "// 目前可用于: 创建自定义指令，自定义COC房规，发送网络请求，读写本地数据",
  "",
  "console.log('这是测试控制台');",
  "console.log('可以这样来查看变量详情：');",
  "console.log(Object.keys(seal));",
  "console.log('更多内容正在制作中...')",
  "console.log('注意: 测试版！API仍然可能发生重大变化！')",
  "// 写在这里的所有变量都是临时变量，如果你希望全局变量，使用 globalThis",
  "// 但是注意，全局变量在进程关闭后失效，想保存状态请存入硬盘。",
  "globalThis._test = 123;",
  "",
  "let ext = seal.ext.find('test');",
  "if (!ext) {",
  "  ext = seal.ext.new('test', '木落', '1.0.0');",
  "  seal.ext.register(ext);",
  "}",
]

/** 执行指令 */
const doExecute = async () => {
  jsLines.value = [];
  const txt = editor.state.doc.toString();
  const data = await store.jsExec(txt);

  // 优先填充print输出
  const lines = []
  if (data.outputs) {
    lines.push(...data.outputs)
  }
  // 填充err或ret
  if (data.err) {
    lines.push(data.err)
  } else {
    lines.push(data.ret);
    try {
      (window as any).lastJSValue = data.ret;
      (globalThis as any).lastJSValue = data.ret;
    } catch (e) { }
  }
  jsLines.value = lines
}

let jsConfigEdited = ref(false)
const doJsConfigChanged = () => {
  jsConfigEdited.value = true
}

let jsConfigFormatErrKeys: Ref<string[]> = ref([]);
const doTaskCronFormatCheck = async (pluginName: string, key: string, expr: string) => {
  let index = jsConfigFormatErrKeys.value.indexOf(pluginName + '/' + key);
  try{
    await store.checkCronExpr(expr);
    if (index !== -1) {
      jsConfigFormatErrKeys.value.splice(index, 1);
    }
    jsConfigEdited.value = true;
  } catch (_err) {
    if (index === -1) {
      jsConfigFormatErrKeys.value.push(pluginName + '/' + key);
    }
    jsConfigEdited.value = true;
  }
};

const doTaskDailyFormatCheck = (pluginName: string, key: string, expr: string) => {
  const pattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  let index = jsConfigFormatErrKeys.value.indexOf(pluginName + '/' + key);
  if (pattern.test(expr)) {
    if (index !== -1) {
      jsConfigFormatErrKeys.value.splice(index, 1);
    }
    jsConfigEdited.value = true;
  } else {
    if (index === -1) {
      jsConfigFormatErrKeys.value.push(pluginName + '/' + key);
    }
    jsConfigEdited.value = true;
  } 
};

const doDeleteUnusedConfig = (pluginName: any, key: any, isTask: boolean) => {
  ElMessageBox.confirm(
    isTask ? `删除插件 ${pluginName} 的定时任务 ${key} ，确定吗？` : `删除插件 ${pluginName} 的配置项 ${key} ，确定吗？`,
    '删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async (data) => {
    await store.jsDeleteUnusedConfig(pluginName, key )
    setTimeout(() => {
      // 稍等等再重载，以免出现没删掉
      refreshConfig()
    }, 1000);
    ElMessage.success('配置项已删除')
  })
}

const doResetJsConfig = (plginName: string, key: string) => {
  ElMessageBox.confirm(
      '重置这条配置项回默认状态，确定吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(async () => {
    await store.jsResetConfig(plginName, key)
    ElMessage({
      type: 'success',
      message: '成功!',
    })
    setTimeout(() => {
      refreshConfig()
      jsConfigEdited.value = false
      jsConfigFormatErrKeys.value = []
    }, 1000);
  })
}
const doJsConfigAddItem = (arr: any[]) => {
  arr.push("");
  doJsConfigChanged()
  return arr;
}
const doJsConfigRemoveItemAt = <T>(arr: T[], index: number) => {
  if (index < 0 || index >= arr.length) {
    return arr;
  }
  arr.splice(index, 1);
  doJsConfigChanged()
  return arr;
}

const doJsConfigSave = async () => {
  await store.jsSetConfig(jsConfig.value)
    jsConfigEdited.value = false
  message.success('已保存')
}

let timerId: number

onMounted(async () => {
  jsEnable.value = await jsStatus()
  watch(jsEnable, async (newStatus, oldStatus) => {
    console.log("new:", newStatus, " old:", oldStatus)
    if (oldStatus !== undefined) {
      if (newStatus) {
        console.log("reload")
        await jsReload()
      } else {
        console.log("shutdown")
        await jsShutdown()
      }
    }
  })

  const el = editorBox.value as any as HTMLElement;
  editor = new EditorView({
    extensions: [basicSetup, javascript(), EditorView.lineWrapping,],
    parent: el,
    doc: defaultText.join('\n'),
  })
  el.onclick = () => {
    editor.focus();
  }
  try {
    (globalThis as any).editor = editor;
  } catch (e) { }

  await refreshList();
  if (jsList.value.length > 0) {
    mode.value = 'list'
  }
  await refreshConfig();

  timerId = setInterval(async () => {
    console.log('refresh')
    const data = await store.jsGetRecord();

    if (data.outputs) {
      jsLines.value.push(...data.outputs)
    }
  }, 3000) as any;
})

onBeforeUnmount(() => {
  clearInterval(timerId)
})


const jsList = ref<JsScriptInfo[]>([]);
const jsFilter = ref<string>('')
const jsFilterCount = computed(() => jsList.value.length - filteredJsList.value.length)
const filteredJsList = computed(() => jsList.value.filter((js) => {
  if (jsFilter.value === '') {
    return true
  }
  const val = jsFilter.value.toLowerCase();
  return js.name?.toLowerCase()?.includes(val)
      || js.desc?.toLowerCase()?.includes(val)
      || js.author?.toLowerCase()?.includes(val)
}))
const jsConfig = ref<Map<string, JsPluginConfig>>(new Map<string, JsPluginConfig>());
const uploadFileList = ref<any[]>([]);

const jsVisitDir = async () => {
  // 好像webui上没啥效果，先算了
  // await store.jsVisitDir();
}

const jsStatus = async () => {
  return store.jsStatus()
}

const refreshList = async () => {
  const lst = await store.jsList();
  jsList.value = lst;
}

const refreshConfig = async () => {
  jsConfig.value = await store.jsGetConfig();
}

const jsReload = async () => {
  const ret = await store.jsReload()
  if (ret && ret.testMode) {
    message.success('展示模式无法重载脚本')
  } else {
    message.success('已重载')
    await refreshList()
    needReload.value = false
  }
  jsEnable.value = await jsStatus()
}

const jsShutdown = async () => {
  const ret = await store.jsShutdown()
  if (ret?.testMode) {
    message.success('展示模式无法关闭')
  } else if (ret?.result === true) {
    message.success('已关闭JS支持')
    jsLines.value = []
    await refreshList()
  }
  jsEnable.value = await jsStatus()
}

const beforeUpload = async (data: {
  file: UploadFileInfo
  fileList: UploadFileInfo[]
}) => { // UploadRawFile
  const file = data.file.file
  let fd = new FormData()
  fd.append('file', file)
  await store.jsUpload({ form: fd })
  refreshList();
  message.success('上传完成，请在全部操作完成后，手动重载插件')
  needReload.value = true
}

const doDelete = async (data: JsScriptInfo, index: number) => {
  ElMessageBox.confirm(
    data.official ? `卸载官方插件《${data.name}》的更新，确定吗？` : `删除插件《${data.name}》，确定吗？`,
    '删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async (data) => {
    await store.jsDelete({ index })
    setTimeout(() => {
      // 稍等等再重载，以免出现没删掉
      refreshList()
    }, 1000);
    message.success('插件已删除，请手动重载后生效')
    needReload.value = true
  })
}

const changejsScriptStatus = async (name: string, status: boolean) => {
  if (status) {
    const ret = await store.jsEnable({ name })
    setTimeout(() => {
      refreshList()
    }, 1000);
    if (ret.result) {
      message.success('插件已启用，请手动重载后生效')
    }
  } else {
    const ret = await store.jsDisable({ name })
    setTimeout(() => {
      refreshList()
    }, 1000);
    if (ret.result) {
      message.success('插件已禁用，请手动重载后生效')
    }
  }
  needReload.value = true
  return true
}

const showSettingDialog = ref<boolean>(false)

interface DeckProp {
  key:  string
  value: string

  name?: string
  desc?: string
  required?: boolean
  default?: string
}

const settingForm = ref({
  props: [{key: "name", value: "test props"}] as DeckProp[]
})

const diffLoading = ref<boolean>(false)

interface JsCheckResult {
  old: string,
  new: string,
  tempFileName: string,
  index: number,
}

const jsCheck = ref<JsCheckResult>({
  old: "",
  new: "",
  tempFileName: "",
  index: -1
})

const doCheckUpdate = async (data: any, index: number) => {
  diffLoading.value = true
  const checkResult = await store.jsCheckUpdate({ index });
  diffLoading.value = false
  if (checkResult.result) {
    jsCheck.value = { ...checkResult, index }
    dialog.info({
      title: '检查更新结果',
      content: () => h('diff-viewer', { lang: "javascript", old: jsCheck.value.old, 'new': jsCheck.value.new }),
      positiveText: '确认更新',
      negativeText: '取消',
      onPositiveClick: async () => {
        const res = await store.jsUpdate(jsCheck.value);
        if (res.result) {
          needReload.value = true
          setTimeout(() => {
            refreshList()
          }, 1000)
          message.success('更新成功，请手动重载后生效')
        } else {
          message.error('更新失败！' + res.err)
        }
      },
      positiveButtonProps: {
        disabled: jsCheck.value.old === jsCheck.value.new
      },
      closable: false,
    })
  } else {
    message.error('检查更新失败！' + checkResult.err)
  }
}
</script>

<style lang="css">
.cm-editor {
  /* height: v-bind("$props.initHeight"); */
  height: 20rem;
  /* font-size: 18px; */

  outline: 0 !important;
  /* height: 50rem; */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
}

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

.deck-keys {
  display: flex;
  flex-flow: wrap;

  &>span {
    margin-right: 1rem;
    /* width: fit-content; */
  }
}

.upload {
  >ul {
    display: none;
  }
}

.js-list-header {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}

.js-list-main {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem
}

.js-item-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}

.js-item {
  min-width: 100%;
}
</style>
