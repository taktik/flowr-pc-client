import { Window } from 'node-window-manager';
import { IRectangle } from 'node-window-manager/dist/interfaces'

export class ProcessWindow extends Window {
  public resizable = false;
  public maximizable = false;
  public minimizable = false;

  public lastTitle: string;

  public opacity: number;

  public lastBounds: IRectangle;
  public initialBounds: IRectangle;

  constructor(handle: number) {
    super(handle);

    this.toggleTransparency(true);
    this.lastBounds = this.getBounds();
    this.initialBounds = this.getBounds();
  }

  public detach(): void {
    this.setOwner(null)
  }

  public show(): void {
    super.show();
    this.setOpacity(1);
  }

  public hide(): void {
    super.hide();
    this.setOpacity(0);
  }
}
