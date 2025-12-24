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
      // Use chrome storage API
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

  async saveVocabularies() {
    try {
      await new Promise((resolve) => {
        chrome.storage.local.set({ vocabs: this.allVocabs }, resolve);
      });
    } catch (error) {
      console.error("Error saving vocabularies:", error);
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

    // Export button
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportToCSV());
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

    // Sort by date (newest first)
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
    const english = this.escapeHtml(vocab.english);
    const translation = vocab.translation
      ? this.escapeHtml(vocab.translation)
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
            .map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`)
            .join("")}</div>`
        : "";

    return `
      <tr data-index="${index}">
        <td>
          <div class="vocab-text">${english}</div>
          ${
            vocab.notes
              ? `<div style="color: #6b7280; font-size: 12px; margin-top: 5px;">${this.escapeHtml(
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
                <button class="action-btn edit-btn" data-index="${index}">✏️ Edit</button>
                <button class="action-btn delete-btn" data-index="${index}">🗑️ Delete</button>
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
        vocab.english.toLowerCase().includes(searchTerm) ||
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

  // EDIT FUNCTION
  editVocabulary(index) {
    if (index < 0 || index >= this.allVocabs.length) {
      this.showNotification("Invalid vocabulary index", "error");
      return;
    }

    const vocab = this.allVocabs[index];
    this.currentEditIndex = index;

    // Fill modal with current data
    document.getElementById("editEnglish").value = vocab.english || "";
    document.getElementById("editTranslation").value = vocab.translation || "";
    document.getElementById("editNotes").value = vocab.notes || "";
    document.getElementById("editTags").value = vocab.tags
      ? vocab.tags.join(", ")
      : "";

    // Show modal
    document.getElementById("editModal").style.display = "flex";
  }

  // DELETE FUNCTION
  async deleteVocabulary(index) {
    if (index < 0 || index >= this.allVocabs.length) {
      this.showNotification("Invalid vocabulary index", "error");
      return;
    }

    const vocab = this.allVocabs[index];
    const confirmDelete = confirm(
      `Delete this vocabulary?\n\nEnglish: ${vocab.english.substring(
        0,
        50
      )}...\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    // Remove from array
    this.allVocabs.splice(index, 1);

    // Save to storage
    await this.saveVocabularies();

    // Update UI
    this.renderDashboard();
    this.showNotification("Vocabulary deleted successfully", "success");
  }

  async saveEdit() {
    if (this.currentEditIndex === -1) return;

    const english = document.getElementById("editEnglish").value.trim();
    if (!english) {
      this.showNotification("English text is required", "error");
      return;
    }

    // Update vocabulary
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
      date: new Date().toISOString(), // Update timestamp
    };

    // Save to storage
    await this.saveVocabularies();

    // Close modal and update UI
    this.closeEditModal();
    this.renderDashboard();
    this.showNotification("Vocabulary updated successfully", "success");
  }

  closeEditModal() {
    document.getElementById("editModal").style.display = "none";
    this.currentEditIndex = -1;
  }

  openAddModal() {
    // For now, redirect to popup or show simple add form
    // In a real implementation, you would open a modal
    alert(
      "To add new vocabulary, please use the extension popup by clicking the extension icon in your browser toolbar."
    );
  }

  async exportToCSV() {
    if (this.allVocabs.length === 0) {
      this.showNotification("No vocabulary to export", "error");
      return;
    }

    try {
      const headers = [
        "English",
        "Translation",
        "Notes",
        "Tags",
        "Source",
        "Domain",
        "Date",
      ];
      const rows = this.allVocabs.map((v) => [
        v.english,
        v.translation || "",
        v.notes || "",
        v.tags ? v.tags.join(", ") : "",
        v.source,
        v.domain || "",
        v.date,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      // Create download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vocabulary-export-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.showNotification("Vocabulary exported successfully", "success");
    } catch (error) {
      console.error("Export error:", error);
      this.showNotification("Error exporting vocabulary", "error");
    }
  }

  async clearAllData() {
    const confirmClear = confirm(
      "Are you sure you want to delete ALL vocabulary data?\n\nThis action cannot be undone!"
    );

    if (!confirmClear) return;

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
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((n) => n.remove());

    // Create new notification
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span style="font-size: 18px;">${type === "success" ? "✅" : "❌"}</span>
      <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize dashboard when page loads
let dashboard;

document.addEventListener("DOMContentLoaded", () => {
  dashboard = new DashboardManager();

  // Make dashboard instance available globally for onclick handlers
  window.dashboard = dashboard;
});
