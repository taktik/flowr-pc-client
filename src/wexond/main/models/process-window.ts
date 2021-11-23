import { Window } from 'node-window-manager';
import { IRectangle } from 'node-window-manager/dist/interfaces'
import mouseEvents from 'mouse-hooks';
import { appWindow } from '..';

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
    this.setOwner(null);

    mouseEvents.once('mouse-up', () => {
      setTimeout(() => {
        this.setBounds({
          width: this.initialBounds.width,
          height: this.initialBounds.height,
        });

        appWindow.webContents.send('remove-tab', this.id);
      }, 50);
    });
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
