/* ------------------------------------------------------------------
   Spices Cafeteria - demo ordering (add to cart + WhatsApp checkout)
   No backend: the cart lives in the browser and the order is handed
   over to WhatsApp as a pre-filled message.
   ------------------------------------------------------------------ */

(function () {
     'use strict';

     // The cafeteria's WhatsApp number.
     // Format: country code + number, digits only (no +, spaces or dashes).
     var WHATSAPP_NUMBER = '919188275573';

     var CURRENCY = '₹'; // Rupee sign
     var STORAGE_KEY = 'spices-cart';

     var cart = load();

     /* ---------------- storage ---------------- */

     function load() {
          try {
               return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
          } catch (e) {
               return [];
          }
     }

     function save() {
          try {
               localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
          } catch (e) {
               /* private mode - cart just won't survive a reload */
          }
     }

     /* ---------------- cart ---------------- */

     function find(name) {
          for (var i = 0; i < cart.length; i++) {
               if (cart[i].name === name) return cart[i];
          }
          return null;
     }

     function add(item) {
          var line = find(item.name);
          if (line) {
               line.qty += 1;
          } else {
               cart.push({ name: item.name, price: item.price, image: item.image, qty: 1 });
          }
          save();
          render();
     }

     function changeQty(name, delta) {
          var line = find(name);
          if (!line) return;
          line.qty += delta;
          if (line.qty < 1) cart.splice(cart.indexOf(line), 1);
          save();
          render();
     }

     function count() {
          return cart.reduce(function (n, line) { return n + line.qty; }, 0);
     }

     function total() {
          return cart.reduce(function (sum, line) { return sum + line.price * line.qty; }, 0);
     }

     /* ---------------- whatsapp ---------------- */

     function openWhatsApp(message) {
          window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message), '_blank');
     }

     function orderSingle(item) {
          var message =
               'Hello Spices Cafeteria! 👋\n\n' +
               'I would like to order:\n\n' +
               '• ' + item.name + ' - ' + CURRENCY + item.price + '\n' +
               (item.desc ? '   (' + item.desc + ')\n' : '') +
               '\nTotal: ' + CURRENCY + item.price + '\n\n' +
               'Please confirm the order. Thank you!';
          openWhatsApp(message);
     }

     function orderCart() {
          if (!cart.length) return;

          var lines = cart.map(function (line) {
               return '• ' + line.name + ' x' + line.qty + ' - ' + CURRENCY + (line.price * line.qty);
          }).join('\n');

          var message =
               'Hello Spices Cafeteria! 👋\n\n' +
               'My order:\n\n' + lines + '\n\n' +
               'Items: ' + count() + '\n' +
               'Total: ' + CURRENCY + total() + '\n\n' +
               'Please confirm the order. Thank you!';
          openWhatsApp(message);
     }

     /* ---------------- rendering ---------------- */

     function render() {
          var body = document.getElementById('cart-body');
          var badge = document.getElementById('cart-count');
          var totalEl = document.getElementById('cart-total');
          var checkout = document.getElementById('cart-checkout');
          if (!body) return;

          body.innerHTML = '';

          if (!cart.length) {
               var empty = document.createElement('p');
               empty.className = 'cart-empty';
               empty.textContent = 'Your cart is empty. Pick something tasty!';
               body.appendChild(empty);
          } else {
               cart.forEach(function (line) {
                    body.appendChild(cartLine(line));
               });
          }

          badge.textContent = count();
          badge.style.display = count() ? 'block' : 'none';
          totalEl.textContent = CURRENCY + total();
          checkout.disabled = !cart.length;
     }

     function cartLine(line) {
          var row = document.createElement('div');
          row.className = 'cart-line';

          var img = document.createElement('img');
          img.src = line.image;
          img.alt = line.name;

          var info = document.createElement('div');
          info.className = 'cart-line-info';
          var title = document.createElement('h4');
          title.textContent = line.name;
          var price = document.createElement('span');
          price.textContent = CURRENCY + line.price + ' each';
          info.appendChild(title);
          info.appendChild(price);

          var qty = document.createElement('div');
          qty.className = 'cart-qty';
          qty.appendChild(qtyButton('−', line.name, -1, 'Remove one ' + line.name));
          var value = document.createElement('strong');
          value.textContent = line.qty;
          qty.appendChild(value);
          qty.appendChild(qtyButton('+', line.name, 1, 'Add one ' + line.name));

          row.appendChild(img);
          row.appendChild(info);
          row.appendChild(qty);
          return row;
     }

     function qtyButton(label, name, delta, aria) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = label;
          btn.setAttribute('aria-label', aria);
          btn.addEventListener('click', function () { changeQty(name, delta); });
          return btn;
     }

     function toast(text) {
          var el = document.getElementById('cart-toast');
          if (!el) return;
          el.textContent = text;
          el.classList.add('show');
          clearTimeout(toast.timer);
          toast.timer = setTimeout(function () { el.classList.remove('show'); }, 2000);
     }

     /* ---------------- wiring ---------------- */

     function itemFromCard(card) {
          return {
               name: card.getAttribute('data-name'),
               price: parseInt(card.getAttribute('data-price'), 10),
               desc: card.getAttribute('data-desc'),
               image: card.getAttribute('data-image')
          };
     }

     function drawer(open) {
          document.body.classList.toggle('cart-open', open);
     }

     document.addEventListener('DOMContentLoaded', function () {

          // add to cart / order now on each food card
          document.querySelectorAll('.food-card').forEach(function (card) {
               var item = itemFromCard(card);

               var addBtn = card.querySelector('.food-btn-cart');
               if (addBtn) {
                    addBtn.addEventListener('click', function () {
                         add(item);
                         toast(item.name + ' added to cart');
                    });
               }

               var waBtn = card.querySelector('.food-btn-wa');
               if (waBtn) {
                    waBtn.addEventListener('click', function () { orderSingle(item); });
               }
          });

          // category filter
          var filters = document.querySelectorAll('.menu-filter button');
          filters.forEach(function (btn) {
               btn.addEventListener('click', function () {
                    var category = btn.getAttribute('data-filter');
                    filters.forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');

                    document.querySelectorAll('.food-col').forEach(function (col) {
                         var match = category === 'all' || col.getAttribute('data-category') === category;
                         col.style.display = match ? '' : 'none';
                    });
               });
          });

          // cart drawer
          document.getElementById('cart-fab').addEventListener('click', function () { drawer(true); });
          document.getElementById('cart-close').addEventListener('click', function () { drawer(false); });
          document.getElementById('cart-backdrop').addEventListener('click', function () { drawer(false); });
          document.getElementById('cart-checkout').addEventListener('click', orderCart);

          document.addEventListener('keyup', function (e) {
               if (e.key === 'Escape') drawer(false);
          });

          render();
     });

})();
