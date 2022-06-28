import { exposeIpc } from '../common/exposeIpc'

exposeIpc(['close', 'getAppConfig', 'receiveConfig', 'setAppConfig'])
