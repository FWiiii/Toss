/**
 * utils/url.ts
 * 用于处理 URL 识别与标准化的工具函数
 */

/**
 * 严格检查一个字符串是否为 URL
 * 用于判断是否需要渲染 "富媒体卡片"
 * * @param text 输入的文本
 * @returns boolean
 */
export const isUrl = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false
  
  // 1. 去除首尾空格
  const str = text.trim()
  
  // 2. 如果包含空格（换行符除外），通常不是纯链接
  // 这里的 \s 包含了空格、tab、换行
  if (/\s/.test(str)) return false

  // 3. 正则表达式分解：
  // ^(https?:\/\/)?           -> 可选的 http:// 或 https:// 开头
  // (
  //   ([a-z0-9-]+\.)+[a-z]{2,} -> 标准域名 (如 google.com, a.b.co)
  //   |
  //   (\d{1,3}\.){3}\d{1,3}    -> 或者 IP 地址 (如 192.168.0.1)
  //   |
  //   localhost                -> 或者 localhost (开发调试用)
  // )
  // (:\d+)?                   -> 可选的端口号 (如 :3000)
  // (\/[-a-z0-9%_.~+]*)* -> 可选的路径
  // (\?[;&a-z0-9%_.~+=-]*)?   -> 可选的查询参数 (?id=1)
  // (\#[-a-z0-9_]*)?          -> 可选的 Hash (#top)
  // $                         -> 必须以这些结尾
  
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' + 
    '(' +
      '([a-z0-9-]+\\.)+[a-z]{2,}|' + 
      '(\\d{1,3}\\.){3}\\d{1,3}|' + 
      'localhost' +
    ')' +
    '(\\:\\d+)?(\\/[-a-z0-9%_.~+]*)*' + 
    '(\\?[;&a-z0-9%_.~+=-]*)?' + 
    '(\\#[-a-z0-9_]*)?$', 
    'i' // 忽略大小写
  )

  return pattern.test(str)
}

/**
 * URL 标准化
 * 将 "google.com" 转换为 "https://google.com" 以便在 href 中跳转
 * * @param url 原始 URL
 * @returns 标准化的 URL
 */
export const normalizeUrl = (url: string): string => {
  if (!url) return ''
  
  const trimmed = url.trim()

  // 如果已经以 http:// 或 https:// 开头，直接返回
  if (/^(https?:\/\/)/i.test(trimmed)) {
    return trimmed
  }

  // 否则默认补全 https://
  return `https://${trimmed}`
}

/**
 * (可选) 辅助函数：提取域名显示
 * 输入: https://www.google.com/search?q=1
 * 输出: google.com
 */
export const getDomain = (url: string): string => {
  try {
    const fullUrl = normalizeUrl(url)
    const hostname = new URL(fullUrl).hostname
    return hostname.replace(/^www\./, '') // 去掉 www. 前缀更简洁
  } catch (e) {
    return url
  }
}
