# -*- coding: utf-8 -*-
"""Сквозной сценарий маркетплейса против живого сервера.

Запуск:  UZUM_BASE_URL=http://127.0.0.1:3000 python3 tests/e2e.py
Обычно не нужен напрямую — его поднимает `npm test` (tests/run-node-tests.mjs):
копирует проект во временную папку, стартует next dev на свободном порту и
гарантированно всё убивает. Скрипт только бьёт по HTTP и ничего не чинит.

Формат вывода: одна строка `~ ok <шаг>` / `~ FAIL <шаг>` на проверку.
"""
import json, os, re, sys, traceback, urllib.request as u, urllib.error

B = os.environ.get("UZUM_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
res = []
def check(cond, label):
    res.append((bool(cond), label))
    print(("~ ok " if cond else "~ FAIL ") + label, flush=True)

# Непредвиденное исключение в теле сценария (баг скрипта, битый JSON) —
# не роняем процесс молча: печатаем видимый FAIL с полным traceback'ом,
# чтобы в логе CI сразу была причина.
def _on_uncaught(exc_type, exc, tb):
    print("~ FAIL сценарий упал: %s: %s" % (exc_type.__name__, exc), flush=True)
    traceback.print_exception(exc_type, exc, tb)
    sys.exit(1)
sys.excepthook = _on_uncaught

class C:
    def __init__(s): s.cookies={}; s.csrf=None
    def call(s, method, path, body=None, ctype="application/json", form=None):
        headers={"Accept":"application/json"}
        if s.cookies: headers["Cookie"]="; ".join(f"{k}={v}" for k,v in s.cookies.items())
        data=None
        if form is not None:
            bnd="----x"; parts=[]
            for k,(fn,content,ct) in form.items():
                parts.append(f'--{bnd}\r\nContent-Disposition: form-data; name="{k}"; filename="{fn}"\r\nContent-Type: {ct}\r\n\r\n'.encode()+content+b"\r\n")
            data=b"".join(parts)+f"--{bnd}--\r\n".encode(); headers["Content-Type"]=f"multipart/form-data; boundary={bnd}"
        elif body is not None:
            data=json.dumps(body).encode(); headers["Content-Type"]=ctype
            if method!="GET": headers["X-CSRFToken"]=s.csrf or ""
        r=u.Request(B+path, data=data, headers=headers, method=method)
        try:
            with u.urlopen(r, timeout=60) as resp:
                for ck in resp.headers.get_all("Set-Cookie") or []:
                    m=re.match(r"([^=]+)=([^;]*)",ck)
                    if m: (s.cookies.__setitem__(m.group(1),m.group(2)) if m.group(2) else s.cookies.pop(m.group(1),None))
                txt=resp.read().decode("utf-8","replace")
        except urllib.error.HTTPError as e:
            txt=e.read().decode("utf-8","replace"); code=e.code
        except Exception as e:
            # Таймаут/соединение — не роняем весь сценарий traceback'ом:
            # шаг просто падает с понятной причиной, остальные шаги идут.
            return 0, f"request error: {type(e).__name__}: {e}"
        else:
            code=resp.status
        try: return code, json.loads(txt)
        except Exception: return code, txt
    def login(s, email, pwd):
        st,csrf=s.call("GET","/api/auth/csrf")
        s.csrf=csrf.get("csrf") if isinstance(csrf,dict) else None
        st,body=s.call("POST","/api/auth/login",{"email":email,"password":pwd})
        st2,csrf=s.call("GET","/api/auth/csrf")
        if isinstance(csrf,dict) and csrf.get("csrf"): s.csrf=csrf["csrf"]
        check(st==200 and s.csrf is not None, f"login {email} -> {st} (csrf={'да' if s.csrf else 'НЕТ'})")
    def html(s, path):
        r=u.Request(B+path, headers={"Cookie":"; ".join(f"{k}={v}" for k,v in s.cookies.items()) or "x=1"})
        try:
            with u.urlopen(r, timeout=90) as resp: return resp.status, resp.read().decode("utf-8","replace")
        except urllib.error.HTTPError as e: return e.code, e.read().decode("utf-8","replace")
        except Exception as e: return 0, f"request error: {type(e).__name__}: {e}"

buyer=C(); seller=C()
buyer.login("buyer@uzum.uz","Password123"); seller.login("seller@uzum.uz","Password123")

st,me=seller.call("GET","/api/auth/me")
check(st==200 and isinstance(me,dict) and me.get("is_seller"), f"seller me -> seller_id={me.get('seller_id') if isinstance(me,dict) else me}")
# количество товаров в сиде менять можно — важно, что кабинет показывает все свои и черновики видны
st,shop_body=seller.call("GET","/api/shop")
shop_id = shop_body["id"] if isinstance(shop_body, dict) and shop_body.get("id") else None
check(st==200 and shop_id is not None, f"магазин продавца: id={shop_id}")
st,mine=seller.call("GET","/api/products/mine")
ids_mine={p["id"] for p in mine["results"]}
check(mine["count"]>=2 and len(ids_mine)==mine["count"] and any(p["status"]=="draft" for p in mine["results"]),
      f"кабинет: {mine['count']} товара, есть черновик, дублей нет")

# публикуем свой товар
st,created=seller.call("POST","/api/products",{"title":"Тестовый лоток для рассады, 24 ячейки","description":"Проверка сквозного сценария: товар создан скриптом, продавец видит его в кабинете, покупатель находит в поиске.","price":56000,"old_price":74000,"stock":9,"category":"dom-i-sad","images":["/products/gen/notebook-a5.svg"],"characteristics":{"Ячеек":"24","Материал":"Переработанный ПЭТ"},"status":"active"})
check(st==201, f"создать товар -> {st} {created}")
pid=created["id"]
st,found=buyer.call("GET","/api/products?q=%D0%A0%D0%B0%D1%81%D1%81%D0%B0%D0%B4%D1%8B"); check(any(p["id"]==pid for p in found["results"]), "товар в поиске у покупателя")
st,p1=buyer.call("GET",f"/api/products/{pid}"); check(p1["discount_percent"]==24, f"скидка посчитана: {p1['discount_percent']}%")

# заказ
st,order=buyer.call("POST","/api/orders",{"items":[{"product_id":pid,"qty":3}],"address":"г. Ташкент, ул. Тестовая, 5","payment_method":"card","delivery_method":"courier","promo_code":"STUDENT10"})
check(st==201, f"оформить заказ -> {st} {order}")
oid=order["id"]
st,det=buyer.call("GET",f"/api/orders/{oid}"); check(det["subtotal"]==168000 and det["discount"]==0 and det["delivery_cost"]==25000 and det["total"]==193000, f"итог заказа: {det['total']} сум (STUDENT10 требует от 200k → скидка {det['discount']}, доставка {det['delivery_cost']})")
st,big=buyer.call("POST","/api/orders",{"items":[{"product_id":1,"qty":1}],"address":"г. Ташкент, ул. Тестовая, 5","payment_method":"card","delivery_method":"courier","promo_code":"STUDENT10"})
st,det2=buyer.call("GET",f"/api/orders/{big['id']}"); check(det2["discount"]==125000 and det2["delivery_cost"]==0, f"STUDENT10 сработал на 1.25M: −{det2['discount']}, доставка {det2['delivery_cost']}")
st,p2=buyer.call("GET",f"/api/products/{pid}"); check(p2["stock"]==6, f"остаток списан: {p2['stock']}")

st,so=seller.call("GET","/api/shop/orders"); check(any(o["id"]==oid for o in so["results"]), f"продавец видит заказ ({so['count']})")
for act,exp in [("packing","packing"),("shipping","shipping"),("delivered","delivered")]:
    st,adv=seller.call("POST",f"/api/orders/{oid}/status",{"action":act}); check(adv.get("status")==exp, f"статус {act} -> {adv.get('status')}")
st,det2=buyer.call("GET",f"/api/orders/{oid}"); check(len(det2["timeline"])==4, f"таймлайн: {len(det2['timeline'])} шагов")

# отзывы
st,rev=buyer.call("POST",f"/api/products/{pid}/reviews",{"rating":5,"text":"Лоток приехал целым, ячейки не гнутся, рассада вынимается легко.","pros":"прочный plastic","cons":"нет"});  check(st in (200,201), f"отзыв покупателя -> {st}")
st,upd=buyer.call("POST",f"/api/products/{pid}/reviews",{"rating":4,"text":"Обновляю: на второй неделе один борт треснул на морозе, продавец прислал замену."}); check(upd.get("updated") is True, f"повторный отзыв = редактирование -> {upd}")
st,rep=seller.call("POST",f"/api/reviews/{upd['id']}/reply",{"reply":"Добрый! Пришлю новый борт курьером, извините за неудобство."}); check(st==200, f"ответ продавца -> {st}")
st,rl=buyer.call("GET",f"/api/products/{pid}/reviews"); check(rl["summary"]["count"]==1 and rl["results"][0]["seller_reply"] and rl["results"][0]["own"], "сводка отзыва: есть ответ, own=True")
st,rl1=buyer.call("GET",f"/api/products/{pid}/reviews")
check(rl1["purchases"]==3 and rl1["summary"]["count"]==1, f"счётчик покупок: {rl1['purchases']} шт, отзывов {rl1['summary']['count']}")

# право на отзыв: только покупатель с не отменённым заказом
st, rl0 = buyer.call("GET", f"/api/products/{pid}/reviews")
check(st == 200 and rl0["can_review"] is True, "покупатель с заказом: can_review=true")
st, rl0 = seller.call("GET", f"/api/products/{pid}/reviews")
check(rl0["can_review"] is False, "продавец без покупки: can_review=false")
def csrf_of(c):
    _, b = c.call("GET", "/api/auth/csrf")
    return b.get("csrf") if isinstance(b, dict) else None

def login_as(email, pwd="Password123"):
    c = C()
    c.csrf = csrf_of(c)
    if c.call("POST", "/api/auth/login", {"email": email, "password": pwd})[0] != 200:
        # пользователя нет — заводим; повторный прогон уже видит его живым
        c.csrf = csrf_of(c)
        c.call("POST", "/api/auth/register", {
            "first_name": "Прохожий", "last_name": "Тестовый", "email": email,
            "phone": "+998901112233", "password": pwd, "password2": pwd,
        })
        c.csrf = csrf_of(c)
        c.call("POST", "/api/auth/login", {"email": email, "password": pwd})
        c.csrf = csrf_of(c)
    return c

stranger = login_as("stranger@uzum.uz")
st,me=stranger.call("GET","/api/auth/me")
check(st==200 and isinstance(me,dict) and me.get("email")=="stranger@uzum.uz",
      f"stranger вошёл, сессия жива -> {st} {str(me)[:200]}")
st, denied = stranger.call("POST", f"/api/products/{pid}/reviews",
    {"rating": 1, "text": "Не покупал, но хочу намусорить в рейтинге, поэтому пишу отзыв просто так."})
check(st == 403 and "только" in str(denied.get("detail", "")).lower(),
      f"чужой отзыв без покупки -> {st} {str(denied)[:200]}")
st,deln=stranger.call("DELETE",f"/api/reviews/{upd['id']}")
check(st==403, f"чужой отзыв удалить нельзя -> {st} {str(deln)[:200]}")
st, html = stranger.html(f"/product/{pid}")
check(st == 200 and "Отзывы пишут только покупатели" in html and "Написать отзыв" not in html,
      "в карточке гость видит подсказку, а не форму отзыва")

# страница товара и кабинет в HTML
for path,label in [(f"/product/{pid}","карточка товара"),("/cabinet","дашборд"),("/cabinet/products","мои товары"),("/cabinet/orders","заказы магазина"),("/cabinet/reviews","отзывы"),(f"/cabinet/products/{pid}","редактор"),("/shop/uzum-students","витрина"),("/profile/orders","мои заказы"),("/profile/settings","настройки")]:
    st,html=seller.html(path); check(st==200 and len(html)>20000, f"{label} {path} -> {st} ({len(html)})")
st,html=buyer.html(f"/profile/orders/{oid}"); check(st==200 and "UZ-" in html, "карточка заказа покупателя рендерится")
st,html=seller.html(f"/product/{pid}"); check("Ответ продавца" in html or "Добрый!" in html, "ответ продавца виден в карточке")

# частичный PATCH + снятие + удаление
st,_=seller.call("PATCH",f"/api/products/{pid}",{"stock":3,"price":49000}); after=seller.call("GET",f"/api/products/{pid}")[1]
check(after["stock"]==3 and after["price"]==49000 and after["old_price"]==74000, f"частичный PATCH: {after['price']}/{after['old_price']}/{after['stock']}")
st,_=seller.call("POST",f"/api/products/{pid}/status",{"status":"draft"})
check(not any(p["id"]==pid for p in buyer.call("GET","/api/products?page_size=100")[1]["results"]), "черновик исчез из каталога")
st,dr=buyer.call("GET","/api/products?status=draft&page_size=100")
check(dr.get("count")==0, f"чужие черновики не светятся в каталоге ({dr.get('count')})")
st,dr2=seller.call("GET","/api/products?status=draft&page_size=100")
check(shop_id is not None and all(p["seller"]["id"]==shop_id for p in dr2["results"]) and dr2["count"]>0,
      f"свои черновики продавец видит ({dr2.get('count')})")
st,html=buyer.html(f"/product/{pid}"); check(st==404, f"чужой черновик -> {st}")
st,html=seller.html(f"/product/{pid}"); check(st==200 and "черновик" in html, "владелец видит черновик с плашкой")
st,dl=seller.call("DELETE",f"/api/products/{pid}"); check(st==200, f"удаление товара -> {st}")
check(not any(p["id"]==pid for p in seller.call("GET","/api/products/mine")[1]["results"]), "товар пропал из кабинета")

# магазин + смена пароля
st,sh=seller.call("PATCH","/api/shop",{"name":"Uzum Students · мастерская","city":"Ташкент","description":"Товары студенческой мастерской: дерево, цемент, свет. Собрано вручную в Ташкенте."}); check(st==200, f"настройки магазина -> {st}")
st,shop=buyer.call("GET","/api/sellers/uzum-students")
check(st==200 and shop.get("name")=="Uzum Students · мастерская" and shop.get("slug")=="uzum-students", f"переименование не сломало /shop/uzum-students (slug={shop.get('slug')})")
st,shopPage=buyer.html("/shop/uzum-students"); check(st==200 and "мастерская" in shopPage, "публичная витрина открывается по старому слагу")
st,html=seller.html("/profile/settings"); check("Сбросить демо-данные" in html, "в настройках есть сброс демо-базы")
st,rp=seller.call("POST","/api/auth/password",{"current":"Password123","next":"Password456"}); check(st==200, f"смена пароля -> {st}")
tmp=C(); st,body=tmp.call("GET","/api/auth/csrf"); tmp.csrf=body.get("csrf") if isinstance(body,dict) else None
check(tmp.call("POST","/api/auth/login",{"email":"seller@uzum.uz","password":"Password456"})[0]==200, "вход с новым паролем")
st,rp=seller.call("POST","/api/auth/password",{"current":"Password456","next":"Password123"}); check(st==200, "пароль возвращён")
st,html=seller.html("/cabinet"); check(st==200, "кабинет жив после всех операций")

fails = sum(1 for c, _ in res if not c)
print(f"=== {len(res) - fails} passed / {fails} failed ===", flush=True)
sys.exit(min(fails, 200))
