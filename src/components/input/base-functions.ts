import { Vec3 } from "$/util";

export const acceptAlways = () => true;
export const identity = <T>(value: T) => value;
export const cloneArray = (value: Vec3): Vec3 => [...value];