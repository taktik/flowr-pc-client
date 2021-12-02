export class Timer {
  private triggered = false
  started: number
  timeout: NodeJS.Timeout

  get remainingTime(): number {
    return this.triggered
      ? 0
      : this.started + this.duration - Date.now()
  }

  constructor(
    callback: () => void,
    private duration: number,
  ) {
    this.started = Date.now()
    this.timeout = global.setTimeout(() => {
      this.triggered = true
      callback()
    }, duration)
  }

  clear(): void {
    global.clearTimeout(this.timeout)
  }
}
