/**
 * 前端侧的聚合函数。
 * 分析阶段在 Python 里算过的统计，这里在浏览器里用同一份结构化结果重算一遍，
 * 用来把「静态导出的图片」换成「数据驱动的图表」。
 */

/** 按某个字段计数，返回从大到小排好序的 { name, value } 数组 */
export function countBy(list, key) {
  const map = new Map()
  for (const item of list) {
    const k = item[key] ?? '未知'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * 从 14 位时间戳里切出小时位，做 24 小时直方图。
 * 数据里的 time 形如 20181002094225（YYYYMMDDHHmmss），小时位是第 9、10 位。
 */
export function hourHistogram(list, timeKey = 'time') {
  const counts = new Array(24).fill(0)
  let valid = 0
  for (const item of list) {
    const t = String(item[timeKey] ?? '')
    if (t.length < 10) continue
    const h = Number(t.slice(8, 10))
    if (Number.isInteger(h) && h >= 0 && h <= 23) {
      counts[h] += 1
      valid += 1
    }
  }
  return {
    valid,
    points: counts.map((count, hour) => ({ hour, count })),
  }
}
