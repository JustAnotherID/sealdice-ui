<template>
  <Teleport to="#root">
    <div style="position: absolute; right: 40px; bottom: 60px; z-index: 10">
      <n-button type="primary" class="btn-add" circle @click="addOne">
        <template #icon>
          <n-icon><i-carbon-add-large /></n-icon>
        </template>
      </n-button>
    </div>
  </Teleport>

  <div v-if="!store.curDice.conns || (store.curDice.conns && store.curDice.conns.length === 0)">
    <span style="vertical-align: middle">似乎还没有账号，</span>
    <n-button text style="font-size: 16px; font-weight: bolder" type="info" @click="addOne">
      点我添加一个
    </n-button>
  </div>

  <div style="display: flex; flex-wrap: wrap">
    <div
      v-for="(i, index) in reactive(store.curDice.conns)"
      :key="index"
      style="min-width: 20rem; flex: 1 0 50%; flex-grow: 0">
      <n-card class="box-card" style="margin-right: 1rem; margin-bottom: 1rem; position: relative">
        <template #header>
          <div class="card-header">
            <span style="word-break: break-all">
              {{ i.nickname || '<"未知">' }}({{ i.userId }})
            </span>
            <n-button size="small" type="error" secondary @click="doRemove(i)">
              <template #icon>
                <n-icon><i-carbon-row-delete /> </n-icon>
              </template>
              删除
            </n-button>
          </div>
        </template>

        <div
          v-if="
            i.adapter?.loginState === goCqHttpStateCode.InLoginQrCode && store.curDice.qrcodes[i.id]
          "
          style="position: absolute; width: 17rem; height: 14rem; background: #fff; z-index: 1">
          <div style="margin-left: 2rem">需要同账号的手机 QQ 扫码登录 (限 2 分钟内完成):</div>
          <img
            alt="qr code"
            style="
              image-rendering: pixelated;
              width: 10rem;
              height: 10rem;
              margin-left: 3.5rem;
              margin-top: 2rem;
            "
            :src="store.curDice.qrcodes[i.id]" />
        </div>

        <div
          v-if="
            i.adapter?.loginState === goCqHttpStateCode.InLoginBar &&
            i.adapter?.goCqHttpLoginDeviceLockUrl
          "
          style="position: absolute; width: 17rem; height: 14rem; background: #fff; z-index: 1">
          <template v-if="i.id === curCaptchaIdSet">
            <div>已提交 ticket，正在等待 gocqhttp 回应</div>
          </template>
          <template v-else>
            <div style="margin-left: 2rem">滑条验证码流程</div>
            <div>
              <a
                style="line-break: anywhere"
                href="javascript:void(0)"
                @click="captchaUrlSet(i, i.adapter?.goCqHttpLoginDeviceLockUrl)">
                {{ i.adapter?.goCqHttpLoginDeviceLockUrl }}
              </a>
            </div>
          </template>
        </div>

        <div
          v-if="i.adapter?.loginState === goCqHttpStateCode.InLoginVerifyCode"
          style="position: absolute; width: 17rem; height: 18rem; background: #fff; z-index: 1">
          <div style="margin-left: 2rem">短信验证码流程</div>
          <div style="margin-top: 4rem">
            <n-form label-width="5rem">
              <n-form-item label="验证码">
                <n-input v-model:value="smsCode"></n-input>
              </n-form-item>
              <n-form-item label="">
                <n-button :disabled="smsCode == ''" type="primary" @click="submitSmsCode(i)">
                  提交
                </n-button>
              </n-form-item>
            </n-form>
          </div>
        </div>

        <n-form ref="formRef" :model="i" label-placement="left" label-width="100px">
          <n-alert
            v-if="i.platform === 'QQ' && i.protocolType === 'red'"
            type="error"
            :closable="false"
            style="margin-bottom: 1rem">
            新版 Chronocat（0.2.x 以上）不再提供 red 协议，故海豹将在未来移除该支持，请尽快迁移。
          </n-alert>

          <n-form-item label="状态">
            <n-flex>
              <div v-if="i.state === 0">
                <n-tag type="error" :bordered="false">断开</n-tag>
              </div>
              <div v-if="i.state === 2">
                <n-tag type="warning" :bordered="false">连接中</n-tag>
              </div>
              <div v-if="i.state === 1">
                <n-tag type="success" :bordered="false">已连接</n-tag>
              </div>
              <div v-if="i.state === 3">
                <n-tag type="error" :bordered="false">失败</n-tag>
              </div>
              <n-tooltip
                v-if="
                  Math.round(new Date().getTime() / 1000) -
                    i.adapter?.inPackGoCqHttpLastRestricted <
                  30 * 60
                ">
                <template #trigger>
                  <n-tag type="warning">风控</n-tag>
                </template>
                {{
                  `看到这个标签是因为最近 20 分钟内有风控警告，将在重新登录后临时消除。触发时间：` +
                  dayjs.unix(i.adapter?.inPackGoCqHttpLastRestricted).fromNow()
                }}
              </n-tooltip>
            </n-flex>
          </n-form-item>

          <n-form-item label="在线时长">
            <div>{{ i.onlineTotalTime }} 未实现</div>
          </n-form-item>

          <n-form-item label="群组数量">
            <div>{{ i.groupNum }}</div>
          </n-form-item>

          <n-form-item label="累计响应指令">
            <div>{{ i.cmdExecutedNum }}</div>
          </n-form-item>

          <n-form-item label="上次执行指令">
            <div v-if="i.cmdExecutedLastTime">
              {{ dayjs.unix(i.cmdExecutedLastTime).fromNow() }}
            </div>
            <div v-else>从未</div>
          </n-form-item>

          <n-form-item v-if="i.adapter?.connectUrl" label="连接地址">
            <div>{{ i.adapter?.connectUrl }}</div>
          </n-form-item>

          <n-form-item v-if="i.adapter?.isReverse" label="服务地址">
            <div>{{ i.adapter?.reverseAddr }}/ws</div>
          </n-form-item>

          <template
            v-if="
              i.platform === 'QQ' &&
              (i.protocolType === 'onebot' || i.protocolType === 'walle-q') &&
              i.adapter.builtinMode !== 'lagrange'
            ">
            <n-form-item v-if="i.adapter.useInPackGoCqhttp" label="协议">
              <div v-if="i.adapter?.inPackGoCqHttpProtocol === 0">Unset</div>
              <div v-if="i.adapter?.inPackGoCqHttpProtocol === 1">Android</div>
              <div v-if="i.adapter?.inPackGoCqHttpProtocol === 2">Android 手表</div>
              <div v-if="i.adapter?.inPackGoCqHttpProtocol === 3">MacOS</div>
              <div v-if="i.adapter?.inPackGoCqHttpProtocol === 5">iPad</div>
              <div v-if="i.adapter?.inPackGoCqHttpProtocol === 6">AndroidPad</div>
              <n-button
                size="small"
                type="primary"
                style="margin-left: 1rem"
                @click="askSetData(i)">
                <template #icon>
                  <n-icon><i-carbon-edit /></n-icon>
                </template>
              </n-button>
            </n-form-item>
            <n-form-item v-if="i.adapter.useInPackGoCqhttp" label="协议版本">
              <div v-if="i.adapter?.inPackGoCqHttpAppVersion === ''">未指定</div>
              <div
                v-if="
                  i.adapter?.inPackGoCqHttpAppVersion && i.adapter.inPackGoCqHttpAppVersion !== ''
                ">
                {{ i.adapter.inPackGoCqHttpAppVersion }}
              </div>
            </n-form-item>
            <n-form-item v-if="i.adapter.useInPackGoCqhttp" label="协议实现">
              <div v-if="i.adapter?.implementation === 'gocq' || i.adapter?.implementation === ''">
                Go-Cqhttp
              </div>
              <div v-if="i.adapter?.implementation === 'walle-q'">Walle-q</div>
            </n-form-item>
            <n-form-item v-else-if="i.adapter?.isReverse" label="特殊">
              <div>反向 WS</div>
            </n-form-item>
            <n-form-item v-else label="特殊">
              <div>分离部署</div>
            </n-form-item>
          </template>

          <template
            v-if="
              i.platform === 'QQ' &&
              i.protocolType === 'onebot' &&
              i.adapter.builtinMode === 'lagrange'
            ">
            <n-form-item label="接入方式">
              <div>内置客户端</div>
            </n-form-item>
            <n-form-item label="签名地址">
              <n-tooltip class="item" placement="bottom">
                <template #trigger>
                  <n-button
                    size="small"
                    circle
                    :disabled="i.enable"
                    style="margin-left: 0.5rem"
                    @click="showSetSignServerDialog(i)">
                    <template #icon>
                      <n-icon><i-carbon-edit /></n-icon>
                    </template>
                  </n-button>
                </template>
                {{ i.enable ? '禁用账号后方可修改签名服务地址' : '单击修改签名服务地址' }}
              </n-tooltip>
            </n-form-item>
          </template>

          <template v-if="i.platform === 'QQ' && i.protocolType === 'red'">
            <n-form-item label="协议">
              <div>[已弃用]Red</div>
            </n-form-item>
            <n-form-item label="协议版本">
              <div>{{ i.adapter?.redVersion || '未知' }}</div>
            </n-form-item>
            <n-form-item label="连接地址">
              <div>{{ i.adapter?.host + ':' + i.adapter?.port }}</div>
            </n-form-item>
          </template>

          <template v-if="i.platform === 'QQ' && i.protocolType === 'official'">
            <n-form-item label="协议">
              <div>[WIP] 官方 QQ Bot</div>
            </n-form-item>
            <n-form-item label="AppID">
              <div>{{ i.adapter?.appID }}</div>
            </n-form-item>
          </template>

          <template
            v-if="
              i.platform === 'QQ' &&
              i.protocolType === 'onebot' &&
              i.adapter.builtinMode !== 'lagrange'
            ">
            <n-form-item label="其他">
              <n-tooltip content="" placement="top-start">
                <template #trigger>
                  <n-button type="default" @click="doGocqExport(i)">导出</n-button>
                </template>
                导出 gocq 设置，用于转分离部署
              </n-tooltip>
            </n-form-item>
          </template>

          <template v-if="i.protocolType === 'satori'">
            <n-form-item label="协议">
              <div>[WIP]Satori</div>
            </n-form-item>
            <n-form-item label="平台">
              <div>{{ i.platform }}</div>
            </n-form-item>
          </template>

          <div
            v-if="
              ![goCqHttpStateCode.InLogin, goCqHttpStateCode.InLoginQrCode].includes(
                i.adapter?.loginState,
              )
            "
            style="display: flex; justify-content: center; margin-bottom: 1rem">
            <n-button-group>
              <n-tooltip placement="bottom-start">
                <template #trigger>
                  <n-button type="warning" @click="askGocqhttpReLogin(i)">重新登录</n-button>
                </template>
                如果日志中出现帐号被风控，可以试试这个功能
              </n-tooltip>
              <n-tooltip placement="bottom-start">
                <template #trigger>
                  <n-button v-if="i.enable" type="warning" @click="askSetEnable(i, false)">
                    禁用
                  </n-button>
                  <n-button v-else type="warning" @click="askSetEnable(i, true)">启用</n-button>
                </template>
                离线/启用此账号，重启骰子后仍将保持离线/启用状态
              </n-tooltip>
            </n-button-group>
          </div>
          <!-- </n-form-item> -->
        </n-form>
      </n-card>
    </div>

    <n-modal
      v-model:show="dialogSetDataFormVisible"
      preset="card"
      title="属性修改"
      :mask-closable="false"
      :close-on-esc="false"
      :closable="false"
      class="the-dialog">
      <n-form v-model="form">
        <n-form-item label="类型" :label-width="formLabelWidth">
          <div>QQ 账号</div>
        </n-form-item>

        <n-form-item label="忽略好友请求" :label-width="formLabelWidth">
          <n-checkbox v-model:checked="form.ignoreFriendRequest">
            {{
              form.ignoreFriendRequest
                ? '我会登录官方客户端处理好友请求'
                : '让海豹帮我按照预设答案处理'
            }}
          </n-checkbox>
        </n-form-item>

        <n-form-item label="协议" :label-width="formLabelWidth" required>
          <n-select
            v-model:value="form.protocol"
            :options="[
              { label: 'Android 协议 - 稳定协议，建议！', value: 1 },
              { label: 'Android 手表协议 - 可共存，但不支持频道/戳一戳', value: 2 },
              { label: 'MacOS', value: 3 },
              { label: 'iPad', value: 5 },
              ...(form.implementation === 'gocq' || form.implementation === ''
                ? [{ label: 'AndroidPad - 稳定协议，建议！', value: 6 }]
                : []),
            ]" />
        </n-form-item>

        <!--        <n-form-item-->
        <!--          v-if="form.accountType === 0 && (form.protocol === 1 || form.protocol === 6)"-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <template #label>-->
        <!--            <div style="display: flex; align-items: center">-->
        <!--              <span>版本</span>-->
        <!--              <n-tooltip>-->
        <!--                <template #trigger>-->
        <!--                  <n-icon><i-carbon-help-filled /></n-icon>-->
        <!--                </template>-->
        <!--                只有需要升级协议版本时才指定。-->
        <!--              </n-tooltip>-->
        <!--            </div>-->
        <!--          </template>-->
        <!--          <n-select-->
        <!--            v-model:value="form.appVersion"-->
        <!--            :options="-->
        <!--              supportedQQVersions.map(version => {-->
        <!--                return { label: version || '不指定版本', value: version };-->
        <!--              })-->
        <!--            " />-->
        <!--        </n-form-item>-->

        <!--        <n-form-item-->
        <!--          v-if="form.accountType === 0 && (form.protocol === 1 || form.protocol === 6)"-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <template #label>-->
        <!--            <div style="display: flex; align-items: center">-->
        <!--              <span>签名服务</span>-->
        <!--              <n-tooltip>-->
        <!--                <template #trigger>-->
        <!--                  <n-icon><i-carbon-help-filled /></n-icon>-->
        <!--                </template>-->
        <!--                如果不知道这是什么，请选择 不使用。允许填写签名服务相关信息。-->
        <!--              </n-tooltip>-->
        <!--            </div>-->
        <!--          </template>-->
        <!--          <n-radio-group-->
        <!--            v-model:value="signConfigType"-->
        <!--            size="small"-->
        <!--            @update:value="signConfigTypeChange">-->
        <!--            <n-radio-button value="none">不使用</n-radio-button>-->
        <!--            <n-radio-button value="simple">简易配置</n-radio-button>-->
        <!--            <n-radio-button value="advanced">高级配置</n-radio-button>-->
        <!--          </n-radio-group>-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'simple'-->
        <!--          "-->
        <!--          label="服务url"-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <n-input-->
        <!--            v-model:value="form.signServerConfig.signServers[0].url"-->
        <!--            placeholder="http://127.0.0.1:13579" />-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'simple'-->
        <!--          "-->
        <!--          label="服务key"-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <n-input v-model:value="form.signServerConfig.signServers[0].key" placeholder="114514" />-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'simple'-->
        <!--          "-->
        <!--          label="服务鉴权"-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <n-input-->
        <!--            v-model:value="form.signServerConfig.signServers[0].authorization"-->
        <!--            placeholder="Bearer xxxx 未设置可不填" />-->
        <!--        </n-form-item>-->

        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'advanced'-->
        <!--          ">-->
        <!--          <n-alert type="warning" :closable="false">-->
        <!--            如果不理解以下配置项，请使用 <strong>简易配置</strong>-->
        <!--          </n-alert>-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'advanced'-->
        <!--          ">-->
        <!--          <el-table :data="form.signServerConfig.signServers" table-layout="auto">-->
        <!--            <el-table-column prop="url" label="服务url">-->
        <!--              <template #default="scope">-->
        <!--                <n-input v-model:value="scope.row.url" placeholder="http://127.0.0.1:8080" />-->
        <!--              </template>-->
        <!--            </el-table-column>-->
        <!--            <el-table-column prop="key" label="服务key">-->
        <!--              <template #default="scope">-->
        <!--                <n-input v-model:value="scope.row.key" placeholder="114514" />-->
        <!--              </template>-->
        <!--            </el-table-column>-->
        <!--            <el-table-column prop="authorization" label="服务鉴权">-->
        <!--              <template #default="scope">-->
        <!--                <n-input v-model:value="scope.row.authorization" placeholder="Bearer xxxx" />-->
        <!--              </template>-->
        <!--            </el-table-column>-->
        <!--            <el-table-column align="right">-->
        <!--              &lt;!&ndash; eslint-disable-next-line vue/no-unused-vars &ndash;&gt;-->
        <!--              <template #header="scope">-->
        <!--                <n-button size="small" type="primary" @click="handleSignServerAdd">-->
        <!--                  新增一行-->
        <!--                </n-button>-->
        <!--              </template>-->
        <!--              <template #default="scope">-->
        <!--                <n-button size="small" type="error" @click="handleSignServerDelete(scope.row.url)">-->
        <!--                  删除-->
        <!--                </n-button>-->
        <!--              </template>-->
        <!--            </el-table-column>-->
        <!--          </el-table>-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'advanced'-->
        <!--          "-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <template #label>-->
        <!--            <div style="display: flex; align-items: center">-->
        <!--              <span>自动切换规则</span>-->
        <!--              <n-tooltip>-->
        <!--                <template #trigger>-->
        <!--                  <n-icon><i-carbon-help-filled /></n-icon>-->
        <!--                </template>-->
        <!--                判断签名服务不可用（需要切换）的额外规则<br />-->
        <!--                - 不设置（此时仅在请求无法返回结果时判定为不可用）<br />-->
        <!--                - 在获取到的 sign 为空（若选此建议关闭-->
        <!--                auto-register，一般为实例未注册但是请求签名的情况）<br />-->
        <!--                - 在获取到的 sign 或 token 为空（若选此建议关闭 auto-refresh-token）-->
        <!--              </n-tooltip>-->
        <!--            </div>-->
        <!--          </template>-->
        <!--          <n-radio-group v-model:value="form.signServerConfig.ruleChangeSignServer" size="small">-->
        <!--            <n-radio-button :value="0">不设置</n-radio-button>-->
        <!--            <n-radio-button :value="1">sign 为空时切换</n-radio-button>-->
        <!--            <n-radio-button :value="2">sign/token为空时切换</n-radio-button>-->
        <!--          </n-radio-group>-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'advanced'-->
        <!--          "-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <template #label>-->
        <!--            <div style="display: flex; align-items: center">-->
        <!--              <span>最大尝试次数</span>-->
        <!--              <n-tooltip>-->
        <!--                <template #trigger>-->
        <!--                  <n-icon><i-carbon-help-filled /></n-icon>-->
        <!--                </template>-->
        <!--                连续寻找可用签名服务器最大尝试次数<br />-->
        <!--                为 0 时会在连续 3-->
        <!--                次没有找到可用签名服务器后保持使用主签名服务器，不再尝试进行切换备用<br />-->
        <!--                否则会在达到指定次数后 <strong>退出</strong> 主程序-->
        <!--              </n-tooltip>-->
        <!--            </div>-->
        <!--          </template>-->
        <!--          <n-input-number-->
        <!--            v-model:value="form.signServerConfig.maxCheckCount"-->
        <!--            size="small"-->
        <!--            :precision="0"-->
        <!--            :min="0" />-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'advanced'-->
        <!--          "-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <template #label>-->
        <!--            <div style="display: flex; align-items: center">-->
        <!--              <span>请求超时时间</span>-->
        <!--              <n-tooltip>-->
        <!--                <template #content>-->
        <!--                  <n-icon><i-carbon-help-filled /></n-icon>-->
        <!--                </template>-->
        <!--                签名服务请求超时时间（s）-->
        <!--              </n-tooltip>-->
        <!--            </div>-->
        <!--          </template>-->
        <!--          <n-input-number-->
        <!--            v-model:value="form.signServerConfig.signServerTimeout"-->
        <!--            size="small"-->
        <!--            :precision="0"-->
        <!--            :min="0" />-->
        <!--          <span>&nbsp;秒</span>-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'advanced'-->
        <!--          "-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <template #label>-->
        <!--            <div style="display: flex; align-items: center">-->
        <!--              <span>自动注册实例</span>-->
        <!--              <n-tooltip style="">-->
        <!--                <template #trigger>-->
        <!--                  <n-icon><i-carbon-help-filled /></n-icon>-->
        <!--                </template>-->
        <!--                在实例可能丢失（获取到的签名为空）时是否尝试重新注册<br />-->
        <!--                为 true 时，在签名服务不可用时可能每次发消息都会尝试重新注册并签名。<br />-->
        <!--                为 false 时，将不会自动注册实例，在签名服务器重启或实例被销毁后需要重启 go-cqhttp-->
        <!--                以获取实例<br />-->
        <!--                否则后续消息将不会正常签名。<br />-->
        <!--                关闭此项后可以考虑开启签名服务器端 auto_register 避免需要重启<br />-->
        <!--                由于实现问题，当前建议关闭此项，推荐开启签名服务器的自动注册实例-->
        <!--              </n-tooltip>-->
        <!--            </div>-->
        <!--          </template>-->
        <!--          <n-switch v-model:value="form.signServerConfig.autoRegister" />-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'advanced'-->
        <!--          "-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <template #label>-->
        <!--            <div style="display: flex; align-items: center">-->
        <!--              <span>自动刷新 token</span>-->
        <!--              <n-tooltip>-->
        <!--                <template #trigger>-->
        <!--                  <n-icon><i-carbon-help-filled /></n-icon>-->
        <!--                </template>-->
        <!--                是否在 token 过期后立即自动刷新签名 token（在需要签名时才会检测到，主要防止 token-->
        <!--                意外丢失）<br />-->
        <!--                独立于定时刷新-->
        <!--              </n-tooltip>-->
        <!--            </div>-->
        <!--          </template>-->
        <!--          <n-switch v-model:value="form.signServerConfig.autoRefreshToken" />-->
        <!--        </n-form-item>-->
        <!--        <n-form-item-->
        <!--          v-if="-->
        <!--            form.accountType === 0 &&-->
        <!--            (form.protocol === 1 || form.protocol === 6) &&-->
        <!--            signConfigType === 'advanced'-->
        <!--          "-->
        <!--          :label-width="formLabelWidth">-->
        <!--          <template #label>-->
        <!--            <div style="display: flex; align-items: center">-->
        <!--              <span>刷新间隔</span>-->
        <!--              <n-tooltip>-->
        <!--                <template #trigger>-->
        <!--                  <n-icon><i-carbon-help-filled /></n-icon>-->
        <!--                </template>-->
        <!--                定时刷新 token 间隔时间，单位为分钟，建议 30~40 分钟，不可超过 60 分钟<br />-->
        <!--                目前丢失 token 也不会有太大影响，可设置为 0 以关闭，推荐开启-->
        <!--              </n-tooltip>-->
        <!--            </div>-->
        <!--          </template>-->
        <!--          <n-input-number-->
        <!--            v-model:value="form.signServerConfig.refreshInterval"-->
        <!--            size="small"-->
        <!--            :precision="0"-->
        <!--            :min="0">-->
        <!--            <template #suffix>-->
        <!--              <span>分钟</span>-->
        <!--            </template>-->
        <!--          </n-input-number>-->
        <!--        </n-form-item>-->

        <small>
          <div>提示：切换协议后，需要点击重新登录，或.master reboot 重启骰子以应用设置</div>
        </small>
      </n-form>

      <template #footer>
        <n-flex>
          <n-button @click="dialogSetDataFormVisible = false">取消</n-button>
          <n-button type="primary" @click="doSetData">确定</n-button>
        </n-flex>
      </template>
    </n-modal>
    <n-modal
      v-model:show="dialogSetSignServerVisible"
      preset="card"
      title="签名地址修改"
      :mask-closable="false"
      :close-on-esc="false"
      :closable="false"
      class="the-dialog">
      <n-form-item label="签名地址" :label-width="formLabelWidth" required>
        <n-radio-group v-model:value="form.signServerType">
          <n-radio :value="0">海豹</n-radio>
          <n-radio :value="1">Lagrange</n-radio>
          <n-radio :value="2">自定义地址</n-radio>
        </n-radio-group>
      </n-form-item>
      <n-form-item
        v-if="form.signServerType === 2"
        label="自定义签名地址"
        :label-width="formLabelWidth"
        required>
        <n-input v-model:value="form.signServerUrl" />
      </n-form-item>
      <n-form-item v-else label="签名版本" :label-width="formLabelWidth" required>
        <n-flex vertical align="flex-start">
          <n-radio-group v-model:value="form.signServerVersion">
            <n-radio value="13107">13107</n-radio>
            <n-radio value="25765">25765</n-radio>
          </n-radio-group>
          <n-text type="warning" class="text-xs">
            如果不知道这是什么，请保持默认选中的最新版本
          </n-text>
        </n-flex>
      </n-form-item>
      <template #footer>
        <n-flex>
          <n-button @click="dialogSetSignServerVisible = false">取消</n-button>
          <n-button
            type="primary"
            :disabled="form.signServerType === 2 && isEmpty(trim(form.signServerUrl))"
            @click="doSetSignServer">
            确定
          </n-button>
        </n-flex>
      </template>
    </n-modal>

    <n-modal
      v-model:show="dialogFormVisible"
      preset="card"
      title="帐号登录"
      :close-on-esc="false"
      :closable="false">
      <n-button type="info" secondary style="float: right; margin-top: -4rem" @click="openSocks">
        辅助工具 -13325 端口
      </n-button>
      <template v-if="form.step === 1">
        <n-alert
          v-if="form.accountType === 7"
          type="error"
          :closable="false"
          style="margin-bottom: 1.5rem">
          该支持功能不完善，所适配的目标 Chronocat 版本为 0.0.54，低于该版本不建议使用。<br />同时，新版
          Chronocat（0.2.x 以上）不再提供 red 协议，海豹也将在未来移除该支持。
        </n-alert>
        <n-alert
          v-if="form.accountType === 10"
          type="warning"
          :closable="false"
          style="margin-bottom: 1.5rem">
          该支持仍处于实验阶段，部分功能尚未完善。<br />
          同时，受到腾讯官方提供的 API 能力的限制，一些功能暂时无法实现。
        </n-alert>
        <n-alert
          v-if="form.accountType === 14"
          type="warning"
          :closable="false"
          style="margin-bottom: 1.5rem">
          该支持仍处于实验阶段，部分功能尚未完善。<br />
          - QQ 平台适配目标版本 0.2.x 以上的 Chronocat。
        </n-alert>
        <!--        <n-alert-->
        <!--          v-if="form.accountType === 0"-->
        <!--          type="error"-->
        <!--          :closable="false"-->
        <!--          style="margin-bottom: 1.5rem">-->
        <!--          内置 gocq 方案已不再支持，目前仅为兼容性保留，<strong>新增入口已关闭</strong>。<br />-->
        <!--          使用内置方案请切换到新的内置客户端。<br />-->
        <!--          如果你依然需要使用 gocq，可以切换到分离部署方式进行连接，但我们非常不建议您再继续使用-->
        <!--          gocq。-->
        <!--        </n-alert>-->
        <n-alert
          v-if="
            store.diceServers.length > 0 &&
            store.diceServers[0].baseInfo.containerMode &&
            (form.accountType === 15 || form.accountType === 0)
          "
          type="warning"
          :closable="false"
          class="mb-6">
          当前为容器模式，内置客户端被禁用。
        </n-alert>

        <n-form v-model="form">
          <n-form-item label="账号类型" :label-width="formLabelWidth">
            <n-select v-model:value="form.accountType" :options="accountTypes" />
          </n-form-item>

          <!--          <n-form-item-->
          <!--            v-if="form.accountType === 0"-->
          <!--            label="设备"-->
          <!--            :label-width="formLabelWidth"-->
          <!--            required>-->
          <!--            <n-select v-model:value="form.protocol" :options="gocqProtocolVersions" />-->
          <!--          </n-form-item>-->

          <!--          <n-form-item-->
          <!--            v-if="form.accountType === 0 && (form.protocol === 1 || form.protocol === 6)"-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <template #label>-->
          <!--              <div style="display: flex; align-items: center">-->
          <!--                <span>版本</span>-->
          <!--                <n-tooltip>-->
          <!--                  <template #trigger>-->
          <!--                    <n-icon><i-carbon-help-filled /></n-icon>-->
          <!--                    只有需要升级协议版本时才指定。-->
          <!--                  </template>-->
          <!--                </n-tooltip>-->
          <!--              </div>-->
          <!--            </template>-->
          <!--            <n-select-->
          <!--              v-model:value="form.appVersion"-->
          <!--              :options="-->
          <!--                supportedQQVersions.map(version => {-->
          <!--                  return { label: version || '不指定版本', value: version };-->
          <!--                })-->
          <!--              ">-->
          <!--            </n-select>-->
          <!--          </n-form-item>-->

          <n-form-item
            v-if="form.accountType === 15"
            label="账号"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.account" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 15"
            label="签名服务"
            :label-width="formLabelWidth"
            required>
            <n-radio-group v-model:value="form.signServerType">
              <n-radio :value="0">海豹</n-radio>
              <n-radio :value="1">Lagrange</n-radio>
              <n-radio :value="2">自定义地址</n-radio>
            </n-radio-group>
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 15 && form.signServerType === 2"
            label="自定义签名地址"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.signServerUrl" />
          </n-form-item>
          <n-form-item
            v-else-if="form.accountType === 15"
            label="签名版本"
            :label-width="formLabelWidth"
            required>
            <n-flex vertical align="flex-start">
              <n-radio-group v-model:value="form.signServerVersion">
                <n-radio value="13107">13107</n-radio>
                <n-radio value="25765">25765</n-radio>
              </n-radio-group>
              <n-text type="warning" size="small">
                如果不知道这是什么，请保持默认选中的最新版本
              </n-text>
            </n-flex>
          </n-form-item>

          <!--          <n-form-item-->
          <!--            v-if="form.accountType === 0"-->
          <!--            label="账号"-->
          <!--            :label-width="formLabelWidth"-->
          <!--            required>-->
          <!--            <n-input v-model:value="form.account" />-->
          <!--          </n-form-item>-->

          <!--          <n-form-item v-if="form.accountType === 0" label="密码" :label-width="formLabelWidth">-->
          <!--            <n-input v-model:value="form.password" type="password" show-password-on="mousedown" />-->
          <!--            <small>-->
          <!--              <div>提示：新设备首次登录多半需要手机版扫码，建议先准备好</div>-->
          <!--              <div>能够进行扫码登录（不填写密码即可），但注意扫码登录不支持自动重连。</div>-->
          <!--              <div>如果出现“要求同一 WIFI 扫码”可以本地登录后备份，复制到服务器上。</div>-->
          <!--              &lt;!&ndash; v-if="form.protocol !== 2"  &ndash;&gt;-->
          <!--              <div style="color: #aa4422">-->
          <!--                提示：首次登录时，建议先尝试 AndroidPad，如失败，切换使用 Android，再失败手表协议。-->
          <!--              </div>-->
          <!--            </small>-->
          <!--          </n-form-item>-->

          <!--          <n-form-item-->
          <!--            v-if="form.accountType === 0 && (form.protocol === 1 || form.protocol === 6)"-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <template #label>-->
          <!--              <div style="display: flex; align-items: center">-->
          <!--                <span>签名服务</span>-->
          <!--                <n-tooltip>-->
          <!--                  <template #trigger>-->
          <!--                    <n-icon><i-carbon-help-filled /></n-icon>-->
          <!--                  </template>-->
          <!--                  如果不知道这是什么，请选择 不使用。允许填写签名服务相关信息。-->
          <!--                </n-tooltip>-->
          <!--              </div>-->
          <!--            </template>-->
          <!--            <n-radio-group-->
          <!--              v-model:value="signConfigType"-->
          <!--              size="small"-->
          <!--              @update:value="signConfigTypeChange">-->
          <!--              <n-radio value="none">不使用</n-radio>-->
          <!--              <n-radio value="simple">简易配置</n-radio>-->
          <!--              <n-radio value="advanced">高级配置</n-radio>-->
          <!--            </n-radio-group>-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'simple'-->
          <!--            "-->
          <!--            label="服务url"-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <n-input-->
          <!--              v-model:value="form.signServerConfig.signServers[0].url"-->
          <!--              placeholder="http://127.0.0.1:8080" />-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'simple'-->
          <!--            "-->
          <!--            label="服务key"-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <n-input-->
          <!--              v-model:value="form.signServerConfig.signServers[0].key"-->
          <!--              placeholder="114514" />-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'simple'-->
          <!--            "-->
          <!--            label="服务鉴权"-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <n-input-->
          <!--              v-model:value="form.signServerConfig.signServers[0].authorization"-->
          <!--              placeholder="Bearer xxxx" />-->
          <!--          </n-form-item>-->

          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'advanced'-->
          <!--            ">-->
          <!--            <n-alert type="warning" :closable="false">-->
          <!--              如果不理解以下配置项，请使用 <strong>简易配置</strong>-->
          <!--            </n-alert>-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'advanced'-->
          <!--            ">-->
          <!--            <el-table :data="form.signServerConfig.signServers" table-layout="auto">-->
          <!--              <el-table-column prop="url" label="服务url">-->
          <!--                <template #default="scope">-->
          <!--                  <n-input v-model:value="scope.row.url" placeholder="http://127.0.0.1:8080" />-->
          <!--                </template>-->
          <!--              </el-table-column>-->
          <!--              <el-table-column prop="key" label="服务key">-->
          <!--                <template #default="scope">-->
          <!--                  <n-input v-model:value="scope.row.key" placeholder="114514" />-->
          <!--                </template>-->
          <!--              </el-table-column>-->
          <!--              <el-table-column prop="authorization" label="服务鉴权">-->
          <!--                <template #default="scope">-->
          <!--                  <n-input v-model:value="scope.row.authorization" placeholder="Bearer xxxx" />-->
          <!--                </template>-->
          <!--              </el-table-column>-->
          <!--              <el-table-column align="right">-->
          <!--                &lt;!&ndash; eslint-disable-next-line vue/no-unused-vars &ndash;&gt;-->
          <!--                <template #header="scope">-->
          <!--                  <n-button size="small" type="info" secondary @click="handleSignServerAdd">-->
          <!--                    新增一行-->
          <!--                  </n-button>-->
          <!--                </template>-->
          <!--                <template #default="scope">-->
          <!--                  <n-button-->
          <!--                    size="small"-->
          <!--                    secondary-->
          <!--                    type="error"-->
          <!--                    @click="handleSignServerDelete(scope.row.url)">-->
          <!--                    删除-->
          <!--                  </n-button>-->
          <!--                </template>-->
          <!--              </el-table-column>-->
          <!--            </el-table>-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'advanced'-->
          <!--            "-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <template #label>-->
          <!--              <div style="display: flex; align-items: center">-->
          <!--                <span>自动切换规则</span>-->
          <!--                <n-tooltip>-->
          <!--                  <template #trigger>-->
          <!--                    <n-icon><i-carbon-help-filled /></n-icon>-->
          <!--                  </template>-->
          <!--                  判断签名服务不可用（需要切换）的额外规则<br />-->
          <!--                  - 不设置（此时仅在请求无法返回结果时判定为不可用）<br />-->
          <!--                  - 在获取到的 sign 为空（若选此建议关闭-->
          <!--                  auto-register，一般为实例未注册但是请求签名的情况）<br />-->
          <!--                  - 在获取到的 sign 或 token 为空（若选此建议关闭 auto-refresh-token）-->
          <!--                </n-tooltip>-->
          <!--              </div>-->
          <!--            </template>-->
          <!--            <n-radio-group v-model:value="form.signServerConfig.ruleChangeSignServer" size="small">-->
          <!--              <n-radio-button :value="0">不设置</n-radio-button>-->
          <!--              <n-radio-button :value="1">sign 为空时切换</n-radio-button>-->
          <!--              <n-radio-button :value="2">sign/token为空时切换</n-radio-button>-->
          <!--            </n-radio-group>-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'advanced'-->
          <!--            "-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <template #label>-->
          <!--              <div style="display: flex; align-items: center">-->
          <!--                <span>最大尝试次数</span>-->
          <!--                <n-tooltip>-->
          <!--                  <template #trigger>-->
          <!--                    <n-icon><i-carbon-help-filled /></n-icon>-->
          <!--                  </template>-->
          <!--                  连续寻找可用签名服务器最大尝试次数<br />-->
          <!--                  为 0 时会在连续 3-->
          <!--                  次没有找到可用签名服务器后保持使用主签名服务器，不再尝试进行切换备用<br />-->
          <!--                  否则会在达到指定次数后 <strong>退出</strong> 主程序-->
          <!--                </n-tooltip>-->
          <!--              </div>-->
          <!--            </template>-->
          <!--            <n-input-number-->
          <!--              v-model:value="form.signServerConfig.maxCheckCount"-->
          <!--              size="small"-->
          <!--              :precision="0"-->
          <!--              :min="0" />-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'advanced'-->
          <!--            "-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <template #label>-->
          <!--              <div style="display: flex; align-items: center">-->
          <!--                <span>请求超时时间</span>-->
          <!--                <n-tooltip>-->
          <!--                  <template #trigger>-->
          <!--                    <n-icon><i-carbon-help-filled /></n-icon>-->
          <!--                  </template>-->
          <!--                  签名服务请求超时时间 (s)-->
          <!--                </n-tooltip>-->
          <!--              </div>-->
          <!--            </template>-->
          <!--            <n-input-number-->
          <!--              v-model:value="form.signServerConfig.signServerTimeout"-->
          <!--              size="small"-->
          <!--              :precision="0"-->
          <!--              :min="0" />-->
          <!--            <span>&nbsp;秒</span>-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'advanced'-->
          <!--            "-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <template #label>-->
          <!--              <div style="display: flex; align-items: center">-->
          <!--                <span>自动注册实例</span>-->
          <!--                <n-tooltip>-->
          <!--                  <template #trigger>-->
          <!--                    <n-icon><i-carbon-help-filled /></n-icon>-->
          <!--                  </template>-->
          <!--                  在实例可能丢失（获取到的签名为空）时是否尝试重新注册<br />-->
          <!--                  为 true 时，在签名服务不可用时可能每次发消息都会尝试重新注册并签名。<br />-->
          <!--                  为 false 时，将不会自动注册实例，在签名服务器重启或实例被销毁后需要重启 go-cqhttp-->
          <!--                  以获取实例<br />-->
          <!--                  否则后续消息将不会正常签名。关闭此项后可以考虑开启签名服务器端 auto_register-->
          <!--                  避免需要重启<br />-->
          <!--                  由于实现问题，当前建议关闭此项，推荐开启签名服务器的自动注册实例-->
          <!--                </n-tooltip>-->
          <!--              </div>-->
          <!--            </template>-->
          <!--            <n-switch v-model:value="form.signServerConfig.autoRegister" />-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'advanced'-->
          <!--            "-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <template #label>-->
          <!--              <div style="display: flex; align-items: center">-->
          <!--                <span>自动刷新 token</span>-->
          <!--                <n-tooltip>-->
          <!--                  <template #trigger>-->
          <!--                    <n-icon><i-carbon-help-filled /></n-icon>-->
          <!--                  </template>-->
          <!--                  是否在 token 过期后立即自动刷新签名 token（在需要签名时才会检测到，主要防止 token-->
          <!--                  意外丢失）<br />-->
          <!--                  独立于定时刷新-->
          <!--                </n-tooltip>-->
          <!--              </div>-->
          <!--            </template>-->
          <!--            <n-switch v-model:value="form.signServerConfig.autoRefreshToken" />-->
          <!--          </n-form-item>-->
          <!--          <n-form-item-->
          <!--            v-if="-->
          <!--              form.accountType === 0 &&-->
          <!--              (form.protocol === 1 || form.protocol === 6) &&-->
          <!--              signConfigType === 'advanced'-->
          <!--            "-->
          <!--            :label-width="formLabelWidth">-->
          <!--            <template #label>-->
          <!--              <div style="display: flex; align-items: center">-->
          <!--                <span>刷新间隔</span>-->
          <!--                <n-tooltip>-->
          <!--                  <template #trigger>-->
          <!--                    <n-icon><i-carbon-help-filled /></n-icon>-->
          <!--                  </template>-->
          <!--                  定时刷新 token 间隔时间，单位为分钟，建议 30~40 分钟，不可超过 60 分钟<br />-->
          <!--                  目前丢失 token 也不会有太大影响，可设置为 0 以关闭，推荐开启-->
          <!--                </n-tooltip>-->
          <!--              </div>-->
          <!--            </template>-->
          <!--            <n-input-number-->
          <!--              v-model:value="form.signServerConfig.refreshInterval"-->
          <!--              size="small"-->
          <!--              :precision="0"-->
          <!--              :min="0" />-->
          <!--            <span>&nbsp;分钟</span>-->
          <!--          </n-form-item>-->

          <n-form-item
            v-if="form.accountType === 6"
            label="账号"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.account" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 6"
            label="连接地址"
            :label-width="formLabelWidth"
            required>
            <n-input
              v-model:value="form.connectUrl"
              placeholder="正向WS连接地址，如 ws://127.0.0.1:1234" />
          </n-form-item>
          <n-form-item v-if="form.accountType === 6" label="访问令牌" :label-width="formLabelWidth">
            <n-input
              v-model:value="form.accessToken"
              placeholder="gocqhttp配置的access token，没有不用填写" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 11"
            label="账号"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.account" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 11"
            label="连接地址"
            :label-width="formLabelWidth"
            required>
            <n-input
              v-model:value="form.reverseAddr"
              placeholder="反向WS服务地址，如 0.0.0.0:4001 (允许全部IP连入，4001端口)" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 13"
            label="连接地址"
            :label-width="formLabelWidth"
            required>
            <n-input
              v-model:value="form.url"
              placeholder="连接地址，如 ws://127.0.0.1:3212/ws/seal" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 13"
            label="Token"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.token" placeholder="填入平台管理界面中获取的token" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 14"
            label="平台"
            :label-width="formLabelWidth"
            required>
            <n-radio-group v-model:value="form.platform">
              <n-radio-button value="QQ" />
            </n-radio-group>
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 14"
            label="主机"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.host" placeholder="Satori 服务的地址，如 127.0.0.1" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 14"
            label="端口"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.port as any" placeholder="如 5500" />
          </n-form-item>
          <n-form-item v-if="form.accountType === 14" label="Token" :label-width="formLabelWidth">
            <n-input v-model:value="form.token" placeholder="填入鉴权 token，没有时无需填写" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 7"
            label="主机"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.host" placeholder="Red 服务的地址，如 127.0.0.1"></n-input>
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 7"
            label="端口"
            :label-width="formLabelWidth"
            required>
            <n-input-number v-model:value="form.port as any" placeholder="如 16530" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 7"
            label="令牌"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.token" placeholder="Red 服务的 token" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 10"
            label="机器人ID"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.appID" placeholder="填写在开放平台获取的AppID" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 10"
            label="机器人令牌"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.token" placeholder="填写在开放平台获取的Token" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 10"
            label="机器人密钥"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.appSecret" placeholder="填写在开放平台获取的AppSecret" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 10"
            label="只在频道使用"
            :label-width="formLabelWidth"
            required>
            <n-switch v-model:value="form.onlyQQGuild" />
          </n-form-item>

          <n-form-item v-if="form.accountType === 10" :label-width="formLabelWidth">
            <small>
              <div>提示：进入腾讯开放平台创建一个机器人</div>
              <div>https://q.qq.com/#/app/bot</div>
              <div>创建之后进入机器人管理后台，切换到「开发 - 开发设置」页</div>
              <div>把机器人的相关信息复制并粘贴进来</div>
            </small>
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 1"
            label="Token"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.token" />
            <small>
              <div>提示：首先去 discord 开发者平台创建一个新的 Application</div>
              <div>https://discord.com/developers/applications</div>
              <div>点击 New Application 创建之后进入应用，然后点 bot，Add bot</div>
              <div>然后把 Privileged Gateway Intents 下面的三个开关打开</div>
              <div>最后把 bot 的 token 复制下来粘贴进来</div>
            </small>
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 1"
            label="http 代理地址"
            :label-width="formLabelWidth">
            <n-input v-model:value="form.proxyURL" placeholder="例：http://127.0.0.1:7890" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 1"
            label="反向代理地址"
            :label-width="formLabelWidth">
            <n-input
              v-model:value="form.reverseProxyUrl"
              placeholder="此地址需要代理到 https://discord.com/ 通常来说正向代理和反向代理只需要一个" />
            <n-input
              v-model:value="form.reverseProxyCDNUrl"
              placeholder="此地址需要代理到 https://cdn.discordapp.com/ " />
            <div style="color: #aa4422">
              注意：反向代理是全局生效的，你一旦设置反向代理地址，这个骰子的所有 Discord
              连接都会使用这个地址
            </div>
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 2"
            label="Token"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.token" />
            <small>
              <div>提示：进入 KOOK 开发者平台创建一个新的应用</div>
              <div>https://developer.kookapp.cn/app/index</div>
              <div>点击新建应用 创建之后进入应用，然后点机器人</div>
              <div>把机器人的 token 复制下来粘贴进来</div>
            </small>
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 3"
            label="Token"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.token" />
            <small>
              <div>提示：私聊 BotFather(https://t.me/BotFather)</div>
              <div>使用/newbot 申请一个新的机器人</div>
              <div>
                按照指示创建机器人之后，在 Bot setting 里面把 Group privacy 里面 privacy mode 关掉
              </div>
              <div>把机器人的 token 复制下来粘贴进来</div>
            </small>
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 3"
            label="http 代理地址"
            :label-width="formLabelWidth">
            <n-input v-model:value="form.proxyURL" placeholder="http://127.0.0.1:7890" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 4"
            label="Url"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.url" />
            <small>
              <div>提示：前往 https://github.com/sealdice/sealdice-minecraft/releases/latest</div>
              <div>下载最新的 mc 插件然后安装在 mc 服务器中</div>
              <div>按照 ip:端口 的格式写在框里，默认端口 8887</div>
              <div>
                详细的使用说明请阅读 Readme (https://github.com/sealdice/sealdice-minecraft#readme)
              </div>
            </small>
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 5"
            label="ClientID"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.clientID" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 5"
            label="Token"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.token" />
            <small>
              <div>提示：前往 Dodo 开发者平台 https://doker.imdodo.com/bot-list</div>
              <div>如果需要提交审核可以写跑团机器人开发</div>
              <div>你的帐号过审后，点击创建应用</div>
              <div>创建完成之后将 clientID 和 Token 复制到这两个框中</div>
            </small>
          </n-form-item>

          <n-form-item v-if="form.accountType === 8" label="昵称" :label-width="formLabelWidth">
            <n-input v-model:value="form.nickname" placeholder="机器人的昵称" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 8"
            label="ClientID"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.clientID" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 8"
            label="RobotCode"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.robotCode" />
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 8"
            label="Token"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.token" />
            <small>
              <div>提示：前往钉钉开发者平台 https://open-dev.dingtalk.com/fe/app</div>
              <div>点击创建应用</div>
              <div>点击 基础信息 - 应用信息</div>
              <div>把 AppKey 复制到 ClientID 内</div>
              <div>把 AppSecret 复制到 Token 内</div>
              <div>创建完成之后点击 应用功能 - 机器人与消息推送 并将机器人配置的开关打开</div>
              <div>请务必确保 推送方式/消息接受模式 都为 Stream 模式</div>
              <div>点击发布后 复制 RobotCode 到 RobotCode 内</div>
            </small>
          </n-form-item>

          <n-form-item
            v-if="form.accountType === 9"
            label="AppToken"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.appToken" />
          </n-form-item>
          <n-form-item
            v-if="form.accountType === 9"
            label="BotToken"
            :label-width="formLabelWidth"
            required>
            <n-input v-model:value="form.botToken" />
            <small>
              <div>提示：前往 Slack 开发者平台 https://api.slack.com/apps</div>
              <div>点击 Create an app 选择 From scratch</div>
              <div>按照要求创建 APP 后，点击 OAuth & Permissions</div>
              <div>在下方的 Scopes 中，为机器人添加 channels:write 和 im:write</div>
              <div>点击 Install App to Workspace</div>
              <div>随后将 Bot User OAuth Token 复制并粘贴在 Bot Token 内</div>
              <div>点击 Socket Mode</div>
              <div>把 Enable Socket Mode 打开</div>
              <div>点击 Event Subscriptions</div>
              <div>
                在 Subscribe to bot events 中，添加 app_mention message.groups 和 message.im
              </div>
              <div>如果要求你 reinstall 按照提示照做</div>
              <div>点击 Basic Information</div>
              <div>在 App-Level Tokens 一栏，点击 Generate Token and Scopes</div>
              <div>弹出的窗口添加 connections:write 命名随意</div>
              <div>随后将生成的 Token 复制到 App Token 内</div>
            </small>
          </n-form-item>
        </n-form>
      </template>
      <template v-else-if="form.step === 2">
        <n-timeline style="min-height: 260px">
          <n-timeline-item
            v-for="(activity, index) in activities"
            :key="index"
            :type="activity.type as any"
            :color="activity.color"
            :size="activity.size as any"
            :hollow="activity.hollow">
            <div>{{ activity.content }}</div>
            <div v-if="index === 2 && isTestMode">
              <div>欢迎体验海豹骰点核心，展示模式下不提供登录功能，请谅解。</div>
              <div>如需测试指令，请移步“指令测试”界面。</div>
              <div>此外，数据会定期自动重置。</div>
              <div>展示版本未必是最新版，建议您下载体验。</div>
              <n-button style="margin-top: 1rem" @click="formClose">再会</n-button>
            </div>
            <div
              v-else-if="
                index === 2 && curConn.adapter?.loginState === goCqHttpStateCode.InLoginQrCode
              ">
              <div>登录需要扫码验证，请使用登录此账号的手机 QQ 扫描二维码以继续登录：</div>
              <img
                alt="qr code"
                :src="store.curDice.qrcodes[curConn.id]"
                style="width: 20rem; height: 20rem; image-rendering: pixelated" />
            </div>

            <div
              v-else-if="
                index === 2 &&
                curConn.adapter?.loginState === goCqHttpStateCode.InLoginDeviceLock &&
                curConn.adapter?.goCqHttpLoginDeviceLockUrl
              ">
              <template v-if="curConn.id === curCaptchaIdSet">
                <div>已提交 ticket，正在等待 gocqhttp 回应</div>
              </template>
              <template v-else>
                <div>账号已开启设备锁，请访问此链接进行验证：</div>
                <div style="line-break: anywhere">
                  <n-button
                    text
                    tag="a"
                    :href="curConn.adapter?.goCqHttpLoginDeviceLockUrl"
                    target="_blank">
                    {{ curConn.adapter?.goCqHttpLoginDeviceLockUrl }}
                  </n-button>
                </div>
              </template>

              <div>
                <div>确认验证完成后，点击此按钮：</div>
                <div>
                  <n-button type="warning" @click="gocqhttpReLogin(curConn)">下一步</n-button>
                </div>
              </div>
            </div>

            <div
              v-else-if="
                index === 2 &&
                curConn.adapter?.loginState === goCqHttpStateCode.InLoginBar &&
                curConn.adapter?.goCqHttpLoginDeviceLockUrl
              ">
              <template v-if="curConn.id === curCaptchaIdSet">
                <div>已提交 ticket，正在等待 gocqhttp 回应</div>
              </template>
              <template v-else>
                <div>滑条验证码流程，访问以下链接操作：</div>
                <div style="line-break: anywhere">
                  <div>
                    <a
                      style="line-break: anywhere"
                      href="javascript:void(0)"
                      @click="captchaUrlSet(curConn, curConn.adapter?.goCqHttpLoginDeviceLockUrl)"
                      >{{ curConn.adapter?.goCqHttpLoginDeviceLockUrl }}</a
                    >
                  </div>
                </div>
              </template>
            </div>

            <div
              v-else-if="
                index === 2 && curConn.adapter?.loginState === goCqHttpStateCode.InLoginVerifyCode
              ">
              <!-- <div v-else-if="1"> -->
              <div>短信验证码流程：</div>
              <div style="line-break: anywhere">
                <n-form label-width="5rem">
                  <n-form-item label="手机号">
                    <div>{{ curConn.adapter?.goCqHttpSmsNumberTip }}</div>
                  </n-form-item>
                  <n-form-item label="验证码">
                    <n-input v-model:value="smsCode" />
                  </n-form-item>
                  <n-form-item label="">
                    <n-button
                      :disabled="smsCode == ''"
                      type="primary"
                      @click="submitSmsCode(curConn)">
                      提交
                    </n-button>
                  </n-form-item>
                </n-form>
              </div>
            </div>

            <div
              v-else-if="
                index === 2 && curConn.adapter?.loginState === goCqHttpStateCode.LoginFailed
              ">
              <div>
                <div>登录失败！可能是以下原因：</div>
                <ul>
                  <li>密码错误 (注意检查大小写)</li>
                  <li>二维码获取失败 (日志中会有“二维码错误”)</li>
                  <li>扫二维码超时过期 (约 2 分钟)</li>
                  <li>海豹发生了故障</li>
                </ul>
                <div>具体请参见日志。如果不出现“确定”按钮，请直接刷新。</div>
                <div>若删除账号重复尝试无果，请回报 bug 给开发者。</div>
                <n-text type="info" text tag="a" href="javascript:window.location.reload()">
                  点我前往日志界面
                </n-text>
              </div>
            </div>
          </n-timeline-item>
        </n-timeline>
      </template>
      <template v-else-if="form.step === 3">
        <n-result
          status="success"
          title="成功啦!"
          description="现在账号状态应该是“已连接”了，去试一试骰子吧！" />
      </template>
      <template v-else-if="form.step === 4">
        <n-result status="success" title="成功啦!" description="操作完成，现在可以进行下一步了" />
      </template>

      <template #footer>
        <n-flex>
          <template v-if="form.step === 1">
            <n-button @click="dialogFormVisible = false">取消</n-button>
            <n-button
              type="primary"
              :disabled="
                form.accountType === 0 ||
                ((form.accountType === 1 || form.accountType === 2 || form.accountType === 3) &&
                  form.token === '') ||
                (form.accountType === 4 && form.url === '') ||
                (form.accountType === 5 && (form.clientID === '' || form.token === '')) ||
                (form.accountType === 8 &&
                  (form.clientID === '' || form.token === '' || form.robotCode === '')) ||
                (form.accountType === 6 && (form.account === '' || form.connectUrl === '')) ||
                (form.accountType === 7 &&
                  (form.host === '' || form.port === '' || form.token === '')) ||
                (form.accountType === 9 && (form.botToken === '' || form.appToken === '')) ||
                (form.accountType === 11 && (form.account === '' || form.reverseAddr === '')) ||
                (form.accountType === 13 && (form.token === '' || form.url === '')) ||
                (form.accountType === 15 &&
                  (form.account === '' || (form.signServerType === 2 && form.signServerUrl === '')))
              "
              @click="goStepTwo">
              下一步
            </n-button>
          </template>
          <template v-if="form.isEnd">
            <n-button @click="formClose">确定</n-button>
          </template>
        </n-flex>
      </template>
    </n-modal>

    <!-- 滑条验证，需要 3000 z-index 的原因是 element 的 overlay 是 2012，其移动端页面上是 2017，我不知道是不是累加的，所以给一个很大的值 -->
    <div
      v-show="dialogSlideVisible"
      id="slide"
      style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(1, 1, 1, 0.7);
        z-index: 3000;
      ">
      <iframe
        id="slideIframe"
        ref="slideIframe"
        src="about:blank"
        rel="noreferrer"
        style="width: 100%; height: 100%"></iframe>
      <div
        v-show="slideBottomShow"
        style="
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 100px;
          z-index: 10;
          display: flex;
          justify-content: center;
          flex-direction: column;
          align-items: center;
        ">
        <div style="margin-bottom: 0.5rem">
          <a style="line-break: anywhere; font-size: 0.5rem" :href="slideLink" target="_blank"
            >方式 2:新页面打开 (如无法验证)</a
          >
        </div>
        <n-button @click="closeCaptchaFrame">关闭，滑条完成后点击</n-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { DiceConnection } from '~/store';
import { goCqHttpStateCode, useStore } from '~/store';
import { sleep } from '~/utils';
import * as dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { urlBase } from '~/backend';
import {
  getConnectQQVersion,
  postConnectionDel,
  postConnectionQrcode,
  postConnectSetData,
  postConnectSetEnable,
  postGoCqCaptchaSet,
  postGoCqHttpRelogin,
  postSetSignServer,
  postSmsCodeSet,
} from '~/api/im_connections';
import { postToolOnebot } from '~/api/others';
import { isEmpty, trim } from 'lodash-es';
import { useDialog, useMessage } from 'naive-ui';

dayjs.extend(relativeTime);

const fullActivities = [
  {
    content: '正在生成虚拟设备信息',
    size: 'large',
    type: 'primary',
    hollow: true,
  },
  {
    content: '正在生成登录配置文件',
    size: 'large',
    color: '#0bbd87',
    hollow: true,
  },
  {
    content: '进行登录……',
    size: 'large',
    flag: true,
  },
  {
    content: '完成！',
    type: 'primary',
    hollow: true,
  },

  {
    content: '进行重新登录流程',
    type: 'large',
    hollow: true,
  },
  {
    content:
      '如果卡在这里不出二维码，可以尝试 1 分钟后刷新页面，再次点击登录。如果还不行请删除此账号重新添加',
    type: 'large',
    hollow: true,
  },
];
const activities = ref([] as typeof fullActivities);

const store = useStore();
const dialog = useDialog();
const message = useMessage();
const curCaptchaIdSet = ref(''); // 当前设置了 ticket 的 id

const isRecentLogin = ref(false);
const duringRelogin = ref(false);
const dialogFormVisible = ref(false);
const dialogSetDataFormVisible = ref(false);
const dialogSetSignServerVisible = ref(false);
const dialogSlideVisible = ref(false);
const formLabelWidth = '120px';
const isTestMode = ref(false);

const slideIframe = ref(null);
const slideLink = ref('');
const slideBottomShow = ref(false);

const curConn = ref({} as DiceConnection);
const curConnId = ref('');
const smsCode = ref('');

const accountTypes = computed(() => {
  return [
    {
      label: 'QQ(内置客户端)',
      value: 15,
      disabled: store.diceServers.length > 0 && store.diceServers[0].baseInfo.containerMode,
    },
    { label: 'QQ(onebot11正向WS)', value: 6 },
    { label: 'QQ(onebot11反向WS)', value: 11 },
    { label: 'QQ(官方机器人)', value: 10 },
    { label: '[WIP]Satori', value: 14 },
    { label: '[WIP]SealChat', value: 13 },
    { label: 'Discord', value: 1 },
    { label: 'KOOK(开黑啦)', value: 2 },
    { label: 'Telegram', value: 3 },
    { label: 'Minecraft服务器(Paper)', value: 4 },
    { label: 'Dodo语音', value: 5 },
    { label: '钉钉', value: 8 },
    { label: 'Slack', value: 9 },
    // {
    //   label: '[已弃用]QQ(内置gocq)',
    //   value: 0,
    //   disabled: store.diceServers.length > 0 && store.diceServers[0].baseInfo.containerMode,
    // },
    { label: '[已弃用]QQ(red协议)', value: 7 },
  ];
});

const gocqProtocolVersions = computed(() => {
  const options = [
    { label: 'Android 协议', value: 1 },
    { label: 'Android 手表协议 - 可共存，但不支持频道/戳一戳', value: 2 },
    { label: 'MacOS', value: 3 },
    { label: 'iPad', value: 5 },
    { label: 'AndroidPad - 可共存', value: 6 },
  ];
  if (form.implementation === 'gocq' || form.implementation === '') {
    options.push({ label: 'AndroidPad - 可共存', value: 6 });
  }
  return options;
});

let captchaTimer = null as any;
const captchaUrlSet = (i: DiceConnection, url: string) => {
  if (slideIframe.value) {
    dialogSlideVisible.value = true;
    const el: HTMLIFrameElement = slideIframe.value;
    slideLink.value = url;
    el.src = url;

    const x = new URL(url);
    const key = x.searchParams.get('cap_cd');
    clearTimeout(captchaTimer);

    const requestURL = `${urlBase}/sd-api/utils/get_token?key=${key}`;
    document.cookie = 'b=' + key + '; path=/;';

    const ticketCheck = async () => {
      const resp = await fetch(requestURL, {
        method: 'GET',
        timeout: 240000,
      } as any);
      const text = await resp.text();
      if (text) {
        console.log('ticket', text);
        if (text === 'FAIL') {
          captchaTimer = setTimeout(ticketCheck, 2000);
          return;
        }
        curCaptchaIdSet.value = i.id;

        await submitCaptchaCode(i, text);
        message.success('已自动读取 ticket:' + text, {
          duration: 8000,
        });
        setTimeout(() => {
          dialogSlideVisible.value = false;
        }, 500);
        clearTimeout(captchaTimer);
        captchaTimer = null;
        return;
      }
      captchaTimer = setTimeout(ticketCheck, 2000);
    };
    captchaTimer = setTimeout(ticketCheck, 5000);
    // });

    slideBottomShow.value = false;
    setTimeout(() => {
      // 等一小会再出来，防止误触
      slideBottomShow.value = true;
    }, 3000);
  }
};

const closeCaptchaFrame = () => {
  clearTimeout(captchaTimer);
  dialogSlideVisible.value = false;
};

const submitCaptchaCode = async (i: DiceConnection, code: string) => {
  await postGoCqCaptchaSet(i.id, code);
};

const submitSmsCode = async (i: DiceConnection) => {
  if (!smsCode.value) return;
  const code = smsCode.value;
  smsCode.value = '';
  await postSmsCodeSet(i.id, code);
};

const setRecentLogin = () => {
  isRecentLogin.value = true;
  // 无用
  // curConn.value.adapter.inPackGoCqHttpRunning = false;
  // curConn.value.adapter.inPackGoCqHttpLoginDeviceLockUrl = '';
  setTimeout(() => {
    isRecentLogin.value = false;
  }, 3000);
};

const openSocks = async () => {
  const ret = await postToolOnebot();
  if (ret.ok) {
    const msg = h('p', null, [
      h('div', null, '将在服务器上开启临时 socks5 服务，端口 13325'),
      h('div', null, '默认持续时长为 20 分钟'),
      h('div', null, [
        h('span', null, `可能的公网 IP: `),
        h('span', { style: 'color: teal' }, `${ret.ip}`),
      ]),
      h('div', null, '注：ip 不一定对仅供参考'),
      h('div', { style: 'min-height: 1rem' }, ''),
      h('div', null, '请于服务器管理面板放行 13325 端口，协议 TCP'),
      h('div', null, '如果为 Windows Server 系统，请再额外关闭系统防火墙或设置放行规则。'),
    ]);
    dialog.info({
      title: '开启辅助工具',
      content: () => msg,
    });
  } else {
    const msg = h('p', null, [
      h('div', null, '启动服务失败，或已经启动'),
      h('div', null, [
        h('span', null, `报错信息：`),
        h('span', { style: 'color: #9b0d0d' }, `${ret.errText}`),
      ]),
      h('div', null, [
        h('span', null, `可能的公网 IP: `),
        h('span', { style: 'color: teal' }, `${ret.ip}`),
      ]),
      h('div', null, '注：ip 不一定对仅供参考'),
      h('div', { style: 'min-height: 1rem' }, ''),
      h('div', null, '请于服务器管理面板放行 13325 端口，协议 TCP'),
      h('div', null, '如果为 Windows Server 系统，请再额外关闭系统防火墙或设置放行规则。'),
    ]);
    dialog.error({
      title: '开启辅助工具',
      content: () => msg,
    });
  }
};

const goStepTwo = async () => {
  form.step = 2;
  curConnId.value = '';
  setRecentLogin();
  duringRelogin.value = false;

  if (form.accountType === 15) {
    switch (form.signServerType) {
      case 0:
        form.signServerUrl = 'sealdice';
        break;
      case 1:
        form.signServerUrl = 'lagrange';
        break;
    }
  }

  store
    .addImConnection(form as any)
    .then(conn => {
      if ((conn as any).testMode) {
        isTestMode.value = true;
      } else {
        curConnId.value = conn.id;
      }
    })
    .catch(e => {
      console.log(e);
      message.error('似乎已经添加了这个账号！');
      formClose();
    });
  if (form.accountType > 0) {
    dialogFormVisible.value = false;
    form.step = 1;
    form.signServerUrl = '';
    return;
  }
  activities.value = [];
  await sleep(500);
  activities.value.push(fullActivities[0]);
  await sleep(1000);
  activities.value.push(fullActivities[1]);
  await sleep(1000);
  activities.value.push(fullActivities[2]);
};

const formClose = async () => {
  curConnId.value = '';
  dialogFormVisible.value = false;
  form.step = 1;
  form.isEnd = false;
};

const setEnable = async (i: DiceConnection, val: boolean) => {
  const ret = await postConnectSetEnable(i.id, val);
  i.enable = ret.enable;
  curCaptchaIdSet.value = '';
  message.success('状态修改完成');
  if (val) {
    setRecentLogin();
    // 若是启用骰子，走登录流程
    curConnId.value = ''; // 先改掉这个，以免和当前连接一致，导致被瞬间重置
    nextTick(() => {
      curConnId.value = i.id;
    });

    // 重复登录时，也打开这个窗口
    activities.value = [];
    dialogFormVisible.value = true;

    if (i.adapter.useInPackGoCqhttp) {
      form.step = 2;
      activities.value.push(fullActivities[4]);
      activities.value.push(fullActivities[5]);
      activities.value.push(fullActivities[2]);
    } else {
      form.step = 4;
      form.isEnd = true;
    }
  }
};

const askSetData = async (i: DiceConnection) => {
  form.protocol = i.adapter?.inPackGoCqHttpProtocol;
  form.appVersion = i.adapter?.inPackGoCqHttpAppVersion;
  form.ignoreFriendRequest = i.adapter?.ignoreFriendRequest;
  form.useSignServer = i.adapter?.useSignServer;
  form.signServerConfig = i.adapter?.signServerConfig;
  dialogSetDataFormVisible.value = true;
  form.endpoint = i;

  signConfigType.value = i.adapter?.useSignServer === true ? 'simple' : 'none';
};

const doSetData = async () => {
  let param = {
    protocol: form.protocol,
    ignoreFriendRequest: form.ignoreFriendRequest,
  } as {
    protocol: number;
    appVersion: string;
    ignoreFriendRequest: boolean;
    useSignServer?: boolean;
    signServerConfig?: any;
  };
  if (form.protocol === 1 || form.protocol === 6) {
    param = {
      ...param,
      appVersion: form.appVersion,
      useSignServer: form.useSignServer,
      signServerConfig: form.signServerConfig,
    };
  }
  await postConnectSetData(form.endpoint.id, param);
  if (form.endpoint.adapter) {
    form.endpoint.adapter.inPackGoCqHttpProtocol = form.protocol;
  }
  message.success('修改完成，请手动重新登录');
  dialogSetDataFormVisible.value = false;
};
const showSetSignServerDialog = async (i: DiceConnection) => {
  form.endpoint = i;
  const ret = await postSetSignServer(form.endpoint.id, '', false, form.signServerVersion);
  if (ret.result) {
    form.signServerUrl = ret.signServerUrl;
    switch (form.signServerUrl) {
      case 'sealdice':
        form.signServerType = 0;
        form.signServerUrl = '';
        break;
      case 'lagrange':
        form.signServerType = 1;
        form.signServerUrl = '';
        break;
      default:
        form.signServerType = 2;
        break;
    }
    form.signServerVersion = ret.signServerVersion;
    dialogSetSignServerVisible.value = true;
  } else {
    message.error(ret.err);
  }
};

const doSetSignServer = async () => {
  switch (form.signServerType) {
    case 0:
      form.signServerUrl = 'sealdice';
      break;
    case 1:
      form.signServerUrl = 'lagrange';
      break;
  }
  const ret = await postSetSignServer(
    form.endpoint.id,
    trim(form.signServerUrl),
    true,
    form.signServerVersion,
  );
  if (ret.result) {
    message.success('修改完成，请手动启用账号以生效');
  } else {
    message.error(ret.err);
  }
  dialogSetSignServerVisible.value = false;
};

const askSetEnable = async (i: DiceConnection, val: boolean) => {
  dialog.warning({
    title: '警告',
    content: '确认修改此账号的在线状态吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      setEnable(i, val);
    },
  });
};

const askGocqhttpReLogin = async (i: DiceConnection) => {
  duringRelogin.value = false;
  dialog.warning({
    title: '警告',
    content: '确认重新登录吗？有可能要再次扫描二维码',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      gocqhttpReLogin(i);
    },
  });
};

const doGocqExport = async (i: DiceConnection) => {
  duringRelogin.value = false;
  dialog.info({
    title: '提示',
    content: '即将下载 gocq 配置，是否继续？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      // http://localhost:3211/sd-api/im_connections/gocq_config_download.zip?id=10f576a4-5237-43f6-9086-269a9f9aace5&token=J4JAofWluYsc0YTgUtDuw3eBnVbZyW%232gTG0agA%40aAVRRIFmrTT0w4tEMbVxGdXn%3A0000000063a8664f
      location.href = `${urlBase}/sd-api/im_connections/gocq_config_download.zip?token=${encodeURIComponent(store.token)}&id=${encodeURIComponent(i.id)}`;
    },
  });
};

const gocqhttpReLogin = async (i: DiceConnection) => {
  curCaptchaIdSet.value = '';
  setRecentLogin();
  duringRelogin.value = true;
  curConnId.value = ''; // 先改掉这个，以免和当前连接一致，导致被瞬间重置
  if (curConn.value && curConn.value.adapter) {
    curConn.value.adapter.loginState = goCqHttpStateCode.Init;
  }
  postGoCqHttpRelogin(i.id)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .then(theConn => {
      curConnId.value = i.id;
    })
    .finally(() => {
      form.isEnd = true;
    });
  // 重复登录时，也打开这个窗口
  activities.value = [];
  dialogFormVisible.value = true;

  if (i.adapter.useInPackGoCqhttp) {
    form.step = 2;
    activities.value.push(fullActivities[4]);
    activities.value.push(fullActivities[5]);
    activities.value.push(fullActivities[2]);
  } else {
    form.step = 4;
  }
};
const signConfigType: Ref<'none' | 'simple' | 'advanced'> = ref('none');
const signConfigTypeChange = (value: any) => {
  switch (value) {
    case 'simple':
      form.useSignServer = true;
      // 恢复其他配置项的默认值
      form.signServerConfig = {
        signServers: [
          form?.signServerConfig?.signServers?.[0] ?? {
            url: '',
            key: '',
            authorization: '',
          },
        ],
        ruleChangeSignServer: 1,
        maxCheckCount: 0,
        signServerTimeout: 60,
        autoRegister: false,
        autoRefreshToken: false,
        refreshInterval: 40,
      };
      break;
    case 'advanced':
      form.useSignServer = true;
      form.signServerConfig = {
        signServers: form.signServerConfig?.signServers ?? [
          { url: '', key: '', authorization: '' },
        ],
        ruleChangeSignServer: 1,
        maxCheckCount: 0,
        signServerTimeout: 60,
        autoRegister: false,
        autoRefreshToken: false,
        refreshInterval: 40,
      };
      break;
    case 'none':
    default:
      form.useSignServer = false;
      form.signServerConfig = {
        signServers: [{ url: '', key: '', authorization: '' }],
      } as any;
      break;
  }
};

const handleSignServerAdd = () => {
  form.signServerConfig?.signServers?.push({
    url: '',
    key: '',
    authorization: '',
  });
};

const handleSignServerDelete = (url: string) => {
  if (form.signServerConfig?.signServers) {
    form.signServerConfig.signServers = form.signServerConfig.signServers.filter(server => {
      return server.url != url;
    });
  }
};

const supportedQQVersions = ref<string[]>([]);

const defaultAccountType: number =
  store.diceServers.length > 0 && store.diceServers[0].baseInfo.containerMode ? 6 : 15;
const form = reactive({
  accountType: defaultAccountType,
  step: 1,
  isEnd: false,
  account: '',
  nickname: '',
  password: '',
  protocol: 1,
  appVersion: '',
  implementation: '',
  id: '',
  token: '',
  botToken: '',
  appToken: '',
  proxyURL: '',
  reverseProxyUrl: '',
  reverseProxyCDNUrl: '',
  url: '',
  clientID: '',
  robotCode: '',
  ignoreFriendRequest: false,
  extraArgs: '',
  endpoint: null as any as DiceConnection,

  relWorkDir: '',
  accessToken: '',
  connectUrl: '',

  host: '',
  port: '',

  appID: undefined,
  appSecret: '',
  onlyQQGuild: true,

  useSignServer: false,
  signServerConfig: {
    signServers: [
      {
        url: '',
        key: '',
        authorization: '',
      },
    ],
    ruleChangeSignServer: 1,
    maxCheckCount: 0,
    signServerTimeout: 60,
    autoRegister: false,
    autoRefreshToken: false,
    refreshInterval: 40,
  },
  signServerType: 0,
  signServerUrl: '',
  signServerKey: '',
  signServerVersion: '25765',

  reverseAddr: ':4001',
  platform: 'QQ',
});

export type addImConnectionForm = typeof form;

const addOne = () => {
  dialogFormVisible.value = true;
  form.protocol = 6;
  form.implementation = 'gocq';
};

let timerId: number;

onBeforeMount(async () => {
  await store.getImConnections();
  for (const i of store.curDice.conns || []) {
    delete store.curDice.qrcodes[i.id];
  }

  const versionsRes = await getConnectQQVersion();
  if (versionsRes.result) {
    supportedQQVersions.value = ['', ...versionsRes.versions];
  }

  timerId = setInterval(async () => {
    await store.getImConnections();

    for (const i of store.curDice.conns || []) {
      // 获取二维码
      if (i.adapter?.loginState === goCqHttpStateCode.InLoginQrCode) {
        store.curDice.qrcodes[i.id] = (await postConnectionQrcode(i.id)).img;
      }

      if (i.id === curConnId.value) {
        curConn.value = i;

        // 登录失败
        if (i.state !== 1 && i.adapter?.loginState === goCqHttpStateCode.LoginFailed) {
          form.isEnd = true;
        }

        // 登录成功
        if (i.state === 1 && i.adapter?.loginState === goCqHttpStateCode.LoginSuccessed) {
          activities.value.push(fullActivities[3]);
          await sleep(1000);
          form.step = 3;
          form.isEnd = true;
        }

        break;
      }
    }
  }, 3000) as any;
});

onBeforeUnmount(() => {
  clearInterval(timerId);
});

const doRemove = async (i: DiceConnection) => {
  dialog.warning({
    title: '警告',
    content: '删除此项帐号，确定吗？（注：删除账号不会影响人物卡和 logs 等数据）',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      postConnectionDel(i.id);
      store.getImConnections();
      message.success('删除成功！');
    },
  });
};
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-add {
  width: 3rem !important;
  height: 3rem !important;
  font-size: 2rem;
  font-weight: bold;
}
</style>

<style>
.the-dialog {
  min-width: 370px;
}
</style>
