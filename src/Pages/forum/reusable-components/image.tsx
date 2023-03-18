import { Image } from "@tiptap/extension-image";

export const MyImage = Image.extend({
  addAttributes() {
    return {
      ...Image.options,
      sizes: {
        default: null,
        parseHTML: (element) => ({
          size: element.getAttribute("data-size")
        }),
        renderHTML: ({ size }) => {
          if (!size) {
            return {};
          }
          return {
            "data-size": size
          };
        }
      }
    };
  },
});