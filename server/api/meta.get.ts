// server/api/meta.get.ts
import { defineEventHandler, getQuery } from 'h3'
import * as cheerio from 'cheerio'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetUrl = query.url as string

  if (!targetUrl) {
    return { error: 'Missing URL' }
  }

  try {
    // 1. 服务端发起请求获取 HTML
    // 注意：如果是生产环境，最好加上 User-Agent 头，否则有些网站会拦截爬虫
    const html = await $fetch<string>(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TossBot/1.0)'
      }
    })

    // 2. 解析 HTML
    const $ = cheerio.load(html)

    // 3. 提取 Open Graph (OG) 标签
    const getMeta = (prop: string) => 
      $(`meta[property="${prop}"]`).attr('content') || 
      $(`meta[name="${prop}"]`).attr('content')

    const title = getMeta('og:title') || $('title').text() || ''
    const description = getMeta('og:description') || getMeta('description') || ''
    const image = getMeta('og:image') || ''

    return {
      title,
      description,
      image,
      url: targetUrl
    }

  } catch (e) {
    console.error('Fetch meta failed:', e)
    // 失败了也不要报错，返回空对象，前端只显示纯链接
    return { title: '', description: '', image: '', url: targetUrl }
  }
})
