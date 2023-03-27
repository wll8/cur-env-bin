const axios = require('axios').default
const http = axios.create({
  baseURL: 'https://httpbin.org/',
  proxy: false,
})

http.interceptors.request.use(async (config) => {
  if(process.env.http_proxy) {
    // [Request to HTTPS with HTTP proxy fails](https://github.com/axios/axios/issues/925#issuecomment-359982190)
    config.httpsAgent = await new require('https-proxy-agent')(`${process.env.http_proxy}`)
    config.headers[`user-agent`] = (new (require('user-agents'))).data.userAgent
  }
  return config
}, (err) => Promise.reject(err))


http.interceptors.response.use((res) => res.data, (err) => Promise.reject(err))

module.exports = http