(()=>{
  const ROOT_SEL = '[data-wl-root]';
  const PROXY_BASE = '/apps/wishlisted/api/proxy';

  async function getWishlist(){
    const r = await fetch(`${PROXY_BASE}/wishlist`);
    if(!r.ok) throw new Error('wishlist fetch failed');
    return r.json();
  }

  async function storefront(query, variables){
    const r = await fetch(`${PROXY_BASE}/storefront`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ query, variables })
    });
    if(!r.ok) throw new Error('storefront fetch failed');
    return r.json();
  }

  async function removeItem(id){
    const r = await fetch(`${PROXY_BASE}/wishlist/items/${encodeURIComponent(id)}`, { method:'POST' });
    if(!r.ok) throw new Error('remove failed');
    return r.json();
  }

  function money(m){
    if(!m) return '';
    try{ return new Intl.NumberFormat(undefined, { style:'currency', currency:m.currencyCode }).format(Number(m.amount)); }catch{ return `${m.amount} ${m.currencyCode}` }
  }

  function renderEmpty(root){
    root.innerHTML = `<p class="wl-empty">Your wishlist is empty.</p>`;
  }

  function render(root, items, detailsById){
    if(!items.length) return renderEmpty(root);
    root.innerHTML = items.map(it=>{
      const d = detailsById[it.variantGid];
      if(!d) return '';
      const img = d.product?.featuredImage;
      const url = d.product?.handle ? `/products/${d.product.handle}?variant=${encodeURIComponent(d.id.split('/').pop())}` : '#';
      return `<article class="wl-card">
        <a href="${url}">${img?`<img src="${img.url}" alt="${img.altText||''}">`:'<div></div>'}</a>
        <div>
          <h3 class="wl-title"><a href="${url}">${d.product?.title||'Product'}</a></h3>
          <div class="wl-price">${money(d.price)}</div>
        </div>
        <div>
          <button data-wl-remove="${it.id}">Remove</button>
        </div>
      </article>`;
    }).join('');
    root.querySelectorAll('[data-wl-remove]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        btn.disabled = true;
        await removeItem(btn.getAttribute('data-wl-remove'));
        btn.closest('.wl-card').remove();
        if(!root.querySelector('.wl-card')) renderEmpty(root);
      });
    });
  }

  async function init(){
    const root = document.querySelector(ROOT_SEL);
    if(!root) return;
    try{
      const { list } = await getWishlist();
      const ids = list.items.map(i=>i.variantGid);
      if(ids.length === 0) return renderEmpty(root);
      const query = `query($ids:[ID!]!){
        nodes(ids:$ids){
          ... on ProductVariant { id title price { amount currencyCode } product { title handle featuredImage { url altText } } }
        }
      }`;
      const sf = await storefront(query, { ids });
      const nodes = (sf.data && sf.data.nodes) || [];
      const byId = {};
      nodes.forEach(n=>{ if(n && n.id) byId[n.id] = n; });
      render(root, list.items, byId);
    } catch(e){
      console.error('[Wishlisted] page init failed', e);
      const root = document.querySelector(ROOT_SEL);
      if(root) root.innerHTML = '<p class="wl-empty">There was a problem loading your wishlist.</p>'
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
