export class Timer {
  started: number
  timeout: NodeJS.Timeout

  get remainingTime(): number {
    return this.started + this.duration - Date.now()
  }

  constructor(
    callback: () => void,
    private duration: number,
  ) {
    this.started = Date.now()
    this.timeout = global.setTimeout(callback, duration)
  }

  clear(): void {
    global.clearTimeout(this.timeout)
  }
}
