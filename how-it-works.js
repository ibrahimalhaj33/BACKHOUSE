/* ═══════════════════════════════════════════════════════
   BackHouse — How It Works Page JS (how-it-works.html)
   Extracted from app.js · No logic changes
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════
  //  HOW IT WORKS PAGE (how-it-works.html)
  // ═══════════════════════════════════════════════════════
  const tabSellers = document.getElementById('tab-sellers');
  const tabBuyers  = document.getElementById('tab-buyers');

  if (tabSellers && tabBuyers) {
    const panelSellers = document.getElementById('sellers-panel');
    const panelBuyers  = document.getElementById('buyers-panel');

    function activateTab(activeTab, inactiveTab, showPanel, hidePanel) {
      activeTab.classList.add('hiw-tabs__btn--active');
      activeTab.setAttribute('aria-pressed', 'true');
      inactiveTab.classList.remove('hiw-tabs__btn--active');
      inactiveTab.setAttribute('aria-pressed', 'false');
      showPanel.removeAttribute('hidden');
      hidePanel.setAttribute('hidden', '');
    }

    tabSellers.addEventListener('click', () =>
      activateTab(tabSellers, tabBuyers, panelSellers, panelBuyers));
    tabBuyers.addEventListener('click', () =>
      activateTab(tabBuyers, tabSellers, panelBuyers, panelSellers));
  }

});
