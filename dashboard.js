// Dashboard Manager dengan PDF Export yang berfungsi
class DashboardManager {
  constructor() {
    this.allVocabs = [];
    this.currentEditIndex = -1;
    this.initialize();
  }

  async initialize() {
    await this.loadVocabularies();
    this.setupEventListeners();
    this.renderDashboard();
  }

  async loadVocabularies() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(["vocabs"], resolve);
      });

      this.allVocabs = result.vocabs || [];
      console.log("Loaded vocabularies:", this.allVocabs.length);
    } catch (error) {
      console.error("Error loading vocabularies:", error);
      this.showNotification("Error loading vocabulary data", "error");
    }
  }

  setupEventListeners() {
    // Search functionality
    const searchBox = document.getElementById("searchBox");
    if (searchBox) {
      searchBox.addEventListener("input", (e) => {
        this.filterVocabularies(e.target.value);
      });
    }

    // Export PDF button - PERBAIKAN DI SINI
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportToPDF());
    }

    // Clear all button
    const clearAllBtn = document.getElementById("clearAllBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => this.clearAllData());
    }

    // Add new button
    const addNewBtn = document.getElementById("addNewBtn");
    if (addNewBtn) {
      addNewBtn.addEventListener("click", () => this.openAddModal());
    }

    const addFirstBtn = document.getElementById("addFirstBtn");
    if (addFirstBtn) {
      addFirstBtn.addEventListener("click", () => this.openAddModal());
    }

    // Modal buttons
    const cancelEdit = document.getElementById("cancelEdit");
    if (cancelEdit) {
      cancelEdit.addEventListener("click", () => this.closeEditModal());
    }

    const saveEdit = document.getElementById("saveEdit");
    if (saveEdit) {
      saveEdit.addEventListener("click", () => this.saveEdit());
    }

    // Table event delegation
    const tableBody = document.getElementById("vocabTableBody");
    if (tableBody) {
      tableBody.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".edit-btn");
        const deleteBtn = e.target.closest(".delete-btn");

        if (editBtn) {
          const index = parseInt(editBtn.getAttribute("data-index"), 10);
          this.editVocabulary(index);
        } else if (deleteBtn) {
          const index = parseInt(deleteBtn.getAttribute("data-index"), 10);
          this.deleteVocabulary(index);
        }
      });
    }
  }

  // PDF Export
  async exportToPDF() {
    if (this.allVocabs.length === 0) {
      this.showNotification("No vocabulary to export", "error");
      return;
    }

    // Buat window baru untuk printing
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      this.showNotification("Please allow pop-ups for PDF export", "error");
      return;
    }

    // Generate HTML untuk print
    const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Vocabulary Export</title>
      <style>
        body { font-family: Arial; margin: 20px; }
        @media print {
          @page { margin: 15mm; size: A4; }
          .no-print { display: none; }
        }
        table { width: 100%; border-collapse: collapse; }
        th { background: #3B82F6; color: white; padding: 10px; }
        td { padding: 8px; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <h2>Vocabulary Master Export</h2>
      <p>${new Date().toLocaleDateString()}</p>
      
      <table>
        <thead>
          <tr>
            <th>English</th>
            <th>Translation</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${this.allVocabs
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
      
      <div class="no-print" style="margin-top: 30px; padding: 15px; background: #f0f0f0;">
        <p><strong>To save as PDF:</strong></p>
        <p>1. Press <strong>Ctrl+P</strong> (Windows) or <strong>Cmd+P</strong> (Mac)</p>
        <p>2. Choose "Save as PDF" as printer destination</p>
        <p>3. Click "Save"</p>
        <button onclick="window.print()" style="
          background: #3B82F6;
          color: white;
          border: none;
          padding: 10px 20px;
          margin-top: 10px;
          cursor: pointer;
        ">
          🖨️ Print / Save as PDF
        </button>
        <button onclick="window.close()" style="
          background: #666;
          color: white;
          border: none;
          padding: 10px 20px;
          margin-top: 10px;
          cursor: pointer;
          margin-left: 10px;
        ">
          Close
        </button>
      </div>
      
      <script>
        // Auto-trigger print dialog
        window.onload = function() {
          setTimeout(() => {
            try {
              window.print();
            } catch (e) {
              console.log('Print requires user interaction');
            }
          }, 500);
        };
        
        // Close window after print
        window.onafterprint = function() {
          setTimeout(() => {
            window.close();
          }, 1000);
        };
      </script>
    </body>
    </html>
  `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    this.showNotification("Opening print dialog...", "info");
  }

  // Helper function to truncate text
  truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }

  // ============ OTHER FUNCTIONS (tetap sama) ============

  renderDashboard() {
    this.updateStats();
    this.renderTable();
  }

  updateStats() {
    const total = this.allVocabs.length;
    const translated = this.allVocabs.filter(
      (v) => v.translation && v.translation.trim()
    ).length;
    const manual = this.allVocabs.filter((v) => v.source === "manual").length;
    const web = this.allVocabs.filter((v) => v.source !== "manual").length;

    document.getElementById("totalVocabs").textContent = total;
    document.getElementById("translatedCount").textContent = translated;
    document.getElementById("manualCount").textContent = manual;
    document.getElementById("webCount").textContent = web;
  }

  renderTable() {
    const tableBody = document.getElementById("vocabTableBody");
    const emptyState = document.getElementById("emptyState");

    if (this.allVocabs.length === 0) {
      tableBody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    const sortedVocabs = [...this.allVocabs].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    tableBody.innerHTML = sortedVocabs
      .map((vocab, index) => {
        const originalIndex = this.allVocabs.findIndex((v) => v === vocab);
        return this.createTableRow(vocab, originalIndex);
      })
      .join("");
  }

  createTableRow(vocab, index) {
    const english = this.escapeHTML(vocab.english || "");
    const translation = vocab.translation
      ? this.escapeHTML(vocab.translation)
      : "No translation";
    const source =
      vocab.source === "manual" ? "📝 Manual" : `🌐 ${vocab.domain || "Web"}`;
    const sourceClass =
      vocab.source === "manual" ? "badge-manual" : "badge-web";
    const date = new Date(vocab.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const tagsHtml =
      vocab.tags && vocab.tags.length > 0
        ? `<div class="tag-container">${vocab.tags
            .map((tag) => `<span class="tag">${this.escapeHTML(tag)}</span>`)
            .join("")}</div>`
        : "";

    return `
      <tr data-index="${index}">
        <td>
          <div class="vocab-text">${english}</div>
          ${
            vocab.notes
              ? `<div style="color: #6b7280; font-size: 12px; margin-top: 5px;">${this.escapeHTML(
                  vocab.notes
                )}</div>`
              : ""
          }
        </td>
        <td>
          <div class="vocab-translation">${translation}</div>
          ${tagsHtml}
        </td>
        <td>
          <div class="vocab-source">
            <span class="badge ${sourceClass}">${source}</span>
          </div>
        </td>
        <td>
          <div style="color: #6b7280; font-size: 13px;">${date}</div>
          <div style="color: #9ca3af; font-size: 12px;">
            ${new Date(vocab.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-btn edit-btn" data-index="${index}">
              ✏️ Edit
            </button>
            <button class="action-btn delete-btn" data-index="${index}">
              🗑️ Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  filterVocabularies(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();

    if (!searchTerm) {
      this.renderTable();
      return;
    }

    const filtered = this.allVocabs.filter(
      (vocab) =>
        (vocab.english && vocab.english.toLowerCase().includes(searchTerm)) ||
        (vocab.translation &&
          vocab.translation.toLowerCase().includes(searchTerm)) ||
        (vocab.notes && vocab.notes.toLowerCase().includes(searchTerm)) ||
        (vocab.tags &&
          vocab.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
    );

    const tableBody = document.getElementById("vocabTableBody");
    const emptyState = document.getElementById("emptyState");

    if (filtered.length === 0) {
      tableBody.innerHTML = "";
      if (emptyState) {
        emptyState.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
          <h3>No Results Found</h3>
          <p>No vocabulary matches "${searchTerm}"</p>
        `;
        emptyState.style.display = "block";
      }
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    tableBody.innerHTML = filtered
      .map((vocab, index) => {
        const originalIndex = this.allVocabs.findIndex((v) => v === vocab);
        return this.createTableRow(vocab, originalIndex);
      })
      .join("");
  }

  editVocabulary(index) {
    if (index < 0 || index >= this.allVocabs.length) {
      this.showNotification("Invalid vocabulary index", "error");
      return;
    }

    const vocab = this.allVocabs[index];
    this.currentEditIndex = index;

    document.getElementById("editEnglish").value = vocab.english || "";
    document.getElementById("editTranslation").value = vocab.translation || "";
    document.getElementById("editNotes").value = vocab.notes || "";
    document.getElementById("editTags").value = vocab.tags
      ? vocab.tags.join(", ")
      : "";

    document.getElementById("editModal").style.display = "flex";
  }

  async deleteVocabulary(index) {
    if (index < 0 || index >= this.allVocabs.length) {
      this.showNotification("Invalid vocabulary index", "error");
      return;
    }

    const vocab = this.allVocabs[index];
    const textPreview =
      vocab.english.length > 50
        ? vocab.english.substring(0, 50) + "..."
        : vocab.english;

    if (
      !confirm(
        `Delete this vocabulary?\n\n"${textPreview}"\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      this.allVocabs.splice(index, 1);
      await this.saveVocabularies();
      this.renderDashboard();
      this.showNotification("Vocabulary deleted successfully", "success");
    } catch (error) {
      console.error("Delete error:", error);
      this.showNotification("Error deleting vocabulary", "error");
    }
  }

  async saveEdit() {
    if (this.currentEditIndex === -1) return;

    const english = document.getElementById("editEnglish").value.trim();
    if (!english) {
      this.showNotification("English text is required", "error");
      return;
    }

    try {
      this.allVocabs[this.currentEditIndex] = {
        ...this.allVocabs[this.currentEditIndex],
        english: english,
        translation: document.getElementById("editTranslation").value.trim(),
        notes: document.getElementById("editNotes").value.trim(),
        tags: document
          .getElementById("editTags")
          .value.split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        date: new Date().toISOString(),
      };

      await this.saveVocabularies();
      this.closeEditModal();
      this.renderDashboard();
      this.showNotification("Vocabulary updated successfully", "success");
    } catch (error) {
      console.error("Save edit error:", error);
      this.showNotification("Error updating vocabulary", "error");
    }
  }

  closeEditModal() {
    document.getElementById("editModal").style.display = "none";
    this.currentEditIndex = -1;
  }

  openAddModal() {
    alert(
      "To add new vocabulary, please use the extension popup by clicking the extension icon in your browser toolbar."
    );
  }

  async saveVocabularies() {
    try {
      await new Promise((resolve) => {
        chrome.storage.local.set({ vocabs: this.allVocabs }, resolve);
      });
    } catch (error) {
      console.error("Error saving vocabularies:", error);
    }
  }

  async clearAllData() {
    if (
      !confirm(
        "Are you sure you want to delete ALL vocabulary data?\n\nThis action cannot be undone!"
      )
    ) {
      return;
    }

    try {
      this.allVocabs = [];
      await this.saveVocabularies();
      this.renderDashboard();
      this.showNotification("All vocabulary data cleared", "success");
    } catch (error) {
      console.error("Clear error:", error);
      this.showNotification("Error clearing data", "error");
    }
  }

  showNotification(message, type = "success") {
    const existing = document.querySelectorAll(".notification");
    existing.forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span style="font-size: 18px;">${type === "success" ? "✅" : "❌"}</span>
      <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new DashboardManager();
  window.dashboard = dashboard;
});
