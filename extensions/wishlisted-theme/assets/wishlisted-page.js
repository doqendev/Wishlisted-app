(()=>{
  const BASE = '/apps/wishlisted';
  const root = document.querySelector('[data-wl-root]');
  if(!root){ console.warn('[Wishlisted] root not found'); return; }

  const state = { items: [], loading: true, error: null, share: { isPublic: false, token: null, saving: false } };

  function el(tag, attrs = {}, children = []){
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k === 'class') node.className = v;
      else if(k === 'html') node.innerHTML = v;
      else if(k === 'value') node.value = v;
      else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if(v !== undefined && v !== null) node.setAttribute(k, v);
    });
    children.forEach(c=> node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  }

  function priceToString(price, currency){
    if(price == null) return '';
    try{
      const locale = (typeof Shopify !== 'undefined' && Shopify.locale) ? Shopify.locale : undefined;
      const curr = currency || (typeof Shopify !== 'undefined' && Shopify.currency?.active) || 'USD';
      return new Intl.NumberFormat(locale, { style: 'currency', currency: curr }).format(Number(price));
    }catch(_){}
    return `${Number(price).toFixed(2)}`;
  }

  function normalizeItems(json){
    if(!json) return [];
    const arr = Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : (Array.isArray(json.list?.items) ? json.list.items : []));
    return arr.map((it)=>{
      const id = it.id || it.itemId || it.wishlistItemId || it.gid || it._id || null;
      const product = it.product || it.productData || it.node || it;
      const variant = it.variant || it.variantData || it.selectedVariant || null;
      const title = product?.title || it.title || 'Untitled product';
      const handle = product?.handle || it.handle || null;
      const url = product?.url || (handle ? `/products/${handle}` : '#');
      const image = (product?.images?.[0]?.src) || (product?.featuredImage?.url) || it.image || it.imageUrl || variant?.image?.url || null;
      const price = variant?.price || product?.price || product?.priceRange?.minVariantPrice?.amount || it.price || null;
      const currencyCode = variant?.price?.currencyCode || product?.priceRange?.minVariantPrice?.currencyCode || undefined;
      return { id, title, url, image, price, currencyCode, raw: it, productGid: it.productGid, variantGid: it.variantGid };
    });
  }

  async function fetchJson(url, opts){
    const r = await fetch(url, opts);
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = r.headers.get('content-type') || '';
    if(ct.includes('application/json')) return r.json();
    const text = await r.text();
    try{ return JSON.parse(text); } catch(_){ return { html: text }; }
  }

  async function hydrateFromStorefront(raw){
    try{
      const items = Array.isArray(raw?.list?.items) ? raw.list.items : (raw?.items || []);
      const ids = Array.from(new Set(items.map(i=> i.variantGid || i.productGid).filter(Boolean)));
      if(!ids.length) return normalizeItems(raw);
      const query = `query WL($ids:[ID!]!){
        nodes(ids:$ids){
          __typename
          ... on ProductVariant { id title image{ url } price { amount currencyCode } product{ title handle } }
          ... on Product { id title handle featuredImage{ url } priceRange { minVariantPrice { amount currencyCode } } }
        }
      }`;
      const res = await fetchJson(`${BASE}/storefront`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query, variables: { ids } }) });
      const byId = {};
      for(const node of (res?.data?.nodes||[])){ if(node?.id) byId[node.id] = node; }
      const enriched = items.map(it=>{
        const node = byId[it.variantGid] || byId[it.productGid] || null;
        const title = node?.product?.title || node?.title;
        const handle = node?.product?.handle || node?.handle;
        const url = handle ? `/products/${handle}` : undefined;
        const image = node?.image?.url || node?.featuredImage?.url;
        const price = node?.price?.amount || node?.priceRange?.minVariantPrice?.amount;
        const currencyCode = node?.price?.currencyCode || node?.priceRange?.minVariantPrice?.currencyCode;
        return { id: it.id, productGid: it.productGid, variantGid: it.variantGid, title, url, image, price, currencyCode, raw: it };
      });
      return normalizeItems({ items: enriched });
    } catch(e){ console.warn('[Wishlisted] hydration failed', e); return normalizeItems(raw); }
  }

  async function load(){
    state.loading = true; state.error = null; render();
    try{
      const data = await fetchJson(`${BASE}/wishlist`);
      if(data?.list){
        state.share.isPublic = !!data.list.isPublic;
        state.share.token = data.list.shareToken || null;
      }
      state.items = await hydrateFromStorefront(data);
      state.loading = false;
      render();
      return;
    } catch(err){
      console.warn('[Wishlisted] fetch failed', err);
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

  async function setSharePublic(isPublic){
    try{
      state.share.saving = true; render();
      const res = await fetch(`${BASE}/wishlist/share`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ makePublic: isPublic }) });
      const json = await res.json();
      state.share.isPublic = !!json.list.isPublic;
      state.share.token = json.list.shareToken;
    } finally { state.share.saving = false; render(); }
  }

  async function rotateShare(){
    try{
      state.share.saving = true; render();
      const res = await fetch(`${BASE}/wishlist/share`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ rotate: true }) });
      const json = await res.json();
      state.share.token = json.list.shareToken;
    } finally { state.share.saving = false; render(); }
  }

  function shareControls(){
    const url = state.share.token ? `${location.origin}/apps/wishlisted/public/${state.share.token}` : '';
    return el('div', { class: 'wl-share' }, [
      el('label', { class: 'wl-share-toggle' }, [
        el('input', { type: 'checkbox', checked: state.share.isPublic ? 'checked' : null, onChange: (e)=> setSharePublic(e.target.checked) }),
        ' Make wishlist public'
      ]),
      state.share.isPublic && state.share.token ? el('div', { class: 'wl-share-url' }, [
        el('input', { type: 'text', readonly: 'readonly', value: url, onFocus:(e)=> e.target.select() }),
        el('button', { onClick: ()=> { navigator.clipboard?.writeText(url); } }, ['Copy link']),
        el('button', { onClick: rotateShare }, ['Rotate link'])
      ]) : el('div', { class: 'wl-share-url' }, ['Sharing is off'])
    ]);
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
    root.appendChild(shareControls());

    if(!state.items.length){
      root.appendChild(el('div', { class: 'wl-empty' }, ['Your wishlist is empty.']));
      return;
    }
    state.items.forEach((it)=>{
      const img = it.image ? el('img', { src: it.image, alt: it.title }) : el('div', { class: 'wl-img-fallback' }, ['No image']);
      const title = el('a', { href: it.url || '#', class: 'wl-title' }, [it.title || 'Untitled product']);
      const price = el('div', { class: 'wl-price' }, [priceToString(it.price, it.currencyCode)]);
      const info = el('div', {}, [title, price]);
      const removeBtn = el('button', { class: 'wl-remove', onClick: ()=> removeItem(it) }, ['Remove']);
      const card = el('div', { class: 'wl-card' }, [img, info, removeBtn]);
      root.appendChild(card);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
