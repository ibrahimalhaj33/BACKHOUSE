/**
 * LISTINGS DATA MANAGER (The "Central Brain")
 * This file handles all data persistence using localStorage.
 * It unifies the Dashboard (All Listings) and the Marketplace (Browse).
 */

const STORAGE_KEY = 'backhouse_listings';

// 1. DEFAULT MOCK DATA
// This is used only if the user's "Memory Bank" is empty.
const DEFAULT_LISTINGS = [
    {
        id: "prod_001",
        name: "Organic Surplus Bell Peppers",
        sku: "VEG-402-BP",
        image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400",
        inventoryCurrent: 45,
        inventoryTotal: 50,
        quantity: 45,
        unit: "KG",
        price: "$120.00",
        numericPrice: 120.00,
        status: "Active",
        expiryDays: 2,
        expiring: true,
        views: 1204,
        seller_name: "Green Valley Farm",
        seller_initials: "GV",
        seller_rating: 4.8,
        seller_reviews: 124,
        distance: "1.2 km"
    },
    {
        id: "prod_002",
        name: "Bakery End-of-Day Bundle",
        sku: "BAK-992-BX",
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400",
        inventoryCurrent: 8,
        inventoryTotal: 40,
        quantity: 8,
        unit: "Units",
        price: "$45.50",
        numericPrice: 45.50,
        status: "Active",
        expiryDays: 14,
        expiring: false,
        views: 456,
        seller_name: "Daily Bread Co.",
        seller_initials: "DB",
        seller_rating: 4.5,
        seller_reviews: 89,
        distance: "0.8 km"
    },
    {
        id: "prod_003",
        name: "Prepared Salad Bases",
        sku: "PRE-104-SL",
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=400",
        inventoryCurrent: 15,
        inventoryTotal: 15,
        quantity: 15,
        unit: "Units",
        price: "$89.00",
        numericPrice: 89.00,
        status: "Reserved",
        expiryDays: 5,
        expiring: true,
        views: 89,
        seller_name: "FreshCut Logistics",
        seller_initials: "FL",
        seller_rating: 4.2,
        seller_reviews: 34,
        distance: "3.5 km"
    }
];

/**
 * Get all listings from the "Memory Bank"
 */
function getListings() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        // If empty, initialize with defaults
        saveListings(DEFAULT_LISTINGS);
        return DEFAULT_LISTINGS;
    }
    return JSON.parse(stored);
}

/**
 * Save listings to the "Memory Bank"
 */
function saveListings(listingsArray) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listingsArray));
}

function getListingById(id) {
    const listings = getListings();
    return listings.find(l => l.id === id);
}

/**
 * Add a new listing to the system
 */
function addListing(newListing) {
    const currentList = getListings();
    currentList.unshift(newListing); // Add to the top
    saveListings(currentList);
}

/**
 * Delete a listing by ID
 */
function deleteListing(id) {
    let currentList = getListings();
    currentList = currentList.filter(item => item.id !== id);
    saveListings(currentList);
}

/**
 * Update a listing's status (e.g. Deactivate/Activate)
 */
function updateListingStatus(id, newStatus) {
    const currentList = getListings();
    const index = currentList.findIndex(item => item.id === id);
    if (index !== -1) {
        currentList[index].status = newStatus;
        saveListings(currentList);
    }
}

/**
 * Get a single listing by its ID
 * Backend: Replace with fetch(`/api/listings/${id}`)
 */
function getListingById(id) {
    const currentList = getListings();
    return currentList.find(item => item.id === id) || null;
}

/**
 * Update a listing's data (merge updated fields)
 * Backend: Replace with fetch(`/api/listings/${id}`, { method: 'PUT', body: JSON.stringify(data) })
 */
function updateListing(id, updatedData) {
    const currentList = getListings();
    const index = currentList.findIndex(item => item.id === id);
    if (index !== -1) {
        // Merge: keep all existing fields, overwrite only the ones passed in
        currentList[index] = { ...currentList[index], ...updatedData };
        saveListings(currentList);
        return currentList[index];
    }
    return null;
}
/**
 * USER PROFILE SIMULATOR
 * Returns the current "Logged In" user info
 */
function getUserProfile() {
    const stored = localStorage.getItem('backhouse_user_profile');
    if (!stored) {
        const defaultProfile = {
            name: "Ahmad Al-Masri",
            initials: "AM",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB2ZiZ7Lodvs1GFrlVq2LkBZUPuj_UD50Xmn6o3YYdcrYiRqRIsZTrz5vVa5qsr0yxJQ0OpGg9TNwhwuiToLrXgu5TZN1K-PbDPadryAvE9ChAAqadZdXlDt_L77TTplUfA-cDOkU7stjzGvEMCeOCi80IsUTlIEU7SFt0ZDHaGWvIQfn47F7rmWFY8GIGC4DQUpPin9P47BG4zkxwYGygbpZIGpNmozTdF6jdoMXjTg4vPghfIvYacoQu9l20x6MAAMbblchPP1bmn", // Current user photo
            role: "Site Manager",
            rating: 4.9,
            sales: 148,
            business: {
                name: "BackHouse Logistics Corp",
                email: "operations@backhouse.eco",
                phone: "+1 (555) 098-7721",
                address: "482 Green Way, Silicon Valley, CA",
                type: "Sustainable Logistics",
                regNumber: "REG-992-004-BLC"
            },
            preferences: {
                emailNotifications: true,
                smsAlerts: false,
                language: "en",
                timezone: "gmt3-jo",
                publicProfile: false,
                anonymousAnalytics: true
            }
        };
        saveUserProfile(defaultProfile);
        return defaultProfile;
    }
    return JSON.parse(stored);
}

function saveUserProfile(profile) {
    localStorage.setItem('backhouse_user_profile', JSON.stringify(profile));
    // Trigger any global UI updates if needed
    if (typeof updateProfileHeader === 'function') {
        updateProfileHeader();
    }
}

// ==========================================
// ORDERS & TRANSACTIONS (The "Central Brain")
// ==========================================

const ORDERS_STORAGE_KEY = 'backhouse_orders';

const DEFAULT_ORDERS = [
    {
        id: "ord_001",
        buyer_id: "user_current", // Using a dummy ID for the current user
        buyer_name: "Ahmad Al-Masri",
        seller_id: "seller_gv",
        seller_name: "Green Valley Farm",
        listing_id: "prod_001",
        listing_name: "Organic Surplus Bell Peppers",
        listing_sku: "SKU · 001",
        listing_image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400",
        price: "144.00 JOD",
        status: "confirmed",
        pickup_date: "Tomorrow, 9:30 AM",
        date_created: new Date().toISOString()
    },
    {
        id: "ord_002",
        buyer_id: "user_current",
        buyer_name: "Ahmad Al-Masri",
        seller_id: "seller_db",
        seller_name: "Daily Bread Co.",
        listing_id: "prod_002",
        listing_name: "Bakery End-of-Day Bundle",
        listing_sku: "SKU · 002",
        listing_image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400",
        price: "76.50 JOD",
        status: "pending",
        pickup_date: null,
        date_created: new Date().toISOString()
    },
    {
        id: "ord_003",
        buyer_id: "buyer_ef",
        buyer_name: "EcoForge Solutions",
        buyer_avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC2KpVhr85-mZjMjMKoVNv4nA2tCMxbLyfpa-Fdqx5LuifqDdC7Js1PItT4wdOcUqJIeEJAGuXE2jziWpU11MpMYuAlgqK4qHqy9WlsHfsgPdi6wKOthYB0fcbuM1Rq0HtctZOXXK_83sXPedyGdizmtveCJ_j2WPSD1dvXG4K8M2HK7-l469ZW7gKEQuI1DHLntRTYl6bxej6Z4DDKB-6jK1X-4xTk0y2uvh4cJ0CC-nW8N0Wy02eNXAlMJB05ghzruUn9ibJyeWNA",
        seller_id: "user_current",
        seller_name: "Ahmad Al-Masri",
        listing_id: "prod_9942",
        listing_name: "Premium Aluminum Scrap 6061",
        listing_sku: "AL-9942",
        listing_image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCDZlhz6Pq97HrgrbcOgBxlAfdW1GdCCNP-GXxjeDSpKOm-c5ZEsZJnJWcbIF_fJnSiarjVIAdz0GmDTb-i2uFACnOVl3P2mGqM9uCb2pc_QKnYyMb5xexjkSnuz0tOGwalexO2JbD19s5oLHbUo_5gY7kJGETmY2HSJ2NupDuHN10qN5Om6Zwzdrgd-MVWClxahF1wrfM2azkM6FRmehP-eoGp1Fwh87dzX1Sutirf4vfm_mr1hp-ehnOSOra-RcsqNhBYaOefFinZ",
        price: "$1,240.00",
        rate: "500kg @ $2.48/kg",
        status: "pending",
        pickup_date: null,
        date_requested: "Oct 24, 2023",
        date_created: new Date().toISOString()
    }
];

function getOrders() {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!stored) {
        saveOrders(DEFAULT_ORDERS);
        return DEFAULT_ORDERS;
    }
    return JSON.parse(stored);
}

function saveOrders(ordersArray) {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersArray));
}

function createOrder(orderData) {
    const currentList = getOrders();
    
    // Check for duplicate pending order for this buyer
    const isDuplicate = currentList.some(order => 
        order.buyer_id === orderData.buyer_id && 
        order.listing_id === orderData.listing_id && 
        order.status === 'pending'
    );

    if (isDuplicate) {
        return { error: 'duplicate' };
    }

    const newOrder = {
        id: "ord_" + Math.random().toString(36).substr(2, 9),
        date_created: new Date().toISOString(),
        status: "pending",
        pickup_date: null,
        ...orderData
    };
    currentList.unshift(newOrder);
    saveOrders(currentList);
    return newOrder;
}

function getOrdersByBuyer(buyerId = "user_current") {
    return getOrders().filter(order => order.buyer_id === buyerId);
}

function getOrdersBySeller(sellerId = "user_current") {
    return getOrders().filter(order => order.seller_id === sellerId);
}

function updateOrderStatus(orderId, newStatus, pickupDate = null) {
    const currentList = getOrders();
    const index = currentList.findIndex(item => item.id === orderId);
    if (index !== -1) {
        currentList[index].status = newStatus;
        if (pickupDate) {
            currentList[index].pickup_date = pickupDate;
        }
        saveOrders(currentList);
        return currentList[index];
    }
    return null;
}

// ═══════════════════════════════════════════════════════
// 3. MESSAGES DATA (Backend Ready Structure)
// ═══════════════════════════════════════════════════════

const DEFAULT_MESSAGES = [
    {
        id: "msg_001",
        from: "seller_gv",
        to: "user_current",
        listingId: "prod_001",
        text: "Hi Marcus! I noticed you were interested in the 50kg Bulk Flour stock. Are you looking for immediate delivery or a warehouse pickup?",
        timestamp: "2026-05-01T10:30:00Z"
    },
    {
        id: "msg_002",
        from: "user_current",
        to: "seller_gv",
        listingId: "prod_001",
        text: "Hey Sarah, warehouse pickup works best for us. We have a truck near your area on Thursday. Is that feasible?",
        timestamp: "2026-05-01T10:35:00Z"
    },
    {
        id: "msg_003",
        from: "seller_gv",
        to: "user_current",
        listingId: "prod_001",
        text: "Thursday morning is perfect. I'll make sure the loading dock is clear. Sounds great, I'll process the payment now so the paperwork is ready for your driver.",
        timestamp: "2026-05-01T10:42:00Z"
    }
];

function getMessages() {
    const saved = localStorage.getItem('backhouse_messages');
    if (!saved) {
        localStorage.setItem('backhouse_messages', JSON.stringify(DEFAULT_MESSAGES));
        return DEFAULT_MESSAGES;
    }
    return JSON.parse(saved);
}

function saveMessages(messages) {
    localStorage.setItem('backhouse_messages', JSON.stringify(messages));
}

function sendMessage(fromId, toId, text, listingId = null) {
    const messages = getMessages();
    const newMessage = {
        id: "msg_" + Date.now(),
        from: fromId,
        to: toId,
        listingId: listingId,
        text: text,
        timestamp: new Date().toISOString()
    };
    messages.push(newMessage);
    saveMessages(messages);
    return newMessage;
}

function deleteOrder(orderId) {
    let currentList = getOrders();
    currentList = currentList.filter(item => item.id !== orderId);
    saveOrders(currentList);
}

function submitSellerRating(sellerName, newRating) {
    const listings = getListings();
    
    // Find all listings by this seller
    const sellerListings = listings.filter(l => l.seller_name === sellerName);
    if (sellerListings.length === 0) return;

    // Grab the current rating and reviews from the first listing
    const currentRating = sellerListings[0].seller_rating || 5.0;
    const currentReviews = sellerListings[0].seller_reviews || 0;

    // Calculate new average
    const totalScore = currentRating * currentReviews;
    const newAverage = (totalScore + newRating) / (currentReviews + 1);
    
    // Update all listings
    listings.forEach(listing => {
        if (listing.seller_name === sellerName) {
            listing.seller_rating = parseFloat(newAverage.toFixed(1));
            listing.seller_reviews = currentReviews + 1;
        }
    });

    saveListings(listings);
}

/* ─── Ratings Infrastructure ─────────── */

const DEFAULT_RATINGS = [
    {
        id: "rat_001",
        type: "received",
        businessName: "EcoLogic Logistics Ltd.",
        image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=150&h=150",
        stars: 5,
        date: "2023-10-24T10:00:00Z"
    },
    {
        id: "rat_002",
        type: "received",
        businessName: "Urban Refurb Co.",
        image: null,
        stars: 4,
        date: "2023-10-18T14:30:00Z"
    },
    {
        id: "rat_003",
        type: "received",
        businessName: "GreenSpace Devs",
        image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=150&h=150",
        stars: 5,
        date: "2023-10-05T09:15:00Z"
    },
    {
        id: "rat_004",
        type: "received",
        businessName: "Design Grid Studio",
        image: null,
        stars: 3,
        date: "2023-09-28T16:45:00Z"
    },
    {
        id: "rat_005",
        type: "received",
        businessName: "Apex Build Partners",
        image: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=150&h=150",
        stars: 4.5,
        date: "2023-09-15T11:20:00Z"
    },
    {
        id: "rat_006",
        type: "received",
        businessName: "Bloom Valley Farms",
        image: null,
        stars: 5,
        date: "2023-09-02T13:10:00Z"
    },
    {
        id: "rat_007",
        type: "given",
        businessName: "Iron & Steel Refurb",
        image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=150&h=150",
        stars: 5,
        date: "2023-11-01T10:00:00Z"
    },
    {
        id: "rat_008",
        type: "given",
        businessName: "Sustainable Packaging Inc.",
        image: null,
        stars: 4,
        date: "2023-10-20T15:00:00Z"
    }
];

function getRatings() {
    const stored = localStorage.getItem('backhouse_ratings');
    if (!stored) {
        localStorage.setItem('backhouse_ratings', JSON.stringify(DEFAULT_RATINGS));
        return DEFAULT_RATINGS;
    }
    return JSON.parse(stored);
}

function saveRatings(ratings) {
    localStorage.setItem('backhouse_ratings', JSON.stringify(ratings));
}

function addRating(type, businessName, stars, image = null) {
    const ratings = getRatings();
    const newRating = {
        id: "rat_" + Date.now(),
        type: type, // 'received' or 'given'
        businessName: businessName,
        image: image,
        stars: parseFloat(stars),
        date: new Date().toISOString()
    };
    
    ratings.unshift(newRating); // Add to the top of the list
    saveRatings(ratings);
    console.log(`[Data] New ${type} rating saved for: ${businessName}`);
    return newRating;
}
