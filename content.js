// ============================================
// VOCAB MASTER - CONTENT SCRIPT
// ============================================

// Inject CSS styles
const style = document.createElement("style");
style.textContent = `
  .vocab-floating-btn {
    position: fixed;
    display: flex;
    gap: 5px;
    background: white;
    padding: 8px 10px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    border: 1px solid #ddd;
    z-index: 10000;
    font-family: Arial, sans-serif;
    animation: vocabFadeIn 0.2s ease;
  }
  
  .vocab-floating-btn button {
    border: none;
    padding: 8px 15px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s;
  }
  
  .vocab-btn-save {
    background: #3B82F6;
    color: white;
  }
  
  .vocab-btn-save:hover {
    background: #2563EB;
  }
  
  .vocab-btn-translate {
    background: #10B981;
    color: white;
  }
  
  .vocab-btn-translate:hover {
    background: #059669;
  }
  
  .vocab-tooltip {
    position: absolute;
    background: #1a1a1a;
    color: white;
    padding: 10px;
    border-radius: 6px;
    max-width: 300px;
    font-size: 12px;
    line-height: 1.4;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    top: 100%;
    margin-top: 5px;
  }
  
  .vocab-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10B981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10002;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: vocabSlideIn 0.3s ease;
  }
  
  @keyframes vocabFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes vocabSlideIn {
    from { opacity: 0; transform: translateX(100px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

document.head.appendChild(style);

// Main Class
class VocabMaster {
  constructor() {
    this.selectedText = "";
    this.floatingBtn = null;
    this.bindEvents();
  }

  bindEvents() {
    document.addEventListener("mouseup", this.handleSelection.bind(this));
    document.addEventListener("mousedown", (e) => {
      if (this.floatingBtn && !this.floatingBtn.contains(e.target)) {
        this.removeFloatingBtn();
      }
    });
  }

  handleSelection(e) {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 3 && text.length < 500) {
      this.selectedText = text;
      this.showFloatingBtn(e);
    }
  }

  showFloatingBtn(e) {
    this.removeFloatingBtn();

    this.floatingBtn = document.createElement("div");
    this.floatingBtn.className = "vocab-floating-btn";
    this.floatingBtn.innerHTML = `
      <button class="vocab-btn-save" title="Save to vocabulary">
        💾 Save
      </button>
      <button class="vocab-btn-translate" title="Translate to Indonesian">
        🔍 Translate
      </button>
    `;

    // Position the button near cursor
    const x = e.pageX;
    const y = e.pageY;

    this.floatingBtn.style.left = `${x}px`;
    this.floatingBtn.style.top = `${y - 60}px`;

    document.body.appendChild(this.floatingBtn);

    // Add button event listeners
    this.floatingBtn
      .querySelector(".vocab-btn-save")
      .addEventListener("click", () => this.saveVocabulary());

    this.floatingBtn
      .querySelector(".vocab-btn-translate")
      .addEventListener("click", () => this.translateText());
  }

  removeFloatingBtn() {
    if (this.floatingBtn) {
      this.floatingBtn.remove();
      this.floatingBtn = null;
    }
  }

  async saveVocabulary() {
    if (!this.selectedText) return;

    try {
      const vocabData = {
        text: this.selectedText,
        translation: "",
        source: window.location.href,
        domain: window.location.hostname,
        timestamp: new Date().toISOString(),
        tags: [],
      };

      // Save using Chrome storage
      const result = await chrome.storage.local.get(["vocabularies"]);
      const vocabs = result.vocabularies || [];
      vocabs.push(vocabData);

      await chrome.storage.local.set({ vocabularies: vocabs });

      // Show success notification
      this.showNotification("Vocabulary saved!");
      this.removeFloatingBtn();

      // Send message to background for auto-translation
      chrome.runtime.sendMessage({
        action: "translateVocabulary",
        data: {
          text: this.selectedText,
          index: vocabs.length - 1,
        },
      });
    } catch (error) {
      console.error("Error saving vocabulary:", error);
      this.showNotification("Error saving vocabulary", true);
    }
  }

  async translateText() {
    if (!this.selectedText) return;

    try {
      // Using Google Translate API
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=${encodeURIComponent(
        this.selectedText
      )}`;

      const response = await fetch(url);
      const data = await response.json();
      const translation = data[0][0][0];

      this.showTranslationTooltip(translation);
    } catch (error) {
      console.error("Translation error:", error);
      this.showTranslationTooltip("Translation failed");
    }
  }

  showTranslationTooltip(translation) {
    if (!this.floatingBtn) return;

    // Remove existing tooltip
    const existingTooltip = this.floatingBtn.querySelector(".vocab-tooltip");
    if (existingTooltip) existingTooltip.remove();

    const tooltip = document.createElement("div");
    tooltip.className = "vocab-tooltip";
    tooltip.textContent = translation;

    this.floatingBtn.appendChild(tooltip);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 5000);
  }

  showNotification(message, isError = false) {
    const notification = document.createElement("div");
    notification.className = "vocab-notification";
    notification.textContent = message;

    if (isError) {
      notification.style.background = "#EF4444";
    }

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
}

// Initialize when page loads
let vocabMaster = null;

function initVocabMaster() {
  if (!vocabMaster) {
    vocabMaster = new VocabMaster();
  }
}

// Start after a short delay to ensure DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVocabMaster);
} else {
  initVocabMaster();
}

// Also re-initialize on dynamic content changes (for SPAs)
let observer = new MutationObserver(() => {
  if (!vocabMaster) {
    initVocabMaster();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
