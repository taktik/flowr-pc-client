import type { ModifiableConfig } from '../frontend/src/interfaces/flowrStore'

export type ConfigProps = {
    config: ModifiableConfig
    lastError: string | undefined
    isLaunchedUrlCorrect: boolean
}
