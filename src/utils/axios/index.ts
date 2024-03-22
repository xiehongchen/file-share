import { RequstInterceptors } from './axiosType'
import type { AxiosError } from 'axios'
import axios from 'axios'
import AxiosTest from './axios'
import AxiosRetry from './axiosRetry'
import { checkStatus } from './checkStatus'
const _RequstInterceptors: RequstInterceptors = {
  // 请求拦截器
  requestInterceptors(config) {
    // console.log('stopRequest', stopRequest)
    // const abortAxios = new AbortAxios()
    // abortAxios.addPending(config)
    return config
  },
  // 请求错误拦截器
  requestInterceptorsCatch(err) {
    return err
  },
  // 响应拦截器
  responseInterceptor(config) {
    return config
  },
  // 响应错误拦截器
  responseInterceptorsCatch(axiosInstance, err: AxiosError) {
    const message = err.code === 'ECONNABORTED' ? '请求超时' : undefined
    if (axios.isCancel(err)) {
      return Promise.reject(err)
    }
    checkStatus((err as AxiosError).response?.status, message, () => {})
    const retryRequest = new AxiosRetry()

    return retryRequest.retry(axiosInstance, err as AxiosError)
  },
}

const useRequest = new AxiosTest({
  directlyGetData: false,
  baseURL: '/api',
  timeout: 3000,
  interceptors: _RequstInterceptors,
  abortRepetitiveRequest: true,
  retryConfig: {
    count: 1,
    waitTime: 500,
  },
})

export default useRequest
