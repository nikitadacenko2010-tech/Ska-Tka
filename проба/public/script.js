async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'помилка');
  }
  return res.json().catch(() => ({}));
}

async function getMe() {
  try { return await api('/api/auth/me'); } catch { return null; }
}

document.addEventListener('DOMContentLoaded', async () => {
  fetch('/api/auth/visit', { method: 'POST', credentials: 'include' }).catch(() => {});
  const me = await getMe();
  const nameEl = document.getElementById('profileUsername');
  if (nameEl) nameEl.textContent = me ? (me.name || 'Акаунт') : 'Увійти';
  updateCounters();
  initGlobalHandlers(me);
  if (document.getElementById('hitAdsGrid')) initHomePageHits();
  if (document.getElementById('catalogAdsGrid')) initCatalog();
  if (document.getElementById('productMainImage')) initProductPage();
  if (document.getElementById('createAdForm')) initCreateAdForm();
  if (document.getElementById('proceedCheckoutBtn')) initCheckoutPage();
  if (document.getElementById('ordersContentBody')) initProfilePage();
  if (document.body.dataset.page === 'admin') initAdminPage();
});

function updateCounters() {
  const cart = JSON.parse(localStorage.getItem('skatka_cart') || '[]');
  if (document.getElementById('cartCounter')) document.getElementById('cartCounter').textContent = cart.length;
  api('/api/products/favorites/list').then(f => {
    if (document.getElementById('favCounter')) document.getElementById('favCounter').textContent = f.length;
  }).catch(() => {});
}

function initGlobalHandlers(me) {
  document.querySelectorAll('.btn-post, a[href="create.html"]').forEach(el => {
    if (!me || me.role !== 'admin') el.style.display = 'none';
  });

  const userBtn = document.getElementById('userMenuBtn');
  const dropdown = document.getElementById('profileDropdown');
  userBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const current = await getMe();
    if (!current) return openAuthModal();
    dropdown?.classList.toggle('active');
  });
  document.addEventListener('click', () => dropdown?.classList.remove('active'));
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    location.reload();
  });
  document.getElementById('openCartModal')?.addEventListener('click', renderCartModal);
  document.getElementById('closeModal')?.addEventListener('click', closeModal);
  document.getElementById('openFriendsBtn')?.addEventListener('click', () => openModal('Для друзів', '<p style="text-align:center;padding:20px;font-weight:900;">Реферальна програма недоступна.</p>'));
  document.getElementById('dropdownFriendsBtn')?.addEventListener('click', () => openModal('Для друзів', '<p style="text-align:center;padding:20px;font-weight:900;">Реферальна програма недоступна.</p>'));
  document.getElementById('openFavModal')?.addEventListener('click', renderFavModal);
}

function openModal(title, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('genericModal').classList.add('active');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.getElementById('genericModal').classList.remove('active');
}

function openAuthModal() {
  openModal('Вхід', `
    <div class="form-field"><label>Email</label><input id="authEmail" type="email"></div>
    <div class="form-field"><label>Пароль</label><input id="authPass" type="password"></div>
    <button class="action-btn" onclick="doLogin()">Увійти</button>
    <button class="secondary-btn" style="width:100%;margin-top:10px;" onclick="showRegister()">Реєстрація</button>
    <div id="authErr" style="color:#ef4444;margin-top:10px;font-weight:800;text-align:center;"></div>
  `);
}
window.showRegister = () => {
  openModal('Реєстрація', `
    <div class="form-field"><label>Імʼя</label><input id="regName"></div>
    <div class="form-field"><label>Email</label><input id="regEmail" type="email"></div>
    <div class="form-field"><label>Пароль</label><input id="regPass" type="password"></div>
    <button class="action-btn" onclick="doRegister()">Створити акаунт</button>
  `);
};
window.doLogin = async () => {
  try {
    await api('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: document.getElementById('authEmail').value, password: document.getElementById('authPass').value }) });
    location.reload();
  } catch(e) { document.getElementById('authErr').textContent = e.message; }
};
window.doRegister = async () => {
  try {
    await api('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: document.getElementById('regName').value, email: document.getElementById('regEmail').value, password: document.getElementById('regPass').value }) });
    location.reload();
  } catch(e) { alert(e.message); }
};

async function initHomePageHits() {
  const grid = document.getElementById('hitAdsGrid');
  const items = await api('/api/products');
  grid.innerHTML = items.slice(0,6).map(cardHtml).join('');
}

function cardHtml(item) {
  const imgs = item.images || [];
  const first = imgs[0] || '';
  const dots = imgs.length > 1
    ? `<div class="card-dots">${imgs.map((_, i) => `<span class="${i===0?'active':''}" data-i="${i}"></span>`).join('')}</div>`
    : '';
  return `
    <div class="ad-card" data-id="${item.id}" onclick="goToProduct(${item.id})">
      <div class="ad-img-wrap">
        <img src="${first}" alt="${item.title}" class="card-img" data-index="0" data-images='${JSON.stringify(imgs)}'>
        ${imgs.length > 1 ? `<button class="card-nav prev" onclick="event.stopPropagation();cardSlide(this,-1)">‹</button>
        <button class="card-nav next" onclick="event.stopPropagation();cardSlide(this,1)">›</button>` : ''}
        ${dots}
      </div>
      <div class="ad-content"><div class="ad-title">${item.title}</div><div class="ad-price">${item.price} грн</div></div>
    </div>`;
}

window.cardSlide = function(btn, dir) {
  const wrap = btn.closest('.ad-img-wrap');
  const img = wrap.querySelector('.card-img');
  const imgs = JSON.parse(img.dataset.images || '[]');
  let i = Number(img.dataset.index || 0);
  i = (i + dir + imgs.length) % imgs.length;
  img.src = imgs[i];
  img.dataset.index = i;
  wrap.querySelectorAll('.card-dots span').forEach((d, idx) => d.classList.toggle('active', idx === i));
};

window.goToProduct = (id) => { localStorage.setItem('skatka_current_product', id); location.href = 'product.html'; };

async function initCatalog() {
  const grid = document.getElementById('catalogAdsGrid');
  const search = document.getElementById('searchInput');
  const filterBtn = document.getElementById('openFilterModal');
  let filters = { category:'all', minPrice:'', maxPrice:'', condition:'all', search:'' };

  async function render() {
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k,v]) => { if (v) q.set(k, v); });
    const items = await api('/api/products?' + q.toString());
    grid.innerHTML = items.length ? items.map(cardHtml).join('') : '<p style="grid-column:1/-1;text-align:center;padding:30px;font-weight:800;color:#627d98;">Товарів не знайдено</p>';
  }
  render();
  search?.addEventListener('input', e => { filters.search = e.target.value; render(); });
  filterBtn?.addEventListener('click', () => {
    openModal('Фільтр', `
      <div class="form-field"><label>Категорія</label><select id="fCat">
        <option value="all">Усі</option><option value="electronics">Електроніка</option>
        <option value="auto">Транспорт</option><option value="property">Нерухомість</option>
        <option value="work">Робота</option><option value="other">Інше</option></select></div>
      <div class="form-field"><label>Стан</label><select id="fCond">
        <option value="all">Будь-який</option><option value="new">Нове</option><option value="used">Б/У</option></select></div>
      <div class="form-field"><label>Мін. ціна</label><input id="fMin" type="number"></div>
      <div class="form-field"><label>Макс. ціна</label><input id="fMax" type="number"></div>
      <button class="action-btn" onclick="applyFilters()">Застосувати</button>
    `);
    window.applyFilters = () => {
      filters.category = document.getElementById('fCat').value;
      filters.condition = document.getElementById('fCond').value;
      filters.minPrice = document.getElementById('fMin').value;
      filters.maxPrice = document.getElementById('fMax').value;
      closeModal(); render();
    };
  });
}

async function initProductPage() {
  const id = localStorage.getItem('skatka_current_product');
  if (!id) return;
  const item = await api('/api/products/' + id);
  const imgs = item.images || [];
  const main = document.getElementById('productMainImage');
  main.src = imgs[0] || '';

  const thumbs = document.getElementById('productGalleryThumbnails');
  if (thumbs && imgs.length) {
    thumbs.innerHTML = imgs.map((src, i) => `
      <img src="${src}" data-src="${src}" onclick="switchProductImage(this)" style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${i===0?'#0077cc':'#e2e8f0'};">
    `).join('');
  }

  document.getElementById('productTitle').textContent = item.title;
  document.getElementById('productPrice').textContent = item.price + ' грн';
  document.getElementById('productDesc').textContent = item.description;
  document.getElementById('productDate').textContent = 'Опубліковано: ' + new Date(item.createdAt).toLocaleDateString();
  document.getElementById('sellerName').textContent = item.seller?.name || '—';

  document.getElementById('showPhoneBtn')?.addEventListener('click', function(){
    this.textContent = '+38 (066) 020-75-00'; this.style.background = '#059669';
  });
  document.getElementById('addToCartBtn')?.addEventListener('click', () => {
    const cart = JSON.parse(localStorage.getItem('skatka_cart') || '[]');
    cart.push(item); localStorage.setItem('skatka_cart', JSON.stringify(cart));
    updateCounters(); alert('Додано до кошика');
  });
  document.getElementById('buyBtn')?.addEventListener('click', () => {
    localStorage.setItem('skatka_checkout_product', id); location.href = 'checkout.html';
  });
}

window.switchProductImage = function(thumb) {
  document.getElementById('productMainImage').src = thumb.dataset.src;
  document.querySelectorAll('#productGalleryThumbnails img').forEach(t => t.style.borderColor = '#e2e8f0');
  thumb.style.borderColor = '#0077cc';
};

function renderCartModal() {
  const cart = JSON.parse(localStorage.getItem('skatka_cart') || '[]');
  if (!cart.length) return openModal('Кошик', '<p style="text-align:center;padding:20px;font-weight:800;">Порожній</p>');
  const html = cart.map((it, i) => `
    <div style="display:flex;gap:10px;align-items:center;border-bottom:1px solid #edf2f7;padding:8px 0;">
      <img src="${(it.images&&it.images[0])||''}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">
      <div style="flex:1;font-weight:900;">${it.title}<div style="color:#0077cc;">${it.price} грн</div></div>
      <button onclick="removeFromCart(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;"><i class="fa-solid fa-trash-can"></i></button>
    </div>`).join('');
  openModal('Кошик', html + `<button class="action-btn" style="margin-top:15px;" onclick="location.href='checkout.html'">Оформити</button>`);
}
window.removeFromCart = (i) => {
  const cart = JSON.parse(localStorage.getItem('skatka_cart') || '[]');
  cart.splice(i,1); localStorage.setItem('skatka_cart', JSON.stringify(cart));
  updateCounters(); renderCartModal();
};

async function renderFavModal() {
  try {
    const favs = await api('/api/products/favorites/list');
    if (!favs.length) return openModal('Обране', '<p style="text-align:center;padding:20px;font-weight:800;">Порожньо</p>');
    const html = favs.map(it => `
      <div style="display:flex;gap:10px;align-items:center;border-bottom:1px solid #edf2f7;padding:8px 0;">
        <img src="${(it.images&&it.images[0])||''}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">
        <div style="flex:1;font-weight:900;">${it.title}<div style="color:#0077cc;">${it.price} грн</div></div>
        <button onclick="toggleFav(${it.id}, this)" style="background:none;border:none;color:#ef4444;cursor:pointer;"><i class="fa-solid fa-heart"></i></button>
      </div>`).join('');
    openModal('Обране', html);
  } catch(e) { openAuthModal(); }
}
window.toggleFav = async (id) => {
  await api('/api/products/favorites/' + id, { method: 'POST' });
  renderFavModal(); updateCounters();
};

async function initCreateAdForm() {
  const fileInput = document.getElementById('newImageFiles');
  const galleryPreview = document.getElementById('imgPreviewGallery');
  fileInput?.addEventListener('change', (e) => {
    galleryPreview.innerHTML = '';
    const files = Array.from(e.target.files).slice(0, 7);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.style.cssText = 'width:85px;height:85px;object-fit:cover;border-radius:10px;border:2px solid #0077cc;';
        galleryPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  document.getElementById('createAdForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', document.getElementById('newTitle').value);
      fd.append('category', document.getElementById('newCategory').value);
      fd.append('condition', document.getElementById('newCondition').value);
      fd.append('price', document.getElementById('newPrice').value);
      fd.append('description', document.getElementById('newDesc').value);
      const files = Array.from(document.getElementById('newImageFiles').files).slice(0, 7);
      files.forEach(f => fd.append('images', f));
      await api('/api/products', { method: 'POST', body: fd });
      alert('Оголошення додано!');
      location.href = 'category.html';
    } catch (e) { alert(e.message); }
  });
}

async function initCheckoutPage() {
  const id = localStorage.getItem('skatka_checkout_product') || localStorage.getItem('skatka_current_product');
  if (!id) return;
  try {
    const item = await api('/api/products/' + id);
    document.getElementById('summaryTitle').textContent = item.title;
    document.getElementById('summaryPrice').textContent = item.price + ' грн';
    document.getElementById('totalText').textContent = item.price + ' грн';
    document.getElementById('summaryImg').src = (item.images && item.images[0]) || '';
    localStorage.setItem('skatka_checkout_item', JSON.stringify(item));
  } catch {}

  document.getElementById('proceedCheckoutBtn')?.addEventListener('click', async () => {
    const item = JSON.parse(localStorage.getItem('skatka_checkout_item') || 'null');
    if (!item) return alert('Товар не знайдено');
    try {
      await api('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.id,
          contactName: document.getElementById('chName').value,
          contactPhone: document.getElementById('chPhone').value,
          city: document.getElementById('chCity').value,
          department: document.getElementById('chDepartment').value
        })
      });
      localStorage.removeItem('skatka_cart');
      alert('Замовлення оформлено!');
      location.href = 'profile.html?tab=orders';
    } catch (e) { alert(e.message); }
  });
}

async function initProfilePage() {
  const me = await getMe();
  if (!me) return openAuthModal();

  if (document.getElementById('accDisplayName')) document.getElementById('accDisplayName').value = me.name || '';
  if (document.getElementById('profileUsername')) document.getElementById('profileUsername').textContent = me.name;

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    location.reload();
  });

  const ordersBody = document.getElementById('ordersContentBody');
  if (ordersBody) {
    try {
      const orders = await api('/api/orders/my');
      ordersBody.innerHTML = orders.length
        ? orders.map(o => `
          <div style="display:flex;gap:15px;align-items:center;padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;margin-bottom:12px;">
            <img src="${(o.product?.images && o.product.images[0]) || ''}" style="width:65px;height:65px;object-fit:cover;border-radius:8px;">
            <div style="flex:1;">
              <div style="font-weight:900;color:#102a43;">${o.product?.title || '—'}</div>
              <div style="font-size:13px;font-weight:700;color:#627d98;">${new Date(o.createdAt).toLocaleDateString()} · ${o.status}</div>
            </div>
            <div style="font-weight:900;color:#0077cc;">${o.product?.price || ''} грн</div>
          </div>`).join('')
        : '<p style="text-align:center;font-weight:800;color:#243b53;">Замовлень ще немає.</p>';
    } catch {}
  }
}

window.uploadAvatar = function(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('profileAvatarImg').src = e.target.result;
      localStorage.setItem('skatka_user_avatar', e.target.result);
    };
    reader.readAsDataURL(input.files[0]);
  }
};
window.showProfileTab = function(tabName) {
  document.querySelectorAll('.profile-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.secondary-btn').forEach(btn => btn.classList.remove('active'));
  const tabMap = { 'account': 'btnTabAccount', 'addresses': 'btnTabAddresses', 'settings': 'btnTabSettings', 'orders': 'btnTabOrders', 'wishlist': 'btnTabWishlist' };
  if (document.getElementById(tabMap[tabName])) document.getElementById(tabMap[tabName]).classList.add('active');
  if (tabName === 'orders') {
    document.getElementById('sectionOrders').style.display = 'block';
    initProfilePage();
  } else if (tabName === 'wishlist') {
    document.getElementById('sectionWishlist').style.display = 'block';
  } else {
    const sec = document.getElementById('section' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (sec) sec.style.display = 'block';
  }
};
window.resetForm = () => alert('Скинуто');
window.updateProfile = async () => { alert('Оновлено'); };
window.addNewAddress = () => prompt('Введіть адресу');

async function initAdminPage() {
  const me = await getMe();
  if (!me || me.role !== 'admin') { location.href = 'index.html'; return; }

  try {
    const s = await api('/api/admin/stats');
    document.getElementById('statUsers').textContent = s.users;
    document.getElementById('statProducts').textContent = s.products;
    document.getElementById('statOrders').textContent = s.orders;
    document.getElementById('statRemoved').textContent = s.removed;
  } catch {}

  try {
    const a = await api('/api/admin/analytics?period=day');
    document.getElementById('anVisits').textContent = a.visits;
    document.getElementById('anViews').textContent = a.views;
    document.getElementById('anLogins').textContent = a.logins;
    document.getElementById('anOrders').textContent = a.orders;
    document.getElementById('anActive').textContent = a.activeUsers;
  } catch {}

  try {
    const users = await api('/api/admin/users');
    const tbody = document.getElementById('adminUsersBody');
    if (tbody) tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td><td>${u.email}</td><td>${u.name}</td><td>${u.role}</td>
        <td>${u.isBlocked ? 'так' : 'ні'}</td>
        <td><button class="secondary-btn" onclick="toggleBlock(${u.id}, ${!u.isBlocked})">${u.isBlocked ? 'Розблокувати' : 'Заблокувати'}</button></td>
      </tr>`).join('');
  } catch {}

  try {
    const items = await api('/api/admin/products');
    const tbody = document.getElementById('adminProductsBody');
    if (tbody) tbody.innerHTML = items.map(p => `
      <tr>
        <td>${p.id}</td><td>${p.title}</td><td>${p.price}</td>
        <td>${p.seller?.name || '—'}</td><td>${p.status}</td>
        <td><button class="secondary-btn" onclick="adminDeleteProduct(${p.id})">Видалити</button></td>
      </tr>`).join('');
  } catch {}
}

window.toggleBlock = async (id, block) => {
  await api(`/api/admin/users/${id}/block`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ isBlocked: block }) });
  location.reload();
};
window.adminDeleteProduct = async (id) => {
  if (!confirm('Видалити?')) return;
  await api('/api/admin/products/' + id, { method: 'DELETE' });
  location.reload();
};