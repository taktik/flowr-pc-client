/**
 * enum values must match MediaDeviceKind
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDeviceInfo/kind
 */
 export enum DeviceType {
    INPUT = 'audioinput',
    OUTPUT = 'audiooutput',
}

export enum AudioMode {
	SPEAKER = 'SPEAKER',
	HEADSET = 'HEADSET',
}

export type AudioModeDevicesPreferences = {
	[DeviceType.INPUT]: string
	[DeviceType.OUTPUT]: string
}

export type AudioStorePreferences = {
    [AudioMode.SPEAKER]?: AudioModeDevicesPreferences
    [AudioMode.HEADSET]?: AudioModeDevicesPreferences
}
