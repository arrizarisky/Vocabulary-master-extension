// DOM Elements
const englishText = document.getElementById("englishText");
const translation = document.getElementById("translation");
const notes = document.getElementById("notes");
const tags = document.getElementById("tags");
const saveManualBtn = document.getElementById("saveManual");
const saveCurrentBtn = document.getElementById("saveCurrent");
const recentList = document.getElementById("recentList");
const allVocabList = document.getElementById("allVocabList");
const searchVocab = document.getElementById("searchVocab");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const openFullViewBtn = document.getElementById("openFullView");
const totalCount = document.getElementById("totalCount");
const tabs = document.querySelectorAll(".tab");

// Tab switching
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    // Remove active class from all tabs
    tabs.forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));

    // Add active class to clicked tab
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add("active");

    // Load content based on tab
    if (tab.dataset.tab === "view") {
      loadAllVocabs();
    } else if (tab.dataset.tab === "manage") {
      updateStats();
    }
  });
});

// Load recent vocabs on startup
loadRecentVocabs();

// Save manual vocabulary
saveManualBtn.addEventListener("click", async () => {
  const english = englishText.value.trim();
  if (!english) {
    showNotification("Please enter English text!", "error");
    return;
  }

  try {
    // Auto-translate if translation is empty
    let translated = translation.value.trim();
    if (!translated) {
      translated = await translateText(english);
    }

    const vocab = {
      english: english,
      translation: translated,
      notes: notes.value.trim(),
      tags: tags.value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
      date: new Date().toISOString(),
      source: "manual",
      domain: "manual",
    };

    // Save to storage
    const result = await chrome.storage.local.get(["vocabs"]);
    const vocabs = result.vocabs || [];
    vocabs.push(vocab);

    await chrome.storage.local.set({ vocabs: vocabs });

    // Show success
    showNotification("Vocabulary saved successfully!");

    // Clear form
    englishText.value = "";
    translation.value = "";
    notes.value = "";
    tags.value = "";

    // Refresh lists
    loadRecentVocabs();
    updateStats();
  } catch (error) {
    console.error("Error saving vocabulary:", error);
    showNotification("Error saving vocabulary!", "error");
  }
});

// Save from current page
saveCurrentBtn.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Inject script to get selected text
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          return window.getSelection().toString().trim();
        },
      },
      async (results) => {
        if (results && results[0] && results[0].result) {
          const selectedText = results[0].result;

          if (selectedText.length < 3) {
            showNotification("Please select more text!", "error");
            return;
          }

          // Populate form with selected text
          englishText.value = selectedText;

          // Auto-translate
          const translated = await translateText(selectedText);
          translation.value = translated;

          // Auto-fill tags based on domain
          const url = new URL(tab.url);
          const domain = url.hostname;
          const domainTags = getTagsFromDomain(domain);
          tags.value = domainTags.join(", ");

          // Focus on translation field
          translation.focus();

          showNotification("Text loaded from page! Fill translation and save.");
        } else {
          showNotification("Please select text on the page first!", "error");
        }
      }
    );
  } catch (error) {
    console.error("Error:", error);
    showNotification("Error accessing page content", "error");
  }
});

// Search functionality
searchVocab.addEventListener("input", async (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const result = await chrome.storage.local.get(["vocabs"]);
  const vocabs = result.vocabs || [];

  if (!searchTerm) {
    loadAllVocabs();
    return;
  }

  const filtered = vocabs.filter(
    (v) =>
      v.english.toLowerCase().includes(searchTerm) ||
      v.translation.toLowerCase().includes(searchTerm) ||
      (v.tags && v.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
  );

  displayVocabs(filtered, allVocabList);
});

// Export to PDF
exportBtn.addEventListener("click", async function () {
  const result = await chrome.storage.local.get(["vocabs"]);
  const vocabs = result.vocabs || [];

  if (vocabs.length === 0) {
    showNotification("No vocabulary to export!", "error");
    return;
  }

  try {
    // Generate PDF content
    const pdfContent = await createPDFDocument(vocabs);

    // Create download
    const blob = new Blob([pdfContent], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocabulary-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification("Vocabulary exported to PDF successfully!");
  } catch (error) {
    console.error("PDF export error:", error);
    showNotification("Error exporting to PDF", "error");
  }
});

// Create PDF Document
function createPDFDocument(vocabs) {
  const htmlContent = createPDFHTML(vocabs);
  const printWindow = window.open("", "_blank");
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.print();

  // Return placeholder (actual implementation would generate PDF)
  return new Blob(["PDF content would be generated here"], {
    type: "application/pdf",
  });
}

// Create HTML for PDF
function createPDFHTML(vocabs) {
  const date = new Date().toLocaleDateString();
  const total = vocabs.length;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @page { margin: 20mm; }
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          border-bottom: 2px solid #3B82F6;
          padding-bottom: 20px;
        }
        .header h1 { 
          color: #3B82F6; 
          margin: 0;
        }
        .header p { 
          color: #666; 
          margin: 5px 0;
        }
        .stats {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          display: flex;
          justify-content: space-around;
          text-align: center;
        }
        .stat-item {
          flex: 1;
        }
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #3B82F6;
          display: block;
        }
        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .vocab-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .vocab-table th {
          background: #3B82F6;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        .vocab-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .vocab-table tr:nth-child(even) {
          background: #f9fafb;
        }
        .vocab-text {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .vocab-translation {
          color: #059669;
          font-style: italic;
        }
        .tags {
          margin-top: 5px;
        }
        .tag {
          display: inline-block;
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          margin-right: 5px;
          margin-bottom: 3px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
        .page-break {
          page-break-after: always;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📚 Vocabulary Master Export</h1>
        <p>Generated on ${date}</p>
        <p>Total Vocabulary Items: ${total}</p>
      </div>
      
      <div class="stats">
        <div class="stat-item">
          <span class="stat-number">${total}</span>
          <span class="stat-label">Total Items</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${
            vocabs.filter((v) => v.translation).length
          }</span>
          <span class="stat-label">Translated</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${
            new Set(vocabs.map((v) => v.domain)).size
          }</span>
          <span class="stat-label">Sources</span>
        </div>
      </div>
      
      <table class="vocab-table">
        <thead>
          <tr>
            <th style="width: 40%;">English Text</th>
            <th style="width: 40%;">Translation</th>
            <th style="width: 20%;">Details</th>
          </tr>
        </thead>
        <tbody>
          ${vocabs
            .map(
              (vocab, index) => `
            <tr>
              <td>
                <div class="vocab-text">${escapeHtmlForPDF(
                  vocab.english || ""
                )}</div>
                ${
                  vocab.notes
                    ? `<div style="font-size: 11px; color: #666; margin-top: 3px;">${escapeHtmlForPDF(
                        vocab.notes
                      )}</div>`
                    : ""
                }
              </td>
              <td>
                <div class="vocab-translation">${
                  vocab.translation
                    ? escapeHtmlForPDF(vocab.translation)
                    : "Not translated"
                }</div>
              </td>
              <td>
                <div style="font-size: 12px; color: #666;">
                  <div>${new Date(vocab.date).toLocaleDateString()}</div>
                  <div style="margin-top: 5px;">${
                    vocab.source === "manual" ? "📝 Manual" : "🌐 Web"
                  }</div>
                  ${
                    vocab.tags && vocab.tags.length > 0
                      ? `
                    <div class="tags">
                      ${vocab.tags
                        .map(
                          (tag) =>
                            `<span class="tag">${escapeHtmlForPDF(tag)}</span>`
                        )
                        .join("")}
                    </div>
                  `
                      : ""
                  }
                </div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated by Vocabulary Master Chrome Extension</p>
        <p>vocabmaster.com • ${date}</p>
      </div>
      
      <button class="no-print" onclick="window.print()" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #3B82F6;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
      ">
        🖨️ Print PDF
      </button>
    </body>
    </html>
  `;
}

function escapeHtmlForPDF(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Import from CSV
importBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,.txt";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = parseCSV(text);

      const result = await chrome.storage.local.get(["vocabs"]);
      const vocabs = result.vocabs || [];

      // Merge imported data
      const merged = [...vocabs, ...imported];
      await chrome.storage.local.set({ vocabs: merged });

      showNotification(`Imported ${imported.length} vocabulary items!`);
      loadRecentVocabs();
      updateStats();
    } catch (error) {
      console.error("Import error:", error);
      showNotification("Error importing CSV!", "error");
    }
  };
  input.click();
});

// Clear all data
clearAllBtn.addEventListener("click", () => {
  if (confirm("Are you sure? This will delete ALL vocabulary data!")) {
    chrome.storage.local.set({ vocabs: [] }, () => {
      showNotification("All data cleared!");
      loadRecentVocabs();
      updateStats();
    });
  }
});

// Open full dashboard
openFullViewBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "dashboard.html" });
});

// Helper Functions
async function loadRecentVocabs() {
  const result = await chrome.storage.local.get(["vocabs"]);
  const vocabs = result.vocabs || [];

  // Show last 5 items
  const recent = vocabs.slice(-5).reverse();
  displayVocabs(recent, recentList, true);
}

async function loadAllVocabs() {
  const result = await chrome.storage.local.get(["vocabs"]);
  const vocabs = result.vocabs || [];
  displayVocabs(vocabs, allVocabList);
}

function displayVocabs(vocabs, container, isRecent = false) {
  if (vocabs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${
          isRecent ? "No vocabulary yet. Start adding!" : "No vocabulary found."
        }
      </div>
    `;
    return;
  }

  container.innerHTML = vocabs
    .map(
      (v, index) => `
    <div class="vocab-item">
      <div class="vocab-text">${escapeHtml(truncateText(v.english, 60))}</div>
      ${
        v.translation
          ? `<div class="vocab-translation">${escapeHtml(
              truncateText(v.translation, 50)
            )}</div>`
          : ""
      }
      <div class="vocab-meta">
        <span>${v.source === "manual" ? "📝 Manual" : "🌐 Web"}</span>
        <span>${formatDate(v.date)}</span>
      </div>
      ${
        v.tags && v.tags.length > 0
          ? `
        <div style="margin-top: 5px; font-size: 11px;">
          ${v.tags
            .map(
              (tag) =>
                `<span style="background: #e5e7eb; padding: 2px 6px; border-radius: 10px; margin-right: 3px;">${tag}</span>`
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  `
    )
    .join("");
}

async function updateStats() {
  const result = await chrome.storage.local.get(["vocabs"]);
  const vocabs = result.vocabs || [];
  totalCount.textContent = vocabs.length;
}

function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  notification.style.background = type === "error" ? "#EF4444" : "#10B981";

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

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

function getTagsFromDomain(domain) {
  const tags = [];

  if (domain.includes("news") || domain.includes("article")) tags.push("news");
  if (domain.includes("tech") || domain.includes("github"))
    tags.push("technology");
  if (domain.includes("business") || domain.includes("forbes"))
    tags.push("business");
  if (domain.includes("youtube") || domain.includes("video"))
    tags.push("entertainment");
  if (domain.includes("reddit") || domain.includes("forum"))
    tags.push("social");
  if (domain.includes("academic") || domain.includes("edu"))
    tags.push("academic");

  return tags.length > 0 ? tags : ["web"];
}

function convertToCSV(vocabs) {
  const headers = ["English", "Translation", "Notes", "Tags", "Source", "Date"];
  const rows = vocabs.map((v) => [
    v.english,
    v.translation || "",
    v.notes || "",
    v.tags ? v.tags.join(", ") : "",
    v.source,
    v.date,
  ]);

  return [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

function parseCSV(csvText) {
  const lines = csvText.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

  return lines.slice(1).map((line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);

    const obj = {};
    headers.forEach((header, index) => {
      obj[header.toLowerCase()] = values[index]
        ? values[index].replace(/"/g, "").trim()
        : "";
    });

    return {
      english: obj.english || "",
      translation: obj.translation || "",
      notes: obj.notes || "",
      tags: obj.tags ? obj.tags.split(",").map((t) => t.trim()) : [],
      source: obj.source || "import",
      date: obj.date || new Date().toISOString(),
      domain: "import",
    };
  });
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Function to be injected
function getSelectedText() {
  return window.getSelection().toString().trim();
}
