export class ResetableTimeout {
    private timeout: NodeJS.Timeout

    constructor(
        private readonly callback: () => void,
        private timeoutValue: number,
    ) {
        this.timeout = setTimeout(callback, timeoutValue)
    }

    reset(timeoutValue = this.timeoutValue): void {
        this.timeoutValue = timeoutValue
        
        this.clear()
        this.timeout = setTimeout(this.callback, timeoutValue)
    }

    clear(): void {
        clearTimeout(this.timeout)
    }
}
