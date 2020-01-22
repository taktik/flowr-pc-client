import { pathExists, readJson, writeJson } from 'fs-extra'
const randomString = require('crypto-random-string')

export type DeviceDetail = { uuid: string }

export class DeviceDetailHelper {
  constructor(private deviceDetailPath: string) {
  }
  private async createDeviceDetailFile(): Promise<void> {
    const uuid = `desktop-client-${randomString(10)}`
    await writeJson(this.deviceDetailPath, { uuid })
  }
  public async getDeviceDetails(): Promise<DeviceDetail> {
    if (!await pathExists(this.deviceDetailPath)) {
      await this.createDeviceDetailFile()
    }
    return readJson(this.deviceDetailPath)
  }
}
