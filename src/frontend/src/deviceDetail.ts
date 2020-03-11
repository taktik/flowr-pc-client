import { pathExists, readJson, writeJson } from 'fs-extra'
import cryptoRandomString = require('crypto-random-string')
import { networkEverywhere } from 'network-everywhere'

export type DeviceDetail = { uuid: string }

export class DeviceDetailHelper {
  constructor(private deviceDetailPath: string) {
  }
  private async createDeviceDetailFile(): Promise<void> {
    let mac: string = ''
    try {
      const activeInterface = await networkEverywhere.getActiveInterface()
      mac = activeInterface.mac
    } catch (err) {
      console.warn(err)
    }
    const randomString = cryptoRandomString({ length: 4 })
    const uuid = `desktop-client-${randomString}-${mac}`
    await writeJson(this.deviceDetailPath, { uuid })
  }
  public async getDeviceDetails(): Promise<DeviceDetail> {
    if (!await pathExists(this.deviceDetailPath)) {
      await this.createDeviceDetailFile()
    }
    return readJson(this.deviceDetailPath)
  }
}
