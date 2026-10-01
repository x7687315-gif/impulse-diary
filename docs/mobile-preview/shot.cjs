/* Mobile-view screenshots of impulse-diary via system Chrome */
const path = require('path')
const { chromium } = require('playwright-core')

const OUT = 'C:/Users/86159/Desktop/代码/impulse-diary/docs/mobile-preview'
const URL = 'http://localhost:4173/'

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN',
  })
  const page = await ctx.newPage()
  const shot = (name) => page.screenshot({ path: path.join(OUT, name) })

  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // 1. 首页 · 浅色
  await shot('1-diary-light.png')

  // 切深色
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('impulse-diary-prefs') || '{}')
    p.theme = 'dark'
    localStorage.setItem('impulse-diary-prefs', JSON.stringify(p))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // 2. 首页 · 深色
  await shot('2-diary-dark.png')

  // 3. 灵动岛展开（双击）
  const island = page.locator('.island')
  if (await island.count()) {
    await island.dblclick()
    await page.waitForTimeout(700)
    await shot('3-island-expanded.png')
    await page.locator('.island-stack').dblclick()
    await page.waitForTimeout(500)
  }

  // 4. 新增记录表单
  await page.locator('.fab').click()
  await page.waitForTimeout(600)
  await shot('4-entry-form.png')
  await page.locator('.overlay').click({ position: { x: 10, y: 10 } })
  await page.waitForTimeout(400)

  // 5-7. 抽屉导航到 统计 / 目标 / 设置
  async function goto(name) {
    await page.locator('.topbar .icon-btn').first().click()
    await page.waitForTimeout(400)
    await page.locator('.side-link', { hasText: name }).click()
    await page.waitForTimeout(900)
  }
  await goto('数据统计')
  await shot('5-stats-dark.png')
  await goto('我的目标')
  await shot('6-goals-dark.png')
  await goto('设置')
  await shot('7-settings-dark.png')

  await browser.close()
  console.log('SCREENSHOTS DONE')
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
