import { i18n } from './i18n'
import { sdk } from './sdk'
import { uiInterfaceId, uiMultiHostId, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const uiMulti = sdk.MultiHost.of(effects, uiMultiHostId)
  const uiMultiOrigin = await uiMulti.bindPort(uiPort, { protocol: 'http' })

  const ui = sdk.createInterface(effects, {
    name: i18n('Web Interface'),
    id: uiInterfaceId,
    description: i18n('The Kimai web interface'),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await uiMultiOrigin.export([ui])]
})
