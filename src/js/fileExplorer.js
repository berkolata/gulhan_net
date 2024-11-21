class FileExplorer {
  constructor() {
    this.currentPath = "C:\\";
    this.history = [this.currentPath];
    this.currentIndex = 0;
    this.selectedItem = null;
    this.currentView = "grid";
    this.draggedItem = null;
    this.imageExtensions = ["jpg", "jpeg", "png", "avif", "webp", "gif"];
    this.textExtensions = ["txt"];
    this.allowedFileTypes = [...this.imageExtensions, ...this.textExtensions];
    this.initModal();

    // Dosya sistemi verilerini localStorage'da tutacağız
    this.initializeFileSystem();
    this.init();
    this.initFileUpload();
    this.currentImageIndex = 0;
    this.currentImageList = [];
  }

  initializeFileSystem() {
    // LocalStorage'dan mevcut dosya sistemini al veya yeni oluştur
    const savedFileSystem = localStorage.getItem("fileSystem");
    if (savedFileSystem) {
      this.fileSystem = JSON.parse(savedFileSystem);
    } else {
      // Başlangıç klasör yapısı
      this.fileSystem = {
        "C:\\": [
          { type: "folder", name: "Users", modified: new Date().toISOString() },
        ],
        "C:\\Users": [
          {
            type: "folder",
            name: "Desktop",
            modified: new Date().toISOString(),
          },
          {
            type: "folder",
            name: "Documents",
            modified: new Date().toISOString(),
          },
        ],
        "C:\\Users\\Desktop": [
          {
            type: "folder",
            name: "Projeler",
            modified: new Date().toISOString(),
          },
          {
            type: "file",
            name: "notlar.txt",
            modified: new Date().toISOString(),
            size: "1 KB",
          },
        ],
      };
      this.saveFileSystem();
    }
  }

  saveFileSystem() {
    localStorage.setItem("fileSystem", JSON.stringify(this.fileSystem));
  }

  init() {
    this.fileArea = document.querySelector(".grid");
    this.pathDisplay = document.querySelector(".flex-1.flex span");
    this.backButton = document.querySelector("button:first-child");
    this.forwardButton = document.querySelector("button:nth-child(2)");
    this.contextMenu = document.getElementById("contextMenu");

    this.setupEventListeners();
    this.renderFiles();
    this.updateNavButtons();
    this.setupContextMenu();
    this.setupViewButtons();
    this.applyCurrentView();
  }

  setupEventListeners() {
    this.backButton.addEventListener("click", () => this.navigateHistory(-1));
    this.forwardButton.addEventListener("click", () => this.navigateHistory(1));

    // Dosyalara tek tıklama olayı ekle
    this.fileArea.addEventListener("click", (e) => {
      const fileEl = e.target.closest('[data-type="file"]');
      if (fileEl) {
        const fileName = fileEl.dataset.name;
        this.openFile(fileName);
      }
    });

    // Yeni klasör oluşturma için klavye kısayolu
    document.addEventListener("keydown", (e) => {
      if (e.key === "n" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        this.createNewFolder();
      }
    });

    // Sürükle-bırak için event listener'lar
    this.fileArea.addEventListener("dragstart", (e) => this.handleDragStart(e));
    this.fileArea.addEventListener("dragover", (e) => this.handleDragOver(e));
    this.fileArea.addEventListener("drop", (e) => this.handleDrop(e));
    this.fileArea.addEventListener("dragend", () => this.handleDragEnd());
  }

  setupContextMenu() {
    // Sağ tık menüsünü göster
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      // Tıklanan öğe bir dosya/klasör mü kontrol et
      const target = e.target.closest("[data-type]");
      if (target) {
        this.selectedItem = {
          name: target.dataset.name,
          type: target.dataset.type,
        };
      } else {
        this.selectedItem = null;
      }

      // Menüyü konumlandır ve göster
      this.contextMenu.style.left = `${e.pageX}px`;
      this.contextMenu.style.top = `${e.pageY}px`;
      this.contextMenu.classList.remove("hidden");

      // Menü öğelerini duruma göre aktif/pasif yap
      this.updateContextMenuItems();
    });

    // Başka bir yere tıklandığında menüyü gizle
    document.addEventListener("click", () => {
      this.contextMenu.classList.add("hidden");
    });

    // Menü öğelerine tıklama olayları
    this.contextMenu.addEventListener("click", (e) => {
      const action = e.target.closest("button")?.dataset.action;
      if (action) {
        switch (action) {
          case "open":
            if (this.selectedItem) {
              if (this.selectedItem.type === "folder") {
                this.navigate(`${this.currentPath}\\${this.selectedItem.name}`);
              } else {
                this.openFile(this.selectedItem.name);
              }
            }
            break;
          case "delete":
            if (this.selectedItem) {
              this.deleteItem();
            }
            break;
          case "newFolder":
            this.createNewFolder();
            break;
          case "newFile":
            this.createNewFile();
            break;
        }
      }
    });
  }

  updateContextMenuItems() {
    const selectedMenu = this.contextMenu.querySelector(".selected-menu");
    const emptyMenu = this.contextMenu.querySelector(".empty-menu");
    const openBtn = this.contextMenu.querySelector('[data-action="open"]');

    if (this.selectedItem) {
      selectedMenu.classList.remove("hidden");
      emptyMenu.classList.add("hidden");

      // Dosya türüne göre "Aç" butonunu göster/gizle
      if (this.selectedItem.type === "file") {
        const extension = this.getFileExtension(this.selectedItem.name);
        const isSupported = [
          ...this.imageExtensions,
          ...this.textExtensions,
        ].includes(extension);
        openBtn.classList.toggle("hidden", !isSupported);
      } else {
        openBtn.classList.remove("hidden");
      }
    } else {
      selectedMenu.classList.add("hidden");
      emptyMenu.classList.remove("hidden");
    }
  }

  createNewFolder() {
    const folderName = prompt("Yeni klasör adı:");
    if (folderName && folderName.trim()) {
      const newPath = `${this.currentPath}\\${folderName}`;

      // Klasör zaten var mı kontrol et
      if (
        this.fileSystem[this.currentPath].some(
          (item) => item.name === folderName
        )
      ) {
        alert("Bu isimde bir klasör zaten var!");
        return;
      }

      // Yeni klasörü mevcut dizine ekle
      this.fileSystem[this.currentPath].push({
        type: "folder",
        name: folderName,
        modified: new Date().toISOString(),
      });

      // Yeni klasörün içini boş bir dizi olarak başlat
      this.fileSystem[newPath] = [];

      this.saveFileSystem();
      this.renderFiles();
    }
  }

  createNewFile() {
    document.getElementById("fileUploadInput").click();
  }

  getFileIcon(type, file = null) {
    if (type === "folder") {
      return `<svg class="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
      </svg>`;
    } else if (this.textExtensions.includes(this.getFileExtension(file.name))) {
      return `<svg class="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>`;
    }
    // Resim dosyaları için null döndür, çünkü gerçek önizleme göstereceğiz
    return null;
  }

  renderFiles() {
    const files = this.fileSystem[this.currentPath].filter(
      (item) => !item.isUpload
    );
    this.pathDisplay.textContent = this.currentPath;

    const upFolderButton =
      this.currentPath !== "\\"
        ? `
      <div class="flex flex-col items-center p-2 hover:bg-gray-100 rounded cursor-pointer" 
           onclick="fileExplorer.navigateUp()">
        <svg class="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 7H12L10.553 5.106C10.214 4.428 9.521 4 8.764 4H3C1.346 4 0 5.346 0 7V18C0 19.654 1.346 21 3 21H20C21.654 21 23 19.654 23 18V10C23 8.346 21.654 7 20 7ZM21 18C21 18.551 20.552 19 20 19H3C2.448 19 2 18.551 2 18V9H20C20.552 9 21 9.449 21 10V18Z"/>
          <path d="M11.293 13.707L8.293 10.707C8.007 10.421 7.532 10.421 7.246 10.707C6.96 10.993 6.96 11.468 7.246 11.754L10.246 14.754C10.389 14.897 10.578 14.968 10.767 14.968C10.956 14.968 11.145 14.897 11.288 14.754L14.288 11.754C14.574 11.468 14.574 10.993 14.288 10.707C14.002 10.421 13.527 10.421 13.241 10.707L11.293 13.707Z"/>
        </svg>
        <span class="text-sm mt-1">Üst Klasör</span>
      </div>`
        : "";

    const newFolderButton = `
      <div class="flex flex-col items-center p-2 hover:bg-gray-100 rounded cursor-pointer" 
           onclick="fileExplorer.createNewFolder()">
        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        </svg>
        <span class="text-sm mt-1">Yeni Klasör</span>
      </div>`;

    const newFileButton = `
      <div class="flex flex-col items-center p-2 hover:bg-gray-100 rounded cursor-pointer" 
           onclick="fileExplorer.createNewFile()">
        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
        </svg>
        <span class="text-sm mt-1">Dosya Yükle</span>
      </div>`;

    const fileList = files.map((file) => this.renderGridItem(file)).join("");
    this.fileArea.innerHTML =
      upFolderButton + newFolderButton + newFileButton + fileList;

    // Klasörlere tıklama olayı ekle
    this.fileArea.querySelectorAll('[data-type="folder"]').forEach((folder) => {
      folder.addEventListener("click", (e) => {
        const folderName = e.currentTarget.dataset.name;
        this.navigate(`${this.currentPath}\\${folderName}`);
      });
    });
  }

  navigate(path) {
    if (this.fileSystem[path]) {
      this.currentPath = path;
      this.history = this.history.slice(0, this.currentIndex + 1);
      this.history.push(path);
      this.currentIndex = this.history.length - 1;
      this.renderFiles();
      this.updateNavButtons();
    }
  }

  navigateHistory(step) {
    const newIndex = this.currentIndex + step;
    if (newIndex >= 0 && newIndex < this.history.length) {
      this.currentIndex = newIndex;
      this.currentPath = this.history[this.currentIndex];
      this.renderFiles();
      this.updateNavButtons();
    }
  }

  updateNavButtons() {
    this.backButton.disabled = this.currentIndex <= 0;
    this.forwardButton.disabled = this.currentIndex >= this.history.length - 1;

    this.backButton.classList.toggle("opacity-50", this.backButton.disabled);
    this.forwardButton.classList.toggle(
      "opacity-50",
      this.forwardButton.disabled
    );
  }

  deleteItem() {
    if (!this.selectedItem) return;

    const confirmDelete = confirm(
      `"${this.selectedItem.name}" öesini silmek istediğinizden emin misiniz?`
    );
    if (confirmDelete) {
      if (this.selectedItem.type === "folder") {
        // Klasörü ve içindekileri sil
        this.deleteFolder(this.selectedItem.name);
      } else {
        // Dosyayı sil
        this.fileSystem[this.currentPath] = this.fileSystem[
          this.currentPath
        ].filter((item) => item.name !== this.selectedItem.name);
      }
      this.saveFileSystem();
      this.renderFiles();
    }
  }

  deleteFolder(folderName) {
    const folderPath = `${this.currentPath}\\${folderName}`;

    // Önce alt klasörleri recursive olarak sil
    Object.keys(this.fileSystem).forEach((path) => {
      if (path.startsWith(folderPath)) {
        delete this.fileSystem[path];
      }
    });

    // Klasörü mevcut dizinden sil
    this.fileSystem[this.currentPath] = this.fileSystem[
      this.currentPath
    ].filter((item) => item.name !== folderName);
  }

  renameItem() {
    if (!this.selectedItem) return;

    const newName = prompt(
      `Yeni ${this.selectedItem.type === "folder" ? "klasör" : "dosya"} adı:`,
      this.selectedItem.name
    );
    if (newName && newName !== this.selectedItem.name) {
      // Aynı isimde dosya/klasör var mı kontrol et
      if (
        this.fileSystem[this.currentPath].some((item) => item.name === newName)
      ) {
        alert("Bu isimde bir dosya/klasör zaten var!");
        return;
      }

      if (this.selectedItem.type === "folder") {
        this.renameFolder(this.selectedItem.name, newName);
      } else {
        // Dosyayı yeniden adlandır
        const fileIndex = this.fileSystem[this.currentPath].findIndex(
          (item) => item.name === this.selectedItem.name
        );
        if (fileIndex !== -1) {
          this.fileSystem[this.currentPath][fileIndex].name = newName;
        }
      }

      this.saveFileSystem();
      this.renderFiles();
    }
  }

  renameFolder(oldName, newName) {
    const oldPath = `${this.currentPath}\\${oldName}`;
    const newPath = `${this.currentPath}\\${newName}`;

    // Klasör yollarını güncelle
    Object.keys(this.fileSystem).forEach((path) => {
      if (path.startsWith(oldPath)) {
        const newSubPath = path.replace(oldPath, newPath);
        this.fileSystem[newSubPath] = this.fileSystem[path];
        delete this.fileSystem[path];
      }
    });

    // Klasör adını mevcut dizinde güncelle
    const folderIndex = this.fileSystem[this.currentPath].findIndex(
      (item) => item.name === oldName
    );
    if (folderIndex !== -1) {
      this.fileSystem[this.currentPath][folderIndex].name = newName;
    }
  }

  setupViewButtons() {
    // Bu fonksiyonu kaldırabilirsiniz
  }

  changeView() {
    // Bu fonksiyonu kaldırabilirsiniz
  }

  applyCurrentView() {
    const fileArea = document.querySelector(".grid");
    fileArea.className = "grid grid-cols-6 gap-4 p-4";
  }

  renderGridItem(file) {
    const isImage = this.imageExtensions.includes(
      this.getFileExtension(file.name)
    );
    let filePreview;

    if (isImage) {
      const contentPath = file.uploadPath
        ? `${file.uploadPath}\\${file.name}`
        : `${this.currentPath}\\${file.name}`;
      const imageContent = localStorage.getItem(`file_content_${contentPath}`);

      return `
        <div class="group relative w-32 h-32 flex items-center justify-center overflow-hidden rounded hover:shadow-lg transition-shadow cursor-pointer" 
             data-name="${file.name}" 
             data-type="${file.type}"
             draggable="true">
          <img src="${imageContent}" 
               alt="${file.name}" 
               class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity"></div>
        </div>`;
    } else {
      filePreview = this.getFileIcon(file.type, file);
      return `
        <div class="flex flex-col items-center p-2 hover:bg-gray-100 rounded cursor-pointer" 
             data-name="${file.name}" 
             data-type="${file.type}"
             draggable="true"
             title="${file.type === "file" ? "Tıklayarak açın" : ""}">
          ${filePreview}
          <span class="text-sm mt-1 text-center break-all w-full">${
            file.name
          }</span>
        </div>
      `;
    }
  }

  handleDragStart(e) {
    const target = e.target.closest("[data-type]");
    if (!target) return;

    this.draggedItem = {
      name: target.dataset.name,
      type: target.dataset.type,
      sourcePath: this.currentPath,
    };

    e.dataTransfer.setData("text/plain", target.dataset.name);
    target.classList.add("opacity-50");
  }

  handleDragOver(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('[data-type="folder"]');
    if (dropTarget) {
      dropTarget.classList.add("bg-blue-100");
    }
  }

  handleDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('[data-type="folder"]');

    if (dropTarget && this.draggedItem) {
      const targetPath = `${this.currentPath}\\${dropTarget.dataset.name}`;
      this.moveItem(this.draggedItem, targetPath);
    }

    this.clearDragState();
  }

  handleDragEnd() {
    this.clearDragState();
  }

  clearDragState() {
    document.querySelectorAll(".opacity-50, .bg-blue-100").forEach((el) => {
      el.classList.remove("opacity-50", "bg-blue-100");
    });
    this.draggedItem = null;
  }

  moveItem(draggedItem, targetPath) {
    // Aynı klasöre taşımayı engelle
    if (draggedItem.sourcePath === targetPath) return;

    // Hedef klasörde aynı isimde öğe var mı kontrol et
    if (
      this.fileSystem[targetPath].some((item) => item.name === draggedItem.name)
    ) {
      alert("Bu isimde bir dosya/klasör zaten var!");
      return;
    }

    // Öğeyi kaynak klasörden kaldır
    const item = this.fileSystem[draggedItem.sourcePath].find(
      (item) => item.name === draggedItem.name
    );
    this.fileSystem[draggedItem.sourcePath] = this.fileSystem[
      draggedItem.sourcePath
    ].filter((item) => item.name !== draggedItem.name);

    // Öğeyi hedef klasöre ekle
    this.fileSystem[targetPath].push(item);

    // Eğer klasör taşınıyorsa, alt klasörleri de güncelle
    if (draggedItem.type === "folder") {
      const oldPath = `${draggedItem.sourcePath}\\${draggedItem.name}`;
      const newPath = `${targetPath}\\${draggedItem.name}`;

      Object.keys(this.fileSystem).forEach((path) => {
        if (path.startsWith(oldPath)) {
          const newSubPath = path.replace(oldPath, newPath);
          this.fileSystem[newSubPath] = this.fileSystem[path];
          delete this.fileSystem[path];
        }
      });
    }

    this.saveFileSystem();
    this.renderFiles();
  }

  initModal() {
    const modalHTML = `
      <div id="filePreviewModal" class="hidden fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div class="absolute top-4 right-4 flex space-x-4 text-white z-10">
          <span id="imageCounter" class="text-lg"></span>
          <button onclick="fileExplorer.closeModal()" class="hover:text-gray-300">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <button id="prevImageBtn" class="absolute left-4 text-white hover:text-gray-300 hidden">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button id="nextImageBtn" class="absolute right-4 text-white hover:text-gray-300 hidden">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div id="modalContent" class="flex-1 flex items-center justify-center p-4">
          <!-- İçerik buraya gelecek -->
        </div>

        <div id="imageInfo" class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 opacity-0 transition-opacity hover:opacity-100">
          <h3 id="modalTitle" class="text-lg"></h3>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    this.modal = document.getElementById("filePreviewModal");
    this.modalTitle = document.getElementById("modalTitle");
    this.modalContent = document.getElementById("modalContent");
    this.prevBtn = document.getElementById("prevImageBtn");
    this.nextBtn = document.getElementById("nextImageBtn");
    this.imageCounter = document.getElementById("imageCounter");

    // Navigasyon butonları için event listener'lar
    this.prevBtn.addEventListener("click", () => this.showPrevImage());
    this.nextBtn.addEventListener("click", () => this.showNextImage());

    // Klavye kontrolü için event listener
    document.addEventListener("keydown", (e) => {
      if (this.modal.classList.contains("hidden")) return;

      switch (e.key) {
        case "ArrowLeft":
          this.showPrevImage();
          break;
        case "ArrowRight":
          this.showNextImage();
          break;
        case "Escape":
          this.closeModal();
          break;
      }
    });
  }

  getFileExtension(fileName) {
    return fileName.split(".").pop().toLowerCase();
  }

  async openFile(fileName) {
    const file = this.fileSystem[this.currentPath].find(
      (f) => f.name === fileName
    );
    const extension = this.getFileExtension(fileName);
    const contentPath = file.uploadPath
      ? `${file.uploadPath}\\${fileName}`
      : `${this.currentPath}\\${fileName}`;

    if (this.imageExtensions.includes(extension)) {
      // Resim dosyaları için görüntüleyici
      this.currentImageList = this.fileSystem[this.currentPath].filter((f) =>
        this.imageExtensions.includes(this.getFileExtension(f.name))
      );

      this.currentImageIndex = this.currentImageList.findIndex(
        (f) => f.name === fileName
      );

      this.showCurrentImage();
      this.modal.classList.remove("hidden");
    } else if (this.textExtensions.includes(extension)) {
      // Text dosyaları için editör
      const fileContent =
        localStorage.getItem(`file_content_${contentPath}`) || "";

      this.modalTitle.textContent = fileName;
      this.modalContent.innerHTML = `
        <div class="bg-white rounded-lg p-4 max-w-2xl w-full max-h-[90vh] flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">${fileName}</h3>
            <button onclick="fileExplorer.closeModal()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <textarea id="textEditor" 
                    class="w-full h-[60vh] p-4 border rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    spellcheck="false">${fileContent}</textarea>
          <div class="flex justify-end mt-4 space-x-2">
            <button onclick="fileExplorer.closeModal()" 
                    class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
              İptal
            </button>
            <button onclick="fileExplorer.saveTextFile('${fileName}')" 
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Kaydet
            </button>
          </div>
        </div>
      `;

      this.modal.classList.remove("hidden");
      this.modal.classList.remove("bg-black"); // Text editör için arka planı beyaz yap
      this.modal.classList.add("bg-black", "bg-opacity-50"); // Yarı saydam arka plan

      // Text editörüne odaklan
      setTimeout(() => {
        document.getElementById("textEditor").focus();
      }, 100);
    }
  }

  saveTextFile(fileName) {
    const textEditor = document.getElementById("textEditor");
    const content = textEditor.value;
    const file = this.fileSystem[this.currentPath].find(
      (f) => f.name === fileName
    );
    const contentPath = file.uploadPath
      ? `${file.uploadPath}\\${fileName}`
      : `${this.currentPath}\\${fileName}`;

    // Dosya içeriğini localStorage'a kaydet
    localStorage.setItem(`file_content_${contentPath}`, content);

    // Dosya boyutunu ve değiştirilme tarihini güncelle
    const fileIndex = this.fileSystem[this.currentPath].findIndex(
      (item) => item.name === fileName
    );

    if (fileIndex !== -1) {
      this.fileSystem[this.currentPath][fileIndex].size = `${Math.ceil(
        new Blob([content]).size / 1024
      )} KB`;
      this.fileSystem[this.currentPath][fileIndex].modified =
        new Date().toISOString();

      this.saveFileSystem();
      this.renderFiles();
    }

    this.closeModal();
  }

  closeModal() {
    this.modal.classList.add("hidden");
    this.modal.classList.remove("bg-opacity-50");
    this.currentImageList = [];
    this.currentImageIndex = 0;
    this.modalContent.innerHTML = "";
  }

  showCurrentImage() {
    const currentImage = this.currentImageList[this.currentImageIndex];
    const contentPath = currentImage.uploadPath
      ? `${currentImage.uploadPath}\\${currentImage.name}`
      : `${this.currentPath}\\${currentImage.name}`;

    const imageContent = localStorage.getItem(`file_content_${contentPath}`);

    this.modalContent.innerHTML = `
      <img src="${imageContent}" 
           alt="${currentImage.name}" 
           class="max-w-full max-h-[90vh] object-contain">
    `;

    this.modalTitle.textContent = currentImage.name;
    this.imageCounter.textContent = `${this.currentImageIndex + 1} / ${
      this.currentImageList.length
    }`;

    // Navigasyon butonlarını güncelle
    this.prevBtn.classList.toggle("hidden", this.currentImageIndex === 0);
    this.nextBtn.classList.toggle(
      "hidden",
      this.currentImageIndex === this.currentImageList.length - 1
    );
  }

  showPrevImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      this.showCurrentImage();
    }
  }

  showNextImage() {
    if (this.currentImageIndex < this.currentImageList.length - 1) {
      this.currentImageIndex++;
      this.showCurrentImage();
    }
  }

  initFileUpload() {
    // Gizli dosya input'u oluştur
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = ".txt,.jpg,.jpeg,.png,.avif,.webp,.gif";
    fileInput.style.display = "none";
    fileInput.id = "fileUploadInput";
    document.body.appendChild(fileInput);

    // Input değişiklik olayını dinle
    fileInput.addEventListener("change", (e) => this.handleFileUpload(e));
  }

  async handleFileUpload(e) {
    const files = Array.from(e.target.files);
    const uploadPath = `${this.currentPath}\\uploads`;

    // Uploads klasörünü gizli olarak oluştur (sadece backend için)
    if (!this.fileSystem[uploadPath]) {
      this.fileSystem[uploadPath] = [];
    }

    const notification = this.showNotification(
      "Dosyalar yükleniyor...",
      "progress"
    );

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const extension = this.getFileExtension(file.name);

      // Dosya türü kontrolü
      if (!this.allowedFileTypes.includes(extension)) {
        errorCount++;
        continue;
      }

      // Dosya adı çakışması kontrolü - mevcut klasörde kontrol et
      if (
        this.fileSystem[this.currentPath].some(
          (item) => item.name === file.name
        )
      ) {
        errorCount++;
        continue;
      }

      try {
        const content = await this.readFile(file);

        // Dosyayı hem uploads klasörüne hem de mevcut klasöre ekle
        this.fileSystem[uploadPath].push({
          type: "file",
          name: file.name,
          size: `${Math.ceil(file.size / 1024)} KB`,
          modified: new Date().toISOString(),
          isUpload: true, // Upload klasöründeki dosyaları işaretle
        });

        // Dosyayı mevcut klasöre ekle (görünür olan)
        this.fileSystem[this.currentPath].push({
          type: "file",
          name: file.name,
          size: `${Math.ceil(file.size / 1024)} KB`,
          modified: new Date().toISOString(),
          uploadPath: uploadPath, // Fiziksel dosya yolunu sakla
        });

        // Dosya içeriğini localStorage'a kaydet
        localStorage.setItem(
          `file_content_${uploadPath}\\${file.name}`,
          content
        );
        successCount++;
      } catch (error) {
        console.error("Dosya yükleme hatası:", error);
        errorCount++;
      }
    }

    this.saveFileSystem();
    this.renderFiles();

    this.updateNotification(
      notification,
      `${successCount} dosya yüklendi${
        errorCount > 0 ? `, ${errorCount} dosya yüklenemedi` : ""
      }`,
      successCount > 0 ? "success" : "error"
    );

    e.target.value = "";
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        if (this.imageExtensions.includes(this.getFileExtension(file.name))) {
          // Resim dosyası için base64
          resolve(e.target.result);
        } else {
          // Text dosyası için metin
          resolve(e.target.result);
        }
      };

      reader.onerror = () => reject(new Error("Dosya okunamadı"));

      if (this.imageExtensions.includes(this.getFileExtension(file.name))) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === "progress"
        ? "bg-blue-500"
        : type === "success"
        ? "bg-green-500"
        : type === "error"
        ? "bg-red-500"
        : "bg-gray-500"
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);
    return notification;
  }

  updateNotification(notification, message, type) {
    notification.textContent = message;
    notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    } text-white`;

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  deleteFile(fileName) {
    const file = this.fileSystem[this.currentPath].find(
      (f) => f.name === fileName
    );

    // Mevcut klasörden dosyayı sil
    this.fileSystem[this.currentPath] = this.fileSystem[
      this.currentPath
    ].filter((item) => item.name !== fileName);

    // Eğer upload klasöründe de varsa oradan da sil
    if (file.uploadPath) {
      this.fileSystem[file.uploadPath] = this.fileSystem[
        file.uploadPath
      ].filter((item) => item.name !== fileName);

      // localStorage'dan içeriği sil
      localStorage.removeItem(`file_content_${file.uploadPath}\\${fileName}`);
    }

    this.saveFileSystem();
    this.renderFiles();
  }

  navigateUp() {
    if (this.currentPath === "\\") return;

    const parentPath =
      this.currentPath.split("\\").slice(0, -1).join("\\") || "\\";
    this.navigate(parentPath);
  }
}

// Uygulama başlatma
document.addEventListener("DOMContentLoaded", () => {
  window.fileExplorer = new FileExplorer();
});
