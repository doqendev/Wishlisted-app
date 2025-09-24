(()=>{
  const BASE = '/apps/wishlisted';
  const root = document.querySelector('[data-wl-root]');
  if(!root){ console.warn('[Wishlisted] root not found'); return; }

  const state = { items: [], loading: true, error: null };

  function el(tag, attrs = {}, children = []){
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k === 'class') node.className = v;
      else if(k === 'html') node.innerHTML = v;
      else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if(v !== undefined && v !== null) node.setAttribute(k, v);
    });
    children.forEach(c=> node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  }

  function priceToString(price){
    if(price == null) return '';
    try{
      if(typeof Shopify !== 'undefined' && Shopify.locale){
        return new Intl.NumberFormat(Shopify.locale, { style: 'currency', currency: Shopify.currency?.active || 'USD' }).format(Number(price));
      }
    }catch(_){}
    return `$${Number(price).toFixed(2)}`;
  }

  function normalizeItems(json){
    if(!json) return [];
    // Accept several shapes: {items:[...]}, [...]
    const arr = Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : []);
    return arr.map((it)=>{
      // Try to normalize common fields
      const id = it.id || it.itemId || it.wishlistItemId || it.gid || it._id || null;
      const product = it.product || it.productData || it.node || it;
      const variant = it.variant || it.variantData || it.selectedVariant || null;
      const title = product?.title || it.title || 'Untitled product';
      const handle = product?.handle || it.handle || null;
      const url = product?.url || (handle ? `/products/${handle}` : '#');
      const image = (product?.images?.[0]?.src) || (product?.featuredImage?.url) || it.image || it.imageUrl || variant?.image?.url || null;
      const price = variant?.price || product?.price || product?.priceRange?.minVariantPrice?.amount || it.price || null;
      return { id, title, url, image, price, raw: it };
    });
  }

  async function fetchJson(url, opts){
    const r = await fetch(url, opts);
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = r.headers.get('content-type') || '';
    if(ct.includes('application/json')) return r.json();
    // allow liquid-rendered JSON in text
    const text = await r.text();
    try{ return JSON.parse(text); } catch(_){ return { html: text }; }
  }

  async function load(){
    state.loading = true; state.error = null; render();
    // Try multiple endpoints for robustness
    const endpoints = [`${BASE}/wishlist/items`, `${BASE}/wishlist`];
    for(const ep of endpoints){
      try{
        const json = await fetchJson(ep);
        if(json?.html){ root.innerHTML = json.html; return; }
        state.items = normalizeItems(json);
        state.loading = false;
        render();
        return;
      } catch(err){
        console.warn('[Wishlisted] fetch failed for', ep, err);
      }
    }
    state.loading = false; state.error = 'Could not load wishlist.'; render();
  }

  async function removeItem(item){
    try{
      const id = item.id || item.raw?.id;
      const url = id ? `${BASE}/wishlist/items/${encodeURIComponent(id)}` : `${BASE}/wishlist/items`;
      await fetch(url, { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: id ? null : JSON.stringify({ id }) });
      state.items = state.items.filter(x=> x !== item);
      render();
    } catch(err){
      console.error('[Wishlisted] remove failed', err);
      alert('Sorry, failed to remove that item.');
    }
  }

  function render(){
    root.innerHTML = '';
    if(state.loading){
      root.appendChild(el('div', { class: 'wl-empty' }, ['Loading your wishlist…']));
      return;
    }
    if(state.error){
      root.appendChild(el('div', { class: 'wl-empty' }, [state.error]));
      return;
    }
    if(!state.items.length){
      root.appendChild(el('div', { class: 'wl-empty' }, ['Your wishlist is empty.']));
      return;
    }
    state.items.forEach((it)=>{
      const img = it.image ? el('img', { src: it.image, alt: it.title }) : el('div', { class: 'wl-img-fallback' }, ['No image']);
      const title = el('a', { href: it.url, class: 'wl-title' }, [it.title]);
      const price = el('div', { class: 'wl-price' }, [priceToString(it.price)]);
      const info = el('div', {}, [title, price]);
      const removeBtn = el('button', { class: 'wl-remove', onClick: ()=> removeItem(it) }, ['Remove']);
      const card = el('div', { class: 'wl-card' }, [img, info, removeBtn]);
      root.appendChild(card);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
