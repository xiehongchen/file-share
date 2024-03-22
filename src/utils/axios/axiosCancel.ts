import { AxiosRequestConfig } from 'axios'

// 存储取消请求控制器
const pendingMap = new Map<string, AbortController>()

// 请求唯一标识
const getUrl = (config: AxiosRequestConfig) => {
  return [config.url, config.method].join(':')
}

/**
 * 取消请求类
 */
class AxiosCanceler {
  /**
   * 添加请求
   * @param config 请求配置
   */
  addPending(config: AxiosRequestConfig) {
    this.removePending(config)
    const url = getUrl(config)
    const abortController = new AbortController()
    config.signal = abortController.signal
    if (!pendingMap.has(url)) {
      pendingMap.set(url, abortController)
    }
  }
  /**
   * 删除指定的请求
   * @param config 请求配置
   */
  removePending(config: AxiosRequestConfig) {
    const url = getUrl(config)
    if (pendingMap.has(url)) {
      const abortController = pendingMap.get(url)
      abortController?.abort()
      pendingMap.delete(url)
    }
  }
  /**
   * 清除所有等待中的请求
   */
  removeAllPending() {
    pendingMap.forEach((abortController) => {
      abortController.abort()
    })
    this.clear()
  }
  clear() {
    pendingMap.clear()
  }
}

export default AxiosCanceler
