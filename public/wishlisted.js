(function(){
  const BASE = '/apps/wishlisted/api/proxy'; // App Proxy subpath prefix (configure in Partner Dashboard)

  async function getWishlist() {
    const res = await fetch(`${BASE}/wishlist`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch wishlist');
    return res.json();
  }

  async function addItem({ productGid, variantGid, wishlistId }) {
    const res = await fetch(`${BASE}/wishlist/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productGid, variantGid, wishlistId })
    });
    if (!res.ok) throw new Error('Failed to add item');
    return res.json();
  }

  async function removeItem(id){
    const res = await fetch(`${BASE}/wishlist/items/${encodeURIComponent(id)}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to remove item');
    return res.json();
  }

  // Minimal vanilla UI enhancement: attach handlers to elements with [data-wishlisted]
  function hydrateButtons(){
    document.querySelectorAll('[data-wishlisted]')
      .forEach(el => {
        if (el.__wishlistedBound) return;
        el.__wishlistedBound = true;
        el.addEventListener('click', async () => {
          try {
            const productGid = el.getAttribute('data-product-gid');
            const variantGid = el.getAttribute('data-variant-gid');
            el.disabled = true;
            await addItem({ productGid, variantGid });
            el.textContent = el.getAttribute('data-added-label') || 'Wishlisted';
            el.classList.add('wishlisted--added');
          } catch(e){
            console.error(e);
            el.textContent = el.getAttribute('data-error-label') || 'Error';
          } finally {
            el.disabled = false;
          }
        });
      });
  }

  // Expose a tiny API on window for themes/custom scripts
  window.Wishlisted = { getWishlist, addItem, removeItem, hydrateButtons };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateButtons);
  } else {
    hydrateButtons();
  }
})();
