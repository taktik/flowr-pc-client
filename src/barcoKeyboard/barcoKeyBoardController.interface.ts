export interface BarcoKeyBoardControllerInterface {
  open(): Promise<void>
  close(): Promise<void>
  toggle(): Promise<void>
}
