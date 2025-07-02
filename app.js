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
        this.updateLoadMoreButton();
    }

    async fetchProducts() {
        try {
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
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchProducts(e.target.value);
            }, 300));
        }

        // Load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreProducts();
            });
        }

        // Modal events
        const modal = document.getElementById('updateModal');
        const modalClose = document.getElementById('modalClose');
        const updateForm = document.getElementById('updateForm');

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        if (updateForm) {
            updateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProduct();
            });
        }
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
        if (!grid) return;

        const productsToShow = this.displayedProducts.length > 0 ? this.displayedProducts : this.products;
        const endIndex = this.currentPage * this.itemsPerPage;
        const currentProducts = productsToShow.slice(0, endIndex);

        if (currentProducts.length === 0) {
            grid.innerHTML = '<div class="loading"><p>No products found</p></div>';
            this.updateLoadMoreButton();
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
        this.updateLoadMoreButton();
    }

    attachProductEventListeners() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        // Remove existing listeners to prevent duplicates
        grid.removeEventListener('click', this.handleGridClick);
        
        // Bind the method to preserve 'this' context
        this.handleGridClick = this.handleGridClick.bind(this);
        grid.addEventListener('click', this.handleGridClick);
    }

    handleGridClick(e) {
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
                this.confirmAndDeleteProduct(productId);
                break;
            default:
                if (e.target.classList.contains('product-image')) {
                    this.viewProductDetails(productId);
                } else if (e.target.classList.contains('popup-close')) {
                    this.closeProductInfo(productId);
                }
        }
    }

    toggleProductInfo(productId) {
        // Close all other popups first
        document.querySelectorAll('.popup').forEach(popup => {
            if (popup.id !== `popup-${productId}`) {
                popup.style.display = 'none';
            }
        });

        const popup = document.getElementById(`popup-${productId}`);
        if (popup) {
            popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
        }
    }

    closeProductInfo(productId) {
        const popup = document.getElementById(`popup-${productId}`);
        if (popup) {
            popup.style.display = 'none';
        }
    }

    openUpdateModal(productId) {
        const product = this.products.find(p => p.id == productId);
        if (!product) return;

        const modal = document.getElementById('updateModal');
        const modalImage = document.getElementById('modalImage');
        const modalInput = document.getElementById('modalInput');

        if (modal && modalImage && modalInput) {
            modalImage.src = product.image;
            modalInput.value = product.title;
            modal.dataset.productId = productId;
            modal.style.display = 'flex';
        }
    }

    closeModal() {
        const modal = document.getElementById('updateModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateProduct() {
        const modal = document.getElementById('updateModal');
        const modalInput = document.getElementById('modalInput');
        
        if (!modal || !modalInput) return;

        const productId = modal.dataset.productId;
        const newTitle = modalInput.value.trim();

        if (!newTitle) {
            this.showNotification('Please enter a valid title', 'error');
            return;
        }

        const productIndex = this.products.findIndex(p => p.id == productId);
        if (productIndex !== -1) {
            this.products[productIndex].title = newTitle;
            
            // Update displayed products if search is active
            if (this.displayedProducts.length > 0) {
                const displayedIndex = this.displayedProducts.findIndex(p => p.id == productId);
                if (displayedIndex !== -1) {
                    this.displayedProducts[displayedIndex].title = newTitle;
                }
            }
            
            this.renderProducts();
            this.closeModal();
            this.showNotification('Product updated successfully!', 'success');
        }
    }

    confirmAndDeleteProduct(productId) {
        const product = this.products.find(p => p.id == productId);
        if (!product) return;

        if (confirm(`Are you sure you want to delete "${product.title}"?`)) {
            this.deleteProduct(productId);
        }
    }

    deleteProduct(productId) {
        // Remove from main products array
        const initialLength = this.products.length;
        this.products = this.products.filter(p => p.id != productId);
        
        // Remove from displayed products if search is active
        if (this.displayedProducts.length > 0) {
            this.displayedProducts = this.displayedProducts.filter(p => p.id != productId);
        }

        // Check if deletion was successful
        if (this.products.length < initialLength) {
            // Recalculate pagination after deletion
            const productsToShow = this.displayedProducts.length > 0 ? this.displayedProducts : this.products;
            const maxPages = Math.ceil(productsToShow.length / this.itemsPerPage);
            
            // Adjust current page if necessary
            if (this.currentPage > maxPages && maxPages > 0) {
                this.currentPage = maxPages;
            } else if (productsToShow.length === 0) {
                this.currentPage = 1;
            }

            this.renderProducts();
            this.showNotification('Product deleted successfully!', 'success');
        } else {
            this.showNotification('Failed to delete product', 'error');
        }
    }

    viewProductDetails(productId) {
        const product = this.products.find(p => p.id == productId);
        if (product) {
            this.showNotification(`Viewing details for: ${product.title}`, 'info');
        }
    }

    searchProducts(query) {
        if (!query.trim()) {
            this.displayedProducts = [];
            this.currentPage = 1;
        } else {
            this.displayedProducts = this.products.filter(product =>
                product.title.toLowerCase().includes(query.toLowerCase()) ||
                product.category.toLowerCase().includes(query.toLowerCase())
            );
            this.currentPage = 1;
        }
        this.renderProducts();
    }

    loadMoreProducts() {
        const productsToShow = this.displayedProducts.length > 0 ? this.displayedProducts : this.products;
        const totalProducts = productsToShow.length;
        const currentlyShown = this.currentPage * this.itemsPerPage;

        if (currentlyShown < totalProducts) {
            this.currentPage++;
            this.renderProducts();
        }
    }

    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (!loadMoreBtn) return;

        const productsToShow = this.displayedProducts.length > 0 ? this.displayedProducts : this.products;
        const totalProducts = productsToShow.length;
        const currentlyShown = this.currentPage * this.itemsPerPage;

        if (currentlyShown >= totalProducts || totalProducts === 0) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.textContent = `Load More (${totalProducts - currentlyShown} remaining)`;
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = 'notification';
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
            max-width: 300px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#28a745' :
                type === 'error' ? '#dc3545' :
                    '#007bff'};
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    showError(message) {
        const grid = document.getElementById('productsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="loading">
                    <p style="color: #dc3545; font-weight: 600;">${message}</p>
                </div>
            `;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ModernStore();
});