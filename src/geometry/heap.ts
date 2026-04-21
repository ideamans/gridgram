/**
 * Minimal binary min-heap.
 *
 * Used by the Dijkstra router. The grid is small (≤25 intersections on
 * a 4×4 layout) so absolute throughput barely matters here, but the
 * previous "sort-on-every-pop" array was O(V² log V) and pq.shift() was
 * itself O(V) — replacing it with a proper heap also makes the routing
 * cost predictable for larger custom layouts.
 */
export class MinHeap<T> {
  private data: T[] = []

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.data.length
  }

  push(item: T): void {
    this.data.push(item)
    this.bubbleUp(this.data.length - 1)
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      this.bubbleDown(0)
    }
    return top
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1
      if (this.compare(this.data[idx], this.data[parent]) < 0) {
        ;[this.data[idx], this.data[parent]] = [this.data[parent], this.data[idx]]
        idx = parent
      } else {
        return
      }
    }
  }

  private bubbleDown(idx: number): void {
    const n = this.data.length
    while (true) {
      const l = idx * 2 + 1
      const r = idx * 2 + 2
      let smallest = idx
      if (l < n && this.compare(this.data[l], this.data[smallest]) < 0) smallest = l
      if (r < n && this.compare(this.data[r], this.data[smallest]) < 0) smallest = r
      if (smallest === idx) return
      ;[this.data[idx], this.data[smallest]] = [this.data[smallest], this.data[idx]]
      idx = smallest
    }
  }
}
