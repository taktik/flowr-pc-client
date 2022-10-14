import { icons } from '../constants'

export default function ensureIcon(icon: string | undefined, fallback = icons.page): string {
    return !icon || icon.trim() === '' ? (fallback as unknown as string) : icon
}
