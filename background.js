// Initialize
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["vocabs"], (result) => {
    if (!result.vocabs) {
      chrome.storage.local.set({ vocabs: [] });
    }
  });
});

// Context menu (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveSelection",
    title: "Save to Vocab Master",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveSelection" && info.selectionText) {
    // Auto-save selected text
    chrome.storage.local.get(["vocabs"], (result) => {
      const vocabs = result.vocabs || [];
      vocabs.push({
        english: info.selectionText,
        translation: "",
        source: "web",
        domain: new URL(tab.url).hostname,
        date: new Date().toISOString(),
        tags: [],
      });
      chrome.storage.local.set({ vocabs: vocabs });

      // Show notification
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Vocabulary Saved",
        message: `"${info.selectionText.substring(0, 50)}..." saved!`,
      });
    });
  }
});
