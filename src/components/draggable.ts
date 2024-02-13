import {Listen, clearTextSelection} from "@/util";

const noop = () => {};

interface Point {
  x: number,
  y: number,
}

export default <T>({
  shouldCancel=() => false,
  onDown=noop,
  onPassTolerance=noop,
  onDrag=noop,
  onUp=noop,
  dragTolerance=4,
}: {
  shouldCancel?: (downEvent: PointerEvent) => boolean,
  onDown?: (downEvent: PointerEvent) => T,
  onPassTolerance?: (downEvent: PointerEvent, moveEvent: PointerEvent) => void,
  onDrag?: (moveEvent: PointerEvent, displacement: Point, data: T) => void,
  onUp?: () => void,
  dragTolerance?: number,
}) => (downEvent: PointerEvent) => {
  if (shouldCancel(downEvent)) return;

  const data = onDown(downEvent);

  let hasPassedTolerance = false;

  const displacement: Point = {
    x: 0,
    y: 0,
  };

  const moveListener = Listen.for(window, "pointermove", (moveEvent: PointerEvent) => {
    clearTextSelection();

    displacement.x += moveEvent.movementX;
    displacement.y += moveEvent.movementY;
    if (!hasPassedTolerance && (displacement.x**2 + displacement.y**2) <= dragTolerance**2) {
      return;
    } else if (!hasPassedTolerance) {
      onPassTolerance(downEvent, moveEvent);
      hasPassedTolerance = true;
    }

    onDrag(moveEvent, displacement, data);
  });

  addEventListener("pointerup", () => {
    clearTextSelection();
    moveListener.detach();

    onUp();
  }, {once: true});
};