import type { AxiosError, AxiosInstance } from 'axios'

class AxiosRetry {
  retry(axiosInstance: AxiosInstance, err: AxiosError) {
    const config: any = err.config
    const { waitTime, count } = config.retryConfig ?? {}
    config.currentCount = config.currentCount ?? 0
    if (config.currentCount >= count) {
      return Promise.reject(err)
    }
    config.currentCount++
    return this.wait(waitTime).then(() => axiosInstance(config))
  }
  wait(waitTime: number) {
    return new Promise((resolve) => setTimeout(resolve, waitTime))
  }
}

export default AxiosRetry
