export const acceptAlways = () => true;
export const identity = <T>(value: T) => value;
export const cloneArray = <T>(value: T[]): T[] => [...value];