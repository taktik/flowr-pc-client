export enum EncryptionType {
  AES_128_CBC = 'aes-128-cbc',
}

export interface IDecryption {
  use: boolean
  type?: EncryptionType
}
