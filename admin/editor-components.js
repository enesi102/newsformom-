/* NewsForMom custom editor component.
   "Paste image" accepts an image copied to the clipboard (Ctrl/Cmd+V).
   Because Decap's documented custom-component API does not expose a stable
   upload-to-media-library API, pasted images are temporarily serialized as
   data URLs. The build script extracts them into /media/news automatically.
*/
(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  CMS.registerEditorComponent({
    id: "article-image",
    label: "Image + caption",
    fields: [
      {
        name: "image",
        label: "Upload image",
        widget: "image",
        choose_url: false,
        required: false,
        media_folder: "/media/news",
        public_folder: "/media/news"
      },
      {
        name: "paste_image",
        label: "Paste image",
        widget: "string",
        required: false,
        hint: "Click this field, then press Ctrl+V / Cmd+V. It accepts an image copied to the clipboard."
      },
      {
        name: "caption",
        label: "Descriere imagine",
        widget: "string",
        required: false
      }
    ],

    pattern: /^<figure class="article-image">\s*<img src="([^"]+)" alt="([^"]*)">\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>$/m,

    fromBlock: function (match) {
      return {
        image: match[1],
        paste_image: "",
        caption: match[3]
      };
    },

    toBlock: function (data) {
      var image = data.paste_image || data.image;
      if (!image) return "";
      var caption = escapeHtml(data.caption || "");
      return [
        '<figure class="article-image">',
        '<img src="' + escapeHtml(image) + '" alt="' + caption + '">',
        '<figcaption>' + caption + '</figcaption>',
        '</figure>'
      ].join("\n");
    },

    toPreview: function (data) {
      var image = data.paste_image || data.image;
      if (!image) return "<p>Alege sau lipește o imagine.</p>";
      return [
        '<figure style="margin:0">',
        '<img src="' + escapeHtml(image) + '" style="max-width:100%;border-radius:12px">',
        '<figcaption style="font-size:.85em;font-style:italic;color:#68736d">',
        escapeHtml(data.caption || ""),
        '</figcaption></figure>'
      ].join("");
    }
  });

  // Turn the custom "Paste image" text field into a clipboard-image receiver.
  // This is intentionally small and dependency-free.
  document.addEventListener("paste", function (event) {
    var items = event.clipboardData && event.clipboardData.items;
    if (!items) return;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.type || item.type.indexOf("image/") !== 0) continue;

      var file = item.getAsFile();
      if (!file) continue;

      event.preventDefault();

      var reader = new FileReader();
      reader.onload = function () {
        var active = document.activeElement;
        if (!active || active.tagName !== "INPUT") return;

        // The field is the paste-image field. Insert the data URL as its value.
        active.value = reader.result;
        active.dispatchEvent(new Event("input", { bubbles: true }));
        active.dispatchEvent(new Event("change", { bubbles: true }));
      };
      reader.readAsDataURL(file);
      break;
    }
  });
})();
