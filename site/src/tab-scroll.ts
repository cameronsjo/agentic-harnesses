/** One-pixel tolerance avoids edge cues caused only by fractional layout rounding. */
export function tabScrollEdges(left: number, width: number, total: number) {
  const overflowing = total > width + 1
  return { left: overflowing && left > 1, right: overflowing && left + width < total - 1 }
}
