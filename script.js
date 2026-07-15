const CONFIG = {
  whatsappNumber: "556492360895",
  businessName: "Mao na Brasa",
  deliveryFee: 10,
  supabaseUrl: "https://oxwchuduvegkgubautit.supabase.co",
  supabaseKey: "sb_publishable_StBXgUqUyPh-wiItDIR5hg_7fol45Yl"
};

const supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

const DEFAULT_SETTINGS = {
  businessName: "Mao na Brasa",
  whatsappNumber: "556492360895",
  deliveryFee: 10,
  brandLabel: "Mao na Brasa",
  heroEyebrow: "Burger artesanal • brasa • sabor",
  heroTitle: "Churrasco.\nSabor.\nAtitude.",
  heroText: "Burgers artesanais feitos na brasa, porcoes caprichadas, bebidas geladas e combos para matar a fome de verdade.",
  heroLogo: "mao-na-brasa-icon-512.png",
  bannerImage: "maonabrasa-banner.png",
  highlight1Title: "Brasa de verdade",
  highlight1Text: "Visual forte, sabor marcante e uma experiencia feita para quem gosta de lanche com presenca.",
  highlight2Title: "Pedido rapido",
  highlight2Text: "Escolha os itens, confira o total e envie tudo pronto direto para o WhatsApp.",
  highlight3Title: "Cardapio editavel",
  highlight3Text: "Produtos, categorias, fotos e disponibilidade continuam sendo atualizados pelo painel admin.",
  aboutEyebrow: "Sobre nos",
  aboutTitle: "Nao e so lanche. E experiencia.",
  aboutText: "O Mao na Brasa nasceu para entregar burgers com presenca: pao macio, carne bem preparada, queijo derretendo e aquele aroma de brasa que abre o apetite antes da primeira mordida.",
  aboutLine1: "Atendimento de segunda a sabado",
  aboutLine2: "Combos, burgers, porcoes, sobremesas e bebidas",
  aboutLine3: "Pedido enviado direto para o WhatsApp",
  contactEyebrow: "Peca agora",
  contactTitle: "Bateu a fome?",
  contactText: "Monte seu pedido no site e envie direto no WhatsApp do Mao na Brasa."
};

let siteSettings = { ...DEFAULT_SETTINGS };
let products = [];
let addons = [];
let activeCategory = "Todos";
let cart = JSON.parse(localStorage.getItem("maoNaBrasaCart")) || [];
let currentAddonProduct = null;
let deferredInstallPrompt = null;

const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const $ = selector => document.querySelector(selector);

function init() {
  loadSettings();
  setupEvents();
  setupReveal();
  setupPWAInstall();
  showTutorialOnce();
  $("#year").textContent = new Date().getFullYear();
  loadProducts();
  loadAddons();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

async function loadSettings() {
  const { data, error } = await supabaseClient
    .from("mnb_site_settings")
    .select("settings")
    .eq("id", "main")
    .maybeSingle();

  if (!error && data?.settings) {
    siteSettings = { ...DEFAULT_SETTINGS, ...data.settings };
  }

  CONFIG.businessName = siteSettings.businessName || DEFAULT_SETTINGS.businessName;
  CONFIG.whatsappNumber = siteSettings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber;
  CONFIG.deliveryFee = Number(siteSettings.deliveryFee ?? DEFAULT_SETTINGS.deliveryFee);
  applySettings();
  setupLinks();
  renderCart();
}

function applySettings() {
  setText("heroEyebrow", siteSettings.heroEyebrow);
  setHeroTitle(siteSettings.heroTitle);
  setText("heroText", siteSettings.heroText);
  setText("highlight1Title", siteSettings.highlight1Title);
  setText("highlight1Text", siteSettings.highlight1Text);
  setText("highlight2Title", siteSettings.highlight2Title);
  setText("highlight2Text", siteSettings.highlight2Text);
  setText("highlight3Title", siteSettings.highlight3Title);
  setText("highlight3Text", siteSettings.highlight3Text);
  setText("aboutEyebrow", siteSettings.aboutEyebrow);
  setText("aboutTitle", siteSettings.aboutTitle);
  setText("aboutText", siteSettings.aboutText);
  setText("aboutLine1", siteSettings.aboutLine1);
  setText("aboutLine2", siteSettings.aboutLine2);
  setText("aboutLine3", siteSettings.aboutLine3);
  setText("contactEyebrow", siteSettings.contactEyebrow);
  setText("contactTitle", siteSettings.contactTitle);
  setText("contactText", siteSettings.contactText);
  setText("footerBrand", siteSettings.brandLabel || siteSettings.businessName);

  const brandLabel = $("#brandLabel");
  if (brandLabel) brandLabel.innerHTML = escapeHtml(siteSettings.brandLabel || siteSettings.businessName).replace(/\bBrasa\b/i, "<strong>Brasa</strong>");

  setImage("brandLogo", siteSettings.heroLogo);
  setImage("heroLogo", siteSettings.heroLogo);
  setImage("aboutLogo", siteSettings.heroLogo);
  setImage("bannerImage", siteSettings.bannerImage);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

function setImage(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.src = value;
}

function setHeroTitle(value) {
  const el = $("#heroTitle");
  if (!el) return;
  const lines = String(value || "").split(/\n+/).filter(Boolean);
  el.innerHTML = lines.map((line, index) => index === 1 ? `<span>${escapeHtml(line)}</span>` : escapeHtml(line)).join("<br>");
}

function setupLinks() {
  const text = encodeURIComponent(`Ola! Vim pelo site do ${CONFIG.businessName} e quero fazer um pedido.`);
  const link = `https://wa.me/${CONFIG.whatsappNumber}?text=${text}`;
  $("#heroWhatsapp").href = link;
  $("#contactWhatsapp").href = link;
}

function setupEvents() {
  const menuToggle = $("#menuToggle");
  menuToggle.addEventListener("click", () => {
    const nav = $("#navMenu");
    nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", nav.classList.contains("open"));
  });

  document.querySelectorAll(".nav a").forEach(link => {
    link.addEventListener("click", () => $("#navMenu").classList.remove("open"));
  });

  $("#openCart").addEventListener("click", () => $("#cartPanel").classList.add("open"));
  $("#closeCart").addEventListener("click", () => $("#cartPanel").classList.remove("open"));
  $("#checkoutBtn").addEventListener("click", checkout);
  $("#searchInput").addEventListener("input", renderProducts);
  $("#orderType").addEventListener("change", () => {
    toggleAddress();
    renderCart();
  });
  $("#tutorialOpen").addEventListener("click", () => $("#tutorialModal").showModal());
  $("#closeTutorial").addEventListener("click", () => $("#tutorialModal").close());
  $("#finishTutorial").addEventListener("click", finishTutorial);
  $("#closeAddonModal").addEventListener("click", () => $("#addonModal").close());
  $("#confirmAddonBtn").addEventListener("click", confirmAddonProduct);
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("mnb_products")
    .select("*")
    .eq("available", true)
    .order("sort_order", { ascending: true });

  if (error) {
    $("#menuGrid").innerHTML = `<p class="empty">Nao foi possivel carregar o cardapio agora.</p>`;
    return;
  }

  products = data.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category || "Outros",
    tag: product.tag || "Na brasa",
    description: product.description || "",
    price: Number(product.price || 0),
    image: product.image || "",
    imageFit: product.image_fit || "contain",
    imagePosition: product.image_position || "center",
    hasAddons: Boolean(product.has_addons)
  }));

  cart = cart
    .filter(item => products.some(product => product.id === item.id))
    .map(item => ({
      ...item,
      lineId: item.lineId || `${item.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      lineKey: item.lineKey || JSON.stringify({ id: item.id, addons: item.addons || [], note: item.note || "" }),
      addons: item.addons || [],
      note: item.note || "",
      unitTotal: item.unitTotal || item.price
    }));
  saveCart();
  renderCategories();
  renderProducts();
  renderCart();
}

async function loadAddons() {
  const { data, error } = await supabaseClient
    .from("mnb_addons")
    .select("*")
    .eq("available", true)
    .order("sort_order", { ascending: true });

  if (!error && data) {
    addons = data.map(addon => ({
      id: addon.id,
      name: addon.name,
      price: Number(addon.price || 0)
    }));
  }
}

function renderCategories() {
  const categories = ["Todos", ...new Set(products.map(product => product.category).filter(Boolean))];
  $("#categoryTabs").innerHTML = categories.map(category => `
    <button class="tab-btn ${category === activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
  `).join("");

  document.querySelectorAll(".tab-btn").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const search = $("#searchInput")?.value?.toLowerCase().trim() || "";
  const list = products.filter(product => {
    const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
    const searchable = `${product.name} ${product.category} ${product.tag} ${product.description}`.toLowerCase();
    return matchesCategory && searchable.includes(search);
  });

  $("#menuGrid").innerHTML = list.length ? list.map(product => `
    <article class="product-card reveal show">
      ${product.image ? `<img class="product-image" src="${escapeAttr(product.image)}" alt="${escapeAttr(product.name)}" style="object-fit:${escapeAttr(product.imageFit)};object-position:${escapeAttr(product.imagePosition)};">` : ""}
      <span class="product-tag">${escapeHtml(labelTag(product.tag))}</span>
      <h3>${escapeHtml(product.name)}</h3>
      <p>${escapeHtml(product.description)}</p>
      <div class="product-bottom">
        <strong class="price">${money(product.price)}</strong>
        <button class="add-btn" data-id="${escapeAttr(product.id)}">Adicionar</button>
      </div>
    </article>
  `).join("") : `<p class="empty">Nenhum item encontrado nessa busca.</p>`;

  document.querySelectorAll(".add-btn").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.id));
  });
}

function addToCart(id) {
  const product = products.find(item => String(item.id) === String(id));
  if (!product) return;
  if (product.hasAddons && addons.length) {
    openAddonModal(product);
    return;
  }
  addCartLine(product, [], "");
}

function openAddonModal(product) {
  currentAddonProduct = product;
  $("#addonProductName").textContent = product.name;
  $("#itemNote").value = "";
  $("#addonList").innerHTML = addons.map(addon => `
    <label class="addon-row">
      <span>${escapeHtml(addon.name)}</span>
      <small>${money(addon.price)}</small>
      <input type="checkbox" value="${escapeAttr(addon.id)}">
    </label>
  `).join("");
  $("#addonModal").showModal();
}

function confirmAddonProduct() {
  if (!currentAddonProduct) return;
  const selected = [...document.querySelectorAll("#addonList input:checked")]
    .map(input => addons.find(addon => addon.id === input.value))
    .filter(Boolean);
  addCartLine(currentAddonProduct, selected, $("#itemNote").value.trim());
  $("#addonModal").close();
}

function addCartLine(product, selectedAddons, note) {
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const lineKey = JSON.stringify({
    id: product.id,
    addons: selectedAddons.map(addon => addon.id).sort(),
    note
  });
  const existing = cart.find(item => item.lineKey === lineKey);
  if (existing) existing.quantity += 1;
  else cart.push({
    ...product,
    lineId: `${product.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    lineKey,
    addons: selectedAddons,
    note,
    unitTotal: product.price + addonsTotal,
    quantity: 1
  });
  saveCart();
  renderCart();
  $("#cartPanel").classList.add("open");
}

function changeQty(lineId, amount) {
  cart = cart
    .map(item => String(item.lineId || item.id) === String(lineId) ? { ...item, quantity: item.quantity + amount } : item)
    .filter(item => item.quantity > 0);
  saveCart();
  renderCart();
}

function removeCartItem(lineId) {
  cart = cart.filter(item => String(item.lineId || item.id) !== String(lineId));
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem("maoNaBrasaCart", JSON.stringify(cart));
}

function renderCartLegacy() {
  const cartItems = $("#cartItems");
  if (!cart.length) {
    cartItems.innerHTML = `<p class="empty">Seu pedido ainda esta vazio.</p>`;
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <small>${money(item.unitTotal || item.price)} cada</small>
          ${item.addons?.length ? `<div class="cart-addons">${item.addons.map(addon => `<span>+ ${escapeHtml(addon.name)} (${money(addon.price)})</span>`).join("")}</div>` : ""}
          ${item.note ? `<small class="cart-note">Obs: ${escapeHtml(item.note)}</small>` : ""}
        </div>
        <div class="qty">
          <button onclick="changeQty('${escapeAttr(item.lineId)}', -1)">−</button>
          <strong>${item.quantity}</strong>
          <button onclick="changeQty('${escapeAttr(item.lineId)}', 1)">+</button>
          <button onclick="removeCartItem('${escapeAttr(item.lineId)}')">×</button>
        </div>
      </div>
    `).join("");
  }

  const subtotal = cart.reduce((sum, item) => sum + Number(item.unitTotal || item.price) * item.quantity, 0);
  const isDelivery = $("#orderType")?.value !== "retirada";
  const total = subtotal + (isDelivery && cart.length ? CONFIG.deliveryFee : 0);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  $("#cartSubtotal").textContent = money(subtotal);
  $("#cartTotal").textContent = money(total);
  $("#cartCount").textContent = count;
}

function renderCart() {
  const cartItems = $("#cartItems");
  if (!cart.length) {
    cartItems.innerHTML = `<p class="empty">Seu pedido ainda esta vazio.</p>`;
  } else {
    cartItems.innerHTML = cart.map((item, index) => {
      const unitTotal = Number(item.unitTotal || item.price);
      const lineTotal = unitTotal * item.quantity;
      const lineId = item.lineId || item.id;
      return `
      <div class="cart-item">
        <div class="cart-item-main">
          <div class="cart-item-title">
            <h4>${index + 1}. ${escapeHtml(item.name)}</h4>
            <em>${item.quantity}x</em>
          </div>
          <small>${money(unitTotal)} cada</small>
          ${item.addons?.length ? `<div class="cart-addons"><strong>Adicionais:</strong>${item.addons.map(addon => `<span>+ ${escapeHtml(addon.name)} (${money(addon.price)})</span>`).join("")}</div>` : ""}
          ${item.note ? `<small class="cart-note">Obs: ${escapeHtml(item.note)}</small>` : ""}
          <strong class="cart-line-total">Total do item: ${money(lineTotal)}</strong>
        </div>
        <div class="qty">
          <button onclick="changeQty('${escapeAttr(lineId)}', -1)">-</button>
          <strong>${item.quantity}</strong>
          <button onclick="changeQty('${escapeAttr(lineId)}', 1)">+</button>
          <button onclick="removeCartItem('${escapeAttr(lineId)}')">x</button>
        </div>
      </div>
    `;
    }).join("");
  }

  const subtotal = cart.reduce((sum, item) => sum + Number(item.unitTotal || item.price) * item.quantity, 0);
  const isDelivery = $("#orderType")?.value !== "retirada";
  const deliveryFee = isDelivery && cart.length ? CONFIG.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  $("#cartSubtotal").textContent = money(subtotal);
  $("#cartDeliveryFee").textContent = isDelivery ? money(deliveryFee) : "Retirada";
  $("#cartTotal").textContent = money(total);
  $("#cartCount").textContent = count;
}

async function checkoutLegacy(event) {
  if (!cart.length) {
    event.preventDefault();
    alert("Adicione pelo menos um item ao pedido.");
    return;
  }

  const name = $("#customerName").value.trim();
  if (!name) {
    event.preventDefault();
    alert("Informe seu nome.");
    return;
  }

  const type = $("#orderType").value;
  const address = $("#customerAddress").value.trim();
  if (type === "entrega" && !address) {
    event.preventDefault();
    alert("Informe o endereco para entrega.");
    return;
  }

  const payment = $("#paymentMethod").value;
  const note = $("#customerNote").value.trim();
  const subtotal = cart.reduce((sum, item) => sum + Number(item.unitTotal || item.price) * item.quantity, 0);
  const deliveryFee = type === "entrega" ? CONFIG.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const protocol = `MNB-${Date.now().toString().slice(-6)}`;

  const lines = cart.map(item => {
    const addonText = item.addons?.length ? `\n  ${item.addons.map(addon => `+ ${addon.name}`).join("\n  ")}` : "";
    const noteText = item.note ? `\n  Obs: ${item.note}` : "";
    return `• ${item.quantity}x ${item.name}${addonText}${noteText} - ${money((item.unitTotal || item.price) * item.quantity)}`;
  }).join("\n");
  let message = `*${CONFIG.businessName} - NOVO PEDIDO*\n`;
  message += `*Protocolo:* ${protocol}\n`;
  message += `*Cliente:* ${name}\n`;
  message += `*Tipo:* ${type.toUpperCase()}\n\n`;
  message += `${lines}\n\n`;
  message += `*Subtotal:* ${money(subtotal)}\n`;
  if (type === "entrega") message += `*Endereco:* ${address}\n*Entrega:* ${money(deliveryFee)}\n`;
  message += `*Pagamento:* ${payment}\n`;
  if (note) message += `*Obs:* ${note}\n`;
  message += `*TOTAL:* ${money(total)}`;

  await saveOrder({ protocol, name, type, address, payment, note, subtotal, deliveryFee, total });
  event.currentTarget.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

async function checkout(event) {
  event.preventDefault();

  if (!cart.length) {
    alert("Adicione pelo menos um item ao pedido.");
    return;
  }

  const name = $("#customerName").value.trim();
  if (!name) {
    alert("Informe seu nome.");
    return;
  }

  const type = $("#orderType").value;
  const address = $("#customerAddress").value.trim();
  if (type === "entrega" && !address) {
    alert("Informe o endereco para entrega.");
    return;
  }

  const payment = $("#paymentMethod").value;
  const note = $("#customerNote").value.trim();
  const subtotal = cart.reduce((sum, item) => sum + Number(item.unitTotal || item.price) * item.quantity, 0);
  const deliveryFee = type === "entrega" ? CONFIG.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const protocol = `MNB-${Date.now().toString().slice(-6)}`;

  const lines = cart.map(item => {
    const addonsText = item.addons?.length ? `\n   Adicionais: ${item.addons.map(addon => addon.name).join(", ")}` : "";
    const itemNoteText = item.note ? `\n   Obs do item: ${item.note}` : "";
    const lineTotal = money(Number(item.unitTotal || item.price) * item.quantity);
    return `- ${item.quantity}x ${item.name}${addonsText}${itemNoteText}\n   Total: ${lineTotal}`;
  }).join("\n\n");

  let message = `*${CONFIG.businessName}*\n`;
  message += `Pedido na brasa chegando!\n`;
  message += `--------------------------------\n`;
  message += `*Protocolo:* ${protocol}\n`;
  message += `*Cliente:* ${name}\n`;
  message += `*Tipo:* ${type === "entrega" ? "Entrega" : "Retirada"}\n`;
  if (type === "entrega") message += `*Endereco:* ${address}\n`;
  message += `*Pagamento:* ${payment}\n\n`;
  message += `*Itens do pedido:*\n${lines}\n\n`;
  message += `*Resumo:*\n`;
  message += `Subtotal: ${money(subtotal)}\n`;
  if (type === "entrega") message += `Entrega: ${money(deliveryFee)}\n`;
  if (note) message += `Obs geral: ${note}\n`;
  message += `*TOTAL: ${money(total)}*\n`;
  message += `--------------------------------\n`;
  message += `Pode preparar que a fome chegou.`;

  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  const checkoutBtn = event.currentTarget;
  checkoutBtn.href = whatsappUrl;
  checkoutBtn.textContent = "Abrindo WhatsApp...";

  saveOrder({ protocol, name, type, address, payment, note, subtotal, deliveryFee, total });
  const opened = window.open(whatsappUrl, "_blank", "noopener");
  if (!opened) window.location.href = whatsappUrl;

  setTimeout(() => {
    checkoutBtn.textContent = "Enviar pedido";
  }, 1200);
}

async function saveOrder({ protocol, name, type, address, payment, note, subtotal, deliveryFee, total }) {
  const items = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    addons: item.addons || [],
    note: item.note || "",
    unit_total: item.unitTotal || item.price,
    quantity: item.quantity
  }));

  const { error } = await supabaseClient.from("mnb_orders").insert({
    protocol,
    customer: { name, type, address, payment, note },
    items,
    subtotal,
    delivery_fee: deliveryFee,
    total
  });

  if (error) console.warn("Pedido nao foi salvo no Supabase:", error.message);
}

function toggleAddress() {
  $("#addressField").style.display = $("#orderType").value === "entrega" ? "grid" : "none";
}

function setupReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("show");
    });
  }, { threshold: 0.14 });
  document.querySelectorAll(".reveal").forEach(item => observer.observe(item));
}

function setupPWAInstall() {
  const installBtn = $("#installBtn");
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn.hidden = false;
  });
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });
}

function showTutorialOnce() {
  if (localStorage.getItem("mnb_tutorial_seen") === "yes") return;
  setTimeout(() => $("#tutorialModal").showModal(), 700);
}

function finishTutorial() {
  localStorage.setItem("mnb_tutorial_seen", "yes");
  $("#tutorialModal").close();
}

function labelTag(tag) {
  if (tag === "vendido") return "Famoso";
  if (tag === "chef") return "Chef";
  return tag || "Na brasa";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

window.changeQty = changeQty;
window.removeCartItem = removeCartItem;
init();
