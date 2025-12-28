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
        iconUrl: "icons/icon.png",
        title: "Vocabulary Saved",
        message: `"${info.selectionText.substring(0, 50)}..." saved!`,
      });
    });
    saveSelectedText(info.selectionText, tab);
  }
});

// Function to save selected text
async function saveSelectedText(selectedText, tab) {
  try {
    // Get existing vocabulary
    const result = await chrome.storage.local.get(["vocabs"]);
    const vocabs = result.vocabs || [];

    // Auto-translate (optional)
    let translation = "";
    try {
      translation = await translateText(selectedText);
    } catch (e) {
      console.log("Translation failed, continuing without it");
    }

    // Create vocabulary object
    const vocab = {
      english: selectedText.trim(),
      translation: translation,
      source: tab.url,
      domain: new URL(tab.url).hostname,
      date: new Date().toISOString(),
      tags: [],
      notes: "",
      sourceType: "context-menu",
    };

    // Save to storage
    vocabs.push(vocab);
    await chrome.storage.local.set({ vocabs: vocabs });

    // Show notification
    showSuccessNotification(selectedText);
  } catch (error) {
    console.error("Error saving from context menu:", error);
    showErrorNotification();
  }
}

// Translation function
async function translateText(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const response = await fetch(url);
    const data = await response.json();
    return data[0][0][0];
  } catch (error) {
    console.error("Translation error:", error);
    return "";
  }
}

// Show success notification
function showSuccessNotification(text) {
  // Create notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "✅ Vocabulary Saved!",
    message: `"${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
    priority: 1,
  });
}

// Show error notification
function showErrorNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "❌ Error Saving",
    message: "Failed to save vocabulary. Please try again.",
    priority: 2,
  });
}

// Handle PDF export message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "exportToPDF":
      chrome.storage.local.get(["vocabs"], (result) => {
        const vocabs = result.vocabs || [];

        // Generate PDF content
        const pdfContent = generatePDFContent(vocabs);
        sendResponse({ success: true, pdf: pdfContent });
      });
      return true;
  }
});

// Generate PDF content (simplified)
function generatePDFContent(vocabs) {
  // Create HTML for printing
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #3B82F6; color: white; padding: 10px; }
          td { padding: 10px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Vocabulary Export</h1>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>English</th>
              <th>Translation</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${vocabs
              .map(
                (v) => `
              <tr>
                <td>${v.english || ""}</td>
                <td>${v.translation || ""}</td>
                <td>${new Date(v.date).toLocaleDateString()}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Return HTML for printing
  return html;
}
