/**
 * CREATE LISTING - Logic
 * Handles image previews, form collection, and saving via API.
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-listing-form');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('image-preview-container');
    const progressFill = document.querySelector('.create-progress__fill');
    const progressLabel = document.querySelector('.create-progress__percentage');

    let uploadedImageBase64 = null;

    // ─── FORM COMPLETION PROGRESS ───────────────────────
    // Each field carries a weight; image upload adds bonus weight.
    const FIELDS = [
        { name: 'name',        weight: 20 },
        { name: 'price',       weight: 20 },
        { name: 'quantity',    weight: 15 },
        { name: 'unit',        weight: 10 },
        { name: 'category',    weight: 10 },
        { name: 'description', weight: 10 },
        { name: 'expiry_date', weight: 10 },
        // image: 5% bonus, tracked separately via uploadedImageBase64
    ];

    function isFilled(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    function updateProgress() {
        let total = 0;
        FIELDS.forEach(f => {
            const el = form.querySelector(`[name="${f.name}"]`);
            if (el && isFilled(el.value)) total += f.weight;
        });
        if (uploadedImageBase64) total += 5;
        total = Math.min(total, 100);

        if (progressFill) progressFill.style.width = total + '%';
        if (progressLabel) progressLabel.textContent = total + '%';
    }

    // Listen for changes on every form field
    form.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', updateProgress);
        el.addEventListener('change', updateProgress);
    });

    // Initial calculation (in case fields are pre-filled)
    updateProgress();

    // 1. IMAGE UPLOAD LOGIC
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImage(file);
    });

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
            updateProgress();
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
        document.getElementById('remove-img').onclick = () => {
            uploadedImageBase64 = null;
            previewContainer.style.display = 'none';
            previewContainer.innerHTML = '';
            updateProgress();
        };
    }

    // 2. FORM SUBMISSION
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const publishBtn = document.querySelector('.btn-publish');
        publishBtn.innerText = 'Publishing...';
        publishBtn.disabled = true;

        const formData = new FormData(form);

        const payload = {
            name: formData.get('name'),
            price: parseFloat(formData.get('price')) || 0,
            quantity: parseInt(formData.get('quantity')) || 0,
            unit: formData.get('unit') || 'Units',
            description: formData.get('description') || '',
            expiry_date: formData.get('expiry_date') || null,
            category: formData.get('category') || null,
        };

        if (uploadedImageBase64) {
            payload.image_base64 = uploadedImageBase64;
        }

        // Try to capture the seller's current location (optional, silently fails)
        // so buyers' radius searches can find this listing.
        const captureLocation = () => new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { timeout: 5000, maximumAge: 300000 }
            );
        });
        const loc = await captureLocation();
        if (loc) {
            payload.seller_latitude = loc.lat;
            payload.seller_longitude = loc.lng;
        }

        try {
            await addListing(payload);
            window.location.href = 'all-listings.html';
        } catch (err) {
            console.error('[Create Listing] Failed:', err);
            const baseMsg = err?.error?.message || 'Failed to create listing. Please try again.';
            const fields = err?.error?.fields;
            let detail = '';
            if (fields && typeof fields === 'object') {
                detail = '\n\n' + Object.entries(fields)
                    .map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                    .join('\n');
            }
            alert(baseMsg + detail);
            publishBtn.innerText = 'Publish Listing';
            publishBtn.disabled = false;
        }
    });
});
