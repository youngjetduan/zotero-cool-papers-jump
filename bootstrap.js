const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const strings = {
  "en-US": { openInCoolPapers: "Open in Cool Papers" },
  "zh-CN": { openInCoolPapers: "在 Cool Papers 中打开" }
};

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

  const onKeyPress = (event) => {
    // 检测 Cmd/Ctrl + G
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      event.stopPropagation();
      jump(win);
      return false;
    }
  };
  
  doc.addEventListener('keydown', onKeyPress, true);
  
  win.__coolpapers_f = onKeyPress;

  /* 菜单项 */
  let menupopup = doc.getElementById("zotero-itemmenu");
  if (!menupopup) return;

  /* 分割线 */
  const sep = doc.createXULElement("menuseparator");
  sep.setAttribute("id", "coolpapers-sep");
  menupopup.appendChild(sep);

  /* 菜单项 */
  const menuItem = doc.createXULElement("menuitem");
  menuItem.setAttribute("id", "coolpapers-jump");
  menuItem.setAttribute("label", getLocaleString("openInCoolPapers"));
  menuItem.addEventListener("command", () => jump(win));
  menupopup.appendChild(menuItem);

  /* 保存引用，shutdown 用 */
  win.__coolpapars_sep      = sep;
  win.__coolpapers_menuItem = menuItem;
}

function openurl(win, url) {
  if (Zotero.openInViewer) {
    Zotero.openInViewer(url);
  } else {
    win.Zotero.launchURL(url);   // 老版本仍走系统浏览器
  }
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
    openurl(win, url);
    return;
  }
  
  // 用标题，没有则用文件名
  query = item.getField("title") || item.getDisplayTitle();
  if (!query) return;
  url = url + `search?highlight=1&query=${encodeURIComponent(query)}`;
  openurl(win, url);
}

function shutdown() {
  const win = Services.wm.getMostRecentWindow("navigator:browser");
  if (!win || !win.ZoteroPane) return;  
  
  /* 卸载键盘监听器（F 键） */
  if (win.__coolpapers_f) {
    win.document.removeEventListener('keydown', win.__coolpapers_f, true);

    delete win.__coolpapers_f;
  }

  /* 卸载菜单项 */
  if (win.__coolpapars_sep) {
    win.__coolpapars_sep.remove();
    win.__coolpapers_menuItem.remove();

    delete win.__coolpapars_sep;
    delete win.__coolpapers_menuItem;
  }
}
