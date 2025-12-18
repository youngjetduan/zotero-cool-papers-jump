const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const strings = {
  "en-US": { openInCoolPapers: "Open in Cool Papers" },
  "zh-CN": { openInCoolPapers: "在 Cool Papers 中打开" }
};

let menuItem;

function startup({ id, version, resourceURI, rootURI }, reason) {
  // 等待 Zotero 初始化完成
  let win = Services.wm.getMostRecentWindow("navigator:browser");
  if (!win || !win.ZoteroPane) {
    Services.ww.registerNotification({
      observe: function (aSubject, aTopic) {
        if (aTopic === "domwindowopened") {
          aSubject.addEventListener("load", function () {
            if (aSubject.ZoteroPane) init(aSubject);
          });
        }
      }
    });
  } else {
    init(win);
  }
}

function getLocaleString(key) {
  const lang  = Zotero.locale || "en-US";
  return strings[lang]?.[key] ?? strings["en-US"][key] ?? "Open in Cool Papers";
}

function init(win) {
  let doc = win.document;
  let menupopup = doc.getElementById("zotero-itemmenu");
  if (!menupopup) return;

  // 监听“即将弹出”
  menupopup.addEventListener("popupshowing", () => {
    // 先清理上一次自己插入的（避免重复）
    let oldSep  = doc.getElementById("coolpapers-sep");
    let oldItem = doc.getElementById("coolpapers-jump");
    oldSep?.remove();
    oldItem?.remove();

    // 分割线
    let sep = doc.createXULElement("menuseparator");
    sep.setAttribute("id", "coolpapers-sep");
    menupopup.insertBefore(sep, menupopup.firstChild);

    // 菜单项
    let menuItem = doc.createXULElement("menuitem");
    menuItem.setAttribute("id", "coolpapers-jump");
    menuItem.setAttribute("label", getLocaleString("openInCoolPapers"));
    menuItem.addEventListener("command", () => jump(win));
    menupopup.insertBefore(menuItem, sep);
  });
}

function jump(win) {
  let url = "https://papers.cool/arxiv/";
  let items = win.ZoteroPane.getSelectedItems();
  if (!items.length) return;
  let item = items[0];
  
  // 优先用 arXiv ID
  let query = item.getField('extra')
             .split('\n')
             .find(l => l.startsWith('arXiv:'))
             ?.replace('arXiv:', '')
             .trim()
             .replace(/\s*\[.*?\]$/, '');
  if (query) {
    url = url + query;
    win.Zotero.launchURL(url);
    return;
  }
  
  // 用标题，没有则用文件名
  query = item.getField("title") || item.getDisplayTitle();
  if (!query) return;
  url = url + `search?highlight=1&query=${encodeURIComponent(query)}`;
  win.Zotero.launchURL(url);
}

function shutdown() {
  if (menuItem) menuItem.remove();
}
