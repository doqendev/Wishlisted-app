// Theme app extension bundle (re-exports public API)
(()=>{
  const BASE = '/apps/wishlisted';
  async function addItem({ productGid, variantGid, wishlistId }){
    console.log('[Wishlisted] addItem →', { productGid, variantGid, wishlistId, url: `${BASE}/wishlist/items` });
    const r = await fetch(`${BASE}/wishlist/items`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ productGid, variantGid, wishlistId })
    });
    console.log('[Wishlisted] addItem response', r.status, r.statusText);
    if(!r.ok){
      const text = await r.text().catch(()=> '');
      console.error('[Wishlisted] addItem error', r.status, text);
      throw new Error('Add failed');
    }
    const json = await r.json().catch(()=> ({}));
    console.log('[Wishlisted] addItem json', json);
    return json;
  }
  function hydrate(){
    console.log('[Wishlisted] hydrate buttons');
    document.querySelectorAll('[data-wishlisted]')
      .forEach(el=>{
        if(el.__wl) return; el.__wl = true;
        el.addEventListener('click', async ()=>{
          try{
            const productGid = el.getAttribute('data-product-gid');
            const variantGid = el.getAttribute('data-variant-gid');
            console.log('[Wishlisted] click', { productGid, variantGid });
            el.disabled = true;
            await addItem({ productGid, variantGid });
            el.classList.add('wishlisted--added');
            const added = el.dataset.addedLabel || 'Wishlisted';
            if(el.querySelector('[data-wishlisted-label]')){
              el.querySelector('[data-wishlisted-label]').textContent = added;
            } else { el.textContent = added; }
            console.log('[Wishlisted] button updated');
          } catch(err){
            console.error('[Wishlisted] click failed', err);
          } finally { el.disabled = false; }
        });
      });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', hydrate); else hydrate();
})();
