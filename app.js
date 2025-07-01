class ModernStore {
    constructor() {
        this.products = [];
        this.displayedProducts = [];
        this.itemsPerPage = 8;
        this.currentPage = 1;
        this.init();
    }

    async init() {
        await this.fetchProducts();
        this.setupEventListeners();
        this.renderProducts();
    }

    async fetchProducts() {
        try {
            // Use a relative path if db.json is in the same directory as your HTML file
            const response = await fetch("https://fakestoreapi.com/products");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.products = await response.json();
        } catch (error) {
            console.error('Error fetching products:', error);
            this.showError('Failed to load products');
        }
        console.log('Products loaded:', this.products.length);
    }
    

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', this.debounce((e) => {
            this.searchProducts(e.target.value);
        }, 300));

        // Load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        loadMoreBtn.addEventListener('click', () => {
            this.loadMoreProducts();
        });

        // Modal events
        const modal = document.getElementById('updateModal');
        const modalClose = document.getElementById('modalClose');
        const updateForm = document.getElementById('updateForm');

        modalClose.addEventListener('click', () => {
            this.closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        updateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProduct();
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        const productsToShow = this.displayedProducts.length > 0 ? this.displayedProducts : this.products;
        const endIndex = this.currentPage * this.itemsPerPage;
        const currentProducts = productsToShow.slice(0, endIndex);

        if (currentProducts.length === 0) {
            grid.innerHTML = '<div class="loading"><p>No products found</p></div>';
            return;
        }

        grid.innerHTML = currentProducts.map(product => `
                    <div class="product-card" data-id="${product.id}">
                        <img class="product-image" src="${product.image}" alt="${product.title}" data-id="${product.id}">
                        <div class="product-info">
                            <div class="product-price">$${product.price}</div>
                            <span class="product-category">${product.category}</span>
                            <h3 class="product-title">${product.title}</h3>
                            <div class="product-actions">
                                <button class="btn btn-info" data-id="${product.id}" data-action="info">Info</button>
                                <button class="btn btn-update" data-id="${product.id}" data-action="update">Update</button>
                                <button class="btn btn-delete" data-id="${product.id}" data-action="delete">Delete</button>
                            </div>
                        </div>
                        <div class="popup" id="popup-${product.id}">
                            <div class="popup-content">
                                <button class="popup-close" data-id="${product.id}">×</button>
                                <h3 class="popup-title">Product Info</h3>
                                <div class="popup-price">$${product.price}</div>
                                <span class="popup-category">${product.category}</span>
                                <p class="popup-description">${product.description}</p>
                            </div>
                        </div>
                    </div>
                `).join('');

        this.attachProductEventListeners();
    }

    attachProductEventListeners() {
        const grid = document.getElementById('productsGrid');

        grid.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            const action = e.target.dataset.action;

            if (!productId) return;

            switch (action) {
                case 'info':
                    this.toggleProductInfo(productId);
                    break;
                case 'update':
                    this.openUpdateModal(productId);
                    break;
                case 'delete':
                    this.deleteProduct(productId);
                    break;
                default:
                    if (e.target.classList.contains('product-image')) {
                        this.viewProductDetails(productId);
                    } else if (e.target.classList.contains('popup-close')) {
                        this.closeProductInfo(productId);
                    }
            }
        });
    }

    toggleProductInfo(productId) {
        // Close all other popups first
        document.querySelectorAll('.popup').forEach(popup => {
            if (popup.id !== `popup-${productId}`) {
                popup.style.display = 'none';
            }
        });

        const popup = document.getElementById(`popup-${productId}`);
        popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
    }

    closeProductInfo(productId) {
        const popup = document.getElementById(`popup-${productId}`);
        popup.style.display = 'none';
    }

    openUpdateModal(productId) {
        const product = this.products.find(p => p.id == productId);
        if (!product) return;

        const modal = document.getElementById('updateModal');
        const modalImage = document.getElementById('modalImage');
        const modalInput = document.getElementById('modalInput');

        modalImage.src = product.image;
        modalInput.value = product.title;
        modal.dataset.productId = productId;
        modal.style.display = 'flex';
    }

    closeModal() {
        const modal = document.getElementById('updateModal');
        modal.style.display = 'none';
    }

    updateProduct() {
        const modal = document.getElementById('updateModal');
        const productId = modal.dataset.productId;
        const newTitle = document.getElementById('modalInput').value.trim();

        if (!newTitle) return;

        const productIndex = this.products.findIndex(p => p.id == productId);
        if (productIndex !== -1) {
            this.products[productIndex].title = newTitle;
            this.renderProducts();
            this.closeModal();
            this.showNotification('Product updated successfully!', 'success');
        }
    }

    deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            this.products = this.products.filter(p => p.id != productId);
            this.displayedProducts = this.displayedProducts.filter(p => p.id != productId);
            this.renderProducts();
            this.showNotification('Product deleted successfully!', 'success');
        }
    }

    viewProductDetails(productId) {
        const product = this.products.find(p => p.id == productId);
        if (product) {
            // In a real app, you would navigate to a details page
            this.showNotification(`Viewing details for: ${product.title}`, 'info');
        }
    }

    searchProducts(query) {
        if (!query.trim()) {
            this.displayedProducts = [];
            this.currentPage = 1;
            this.renderProducts();
            return;
        }

        this.displayedProducts = this.products.filter(product =>
            product.title.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
        );
        this.currentPage = 1;
        this.renderProducts();
    }

    loadMoreProducts() {
        this.currentPage++;
        this.renderProducts();
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 10px;
                    color: white;
                    font-weight: 600;
                    z-index: 1001;
                    animation: slideIn 0.3s ease;
                    background: ${type === 'success' ? 'var(--success-color)' :
                type === 'error' ? 'var(--danger-color)' :
                    'var(--primary-color)'};
                `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = `
                    <div class="loading">
                        <p style="color: var(--danger-color); font-weight: 600;">${message}</p>
                    </div>
                `;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ModernStore();
});