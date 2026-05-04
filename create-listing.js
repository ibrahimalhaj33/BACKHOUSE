/**
 * CREATE LISTING - Logic
 * Handles image previews, form collection, and saving to central data.
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-listing-form');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('image-preview-container');
    
    let uploadedImageBase64 = null;

    // 1. IMAGE UPLOAD LOGIC
    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // File selection handler
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImage(file);
    });

    // Drag & Drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#10B981';
        dropZone.style.background = 'rgba(16, 185, 129, 0.05)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
        const file = e.dataTransfer.files[0];
        if (file) handleImage(file);
    });

    function handleImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageBase64 = e.target.result;
            showPreview(uploadedImageBase64);
        };
        reader.readAsDataURL(file);
    }

    function showPreview(src) {
        previewContainer.innerHTML = `
            <div class="image-preview">
                <img src="${src}" alt="Preview">
                <span class="image-preview__badge">Primary Image</span>
                <button type="button" class="image-preview__delete" id="remove-img">
                    <span class="material-symbols-outlined" style="font-size: 1.25rem;">delete</span>
                </button>
            </div>
        `;
        previewContainer.style.display = 'block';
        
        // Add delete listener
        document.getElementById('remove-img').onclick = () => {
            uploadedImageBase64 = null;
            previewContainer.style.display = 'none';
            previewContainer.innerHTML = '';
        };
    }

    // 2. FORM SUBMISSION
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Gather basic data
        const formData = new FormData(form);
        const name = formData.get('name');
        const priceValue = parseFloat(formData.get('price'));
        const expiryDate = formData.get('expiry_date');
        
        // Calculate expiry days for dashboard logic
        let expiryDays = 7; // Default
        if (expiryDate) {
            const diff = new Date(expiryDate) - new Date();
            expiryDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }

        // CREATE THE FINAL OBJECT
        // This is the "Package" we talked about
        const newListing = {
            id: 'prod_' + Date.now(),
            name: name,
            sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
            image: uploadedImageBase64 || 'https://images.unsplash.com/photo-1553531384-cc64ac80f931?auto=format&fit=crop&q=80&w=400',
            inventoryCurrent: parseInt(formData.get('quantity')) || 0,
            inventoryTotal: parseInt(formData.get('quantity')) || 0,
            quantity: formData.get('quantity') || '0',
            unit: formData.get('unit') || 'Units',
            price: `$${priceValue.toFixed(2)}`,
            numericPrice: priceValue,
            status: 'Active',
            expiryDays: expiryDays,
            expiring: expiryDays <= 5,
            views: 0, // Standardized property
            seller_name: 'My Warehouse',
            seller_initials: 'MW',
            seller_rating: 5.0,
            seller_reviews: 0,
            distance: (Math.random() * 5).toFixed(1) + ' km'
        };

        // SAVE TO CENTRAL BRAIN
        if (typeof addListing === 'function') {
            addListing(newListing);
            
            // Visual feedback before redirect
            const publishBtn = document.querySelector('.btn-publish');
            publishBtn.innerText = 'Publishing...';
            publishBtn.disabled = true;

            setTimeout(() => {
                window.location.href = 'all-listings.html';
            }, 800);
        } else {
            console.error('Data manager not found!');
        }
    });
});
