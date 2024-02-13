import { toHex } from "@/util";
import * as cm from "./colormanagement";
import { settings } from "@/components/store";

export const colorCss = (color: cm.Col) => {
  const srgb = settings.deviceSpace.from(color);
  return `#${srgb.map(toHex).join("")}`;
};