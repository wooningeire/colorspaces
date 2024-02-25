import {Listen, clearTextSelection} from "@/util";

const noop = () => {};

interface Point {
  x: number,
  y: number,
}

export default <T>({
  shouldCancel=() => false,
  onDown=noop as unknown as (downEvent: PointerEvent) => T,
  onPassTolerance=noop,
  onDrag=noop,
  onUp=noop,
  onUpAfterPassTolerance=noop,
  dragTolerance=4,
}: {
  shouldCancel?: (downEvent: PointerEvent) => boolean,
  onDown?: (downEvent: PointerEvent) => T,
  onPassTolerance?: (downEvent: PointerEvent, moveEvent: PointerEvent) => void,
  onDrag?: (moveEvent: PointerEvent, displacement: Point, data: T) => void,
  onUp?: (upEvent: PointerEvent) => void,
  onUpAfterPassTolerance?: (upEvent: PointerEvent) => void,
  dragTolerance?: number,
}) => (downEvent: PointerEvent) => {
  if (shouldCancel(downEvent)) return;

  const data = onDown(downEvent);

  let hasPassedTolerance = false;

  const displacement: Point = {
    x: 0,
    y: 0,
  };

  // Used to temporarily lock the displacement values after passing the threshold to avoid problems with pointer lock
  let displacementLocked = false;

  const moveListener = Listen.for(window, "pointermove", (moveEvent: PointerEvent) => {
    clearTextSelection();

    if (!displacementLocked) {
      displacement.x += moveEvent.movementX;
      displacement.y += moveEvent.movementY;
    }
    if (!hasPassedTolerance && (displacement.x**2 + displacement.y**2) <= dragTolerance**2) {
      return;
    } else if (!hasPassedTolerance) {
      onPassTolerance(downEvent, moveEvent);
      hasPassedTolerance = true;

      displacementLocked = true;
      displacement.x = 0;
      displacement.y = 0;
      // Temporary hardcoded value until pointer lock has a mechanism to detect when lock begins
      setTimeout(() => {
        displacementLocked = false;
      }, 75);

      addEventListener("pointerup", (upEvent: PointerEvent) => {
        onUpAfterPassTolerance(upEvent);
      }, {once: true});
    }

    onDrag(moveEvent, displacement, data);
  });

  addEventListener("pointerup", (upEvent: PointerEvent) => {
    clearTextSelection();
    moveListener.detach();
    onUp(upEvent);
  }, {once: true});
};