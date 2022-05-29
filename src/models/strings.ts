import * as marked from "marked";

export default (key: keyof typeof strings) => marked.parseInline(key);

const strings = {

};