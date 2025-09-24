// Theme app extension bundle (re-exports public API)
(()=>{
  const BASE = '/apps/wishlisted';
  async function addItem({ productGid, variantGid, wishlistId }){
    const r = await fetch(`${BASE}/wishlist/items`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ productGid, variantGid, wishlistId })
    });
    if(!r.ok) throw new Error('Add failed');
    return r.json();
  }
  function hydrate(){
    document.querySelectorAll('[data-wishlisted]')
      .forEach(el=>{
        if(el.__wl) return; el.__wl = true;
        el.addEventListener('click', async ()=>{
          try{
            el.disabled = true;
            await addItem({
              productGid: el.getAttribute('data-product-gid'),
              variantGid: el.getAttribute('data-variant-gid')
            });
            el.classList.add('wishlisted--added');
            const added = el.dataset.addedLabel || 'Wishlisted';
            if(el.querySelector('[data-wishlisted-label]')){
              el.querySelector('[data-wishlisted-label]').textContent = added;
            } else { el.textContent = added; }
          } finally { el.disabled = false; }
        });
      });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', hydrate); else hydrate();
})();
