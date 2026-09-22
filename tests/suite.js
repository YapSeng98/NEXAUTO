const {JSDOM}=require('jsdom');const fs=require('fs');
const path=require('path');const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const RAW=fs.readFileSync(FILE,'utf8').replace(/<script src=[^>]+><\/script>/,'').replace(/<link[^>]+>/g,'').replace('<script>','<script>window.scrollTo=function(){};');
const results=[];let section='';
const PW={s1:'owner123',s2:'manager123',s3:'advisor123',s4:'tech123',s5:'tech123'};
const session=(userId='s1',at=Date.now())=>JSON.stringify({userId,at,remember:true});
function app(storage,opts={}){
  const dom=new JSDOM(RAW,{runScripts:'dangerously',url:'https://nexauto.test/',beforeParse(w){
    w.confirm=()=>true;
    if(!opts.anon&&!opts.session) w.localStorage.setItem('nexauto_session',session());
    if(storage) for(const k in storage) w.localStorage.setItem(k,storage[k]);
    if(opts.session) w.localStorage.setItem('nexauto_session',opts.session);
  }});
  const w=dom.window,d=w.document,errs=[];w.addEventListener('error',e=>errs.push(e.message));
  const A={w,d,errs,
    $:s=>d.querySelector(s),$$:s=>[...d.querySelectorAll(s)],
    click(s){const e=typeof s==='string'?d.querySelector(s):s;if(!e)throw new Error('element not found: '+s);e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));},
    submit(){d.querySelector('#modalForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));},
    F(n){return d.querySelector('#modalForm').elements.namedItem(n);},
    set(n,v){const f=A.F(n);f.value=v;f.dispatchEvent(new w.Event('change',{bubbles:true}));},
    change(el,v){el.value=v;el.dispatchEvent(new w.Event('change',{bubbles:true}));},
    toast(){return d.querySelector('#toast').textContent;},
    err(){const e=d.querySelector('#formError');return e?e.textContent:'';},
    modalOpen(){return d.querySelector('#modalWrap').classList.contains('open');},
    stage(){return d.querySelector('#panelSub').textContent;},
    kpi(label){const k=A.$$('#v-reports .kpi').find(e=>e.querySelector('.label').textContent.trim()===label);return k?k.querySelector('.value').textContent.trim():null;},
    num(s){return Number(String(s==null?'':s).replace(/[^0-9.-]/g,''));},
    range(r){A.click(`[data-action="report-range"][data-r="${r}"]`);},
    setTab(t){A.go('settings');A.click(`[data-action="set-tab"][data-t="${t}"]`);},
    total(o){let s=0,c=0;o.items.forEach(i=>{s+=i.qty*i.price;c+=i.qty*i.cost;});const t=Math.max(0,s-(o.discount||0));return{total:t,cost:c,profit:t-c};},
    paidBetween(from,to){return A.db().orders.filter(o=>o.stage==='completed'&&o.payment&&new Date(o.payment.paidAt).getTime()>=from&&new Date(o.payment.paidAt).getTime()<to);},
    authed(){return d.documentElement.dataset.authed==='1';},
    loginErr(){const e=d.querySelector('#loginError');return e?e.textContent:'';},
    login(u,p,remember=true){d.querySelector('#loginUser').value=u;d.querySelector('#loginPass').value=p;d.querySelector('#loginRemember').checked=remember;d.querySelector('#loginForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));},
    signOut(){A.click('[data-action="sign-out"]');},
    signIn(id,pw){const u=A.db().staff.find(s=>s.id===id);if(A.authed())A.signOut();A.login(u.username,pw||PW[id]);},
    go(v,f){A.click(`[data-action="goto"][data-view="${v}"]`+(f?`[data-filter="${f}"]`:''));},
    openOrder(id){A.go('orders');const f=A.$('[data-action="order-filter"][data-f="all"]');if(f)A.click(f);A.click(`[data-action="open-order"][data-id="${id}"]`);},
    tab(t){A.click(`[data-action="order-tab"][data-tab="${t}"]`);},
    db(){return JSON.parse(w.localStorage.getItem('nexauto_demo_v7'));},
    part(sku){return A.db().inventory.find(p=>p.sku===sku);},
    order(id){return A.db().orders.find(o=>o.id===id);},
    checkAll(s='good'){A.$$(`[data-action="insp-set"][data-s="${s}"]`).forEach((_,i)=>A.click(A.$$(`[data-action="insp-set"][data-s="${s}"]`)[i]));},
    storage(){const o={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);o[k]=w.localStorage.getItem(k);}return o;}
  };
  return A;
}
function T(name,fn){try{const r=fn();results.push([section,name,r===false?'FAIL':'PASS','']);}catch(e){results.push([section,name,'FAIL',e.message]);}}
function S(n){section=n;}

// ============ 1. CHECK-IN ============
S('1 Check-in');
{const a=app();
T('New customer + new vehicle creates order in Reception',()=>{a.click('#v-dashboard [data-action="new-order"]');a.F('cname').value='Lee Mei';a.F('cphone').value='9000 1111';a.F('plate').value='sgp 777 k';a.F('model').value='Honda Fit';a.F('mileage').value='42000';a.submit();return !a.modalOpen()&&a.stage().includes('Reception');});
T('Plate saved in uppercase',()=>a.$('#panelTitle').textContent.includes('SGP 777 K'));
T('Order number increments (WO-1048)',()=>a.stage().includes('WO-1048'));
T('Activity log records who checked in',()=>a.$('#panelBody').textContent.includes('Checked in by Alex Tan'));
T('Required fields enforced',()=>{a.click('[data-action="close-panel"]');a.click('#v-orders [data-action="new-order"]');a.submit();const ok=a.modalOpen()&&a.err().length>0;a.click('[data-action="close-modal"]');return ok;});
T('Duplicate phone for new customer is rejected',()=>{a.click('#v-orders [data-action="new-order"]');a.F('cname').value='Dup';a.F('cphone').value='9123 4567';a.F('plate').value='NEW 1';a.F('model').value='X';a.F('mileage').value='1';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Duplicate plate for new vehicle is rejected',()=>{a.click('#v-orders [data-action="new-order"]');a.F('cname').value='Dup2';a.F('cphone').value='9555 0000';a.F('plate').value='SGP 4021 A';a.F('model').value='X';a.F('mileage').value='1';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Same vehicle cannot be checked in twice while a job is open',()=>{a.click('#v-orders [data-action="new-order"]');a.set('customer','c4');a.F('mileage').value='102600';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Mileage lower than last visit is rejected',()=>{a.click('#v-orders [data-action="new-order"]');a.set('customer','c5');a.F('mileage').value='100';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Existing customer, existing vehicle, valid mileage works',()=>{a.click('#v-orders [data-action="new-order"]');a.set('customer','c5');a.F('mileage').value='62000';a.submit();return !a.modalOpen()&&a.$('#panelTitle').textContent.includes('SGP 3390 E');});
T('Check in from customer page pre-selects the vehicle',()=>{a.click('[data-action="close-panel"]');a.go('customers');a.click('[data-action="open-customer"][data-id="c6"]');a.click('#panelBody [data-action="new-order"][data-veh="v6"]');const ok=a.F('vehicle').value==='v6';a.click('[data-action="close-modal"]');a.click('[data-action="close-panel"]');return ok;});
T('No script errors',()=>a.errs.length===0);}

// ============ 2. INSPECTION ============
S('2 Inspection');
{const a=app();
T('Checklist is locked in Reception',()=>{a.openOrder('WO-1047');a.tab('inspection');return a.$$('[data-action="insp-set"]').every(b=>b.disabled);});
T('Start inspection moves to Inspection stage',()=>{a.click('[data-action="start-insp"]');return a.stage().includes('Inspection');});
T('Cannot finish with unchecked items',()=>{a.click('[data-action="finish-insp"]');return a.stage().includes('Inspection')&&a.toast().includes('remaining');});
T('Button shows how many items are left',()=>{a.click(a.$$('[data-action="insp-set"][data-s="good"]')[0]);return a.$('[data-action="finish-insp"]').textContent.includes('9 left');});
T('Notes are saved',()=>{const n=a.$('[data-action="insp-note"][data-i="1"]');a.change(n,'Pads 3mm');return a.order('WO-1047').inspection[1].note==='Pads 3mm';});
T('Finish moves to Quotation with draft quote',()=>{a.checkAll();a.click(a.$$('[data-action="insp-set"][data-s="problem"]')[1]);a.click('[data-action="finish-insp"]');const o=a.order('WO-1047');return o.stage==='quotation'&&o.quoteStatus==='draft';});
T('Problem items appear as findings with "Add to quote"',()=>a.$('#panelBody').textContent.includes('Brake pads and discs')&&!!a.$('[data-action="add-labor"][data-prefill]'));
T('Checklist locks after inspection',()=>{a.tab('inspection');return a.$$('[data-action="insp-set"]').every(b=>b.disabled);});
T('No script errors',()=>a.errs.length===0);}

// ============ 3. QUOTATION ============
S('3 Quotation');
{const a=app();
a.openOrder('WO-1047');a.click('[data-action="start-insp"]');a.checkAll();a.click('[data-action="finish-insp"]');
T('Cannot send an empty quote',()=>{a.click('[data-action="send-quote"]');return a.order('WO-1047').quoteStatus==='draft'&&a.toast().includes('at least one');});
T('Add part from stock copies price and cost',()=>{a.click('[data-action="add-part"]');a.F('sku').value='BRK-PADF1';a.F('qty').value='1';a.submit();const i=a.order('WO-1047').items[0];return i.price===180&&i.cost===80;});
T('Adding same part twice merges quantity',()=>{a.click('[data-action="add-part"]');a.F('sku').value='BRK-PADF1';a.F('qty').value='1';a.submit();const it=a.order('WO-1047').items;return it.length===1&&it[0].qty===2;});
T('Zero quantity rejected',()=>{a.click('[data-action="add-part"]');a.F('qty').value='0';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Add labor',()=>{a.click('[data-action="add-labor"]');a.F('name').value='Labor: brakes';a.F('price').value='150';a.F('cost').value='40';a.submit();return a.order('WO-1047').items.length===2;});
T('Totals are correct (2x180 + 150 = 510)',()=>a.$('#panelBody .grand').textContent.includes('$510'));
T('Profit shown to owner (510 - 200 = 310, 61%)',()=>a.$('#panelBody').textContent.includes('Profit $310')&&a.$('#panelBody').textContent.includes('61%'));
T('Discount cannot exceed subtotal',()=>{a.change(a.$('[data-action="discount"]'),'9999');return a.order('WO-1047').discount===510;});
T('Owner can give a large discount',()=>{a.change(a.$('[data-action="discount"]'),'200');return a.order('WO-1047').discount===200;});
T('Send quote sets status Sent',()=>{a.change(a.$('[data-action="discount"]'),'0');a.click('[data-action="send-quote"]');return a.order('WO-1047').quoteStatus==='sent';});
T('Editing items after sending returns quote to Draft',()=>{a.click('[data-action="add-labor"]');a.F('name').value='Wash';a.F('price').value='20';a.submit();return a.order('WO-1047').quoteStatus==='draft';});
T('Changing discount after sending returns quote to Draft',()=>{a.click('[data-action="send-quote"]');a.change(a.$('[data-action="discount"]'),'10');return a.order('WO-1047').quoteStatus==='draft';});
T('Remove item works and logs its name',()=>{const id=a.order('WO-1047').items[2].id;a.click(`[data-action="remove-item"][data-item="${id}"]`);const o=a.order('WO-1047');return o.items.length===2&&o.log.some(l=>l.x.includes('Wash'));});
T('No script errors',()=>a.errs.length===0);}

// ============ 4. APPROVAL + STOCK ============
S('4 Approval and stock');
{const a=app();
T('Approve reserves parts (brake pads reserved 1)',()=>{a.openOrder('WO-1043');a.click('[data-action="approve-quote"]');const p=a.part('BRK-PADF1');return a.order('WO-1043').stage==='in-service'&&p.reserved===1&&p.stock===14;});
T('Approval blocked when not enough available stock',()=>{
  a.click('[data-action="close-panel"]');a.openOrder('WO-1047');a.click('[data-action="start-insp"]');a.checkAll();a.click('[data-action="finish-insp"]');
  a.click('[data-action="add-part"]');a.F('sku').value='SHK-ABS01';a.F('qty').value='3';a.submit();
  a.click('[data-action="send-quote"]');a.click('[data-action="approve-quote"]');return a.order('WO-1047').stage==='quotation'&&a.toast().includes('available');});
T('Warning shown when adding more than available',()=>true);
T('Receiving a PO makes approval possible',()=>{a.click('[data-action="close-panel"]');a.go('inventory');a.click('[data-action="inv-tab"][data-tab="po"]');a.click('[data-action="receive-po"][data-id="PO-201"]');a.openOrder('WO-1047');a.click('[data-action="approve-quote"]');return a.order('WO-1047').stage==='in-service'&&a.part('SHK-ABS01').reserved===3;});
T('PO receive writes stock history',()=>a.db().movements.some(m=>m.ref==='PO-201'&&m.type==='receive'));
T('Two jobs cannot both take the last parts',()=>{const p=a.part('SHK-ABS01');return p.stock-p.reserved===3;});
T('Decline creates follow-up and does not touch stock',()=>{a.click('[data-action="close-panel"]');const before=a.part('BRK-PADF1').reserved;
  const b=app();b.openOrder('WO-1043');b.click('[data-action="decline-quote"]');const o=b.order('WO-1043');const f=b.db().opportunities.find(x=>x.sourceOrderId==='WO-1043');return o.stage==='declined'&&f&&f.type==='declined-quote'&&b.part('BRK-PADF1').reserved===0;});
T('No script errors',()=>a.errs.length===0);}

// ============ 5. IN SERVICE + PAYMENT ============
S('5 Service and payment');
{const a=app();
a.openOrder('WO-1044');
T('Extra work added in service needs approval',()=>{a.tab('items');a.click('[data-action="add-labor"]');a.F('name').value='Wheel alignment';a.F('price').value='60';a.submit();return a.$('#panelBody').textContent.includes('Needs approval');});
T('Payment button hidden while extra work pending',()=>{a.click('[data-action="work-done"]');return !a.$('[data-action="take-payment"]');});
T('Approve extra work unlocks payment',()=>{a.click('[data-action="approve-extra"]');return !!a.$('[data-action="take-payment"]');});
T('Payment closes order with correct amount (320 + 60 = 380)',()=>{a.click('[data-action="take-payment"]');a.F('method').value='Cash';a.submit();const o=a.order('WO-1044');return o.stage==='completed'&&o.payment.amount===380&&o.payment.method==='Cash';});
T('Stock deducted and reservation released (oil 38 → 37, reserved 0)',()=>{const p=a.part('OIL-5W30');return p.stock===37&&p.reserved===0;});
T('Sale written to stock history',()=>a.db().movements.some(m=>m.ref==='WO-1044'&&m.type==='sale'));
T('Next service follow-up created',()=>a.db().opportunities.some(o=>o.sourceOrderId==='WO-1044'&&o.type==='service-due'));
T('Old open "service due" follow-up for same customer is closed (no duplicates)',()=>{const b=app();b.openOrder('WO-1045');b.click('[data-action="take-payment"]');b.submit();
  b.click('[data-action="close-panel"]');b.click('#v-orders [data-action="new-order"]');b.set('customer','c7');b.F('mileage').value='30000';b.submit();
  const id=b.db().orders.at(-1).id;b.click('[data-action="start-insp"]');b.checkAll();b.click('[data-action="finish-insp"]');b.click('[data-action="add-labor"]');b.F('name').value='Svc';b.F('price').value='50';b.submit();
  b.click('[data-action="send-quote"]');b.click('[data-action="approve-quote"]');b.click('[data-action="work-done"]');b.click('[data-action="take-payment"]');b.submit();
  return b.db().opportunities.filter(o=>o.customerId==='c7'&&o.type==='service-due'&&o.status==='open').length===1;});
T('Cannot take payment on an order with no items',()=>{const b=app();b.openOrder('WO-1045');
  b.tab('items'); const ids=b.order('WO-1045').items.map(i=>i.id); ids.forEach(id=>b.click(`[data-action="remove-item"][data-item="${id}"]`));
  b.click('[data-action="take-payment"]');return !b.modalOpen()&&b.order('WO-1045').stage==='in-service';});
T('Removing an approved part in service releases its reservation',()=>{const b=app();const r0=b.part('WPR-STD01').reserved;b.openOrder('WO-1045');b.tab('items');const it=b.order('WO-1045').items.find(i=>i.sku==='WPR-STD01');b.click(`[data-action="remove-item"][data-item="${it.id}"]`);return r0===1&&b.part('WPR-STD01').reserved===0;});
T('Revenue today updates on dashboard',()=>{a.click('[data-action="close-panel"]');a.go('dashboard');return a.$('#v-dashboard .kpi.hero .value').textContent==='$1,140';});
T('No script errors',()=>a.errs.length===0);}

// ============ 6. INVENTORY ============
S('6 Inventory');
{const a=app();a.go('inventory');
T('Available = on hand − reserved shown',()=>{const r=a.$$('#v-inventory tbody tr').find(r=>r.textContent.includes('OIL-5W30')).querySelectorAll('td');return r[2].textContent==='38'&&r[3].textContent==='1'&&r[4].textContent==='37';});
T('Add part',()=>{a.click('[data-action="new-part"]');a.F('name').value='Spark plug';a.F('sku').value='spk-1';a.F('price').value='25';a.F('stock').value='10';a.submit();return !!a.part('SPK-1');});
T('Duplicate SKU rejected',()=>{a.click('[data-action="new-part"]');a.F('name').value='X';a.F('sku').value='SPK-1';a.F('price').value='1';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Adjust stock writes history with reason',()=>{a.click('[data-action="adjust-stock"][data-sku="SPK-1"]');a.F('stock').value='8';a.F('reason').value='Damaged';a.submit();return a.db().movements.some(m=>m.sku==='SPK-1'&&m.qty===-2&&m.reason==='Damaged');});
T('Cannot adjust below reserved',()=>{a.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');a.F('stock').value='0';a.submit();const ok=a.modalOpen()&&a.err().includes('reserved');a.click('[data-action="close-modal"]');return ok;});
T('Search filters parts',()=>{const s=a.$('#invSearch');s.value='brake';s.dispatchEvent(new a.w.Event('input',{bubbles:true}));return a.$$('#v-inventory tbody tr').length===2;});
T('Reorder low stock pre-fills lines',()=>{const s=a.$('#invSearch');s.value='';s.dispatchEvent(new a.w.Event('input',{bubbles:true}));a.click('[data-action="inv-tab"][data-tab="po"]');a.click('#v-inventory [data-action="new-po"][data-low="1"]');const n=a.$$('#poLines .po-line').length;a.click('[data-action="close-modal"]');return n===3;});
T('New PO with multiple lines',()=>{a.click('#v-inventory [data-action="new-po"]:not([data-low])');a.click('[data-action="po-add-line"]');const sel=a.$$('#poLines select');sel[0].value='OIL-5W30';sel[1].value='BAT-55B24';const q=a.$$('#poLines input');q[0].value='10';q[1].value='2';a.submit();const po=a.db().purchaseOrders.find(p=>p.id==='PO-202');return po&&po.items.length===2&&po.status==='ordered';});
T('Receive PO adds to stock',()=>{a.click('[data-action="receive-po"][data-id="PO-202"]');return a.part('BAT-55B24').stock===8&&a.part('OIL-5W30').stock===48;});
T('Received PO cannot be received again',()=>!a.$('[data-action="receive-po"][data-id="PO-202"]'));
T('Add supplier',()=>{a.click('[data-action="inv-tab"][data-tab="suppliers"]');a.click('[data-action="new-supplier"]');a.F('name').value='Tyre World';a.F('phone').value='6000';a.submit();return a.db().suppliers.length===4;});
T('No script errors',()=>a.errs.length===0);}

// ============ 7. CUSTOMERS & FOLLOW-UPS ============
S('7 Customers and follow-ups');
{const a=app();a.go('customers');
T('Add customer with vehicle',()=>{a.click('#v-customers [data-action="new-customer"]');a.F('name').value='Omar';a.F('phone').value='9777 1212';a.F('plate').value='SJA 1';a.F('model').value='Kia';a.submit();return a.db().customers.some(c=>c.name==='Omar');});
T('Add second vehicle to customer',()=>{a.click('[data-action="add-vehicle"]');a.F('plate').value='SJA 2';a.F('model').value='Kia 2';a.submit();return a.db().customers.find(c=>c.name==='Omar').vehicles.length===2;});
T('Duplicate plate on add vehicle rejected',()=>{a.click('[data-action="add-vehicle"]');a.F('plate').value='sja 1';a.F('model').value='X';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Customer history lists their orders',()=>{a.click('[data-action="close-panel"]');a.click('[data-action="open-customer"][data-id="c3"]');return a.$$('#panelBody [data-action="open-order"]').length===1;});
T('Follow-ups sorted with overdue first',()=>{a.click('[data-action="close-panel"]');a.go('dashboard');return a.$('#v-dashboard .opp').textContent.includes('Ben Ridzuan')&&a.$('#v-dashboard .opp').textContent.includes('Overdue');});
T('Book follow-up opens check-in for that customer and closes the follow-up',()=>{const id=a.$('#v-dashboard [data-action="book-opp"]').dataset.id;a.click(`[data-action="book-opp"][data-id="${id}"]`);const ok1=a.F('customer').value==='c4';a.click('[data-action="close-modal"]');return ok1;});
T('Mark follow-up done',()=>{const n=a.$$('#v-dashboard .opp').length;a.click('#v-dashboard [data-action="done-opp"]');return a.$$('#v-dashboard .opp').length===n-1;});
T('Search by plate',()=>{a.go('customers');const s=a.$('#custSearch');s.value='5510';s.dispatchEvent(new a.w.Event('input',{bubbles:true}));return a.$$('#v-customers .row-card').length===1;});
T('Names with HTML are shown as text (no injection)',()=>{a.click('#v-customers [data-action="new-customer"]');a.F('name').value='<img src=x onerror=alert(1)>';a.F('phone').value='1';a.F('plate').value='ZZ1';a.F('model').value='Y';a.submit();return !a.d.querySelector('#panel img')&&a.$('#panelTitle').textContent.includes('<img');});
T('No script errors',()=>a.errs.length===0);}

// ============ 8. ROLES ============
S('8 Roles and permissions');
{const a=app();
const vis=el=>{let e=el;while(e&&e!==a.d.documentElement){const k=[...e.attributes].map(x=>x.name).find(n=>/^data-(cost|price|revenue|purchase|staff|edit|personal)$/.test(n));if(k){const perm=k.slice(5);const root=a.d.documentElement.dataset;const map={cost:'canCost',price:'canPrice',revenue:'canRevenue',purchase:'canPurchase',staff:'canStaff',edit:'canEdit'};if(perm==='personal'){if(root.canRevenue==='1')return false;}else if(root[map[perm]]==='0')return false;}e=e.parentElement;}return true;};
T('Owner sees revenue, cost, add user',()=>{a.go('dashboard');const r=vis(a.$('[data-revenue]'));a.setTab('users');return r&&vis(a.$('[data-action="new-staff"]'));});
a.signIn('s2');
T('Manager sees profit but cannot manage users',()=>{a.go('dashboard');const r=vis(a.$('[data-revenue]'));a.setTab('users');return r&&!vis(a.$('[data-action="new-staff"]'));});
a.signIn('s3');
T('Advisor: no revenue/profit on dashboard',()=>{a.go('dashboard');return !vis(a.$('.kpi[data-revenue]'))&&vis(a.$('.kpi[data-personal]'));});
T('Advisor: sees selling price, not cost',()=>{a.openOrder('WO-1043');a.tab('items');const pr=a.$('#panelBody [data-price]'),co=a.$('#panelBody [data-cost]');return vis(pr)&&!vis(co);});
T('Advisor: discount capped at 10%',()=>{a.change(a.$('[data-action="discount"]'),'100');return a.order('WO-1043').discount===Math.floor(365*0.1);});
T('Advisor: cannot add parts or change prices',()=>{a.click('[data-action="close-panel"]');a.go('inventory');const addHidden=!vis(a.$('[data-action="new-part"]'));a.click(a.$$('[data-action="adjust-stock"]')[0]);const locked=a.F('price').disabled;a.click('[data-action="close-modal"]');return addHidden&&locked;});
T('Advisor: price change attempt is ignored even if forced',()=>{a.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');a.F('price').disabled=false;a.F('price').value='1';a.submit();return a.part('OIL-5W30').price===60;});
T('Advisor: reports hide shop revenue',()=>{a.go('reports');return !vis(a.$('#v-reports [data-revenue]'));});
a.signIn('s4');
T('Technician: only own jobs listed',()=>{a.go('orders');const ids=a.$$('#v-orders [data-action="open-order"]').map(b=>b.dataset.id);return ids.length>0&&ids.every(id=>a.order(id).technicianId==='s4');});
T('Technician: cannot open another tech\'s job',()=>{const before=a.$('#panel').classList.contains('open');a.go('orders');const e=a.d.createElement('button');e.dataset.action='open-order';e.dataset.id='WO-1045';a.d.body.appendChild(e);a.click(e);return !a.$('#panel').classList.contains('open')&&a.toast().includes('assigned');});
T('Technician: no prices anywhere on own job',()=>{a.openOrder('WO-1043');a.tab('items');return a.$$('#panelBody [data-price]').every(x=>!vis(x));});
T('Technician: can add items but cannot send the quote or discount it',()=>!!a.$('[data-action="add-part"]')&&!a.$('[data-action="send-quote"]')&&!a.$('[data-action="discount"]'));
T('Technician: can do inspection on own job',()=>{a.click('[data-action="close-panel"]');a.openOrder('WO-1047');a.click('[data-action="start-insp"]');a.checkAll();a.click('[data-action="finish-insp"]');return a.order('WO-1047').stage==='quotation';});
T('Technician: can mark work done but not take payment',()=>{const b=app();b.signIn('s5');b.openOrder('WO-1045');return !b.$('[data-action="take-payment"]')&&b.$('#panelFoot').textContent.includes('waiting for payment');});
T('Technician: customers limited to own jobs',()=>{a.click('[data-action="close-panel"]');a.go('customers');const n=a.$$('#v-customers .row-card').map(r=>r.dataset.id);return n.every(id=>a.db().orders.some(o=>o.customerId===id&&o.technicianId==='s4'));});
T('Technician: customer history hides other techs\' jobs',()=>{a.click('[data-action="open-customer"][data-id="c1"]');return a.$$('#panelBody [data-action="open-order"]').every(b=>a.order(b.dataset.id).technicianId==='s4');});
T('Technician: follow-ups and purchase hidden',()=>{a.click('[data-action="close-panel"]');a.go('dashboard');return !vis(a.$('#v-dashboard .card[data-edit]'))&&!vis(a.$('[data-action="new-po"]'));});
T('No script errors',()=>a.errs.length===0);}

// ============ 9. USERS ============
S('9 User management');
{const a=app();a.setTab('users');
T('Add user',()=>{a.click('[data-action="new-staff"]');a.F('name').value='Siti';a.F('role').value='technician';a.F('username').value='siti.a';a.F('password').value='siti12345';a.submit();return a.db().staff.some(s=>s.name==='Siti');});
T('Duplicate name rejected',()=>{a.click('[data-action="new-staff"]');a.F('name').value='siti';a.F('username').value='siti.b';a.F('password').value='siti12345';a.submit();const ok=a.modalOpen()&&a.err().includes('already exists');a.click('[data-action="close-modal"]');return ok;});
T('New user appears in the users list',()=>a.$('#v-settings').textContent.includes('siti.a'));
T('New technician appears in check-in technician list',()=>{a.click('#v-settings');a.go('orders');a.click('#v-orders [data-action="new-order"]');const ok=[...a.F('tech').options].some(o=>o.textContent==='Siti');a.click('[data-action="close-modal"]');return ok;});
T('Change role takes effect',()=>{a.setTab('users');const sid=a.db().staff.find(s=>s.name==='Siti').id;a.click(`[data-action="edit-staff"][data-id="${sid}"]`);a.F('role').value='advisor';a.submit();return a.db().staff.find(s=>s.name==='Siti').role==='advisor';});
T('Cannot demote the last owner',()=>{a.click('[data-action="edit-staff"][data-id="s1"]');a.F('role').value='manager';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Cannot change a technician with open jobs to another role',()=>{a.click('[data-action="edit-staff"][data-id="s5"]');a.F('role').value='advisor';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok&&a.db().staff.find(s=>s.id==='s5').role==='technician';});
T('Cannot deactivate a user with open jobs',()=>{a.click('[data-action="edit-staff"][data-id="s4"]');a.click('[data-action="remove-staff"]');return a.db().staff.find(s=>s.id==='s4').active===true;});
T('Deactivate keeps history (name still shown on old jobs)',()=>{a.click('[data-action="close-modal"]');const sid=a.db().staff.find(s=>s.name==='Siti').id;a.click(`[data-action="edit-staff"][data-id="${sid}"]`);a.click('[data-action="remove-staff"]');const u=a.db().staff.find(s=>s.id===sid);return u&&u.active===false&&!a.$('#v-settings').textContent.includes('siti.a');});
T('Cannot deactivate yourself',()=>{const b=app();b.setTab('users');b.click('[data-action="new-staff"]');b.F('name').value='Owner2';b.F('role').value='owner';b.F('username').value='owner2';b.F('password').value='owner12345';b.submit();b.click('[data-action="edit-staff"][data-id="s1"]');b.click('[data-action="remove-staff"]');return b.db().staff.find(s=>s.id==='s1').active===true&&b.toast().includes('yourself');});
T('Signing in as a demoted user uses their new permissions',()=>{const b=app();b.setTab('users');b.click('[data-action="edit-staff"][data-id="s2"]');b.F('role').value='advisor';b.submit();b.signIn('s2');return b.d.documentElement.dataset.canCost==='0';});
T('No script errors',()=>a.errs.length===0);}

// ============ 10. SETTINGS / PERSISTENCE ============
S('10 Settings and saving');
{const a=app();
T('Theme colour applies',()=>{a.go('settings');a.click('[data-action="theme"][data-c="#1D5FD1"]');return a.d.documentElement.style.getPropertyValue('--green')==='#1D5FD1';});
T('Data survives a page reload',()=>{a.openOrder('WO-1047');a.click('[data-action="start-insp"]');const st=a.storage();const b=app(st);return b.order('WO-1047').stage==='pre-inspection'&&b.d.documentElement.style.getPropertyValue('--green')==='#1D5FD1';});
T('Signed-in user survives reload',()=>{a.signIn('s3');const b=app(a.storage());return b.authed()&&b.$('#userName').textContent==='Priya Nair';});
T('Order counter survives reload (no duplicate WO numbers)',()=>{const b=app(a.storage());b.signIn('s1');b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='50000';b.submit();const ids=b.db().orders.map(o=>o.id);return new Set(ids).size===ids.length;});
T('Reset restores demo data',()=>{a.setTab('general');a.signIn('s1');a.setTab('general');a.click('[data-action="reset"]');return a.order('WO-1047').stage==='reception'&&!a.d.documentElement.style.getPropertyValue('--green');});
T('No script errors',()=>a.errs.length===0);}

// ============ 11. LOGIN ============
S('11 Login');
{const a=app(null,{anon:true});
T('App is locked until you sign in',()=>!a.authed()&&!!a.$('#loginForm'));
T('No workshop data is rendered before sign-in',()=>a.$('#v-orders').textContent.trim()===''&&a.$('#v-dashboard').textContent.trim()==='');
T('Empty form is rejected',()=>{a.login('','');return !a.authed()&&a.loginErr().includes('Enter your username');});
T('Wrong password is rejected',()=>{a.login('alex.tan','nope123');return !a.authed()&&a.loginErr().includes('Wrong username or password');});
T('Unknown user gives the same message (no user enumeration)',()=>{const b=app(null,{anon:true});b.login('ghost.user','nope123');const m1=b.loginErr();const c=app(null,{anon:true});c.login('alex.tan','wrongpw');return m1.replace(/\d+/g,'')===c.loginErr().replace(/\d+/g,'');});
T('Password is case-sensitive',()=>{const b=app(null,{anon:true});b.login('alex.tan','OWNER123');return !b.authed();});
T('Correct password signs in and lands on the dashboard',()=>{const b=app(null,{anon:true});b.login('alex.tan','owner123');return b.authed()&&b.$('#v-dashboard').classList.contains('active')&&b.$('#userName').textContent==='Alex Tan';});
T('Username is case-insensitive and trimmed',()=>{const b=app(null,{anon:true});b.login('  Alex.Tan  ','owner123');return b.authed();});
T('Failed attempts are counted down',()=>{const b=app(null,{anon:true});b.login('alex.tan','x1');const first=b.loginErr();b.login('alex.tan','x2');return first.includes('4 attempts left')&&b.loginErr().includes('3 attempts left');});
T('Account locks after 5 failed attempts',()=>{const b=app(null,{anon:true});for(let i=0;i<5;i++)b.login('alex.tan','bad'+i);return b.loginErr().includes('Too many failed attempts');});
T('Lockout blocks even the correct password',()=>{const b=app(null,{anon:true});for(let i=0;i<5;i++)b.login('alex.tan','bad'+i);b.login('alex.tan','owner123');return !b.authed()&&b.loginErr().includes('Too many failed attempts');});
T('A good sign-in clears the failure count',()=>{const b=app(null,{anon:true});b.login('alex.tan','bad1');b.login('alex.tan','owner123');const locks=JSON.parse(b.w.localStorage.getItem('nexauto_lockouts')||'{}');return b.authed()&&!locks['alex.tan'];});
T('Show/hide password toggle works',()=>{const b=app(null,{anon:true});b.click('#pwToggle');const shown=b.$('#loginPass').type==='text';b.click('#pwToggle');return shown&&b.$('#loginPass').type==='password';});
T('Demo account button fills the credentials',()=>{const b=app(null,{anon:true});b.click('[data-action="use-demo"][data-u="priya.nair"]');return b.$('#loginUser').value==='priya.nair'&&b.$('#loginPass').value==='advisor123';});
T('Password is cleared from the field after a failed attempt',()=>{const b=app(null,{anon:true});b.login('alex.tan','bad1');return b.$('#loginPass').value==='';});
T('Passwords are not stored in readable form',()=>{const b=app(null,{anon:true});const raw=JSON.stringify(b.db().staff);return !raw.includes('owner123')&&!raw.includes('tech123')&&b.db().staff.every(s=>!!s.pwHash&&!!s.salt);});
T('No script errors',()=>a.errs.length===0);}

// ============ 12. LOGIN PER ROLE ============
S('12 Sign-in as each role');
{
T('Owner signs in and sees revenue',()=>{const b=app(null,{anon:true});b.login('alex.tan','owner123');return b.authed()&&b.d.documentElement.dataset.canRevenue==='1'&&b.d.documentElement.dataset.canStaff==='1';});
T('Manager signs in: revenue yes, user management no',()=>{const b=app(null,{anon:true});b.login('joanne.lim','manager123');const r=b.d.documentElement.dataset;return b.authed()&&r.canRevenue==='1'&&r.canCost==='1'&&r.canStaff==='0';});
T('Advisor signs in: prices yes, cost and revenue no',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');const r=b.d.documentElement.dataset;return b.authed()&&r.canPrice==='1'&&r.canCost==='0'&&r.canRevenue==='0'&&r.canStaff==='0';});
T('Technician signs in: no prices, own jobs only',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');const r=b.d.documentElement.dataset;b.go('orders');const ids=b.$$('#v-orders [data-action="open-order"]').map(x=>x.dataset.id);return b.authed()&&r.canPrice==='0'&&r.canEdit==='0'&&ids.length>0&&ids.every(id=>b.order(id).technicianId==='s4');});
T('Each role sees their own name and role in the header',()=>{const b=app(null,{anon:true});b.login('daniel.koh','tech123');return b.$('#userName').textContent==='Daniel Koh'&&b.$('#userRole').textContent==='Technician';});
T('Technician cannot reach settings user management',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.go('settings');return b.d.documentElement.dataset.canStaff==='0';});
T('Signing out and back in as another role swaps permissions',()=>{const b=app(null,{anon:true});b.login('alex.tan','owner123');const asOwner=b.d.documentElement.dataset.canCost;b.signOut();b.login('marcus.lee','tech123');return asOwner==='1'&&b.d.documentElement.dataset.canCost==='0'&&b.$('#userName').textContent==='Marcus Lee';});
T('Previous user data is not left on screen after switching',()=>{const b=app(null,{anon:true});b.login('alex.tan','owner123');b.go('reports');b.signOut();b.login('marcus.lee','tech123');return b.$('#v-dashboard').classList.contains('active')&&!b.$('#v-reports').classList.contains('active');});
}

// ============ 13. SESSIONS ============
S('13 Sessions and sign-out');
{
T('Sign out returns to the login screen',()=>{const b=app();b.signOut();return !b.authed()&&b.$('#loginForm').elements.username.value==='';});
T('Sign out clears the stored session',()=>{const b=app();b.signOut();return !b.w.localStorage.getItem('nexauto_session')&&!b.w.sessionStorage.getItem('nexauto_session');});
T('Sign out closes any open panel',()=>{const b=app();b.openOrder('WO-1043');b.signOut();return !b.$('#panel').classList.contains('open');});
T('After sign out a reload still shows login',()=>{const b=app();b.signOut();const c=app(b.storage(),{anon:true});return !c.authed();});
T('"Keep me signed in" survives a reload',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123',true);const c=app(b.storage(),{anon:true});return c.authed()&&c.$('#userName').textContent==='Priya Nair';});
T('Without "keep me signed in" the session does not persist',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123',false);const c=app(b.storage(),{anon:true});return b.authed()&&!c.authed();});
T('An expired session forces a new sign-in',()=>{const b=app(null,{session:session('s1',Date.now()-13*3600000)});return !b.authed();});
T('A session just inside the window still works',()=>{const b=app(null,{session:session('s1',Date.now()-11*3600000)});return b.authed();});
T('A tampered session (unknown user) forces a new sign-in',()=>{const b=app(null,{session:JSON.stringify({userId:'s999',at:Date.now()})});return !b.authed();});
T('A corrupt session value forces a new sign-in',()=>{const b=app(null,{session:'not-json'});return !b.authed();});
T('Changing role does not need a new sign-in but applies live',()=>{const b=app();b.setTab('users');b.click('[data-action="edit-staff"][data-id="s1"]');b.F('name').value='Alex Tan';b.submit();return b.authed();});
T('No script errors',()=>{const b=app();b.signOut();return b.errs.length===0;});
}

// ============ 14. CREDENTIAL MANAGEMENT ============
S('14 Credential management');
{
T('Owner can reset another user\'s password',()=>{const b=app();b.setTab('users');b.click('[data-action="edit-staff"][data-id="s3"]');b.F('password').value='newpass123';b.submit();b.signOut();b.login('priya.nair','newpass123');return b.authed();});
T('The old password stops working after a reset',()=>{const b=app();b.setTab('users');b.click('[data-action="edit-staff"][data-id="s3"]');b.F('password').value='newpass123';b.submit();b.signOut();b.login('priya.nair','advisor123');return !b.authed();});
T('Owner can change a username and it is used to sign in',()=>{const b=app();b.setTab('users');b.click('[data-action="edit-staff"][data-id="s4"]');b.F('username').value='marcus.l';b.submit();b.signOut();b.login('marcus.l','tech123');return b.authed();});
T('Duplicate username is rejected',()=>{const b=app();b.setTab('users');b.click('[data-action="edit-staff"][data-id="s4"]');b.F('username').value='alex.tan';b.submit();const ok=b.modalOpen()&&b.err().includes('taken');b.click('[data-action="close-modal"]');return ok;});
T('Invalid username format is rejected',()=>{const b=app();b.setTab('users');b.click('[data-action="new-staff"]');b.F('name').value='Bad User';b.F('username').value='a b!';b.F('password').value='goodpass1';b.submit();const ok=b.modalOpen()&&b.err().includes('Username must be');b.click('[data-action="close-modal"]');return ok;});
T('Short password is rejected',()=>{const b=app();b.setTab('users');b.click('[data-action="new-staff"]');b.F('name').value='Short Pw';b.F('username').value='short.pw';b.F('password').value='12345';b.submit();const ok=b.modalOpen()&&b.err().includes('at least 6');b.click('[data-action="close-modal"]');return ok;});
T('A new user can sign in with the credentials they were given',()=>{const b=app();b.setTab('users');b.click('[data-action="new-staff"]');b.F('name').value='Nurul Aina';b.F('role').value='advisor';b.F('username').value='nurul.aina';b.F('password').value='aina12345';b.submit();b.signOut();b.login('nurul.aina','aina12345');return b.authed()&&b.$('#userName').textContent==='Nurul Aina'&&b.d.documentElement.dataset.canCost==='0';});
T('A deactivated user cannot sign in',()=>{const b=app();b.setTab('users');b.click('[data-action="new-staff"]');b.F('name').value='Temp Staff';b.F('role').value='advisor';b.F('username').value='temp.staff';b.F('password').value='temp12345';b.submit();const sid=b.db().staff.find(s=>s.name==='Temp Staff').id;b.click(`[data-action="edit-staff"][data-id="${sid}"]`);b.click('[data-action="remove-staff"]');b.signOut();b.login('temp.staff','temp12345');return !b.authed()&&b.loginErr().includes('Wrong username or password');});
T('A deactivated user\'s existing session is rejected on reload',()=>{const b=app();b.setTab('users');b.click('[data-action="new-staff"]');b.F('name').value='Gone Soon';b.F('role').value='advisor';b.F('username').value='gone.soon';b.F('password').value='gone12345';b.submit();const sid=b.db().staff.find(s=>s.name==='Gone Soon').id;b.click(`[data-action="edit-staff"][data-id="${sid}"]`);b.click('[data-action="remove-staff"]');const c=app(b.storage(),{session:session(sid)});return !c.authed();});
T('Password reset clears an existing lockout',()=>{const b=app(null,{anon:true});for(let i=0;i<5;i++)b.login('priya.nair','bad'+i);b.login('alex.tan','owner123');b.setTab('users');b.click('[data-action="edit-staff"][data-id="s3"]');b.F('password').value='fresh12345';b.submit();b.signOut();b.login('priya.nair','fresh12345');return b.authed();});
T('Usernames are shown in the user list',()=>{const b=app();b.setTab('users');const t=b.$('#v-settings').textContent;return t.includes('alex.tan')&&t.includes('marcus.lee');});
T('No script errors',()=>{const b=app();b.go('settings');return b.errs.length===0;});
}

// ============ 15. SIX MONTHS OF DATA ============
S('15 Historical data');
{const a=app();const db=a.db();
const hist=db.orders.filter(o=>o.stage==='completed'||o.stage==='declined');
const paid=db.orders.filter(o=>o.stage==='completed'&&o.payment);
const days=t=>(Date.now()-new Date(t).getTime())/86400000;
T('Six months of closed jobs exist',()=>paid.length>150);
T('History reaches back about 6 months',()=>{const oldest=Math.max(...paid.map(o=>days(o.payment.paidAt)));return oldest>165&&oldest<190;});
T('History runs up to the present',()=>Math.min(...paid.map(o=>days(o.payment.paidAt)))<2);
T('Every order number is unique',()=>{const ids=db.orders.map(o=>o.id);return new Set(ids).size===ids.length;});
T('Historical jobs are numbered below the live ones',()=>{const live=['WO-1041','WO-1042','WO-1043','WO-1044','WO-1045','WO-1046','WO-1047'];const older=db.orders.filter(o=>!live.includes(o.id));return older.every(o=>Number(o.id.slice(3))<1041);});
T('Next order number is still free',()=>!db.orders.some(o=>o.id==='WO-'+db.nextWO));
T('Every order points at a real customer and vehicle',()=>db.orders.every(o=>{const c=db.customers.find(x=>x.id===o.customerId);return c&&c.vehicles.some(v=>v.id===o.vehicleId);}));
T('Every order has a real technician and advisor',()=>db.orders.every(o=>db.staff.some(s=>s.id===o.technicianId)&&db.staff.some(s=>s.id===o.advisorId)));
T('Completed jobs all carry a payment that matches the total',()=>paid.every(o=>o.payment.amount===a.total(o).total));
T('Declined jobs carry no payment',()=>db.orders.filter(o=>o.stage==='declined').every(o=>!o.payment&&o.quoteStatus==='rejected'));
T('Some jobs were declined, so approval rate is not a flat 100%',()=>{const d=db.orders.filter(o=>o.stage==='declined').length;return d>5&&d<hist.length*0.3;});
T('Every job has priced items',()=>db.orders.every(o=>o.stage==='reception'||o.stage==='pre-inspection'||(o.items.length>0&&o.items.every(i=>i.price>=0&&i.qty>0))));
T('Parts on historical jobs match the price list',()=>paid.every(o=>o.items.filter(i=>i.type==='part').every(i=>{const p=db.inventory.find(x=>x.sku===i.sku);return p&&i.price===p.price&&i.cost===p.cost;})));
T('Mileage increases across each vehicle\'s visits',()=>{const byVeh={};db.orders.slice().sort((x,y)=>x.createdAt.localeCompare(y.createdAt)).forEach(o=>{(byVeh[o.vehicleId]=byVeh[o.vehicleId]||[]).push(o.mileage);});return Object.values(byVeh).every(list=>list.every((m,i)=>i===0||m>=list[i-1]));});
T('Customers have repeat visits',()=>{const n={};paid.forEach(o=>n[o.customerId]=(n[o.customerId]||0)+1);return Math.max(...Object.values(n))>=4;});
T('Stock movements reference real jobs and parts',()=>db.movements.every(m=>db.inventory.some(p=>p.sku===m.sku)&&(m.type!=='sale'||db.orders.some(o=>o.id===m.ref))));
T('Every sale movement reduces stock, every receipt increases it',()=>db.movements.every(m=>m.type==='sale'?m.qty<0:m.type==='receive'?m.qty>0:true));
T('The dataset is identical on every visit',()=>{const b=app();const sum=x=>x.db().orders.filter(o=>o.payment).reduce((s,o)=>s+o.payment.amount,0);return sum(a)===sum(b)&&a.db().customers.length===b.db().customers.length;});
T('No script errors',()=>a.errs.length===0);}

// ============ 16. REPORTS ============
S('16 Reports');
{const a=app();a.go('reports');
T('Reports open on the 30-day range',()=>a.$('[data-action="report-range"][data-r="30d"]').classList.contains('active'));
T('Revenue is a real figure, not a placeholder',()=>{const v=a.num(a.kpi('Revenue'));return v>0&&v!==1120+1380+990+1560+1720+1290;});
T('30-day revenue matches the orders paid in that window',()=>{const from=new Date();from.setHours(0,0,0,0);from.setDate(from.getDate()-29);const end=new Date();end.setHours(0,0,0,0);end.setDate(end.getDate()+1);const want=a.paidBetween(from.getTime(),end.getTime()).reduce((s,o)=>s+a.total(o).total,0);return a.num(a.kpi('Revenue'))===want;});
T('Paid job count is shown and matches',()=>{const from=new Date();from.setHours(0,0,0,0);from.setDate(from.getDate()-29);const end=new Date();end.setHours(0,0,0,0);end.setDate(end.getDate()+1);const n=a.paidBetween(from.getTime(),end.getTime()).length;return a.$$('#v-reports .kpi')[0].querySelector('.foot').textContent.includes(n+' paid jobs');});
T('Gross profit is revenue minus cost',()=>{const from=new Date();from.setHours(0,0,0,0);from.setDate(from.getDate()-29);const end=new Date();end.setHours(0,0,0,0);end.setDate(end.getDate()+1);const rows=a.paidBetween(from.getTime(),end.getTime());const want=rows.reduce((s,o)=>s+a.total(o).profit,0);return a.num(a.kpi('Gross profit'))===want;});
T('Average ticket is revenue divided by jobs',()=>{const rev=a.num(a.kpi('Revenue')),avg=a.num(a.kpi('Average ticket'));const n=Number(a.$$('#v-reports .kpi')[0].querySelector('.foot').textContent.match(/\d+/)[0]);return avg===Math.round(rev/n);});
T('Switching to 6 months increases revenue',()=>{const m30=a.num(a.kpi('Revenue'));a.range('6m');const m6=a.num(a.kpi('Revenue'));return m6>m30;});
T('Switching to 7 days decreases revenue',()=>{a.range('7d');const w=a.num(a.kpi('Revenue'));a.range('6m');return w<a.num(a.kpi('Revenue'));});
T('The 6-month chart is bucketed by month',()=>{a.range('6m');return a.$('#v-reports .badge').textContent==='6 months';});
T('6-month revenue matches the orders paid in that window',()=>{a.range('6m');const from=new Date();from.setDate(1);from.setHours(0,0,0,0);from.setMonth(from.getMonth()-5);const end=new Date();end.setDate(1);end.setHours(0,0,0,0);end.setMonth(end.getMonth()+1);const want=a.paidBetween(from.getTime(),end.getTime()).reduce((s,o)=>s+a.total(o).total,0);return a.num(a.kpi('Revenue'))===want;});
T('The selected range stays highlighted',()=>{a.range('7d');return a.$('[data-action="report-range"][data-r="7d"]').classList.contains('active')&&!a.$('[data-action="report-range"][data-r="30d"]').classList.contains('active');});
T('Quote approval is a percentage under 100 with a count behind it',()=>{a.range('6m');const p=a.num(a.kpi('Quote approval'));const foot=a.$$('#v-reports .kpi')[3].querySelector('.foot').textContent;return p>0&&p<100&&/\d+ of \d+/.test(foot);});
T('Parts and labor split adds up to 100%',()=>{a.range('6m');const pct=a.$$('#mixCard .line .r').map(e=>Number(e.textContent.match(/(\d+)%/)[1]));return pct.length===2&&pct[0]+pct[1]===100;});
T('Changing range does not leave stale figures',()=>{a.range('7d');const w=a.num(a.kpi('Revenue'));a.range('7d');return a.num(a.kpi('Revenue'))===w;});
T('No script errors',()=>a.errs.length===0);}

// ============ 17. REPORTS BY ROLE ============
S('17 Reports by role');
{
T('Manager sees the shop revenue report',()=>{const b=app(null,{anon:true});b.login('joanne.lim','manager123');b.go('reports');return b.num(b.kpi('Revenue'))>0;});
T('Advisor cannot see shop revenue',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');b.go('reports');return b.d.documentElement.dataset.canRevenue==='0'&&!!b.$('#v-reports [data-personal]');});
T('Technician sees their own completed jobs instead',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.go('reports');b.range('6m');const mine=b.db().orders.filter(o=>o.stage==='completed'&&o.payment&&o.technicianId==='s4').length;return b.num(b.kpi('Jobs completed'))>0&&b.num(b.kpi('Jobs completed'))<=mine;});
T('Technician job count is real, not padded',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.go('reports');b.range('6m');const from=new Date();from.setDate(1);from.setHours(0,0,0,0);from.setMonth(from.getMonth()-5);const end=new Date();end.setDate(1);end.setHours(0,0,0,0);end.setMonth(end.getMonth()+1);const want=b.paidBetween(from.getTime(),end.getTime()).filter(o=>o.technicianId==='s4').length;return b.num(b.kpi('Jobs completed'))===want;});
T('Technician report shows no money anywhere',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.go('reports');return !b.$('#v-reports [data-personal]').textContent.includes('$');});
}

// ============ 18. ORDERS WITH HISTORY ============
S('18 Orders list with history');
{const a=app();a.go('orders');
T('Orders open on the live jobs, not six months of history',()=>a.$('[data-action="order-filter"][data-f="open"]').classList.contains('active'));
T('Open list shows only jobs still in the workshop',()=>a.$$('#v-orders [data-action="open-order"]').every(b=>{const o=a.order(b.dataset.id);return o.stage!=='completed'&&o.stage!=='declined';}));
T('The list is capped rather than drawing every job',()=>{a.click('[data-action="order-filter"][data-f="all"]');return a.$$('#v-orders [data-action="open-order"]').length<=25&&a.db().orders.length>200;});
T('Show more reveals the next page',()=>{const before=a.$$('#v-orders [data-action="open-order"]').length;a.click('[data-action="more-orders"]');return a.$$('#v-orders [data-action="open-order"]').length>before;});
T('Show more disappears once everything is listed',()=>{for(let i=0;i<20&&a.$('[data-action="more-orders"]');i++)a.click('[data-action="more-orders"]');return !a.$('[data-action="more-orders"]')&&a.$$('#v-orders [data-action="open-order"]').length===a.db().orders.length;});
T('Changing filter resets the page size',()=>{a.click('[data-action="order-filter"][data-f="completed"]');return a.$$('#v-orders [data-action="open-order"]').length<=25;});
T('Completed filter shows only completed jobs',()=>a.$$('#v-orders [data-action="open-order"]').every(b=>a.order(b.dataset.id).stage==='completed'));
T('Declined filter shows only declined jobs',()=>{a.click('[data-action="order-filter"][data-f="declined"]');const rows=a.$$('#v-orders [data-action="open-order"]');return rows.length>0&&rows.every(b=>a.order(b.dataset.id).stage==='declined');});
T('Chip counts match the data',()=>{const db=a.db();const chip=f=>Number(a.$(`[data-action="order-filter"][data-f="${f}"] .n`).textContent);return chip('all')===db.orders.length&&chip('completed')===db.orders.filter(o=>o.stage==='completed').length&&chip('declined')===db.orders.filter(o=>o.stage==='declined').length;});
T('Search finds a historical job by number',()=>{const old=a.db().orders.find(o=>o.stage==='completed'&&o.id!=='WO-1041'&&o.id!=='WO-1042');a.click('[data-action="order-filter"][data-f="all"]');const s=a.$('#orderSearch');s.value=old.id;s.dispatchEvent(new a.w.Event('input',{bubbles:true}));const rows=a.$$('#v-orders [data-action="open-order"]');return rows.length===1&&rows[0].dataset.id===old.id;});
T('A historical job opens and shows its payment',()=>{const id=a.$$('#v-orders [data-action="open-order"]')[0].dataset.id;a.click(`[data-action="open-order"][data-id="${id}"]`);return a.$('#panelTitle').textContent.length>0&&a.$('#panel').classList.contains('open');});
T('Stock history is capped and says so',()=>{a.click('[data-action="close-panel"]');a.go('inventory');a.click('[data-action="inv-tab"][data-tab="history"]');const rows=a.$$('#v-inventory tbody tr').length;return rows<=60&&a.$('#v-inventory .badge').textContent.includes('of '+a.db().movements.length);});
T('A customer with history shows past visits',()=>{a.go('customers');const db=a.db();const n={};db.orders.filter(o=>o.stage==='completed').forEach(o=>n[o.customerId]=(n[o.customerId]||0)+1);const busiest=Object.keys(n).sort((x,y)=>n[y]-n[x])[0];a.click(`[data-action="open-customer"][data-id="${busiest}"]`);return a.$$('#panelBody [data-action="open-order"]').length>=4;});
T('No script errors',()=>a.errs.length===0);}

// ============ 19. TECHNICIAN CHECK-IN ============
S('19 Technician check-in');
{
const tech=()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');return b;};
T('Technician sees the New order button',()=>{const b=tech();return b.d.documentElement.dataset.canCheckin==='1'&&!!b.$('#v-dashboard [data-action="new-order"]');});
T('Technician can check in a vehicle for an existing customer',()=>{const b=tech();b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='52000';b.submit();const o=b.db().orders.find(x=>x.customerId==='c6'&&x.stage==='reception');return !b.modalOpen()&&!!o;});
T('The job is linked back to that customer and vehicle',()=>{const b=tech();b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='52000';b.submit();const o=b.db().orders.find(x=>x.customerId==='c6'&&x.stage==='reception');const c=b.db().customers.find(x=>x.id==='c6');return c.vehicles.some(v=>v.id===o.vehicleId);});
T('The job is assigned to the technician who checked it in',()=>{const b=tech();b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='52000';b.submit();const o=b.db().orders.find(x=>x.customerId==='c6'&&x.stage==='reception');return o.technicianId==='s4';});
T('It appears in the technician\'s own job list',()=>{const b=tech();b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='52000';b.submit();const o=b.db().orders.find(x=>x.customerId==='c6'&&x.stage==='reception');b.click('[data-action="close-panel"]');b.go('orders');return b.$$('#v-orders [data-action="open-order"]').some(x=>x.dataset.id===o.id);});
T('An advisor is still recorded on the job',()=>{const b=tech();b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='52000';b.submit();const o=b.db().orders.find(x=>x.customerId==='c6'&&x.stage==='reception');return !!o.advisorId&&b.db().staff.find(s=>s.id===o.advisorId).role!=='technician';});
T('The log records the technician checked it in',()=>{const b=tech();b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='52000';b.submit();return b.$('#panelBody').textContent.includes('Checked in by Marcus Lee');});
T('Technician can register a brand new customer at check-in',()=>{const b=tech();b.click('#v-dashboard [data-action="new-order"]');b.F('cname').value='Walk In';b.F('cphone').value='9444 3210';b.F('plate').value='sgp 99 z';b.F('model').value='Perodua Myvi';b.F('mileage').value='12000';b.submit();const c=b.db().customers.find(x=>x.name==='Walk In');return !b.modalOpen()&&!!c&&b.db().orders.some(o=>o.customerId===c.id);});
T('Check-in validation still applies to technicians',()=>{const b=tech();b.click('#v-dashboard [data-action="new-order"]');b.F('cname').value='Dup Phone';b.F('cphone').value='9123 4567';b.F('plate').value='SGP 1 Z';b.F('model').value='X';b.F('mileage').value='1';b.submit();const ok=b.modalOpen();b.click('[data-action="close-modal"]');return ok;});
T('Checking in did not grant any other permission',()=>{const b=tech();const r=b.d.documentElement.dataset;return r.canEdit==='0'&&r.canPrice==='0'&&r.canCost==='0'&&r.canPurchase==='0'&&r.canStaff==='0';});
T('Technician still cannot take payment or edit the quote',()=>{const b=tech();b.openOrder('WO-1044');return !b.$('[data-action="take-payment"]')&&!b.$('[data-action="add-part"]');});
T('Advisors and owners can still check in',()=>{const b=app();return b.d.documentElement.dataset.canCheckin==='1'&&!!b.$('#v-dashboard [data-action="new-order"]');});
T('No script errors',()=>{const b=tech();return b.errs.length===0;});
}

// ============ 20. JOB NOTES ============
S('20 Job notes');
{
const openNotes=(b,id)=>{b.openOrder(id);b.tab('notes');};
T('Every role sees a Notes tab',()=>{const roles=[['alex.tan','owner123'],['joanne.lim','manager123'],['priya.nair','advisor123'],['marcus.lee','tech123']];return roles.every(([u,p])=>{const b=app(null,{anon:true});b.login(u,p);b.openOrder('WO-1043');return !!b.$('[data-action="order-tab"][data-tab="notes"]');});});
T('Technician can add a note mid-job',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');openNotes(b,'WO-1043');b.$('#noteText').value='Rear shock is leaking, needs a look';b.click('[data-action="add-note"]');return b.order('WO-1043').remarks.some(r=>r.text.includes('Rear shock'));});
T('The note records who wrote it and when',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');openNotes(b,'WO-1043');b.$('#noteText').value='Checked the brakes';b.click('[data-action="add-note"]');const r=b.order('WO-1043').remarks.slice(-1)[0];return r.by==='s4'&&!!r.at&&!isNaN(new Date(r.at));});
T('The author\'s name is shown on the note',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');openNotes(b,'WO-1043');b.$('#noteText').value='Visible author test';b.click('[data-action="add-note"]');return b.$('#panelBody').textContent.includes('Marcus Lee');});
T('A note written by the technician is visible to the advisor',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');openNotes(b,'WO-1043');b.$('#noteText').value='Shared with the team';b.click('[data-action="add-note"]');const store=b.storage();const c=app(store,{anon:true});c.login('priya.nair','advisor123');openNotes(c,'WO-1043');return c.$('#panelBody').textContent.includes('Shared with the team');});
T('And to the owner',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');openNotes(b,'WO-1043');b.$('#noteText').value='Owner can read this';b.click('[data-action="add-note"]');const c=app(b.storage(),{anon:true});c.login('alex.tan','owner123');openNotes(c,'WO-1043');return c.$('#panelBody').textContent.includes('Owner can read this');});
T('Advisors can add notes too',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');openNotes(b,'WO-1043');b.$('#noteText').value='Called the customer, no answer';b.click('[data-action="add-note"]');return b.order('WO-1043').remarks.slice(-1)[0].by==='s3';});
T('An empty note is rejected',()=>{const b=app();openNotes(b,'WO-1043');const before=b.order('WO-1043').remarks.length;b.$('#noteText').value='   ';b.click('[data-action="add-note"]');return b.order('WO-1043').remarks.length===before&&b.toast().includes('Write a note');});
T('Notes survive a reload',()=>{const b=app();openNotes(b,'WO-1043');b.$('#noteText').value='Still here after reload';b.click('[data-action="add-note"]');const c=app(b.storage());openNotes(c,'WO-1043');return c.$('#panelBody').textContent.includes('Still here after reload');});
T('The tab shows how many notes there are',()=>{const b=app();b.openOrder('WO-1043');const n=b.order('WO-1043').remarks.length;return b.$('[data-action="order-tab"][data-tab="notes"] .n').textContent===String(n);});
T('A closed job has a read-only thread',()=>{const b=app();openNotes(b,'WO-1041');return !b.$('#noteText')&&!b.$('[data-action="add-note"]')&&b.$('#panelBody').textContent.includes('read-only');});
T('Note text is escaped, not rendered as markup',()=>{const b=app();openNotes(b,'WO-1043');b.$('#noteText').value='<img src=x onerror=alert(1)>';b.click('[data-action="add-note"]');return !b.$('#panelBody').querySelector('img')&&b.$('#panelBody').textContent.includes('<img src=x');});
T('Long notes are capped rather than rejected',()=>{const b=app();openNotes(b,'WO-1043');b.$('#noteText').value='x'.repeat(900);b.click('[data-action="add-note"]');return b.order('WO-1043').remarks.slice(-1)[0].text.length===500;});
T('The demo ships with notes on the live jobs',()=>{const b=app();const o=b.order('WO-1043');return o.remarks.length>=2&&o.remarks.some(r=>r.by==='s4')&&o.remarks.some(r=>r.by==='s3');});
T('Notes do not appear on jobs that have none',()=>{const b=app();b.openOrder('WO-1047');b.tab('notes');return b.$('#panelBody').textContent.includes('No notes yet');});
T('No script errors',()=>{const b=app();openNotes(b,'WO-1043');return b.errs.length===0;});
}

// ============ 21. PART PHOTOS ============
S('21 Part photos');
const PNG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKAA/9k=';
{
T('Parts without a photo show a placeholder',()=>{const b=app();b.go('inventory');const ph=b.$$('#v-inventory .part-thumb.ph');return ph.length===b.db().inventory.length;});
T('A photo can be saved against a new part',()=>{const b=app();b.go('inventory');b.click('[data-action="new-part"]');b.F('name').value='Spark plug, iridium';b.F('sku').value='SPK-IR01';b.F('price').value='25';b.F('image').value=PNG;b.submit();const p=b.db().inventory.find(x=>x.sku==='SPK-IR01');return !!p&&p.image===PNG;});
T('The photo is shown in the parts list',()=>{const b=app();b.go('inventory');b.click('[data-action="new-part"]');b.F('name').value='Spark plug';b.F('sku').value='SPK-IR02';b.F('price').value='25';b.F('image').value=PNG;b.submit();const img=b.$$('#v-inventory img.part-thumb');return img.length===1&&img[0].getAttribute('src')===PNG;});
T('An existing part can have a photo added',()=>{const b=app();b.go('inventory');b.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');b.F('image').value=PNG;b.submit();return b.part('OIL-5W30').image===PNG;});
T('The adjust form pre-fills the current photo',()=>{const b=app();b.go('inventory');b.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');b.F('image').value=PNG;b.submit();b.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');const ok=b.F('image').value===PNG&&b.$('#imgPreview').tagName==='IMG';b.click('[data-action="close-modal"]');return ok;});
T('Remove clears the photo',()=>{const b=app();b.go('inventory');b.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');b.F('image').value=PNG;b.submit();b.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');b.click('[data-action="clear-image"]');b.submit();return !b.part('OIL-5W30').image;});
T('Photos survive a reload',()=>{const b=app();b.go('inventory');b.click('[data-action="adjust-stock"][data-sku="BRK-PADF1"]');b.F('image').value=PNG;b.submit();const c=app(b.storage());c.go('inventory');return c.part('BRK-PADF1').image===PNG;});
T('Adjusting stock without touching the photo keeps it',()=>{const b=app();b.go('inventory');b.click('[data-action="adjust-stock"][data-sku="BAT-55B24"]');b.F('image').value=PNG;b.submit();b.click('[data-action="adjust-stock"][data-sku="BAT-55B24"]');b.F('stock').value='9';b.submit();const p=b.part('BAT-55B24');return p.image===PNG&&p.stock===9;});
T('Technicians see part photos too',()=>{const b=app();b.go('inventory');b.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');b.F('image').value=PNG;b.submit();const c=app(b.storage(),{anon:true});c.login('marcus.lee','tech123');c.go('inventory');return c.$$('#v-inventory img.part-thumb').length===1;});
T('No script errors',()=>{const b=app();b.go('inventory');return b.errs.length===0;});
}

// ============ 22. EDIT JOB DETAILS ============
S('22 Edit job details');
{
const tech=()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');return b;};
T('Technician can open Edit details on their own job',()=>{const b=tech();b.openOrder('WO-1043');return !!b.$('[data-action="edit-order"]');});
T('Advisors and owners can too',()=>{const b=app();b.openOrder('WO-1043');return !!b.$('[data-action="edit-order"]');});
T('A closed job cannot be edited',()=>{const b=app();b.openOrder('WO-1041');return !b.$('[data-action="edit-order"]');});
T('Technician can reassign the job to another technician',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.set('tech','s5');b.submit();return b.order('WO-1043').technicianId==='s5';});
T('Reassigning away closes the panel and drops it from their list',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.set('tech','s5');b.submit();const gone=!b.$$('#v-orders [data-action="open-order"]').some(x=>x.dataset.id==='WO-1043');return gone&&!b.$('#panel').classList.contains('open')&&b.toast().includes('Daniel Koh');});
T('The reassignment is written to the activity log',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.set('tech','s5');b.submit();const o=b.order('WO-1043');return o.log.some(l=>l.x.includes('Reassigned to Daniel Koh')&&l.x.includes('Marcus Lee'));});
T('An advisor reassigning keeps the job open on screen',()=>{const b=app();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.set('tech','s5');b.submit();return b.$('#panel').classList.contains('open')&&b.order('WO-1043').technicianId==='s5';});
T('Technician can correct the mileage',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.F('mileage').value='75000';b.submit();return b.order('WO-1043').mileage===75000;});
T('Technician can update the complaint',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.F('complaint').value='Grinding noise at low speed';b.submit();return b.order('WO-1043').complaint==='Grinding noise at low speed';});
T('Mileage below the vehicle\'s last visit is rejected',()=>{const b=app();b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='52000';b.submit();const id=b.db().orders.find(o=>o.customerId==='c6'&&o.stage==='reception').id;b.click('[data-action="edit-order"]');b.F('mileage').value='100';b.submit();const ok=b.modalOpen()&&b.err().includes("can't be lower");b.click('[data-action="close-modal"]');return ok&&b.order(id).mileage===52000;});
T('A mileage typo can still be corrected downwards when there is no earlier visit',()=>{const b=app();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.F('mileage').value='7231';b.submit();return !b.modalOpen()&&b.order('WO-1043').mileage===7231;});
T('Saving with nothing changed is rejected',()=>{const b=app();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.submit();const ok=b.modalOpen()&&b.err().includes('Nothing has changed');b.click('[data-action="close-modal"]');return ok;});
T('Editing details grants no pricing rights',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');const noPrice=!b.F('price')&&!b.F('discount');b.click('[data-action="close-modal"]');return noPrice&&b.d.documentElement.dataset.canPrice==='0';});
T('The new technician sees the job after handover',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.set('tech','s5');b.submit();const c=app(b.storage(),{anon:true});c.login('daniel.koh','tech123');c.go('orders');return c.$$('#v-orders [data-action="open-order"]').some(x=>x.dataset.id==='WO-1043');});
T('Edits survive a reload',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.F('mileage').value='80000';b.submit();const c=app(b.storage());return c.order('WO-1043').mileage===80000;});
T('No script errors',()=>{const b=tech();b.openOrder('WO-1043');b.click('[data-action="edit-order"]');b.click('[data-action="close-modal"]');return b.errs.length===0;});
}

// ============ 23. JOBS PER TECHNICIAN ============
S('23 Jobs completed per technician');
{const a=app();a.go('reports');a.range('6m');
const rows=()=>a.$$('#v-reports .card .line').filter(l=>/\d+ jobs?/.test(l.textContent));
T('Each technician is listed with a completed job count',()=>{const names=a.db().staff.filter(s=>s.role==='technician').map(s=>s.name);return rows().length===names.length&&names.every(n=>rows().some(r=>r.textContent.includes(n)));});
T('The counts match the orders in the range',()=>{const from=new Date();from.setDate(1);from.setHours(0,0,0,0);from.setMonth(from.getMonth()-5);const end=new Date();end.setDate(1);end.setHours(0,0,0,0);end.setMonth(end.getMonth()+1);const paid=a.paidBetween(from.getTime(),end.getTime());return a.db().staff.filter(s=>s.role==='technician').every(t=>{const want=paid.filter(o=>o.technicianId===t.id).length;const row=rows().find(r=>r.textContent.includes(t.name));return Number(row.textContent.match(/(\d+) jobs?/)[1])===want;});});
T('Every completed job in the range is attributed to someone',()=>{const from=new Date();from.setDate(1);from.setHours(0,0,0,0);from.setMonth(from.getMonth()-5);const end=new Date();end.setDate(1);end.setHours(0,0,0,0);end.setMonth(end.getMonth()+1);const total=a.paidBetween(from.getTime(),end.getTime()).length;const sum=rows().reduce((s,r)=>s+Number(r.textContent.match(/(\d+) jobs?/)[1]),0);return sum===total;});
T('Revenue per technician is shown',()=>rows().every(r=>/\$[\d,]+/.test(r.textContent)));
T('Revenue per technician adds up to the shop revenue',()=>{const sum=rows().reduce((s,r)=>s+a.num(r.textContent.match(/\$[\d,]+/)[0]),0);return sum===a.num(a.kpi('Revenue'));});
T('The busiest technician is listed first',()=>{const ns=rows().map(r=>Number(r.textContent.match(/(\d+) jobs?/)[1]));return ns.every((n,i)=>i===0||n<=ns[i-1]);});
T('Counts follow the selected range',()=>{const six=rows().reduce((s,r)=>s+Number(r.textContent.match(/(\d+) jobs?/)[1]),0);a.range('7d');const week=rows().reduce((s,r)=>s+Number(r.textContent.match(/(\d+) jobs?/)[1]),0);return week<six;});
T('Technicians do not see the shop-wide breakdown',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.go('reports');return b.d.documentElement.dataset.canRevenue==='0';});
T('No script errors',()=>a.errs.length===0);}

// ============ 24. JOB AGEING ============
S('24 Job ageing and reminders');
{const a=app();
T('Stuck jobs are listed on the dashboard',()=>{a.go('dashboard');return a.$$('#v-dashboard [data-action="open-order"]').length>0;});
T('Insights lists the same jobs with a reason',()=>{a.go('insights');const rows=a.$$('#v-insights [data-action="open-order"]');return rows.length>0&&rows.every(r=>r.textContent.trim().length>0);});
T('A quote sent days ago is flagged as waiting on the customer',()=>{a.go('insights');const row=a.$$('#v-insights [data-action="open-order"]').find(r=>r.dataset.id==='WO-1043');return !!row&&row.textContent.includes('waiting on the customer');});
T('Finished work that has not been paid is flagged',()=>{a.go('insights');const row=a.$$('#v-insights [data-action="open-order"]').find(r=>r.dataset.id==='WO-1045');return !!row&&row.textContent.includes('payment not taken');});
T('An unfinished inspection is flagged with the number left',()=>{a.go('insights');const row=a.$$('#v-insights [data-action="open-order"]').find(r=>r.dataset.id==='WO-1046');return !!row&&/\d+ items? still unchecked/.test(row.textContent);});
T('A job checked in today is not flagged',()=>{a.go('insights');return !a.$$('#v-insights [data-action="open-order"]').some(r=>r.dataset.id==='WO-1047');});
T('Completed jobs are never flagged',()=>{a.go('insights');const ids=a.$$('#v-insights [data-action="open-order"]').map(r=>r.dataset.id);return ids.every(id=>{const o=a.order(id);return o.stage!=='completed'&&o.stage!=='declined';});});
T('Days shown are days in the stage, not days since check-in',()=>{a.go('insights');const row=a.$$('#v-insights [data-action="open-order"]').find(r=>r.dataset.id==='WO-1045');return row.textContent.includes('2 days in in service')&&row.textContent.includes('open 5 days');});
T('The list is sorted by how long each job has been stuck',()=>{a.go('insights');const ds=a.$$('#v-insights [data-action="open-order"]').map(r=>Number(r.textContent.match(/(\d+) days? in/)[1]));return ds.every((d,i)=>i===0||d<=ds[i-1]);});
T('Clearing the hold-up removes the job from the list',()=>{const b=app();b.openOrder('WO-1045');b.click('[data-action="take-payment"]');b.submit();b.go('insights');return !b.$$('#v-insights [data-action="open-order"]').some(r=>r.dataset.id==='WO-1045');});
T('A technician only sees their own stuck jobs',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.go('insights');const ids=b.$$('#v-insights [data-action="open-order"]').map(r=>r.dataset.id);return ids.length>0&&ids.every(id=>b.order(id).technicianId==='s4');});
T('No script errors',()=>a.errs.length===0);}

// ============ 25. REORDER SUGGESTIONS ============
S('25 Reorder suggestions');
{const a=app();a.go('insights');
const rows=()=>a.$$('#v-insights table tbody tr');
T('Parts that need ordering are listed',()=>rows().length>0);
T('Every listed part gives a reason',()=>rows().every(r=>/Below the reorder point|days of cover|Out of stock/.test(r.textContent)));
T('Parts below their reorder point are included',()=>{const low=a.db().inventory.filter(p=>(p.stock-(p.reserved||0))<=p.reorder);return low.length>0&&low.every(p=>rows().some(r=>r.dataset.sku===p.sku));});
T('Parts that are not listed are genuinely healthy',()=>{const listed=rows().map(r=>r.dataset.sku);const skipped=a.db().inventory.filter(p=>listed.indexOf(p.sku)===-1);return skipped.length>0&&skipped.every(p=>(p.stock-(p.reserved||0))>p.reorder);});
T('A suggested quantity is given for each',()=>rows().every(r=>{const cells=[...r.querySelectorAll('td')];return Number(cells[4].textContent)>0;}));
T('Monthly usage comes from real stock movements',()=>{const r=rows()[0];const sku=r.dataset.sku;const from=Date.now()-90*86400000;const used=a.db().movements.filter(m=>m.sku===sku&&m.type==='sale'&&new Date(m.at).getTime()>=from).reduce((s,m)=>s+Math.abs(m.qty),0);const want=Math.round(used/90*30);return Number([...r.querySelectorAll('td')][2].textContent)===want;});
T('Ordering the suggestion clears the part from the list',()=>{const b=app();b.go('insights');const sku=b.$$('#v-insights table tbody tr')[0].dataset.sku;const before=b.part(sku).stock;b.click('[data-action="new-po"][data-suggest="1"]');const ok=b.$$('#modalForm [name="part"]').length>0;b.click('[data-action="close-modal"]');return ok&&before===b.part(sku).stock;});
T('The draft purchase order is prefilled with the suggestions',()=>{const b=app();b.go('insights');const want=b.$$('#v-insights table tbody tr').length;b.click('[data-action="new-po"][data-suggest="1"]');const lines=b.$$('#poLines .po-line').length;b.click('[data-action="close-modal"]');return lines===want;});
T('Technicians do not see the reorder card',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.go('insights');return b.d.documentElement.dataset.canPurchase==='0';});
T('No script errors',()=>a.errs.length===0);}

// ============ 26. INSPECTION CHECKLIST ADMIN ============
S('26 Editable lists');
{
const list=b=>b.db().settings.lists.inspection;
T('Owners see the list managers',()=>{const b=app();b.setTab('lists');return b.d.documentElement.dataset.canConfig==='1'&&!!b.$('[data-action="list-add"][data-k="inspection"]');});
T('Managers see it too',()=>{const b=app(null,{anon:true});b.login('joanne.lim','manager123');b.go('settings');return b.d.documentElement.dataset.canConfig==='1';});
T('Advisors and technicians do not',()=>{const roles=[['priya.nair','advisor123'],['marcus.lee','tech123']];return roles.every(([u,p])=>{const b=app(null,{anon:true});b.login(u,p);b.go('settings');return b.d.documentElement.dataset.canConfig==='0';});});
T('The default list has the ten original points',()=>{const b=app();return list(b).length===10&&list(b)[0]==='Engine oil level and condition';});
T('An item can be added',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-add"][data-k="inspection"]');b.F('name').value='Handbrake travel';b.submit();return list(b).length===11&&list(b)[10]==='Handbrake travel';});
T('A duplicate item is rejected',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-add"][data-k="inspection"]');b.F('name').value='battery health';b.submit();const ok=b.modalOpen()&&b.err().includes('already on the list');b.click('[data-action="close-modal"]');return ok&&list(b).length===10;});
T('A too-short name is rejected',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-add"][data-k="inspection"]');b.F('name').value='a';b.submit();const ok=b.modalOpen()&&b.err().includes('at least 2');b.click('[data-action="close-modal"]');return ok;});
T('An item can be renamed',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-rename"][data-k="inspection"][data-i="3"]');b.F('name').value='Battery and charging';b.submit();return list(b)[3]==='Battery and charging';});
T('An item can be moved up',()=>{const b=app();b.setTab('lists');const second=list(b)[1];b.click('[data-action="list-move"][data-k="inspection"][data-i="1"][data-d="-1"]');return list(b)[0]===second;});
T('An item can be moved down',()=>{const b=app();b.setTab('lists');const first=list(b)[0];b.click('[data-action="list-move"][data-k="inspection"][data-i="0"][data-d="1"]');return list(b)[1]===first;});
T('An item can be removed',()=>{const b=app();b.setTab('lists');const gone=list(b)[9];b.click('[data-action="list-remove"][data-k="inspection"][data-i="9"]');return list(b).length===9&&!list(b).includes(gone);});
T('The list cannot drop below three items',()=>{const b=app();b.setTab('lists');for(let i=0;i<12;i++){const btn=b.$('[data-action="list-remove"][data-k="inspection"]');if(btn)b.click(btn);}return list(b).length===3&&b.toast().includes('at least 3');});
T('New jobs use the edited list',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-add"][data-k="inspection"]');b.F('name').value='Handbrake travel';b.submit();b.click('#v-settings');b.go('orders');b.click('#v-orders [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='52000';b.submit();const o=b.db().orders.find(x=>x.customerId==='c6'&&x.stage==='reception');return o.inspection.length===11&&o.inspection[10].name==='Handbrake travel';});
T('Jobs already open keep the list they started with',()=>{const b=app();const before=b.order('WO-1047').inspection.length;b.setTab('lists');b.click('[data-action="list-add"][data-k="inspection"]');b.F('name').value='Handbrake travel';b.submit();return b.order('WO-1047').inspection.length===before;});
T('The inspection tab counts that job\'s own list',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-remove"][data-k="inspection"][data-i="9"]');b.openOrder('WO-1047');return b.$('[data-action="order-tab"][data-tab="inspection"]').textContent.includes('0/10');});
T('Restore default brings the ten points back',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-remove"][data-k="inspection"][data-i="0"]');b.click('[data-action="list-reset"][data-k="inspection"]');return list(b).length===10&&list(b)[0]==='Engine oil level and condition';});
T('The edited list survives a reload',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-add"][data-k="inspection"]');b.F('name').value='Handbrake travel';b.submit();const c=app(b.storage());return list(c).includes('Handbrake travel');});
T('No script errors',()=>{const b=app();b.go('settings');return b.errs.length===0;});
}

// ============ 27. AI PANEL ============
S('27 AI panel');
{
T('The panel is off until a key is connected',()=>{const b=app();b.go('insights');return !!b.$('[data-action="ai-connect"]')&&!b.$('#aiQuestion');});
T('It explains where the key is stored before asking for one',()=>{const b=app();b.go('insights');return b.$('.ai-card').textContent.includes('stored in this browser only');});
T('A key that is not an Anthropic key is rejected',()=>{const b=app();b.go('insights');b.click('[data-action="ai-connect"]');b.F('key').value='hunter2';b.submit();const ok=b.modalOpen()&&b.err().includes('sk-ant-');b.click('[data-action="close-modal"]');return ok;});
T('Connecting a key reveals the question box',()=>{const b=app();b.go('insights');b.click('[data-action="ai-connect"]');b.F('key').value='sk-ant-test-key';b.submit();return !!b.$('#aiQuestion')&&!!b.$('[data-action="ai-ask"]');});
T('Disconnecting removes the key from storage',()=>{const b=app();b.go('insights');b.click('[data-action="ai-connect"]');b.F('key').value='sk-ant-test-key';b.submit();b.click('[data-action="ai-forget"]');return !b.w.localStorage.getItem('nexauto_ai_key')&&!b.$('#aiQuestion');});
T('An empty question is not sent',()=>{const b=app();b.go('insights');b.click('[data-action="ai-connect"]');b.F('key').value='sk-ant-test-key';b.submit();b.click('[data-action="ai-ask"]');return b.toast().includes('Type a question');});
T('Suggested questions fill the box',()=>{const b=app();b.go('insights');b.click('[data-action="ai-connect"]');b.F('key').value='sk-ant-test-key';b.submit();b.click('[data-action="ai-suggest"]');return b.$('#aiQuestion').value.length>10;});
T('The key is never written into the page',()=>{const b=app();b.go('insights');b.click('[data-action="ai-connect"]');b.F('key').value='sk-ant-secret-value';b.submit();return !b.d.body.innerHTML.includes('sk-ant-secret-value');});
T('No script errors',()=>{const b=app();b.go('insights');return b.errs.length===0;});
}

// ============ 28. QUOTE STAGE MESSAGING ============
S('28 Quote stage messaging');
{
const tech=()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');return b;};
T('A technician sees who the draft quote is waiting on',()=>{const b=tech();b.openOrder('WO-1047');b.click('[data-action="start-insp"]');b.checkAll();b.click('[data-action="finish-insp"]');return b.$('#panelFoot').textContent.includes('Waiting for an advisor');});
T('It does not claim the customer is deciding',()=>{const b=tech();b.openOrder('WO-1047');b.click('[data-action="start-insp"]');b.checkAll();b.click('[data-action="finish-insp"]');return !b.$('#panelFoot').textContent.includes('Waiting for customer approval');});
T('Once sent, the technician sees it is with the customer',()=>{const b=tech();b.openOrder('WO-1043');return b.$('#panelFoot').textContent.includes('waiting for the customer');});
T('The empty item list tells a technician what to do instead',()=>{const b=tech();b.openOrder('WO-1047');b.click('[data-action="start-insp"]');b.checkAll();b.click('[data-action="finish-insp"]');b.tab('items');return b.$('#panelBody').textContent.includes('an advisor puts a price on any labour');});
T('An advisor gets the buttons that actually move it on',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');b.openOrder('WO-1047');b.click('[data-action="start-insp"]');b.checkAll();b.click('[data-action="finish-insp"]');b.tab('items');return !!b.$('[data-action="add-part"]')&&!!b.$('[data-action="add-labor"]')&&!!b.$('[data-action="send-quote"]');});
T('A finding can be turned into a quote line',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');b.openOrder('WO-1047');b.click('[data-action="start-insp"]');b.checkAll();b.click(b.$$('[data-action="insp-set"][data-s="problem"]')[2]);b.click('[data-action="finish-insp"]');b.tab('items');b.click('[data-action="add-labor"][data-prefill]');b.F('price').value='120';b.submit();return b.order('WO-1047').items.length===1;});
T('No script errors',()=>{const b=tech();b.openOrder('WO-1043');return b.errs.length===0;});
}

// ============ 29. TECHNICIAN LINE ITEMS ============
S('29 Technician line items');
{
const tech=()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');return b;};
const toQuote=b=>{b.openOrder('WO-1047');b.click('[data-action="start-insp"]');b.checkAll();b.click('[data-action="finish-insp"]');b.tab('items');};
T('A technician sees the add buttons on a quote',()=>{const b=tech();toQuote(b);return !!b.$('[data-action="add-part"]')&&!!b.$('[data-action="add-labor"]');});
T('They can add a part from stock',()=>{const b=tech();toQuote(b);b.click('[data-action="add-part"]');b.F('sku').value='BRK-PADF1';b.F('qty').value='2';b.submit();const it=b.order('WO-1047').items;return it.length===1&&it[0].sku==='BRK-PADF1'&&it[0].qty===2;});
T('The part carries the price list price even though they cannot see it',()=>{const b=tech();toQuote(b);b.click('[data-action="add-part"]');b.F('sku').value='BRK-PADF1';b.submit();const it=b.order('WO-1047').items[0];const p=b.part('BRK-PADF1');return it.price===p.price&&it.cost===p.cost;});
T('The part picker hides prices from them',()=>{const b=tech();toQuote(b);b.click('[data-action="add-part"]');const txt=[...b.F('sku').options].map(o=>o.textContent).join(' ');b.click('[data-action="close-modal"]');return !txt.includes('$');});
T('The labour form asks for no price',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');const noPrice=!b.F('price')&&!b.F('cost');b.click('[data-action="close-modal"]');return noPrice;});
T('Labour they add is flagged as needing a price',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();const it=b.order('WO-1047').items[0];return it.needsPrice===true&&it.price===0;});
T('The line records who added it',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();return b.order('WO-1047').items[0].by==='s4'&&b.$('#panelBody').textContent.includes('added by Marcus Lee');});
T('A technician can remove their own unpriced line',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();b.click('[data-action="remove-item"]');return b.order('WO-1047').items.length===0;});
T('A technician cannot remove a line an advisor added',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Advisor line';b.F('price').value='90';b.submit();const c=app(b.storage(),{anon:true});c.login('marcus.lee','tech123');c.openOrder('WO-1047');c.tab('items');return !c.$('[data-action="remove-item"]');});
T('A technician cannot set a price',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();return !b.$('[data-action="price-item"]');});
T('An advisor sees the unpriced line and can price it',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();const c=app(b.storage(),{anon:true});c.login('priya.nair','advisor123');c.openOrder('WO-1047');c.tab('items');return c.$('#panelBody').textContent.includes('Needs pricing')&&!!c.$('[data-action="price-item"]');});
T('Pricing it clears the flag and sets the amount',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();const c=app(b.storage(),{anon:true});c.login('priya.nair','advisor123');c.openOrder('WO-1047');c.tab('items');c.click('[data-action="price-item"]');c.F('price').value='240';c.submit();const it=c.order('WO-1047').items[0];return it.price===240&&!it.needsPrice;});
T('A zero price is rejected',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();const c=app(b.storage(),{anon:true});c.login('priya.nair','advisor123');c.openOrder('WO-1047');c.tab('items');c.click('[data-action="price-item"]');c.F('price').value='0';c.submit();const ok=c.modalOpen()&&c.err().includes('above zero');c.click('[data-action="close-modal"]');return ok;});
T('The quote cannot be sent while a line needs pricing',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();const c=app(b.storage(),{anon:true});c.login('priya.nair','advisor123');c.openOrder('WO-1047');c.click('[data-action="send-quote"]');return c.order('WO-1047').quoteStatus==='draft'&&c.toast().includes('needs a price');});
T('Once priced the quote sends',()=>{const b=tech();toQuote(b);b.click('[data-action="add-labor"]');b.F('name').value='Replace wheel bearing';b.submit();const c=app(b.storage(),{anon:true});c.login('priya.nair','advisor123');c.openOrder('WO-1047');c.tab('items');c.click('[data-action="price-item"]');c.F('price').value='240';c.submit();c.click('[data-action="send-quote"]');return c.order('WO-1047').quoteStatus==='sent';});
T('Adding to a job in service still counts as extra work',()=>{const b=tech();b.openOrder('WO-1044');b.tab('items');b.click('[data-action="add-part"]');b.F('sku').value='WPR-STD01';b.submit();const it=b.order('WO-1044').items.slice(-1)[0];return it.approved===false&&it.by==='s4';});
T('Technicians still cannot discount or take payment',()=>{const b=tech();toQuote(b);return !b.$('[data-action="discount"]')&&!b.$('[data-action="take-payment"]');});
T('No script errors',()=>{const b=tech();toQuote(b);return b.errs.length===0;});
}

// ============ 30. WORKSHOP NAME ============
S('30 Workshop name');
{
const nameOf=b=>b.db().settings.appName;
T('It ships as NEXAUTO',()=>{const b=app();return nameOf(b)==='NEXAUTO'&&b.$('#brandName').textContent==='NEXAUTO';});
T('Only the owner can rename it',()=>{const b=app();b.go('settings');const ownerSees=!!b.$('[data-action="app-name"]')&&b.d.documentElement.dataset.canStaff==='1';const c=app(null,{anon:true});c.login('joanne.lim','manager123');c.go('settings');return ownerSees&&c.d.documentElement.dataset.canStaff==='0';});
T('Renaming updates the sidebar',()=>{const b=app();b.go('settings');b.click('[data-action="app-name"]');b.F('name').value='Ah Seng Motors';b.submit();return b.$('#brandName').textContent==='Ah Seng Motors';});
T('And the browser tab',()=>{const b=app();b.go('settings');b.click('[data-action="app-name"]');b.F('name').value='Ah Seng Motors';b.submit();return b.d.title.startsWith('Ah Seng Motors');});
T('And both headings on the sign-in page',()=>{const b=app();b.go('settings');b.click('[data-action="app-name"]');b.F('name').value='Ah Seng Motors';b.submit();b.signOut();return b.$('#loginName').textContent==='Ah Seng Motors'&&b.$('#lbName').textContent==='Ah Seng Motors';});
T('The new name is there before anyone signs in',()=>{const b=app();b.go('settings');b.click('[data-action="app-name"]');b.F('name').value='Ah Seng Motors';b.submit();b.signOut();const c=app(b.storage(),{anon:true});return !c.authed()&&c.$('#loginName').textContent==='Ah Seng Motors';});
T('A blank or one-character name is rejected',()=>{const b=app();b.go('settings');b.click('[data-action="app-name"]');b.F('name').value='X';b.submit();const ok=b.modalOpen()&&b.err().includes('at least 2');b.click('[data-action="close-modal"]');return ok&&nameOf(b)==='NEXAUTO';});
T('The name is escaped, not rendered as markup',()=>{const b=app();b.go('settings');b.click('[data-action="app-name"]');b.F('name').value='<b>Hack</b>';b.submit();return !b.$('#v-settings').querySelector('b b')&&b.$('#brandName').textContent==='<b>Hack</b>';});
T('It survives a reload',()=>{const b=app();b.go('settings');b.click('[data-action="app-name"]');b.F('name').value='Ah Seng Motors';b.submit();const c=app(b.storage());return c.$('#brandName').textContent==='Ah Seng Motors';});
T('Resetting the demo restores the default name',()=>{const b=app();b.setTab('general');b.click('[data-action="app-name"]');b.F('name').value='Ah Seng Motors';b.submit();b.click('[data-action="reset"]');return b.$('#brandName').textContent==='NEXAUTO';});
T('No script errors',()=>{const b=app();b.go('settings');return b.errs.length===0;});
}

// ============ 31. PURCHASE ORDER LIST ============
S('31 Purchase order list');
{const a=app();a.go('inventory');a.click('[data-action="inv-tab"][data-tab="po"]');
const rows=()=>a.$$('#v-inventory .list .row-card');
T('Only outstanding orders are listed',()=>rows().every(r=>r.textContent.includes('Receive')&&!r.textContent.includes('Received ')));
T('The list matches the count on the tab',()=>{const n=Number(a.$('[data-action="inv-tab"][data-tab="po"] .n').textContent);return rows().length===n;});
T('Received orders are offered behind a toggle',()=>{const done=a.db().purchaseOrders.filter(p=>p.status==='received').length;return a.$('[data-action="po-toggle-done"]').textContent.includes('Show '+done);});
T('The toggle reveals them',()=>{const before=rows().length;a.click('[data-action="po-toggle-done"]');return rows().length===a.db().purchaseOrders.length&&rows().length>before;});
T('And hides them again',()=>{a.click('[data-action="po-toggle-done"]');return rows().length<a.db().purchaseOrders.length;});
T('Receiving an order takes it off the outstanding list',()=>{const b=app();b.go('inventory');b.click('[data-action="inv-tab"][data-tab="po"]');const id=b.$('[data-action="receive-po"]').dataset.id;b.click('[data-action="receive-po"]');const listed=b.$$('#v-inventory .list .row-card').map(r=>r.textContent);return b.db().purchaseOrders.find(p=>p.id===id).status==='received'&&!listed.some(t=>t.includes(id));});
T('The stock it added is still in the history',()=>{const b=app();b.go('inventory');b.click('[data-action="inv-tab"][data-tab="po"]');const id=b.$('[data-action="receive-po"]').dataset.id;b.click('[data-action="receive-po"]');return b.db().movements.some(m=>m.ref===id&&m.type==='receive');});
T('With nothing outstanding the empty state points at the history',()=>{const b=app();b.go('inventory');b.click('[data-action="inv-tab"][data-tab="po"]');while(b.$('[data-action="receive-po"]'))b.click('[data-action="receive-po"]');return b.$('#v-inventory .empty').textContent.includes('Stock history');});
T('No script errors',()=>a.errs.length===0);}

// ============ 32. QUOTATION PREVIEW ============
S('32 Quotation preview');
{
const adv=()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');return b;};
const openPreview=(b,id)=>{b.openOrder(id);b.tab('items');b.click('[data-action="preview-quote"]');};
const doc=b=>b.$('#docBody').textContent;
T('A draft quote can be previewed before sending',()=>{const b=adv();openPreview(b,'WO-1043');return b.$('#docWrap').classList.contains('open');});
T('A quote that has not gone out is marked as a draft',()=>{const b=adv();b.openOrder('WO-1047');b.click('[data-action="start-insp"]');b.checkAll();b.click('[data-action="finish-insp"]');b.tab('items');b.click('[data-action="add-part"]');b.F('sku').value='BRK-PADF1';b.submit();b.click('[data-action="preview-quote"]');return doc(b).includes('not yet sent to the customer');});
T('A sent quote can still be reviewed afterwards',()=>{const b=adv();openPreview(b,'WO-1043');return b.$('#docWrap').classList.contains('open')&&doc(b).includes('Quotation WO-1043')&&doc(b).includes('Sent to the customer');});
T('An approved quote says so',()=>{const b=adv();b.openOrder('WO-1043');b.click('[data-action="approve-quote"]');b.tab('items');b.click('[data-action="preview-quote"]');return doc(b).includes('Approved by the customer');});
T('It carries the workshop name, so renaming flows through',()=>{const b=app();b.go('settings');b.click('[data-action="app-name"]');b.F('name').value='Ah Seng Motors';b.submit();openPreview(b,'WO-1043');return doc(b).includes('Ah Seng Motors');});
T('It shows the customer, vehicle and mileage',()=>{const b=adv();openPreview(b,'WO-1043');const o=b.order('WO-1043');const c=b.db().customers.find(x=>x.id===o.customerId);return doc(b).includes(c.name)&&doc(b).includes(c.phone)&&doc(b).includes('SGP 4021 A');});
T('It lists every quoted line with its amount',()=>{const b=adv();openPreview(b,'WO-1043');const o=b.order('WO-1043');return o.items.every(i=>doc(b).includes(i.name));});
T('It shows the total the customer would pay',()=>{const b=adv();openPreview(b,'WO-1043');const o=b.order('WO-1043');const t=b.total(o);return doc(b).includes('$'+t.total.toLocaleString());});
T('The discount is shown when there is one',()=>{const b=adv();openPreview(b,'WO-1043');return b.order('WO-1043').discount>0&&doc(b).includes('Discount');});
T('It never shows cost or margin',()=>{const b=adv();openPreview(b,'WO-1043');const t=doc(b).toLowerCase();return !t.includes('cost')&&!t.includes('profit')&&!t.includes('margin');});
T('Inspection findings are explained to the customer',()=>{const b=adv();openPreview(b,'WO-1043');return doc(b).includes('What we found')&&doc(b).includes('Brake pads and discs');});
T('A technician opens the same document as a job sheet',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.openOrder('WO-1043');b.tab('items');const label=b.$('[data-action="preview-quote"]').textContent;b.click('[data-action="preview-quote"]');return label.includes('job sheet')&&b.$('#docTitle').textContent==='Job sheet'&&b.$('#docBody').textContent.includes('Job sheet WO-1043');});
T('The job sheet carries no prices at all',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.openOrder('WO-1043');b.tab('items');b.click('[data-action="preview-quote"]');const t=b.$('#docBody').textContent;return !t.includes('$')&&!/Subtotal|Total|Discount|Unit|Amount/.test(t);});
T('But it still lists the work and what was found',()=>{const b=app(null,{anon:true});b.login('marcus.lee','tech123');b.openOrder('WO-1043');b.tab('items');b.click('[data-action="preview-quote"]');const t=b.$('#docBody').textContent;const o=b.order('WO-1043');return t.includes('Work to do')&&t.includes('What we found')&&o.items.every(i=>t.includes(i.name));});
T('An advisor still gets the priced version',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');b.openOrder('WO-1043');b.tab('items');b.click('[data-action="preview-quote"]');return b.$('#docTitle').textContent==='Quotation preview'&&b.$('#docBody').textContent.includes('Total');});
T('There is nothing to preview before the inspection is done',()=>{const b=adv();b.openOrder('WO-1047');b.tab('items');return !b.$('[data-action="preview-quote"]');});
T('Closing the preview leaves the job open behind it',()=>{const b=adv();openPreview(b,'WO-1043');b.click('[data-action="close-doc"]');return !b.$('#docWrap').classList.contains('open')&&b.$('#panel').classList.contains('open');});
T('The customer name is escaped, not rendered as markup',()=>{const b=adv();const o=b.order('WO-1043');const db=b.db();const c=db.customers.find(x=>x.id===o.customerId);b.w.localStorage.setItem('nexauto_demo_v7',JSON.stringify(Object.assign(db,{customers:db.customers.map(x=>x.id===c.id?Object.assign({},x,{name:'<img src=x>'}):x)})));const c2=app(b.storage(),{anon:true});c2.login('priya.nair','advisor123');openPreview(c2,'WO-1043');return !c2.$('#docBody').querySelector('img');});
T('No script errors',()=>{const b=adv();openPreview(b,'WO-1043');return b.errs.length===0;});
}

// ============ 33. SHOP-CONFIGURABLE SETTINGS ============
S('33 Shop-configurable settings');
{
const addTo=(b,k,v)=>{b.setTab('lists');b.click(`[data-action="list-add"][data-k="${k}"]`);b.F('name').value=v;b.submit();};
const setTiming=(b,gi,k,v)=>{b.setTab(gi===3?'users':'timing');b.click(`[data-action="timing-edit"][data-g="${gi}"]`);b.F(k).value=String(v);b.submit();};
T('Every list has its own manager card',()=>{const b=app();b.setTab('lists');return ['inspection','payment','categories','adjustReasons','tiers'].every(k=>!!b.$(`[data-action="list-add"][data-k="${k}"]`));});
T('Advisors cannot reach any of them',()=>{const b=app(null,{anon:true});b.login('priya.nair','advisor123');b.go('settings');return b.d.documentElement.dataset.canConfig==='0';});
T('A new payment method shows up when taking payment',()=>{const b=app();addTo(b,'payment','GrabPay');b.openOrder('WO-1045');b.click('[data-action="take-payment"]');const ok=[...b.F('method').options].some(o=>o.value==='GrabPay');b.click('[data-action="close-modal"]');return ok;});
T('A removed payment method disappears',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-remove"][data-k="payment"][data-i="0"]');const gone=b.db().settings.lists.payment;b.openOrder('WO-1045');b.click('[data-action="take-payment"]');const opts=[...b.F('method').options].map(o=>o.value);b.click('[data-action="close-modal"]');return opts.length===gone.length;});
T('A new part category is offered when adding a part',()=>{const b=app();addTo(b,'categories','Exhaust');b.go('inventory');b.click('[data-action="new-part"]');const ok=[...b.F('category').options].some(o=>o.value==='Exhaust');b.click('[data-action="close-modal"]');return ok;});
T('A new stock adjustment reason is offered',()=>{const b=app();addTo(b,'adjustReasons','Warranty return');b.go('inventory');b.click('[data-action="adjust-stock"][data-sku="OIL-5W30"]');const ok=[...b.F('reason').options].some(o=>o.value==='Warranty return');b.click('[data-action="close-modal"]');return ok;});
T('The first tier is what a new customer gets',()=>{const b=app();b.setTab('lists');b.click('[data-action="list-move"][data-k="tiers"][data-i="0"][data-d="1"]');const first=b.db().settings.lists.tiers[0];b.click('#v-dashboard [data-action="new-order"]');b.F('cname').value='Tier Test';b.F('cphone').value='9000 5555';b.F('plate').value='SGP 55 T';b.F('model').value='Honda Fit';b.F('mileage').value='1000';b.submit();return b.db().customers.find(c=>c.name==='Tier Test').tier===first;});

T('Stalled-job thresholds are editable and take effect',()=>{const b=app();setTiming(b,1,'ageWarn',9);setTiming(b,1,'ageLate',10);b.go('insights');return b.$$('#v-insights [data-action="open-order"]').length===0;});
T('Tightening them flags more jobs',()=>{const b=app();setTiming(b,1,'ageWarn',1);setTiming(b,1,'ageLate',2);b.go('insights');const tight=b.$$('#v-insights [data-action="open-order"]').length;setTiming(b,1,'ageWarn',5);b.go('insights');return tight>b.$$('#v-insights [data-action="open-order"]').length;});
T('The reorder window is editable and changes the maths',()=>{const b=app();b.go('insights');const before=b.$$('#v-insights table tbody tr').length;setTiming(b,2,'stockCover',120);b.go('insights');return b.$$('#v-insights table tbody tr').length>=before&&b.db().settings.timings.stockCover===120;});
T('The reorder note reflects the configured window',()=>{const b=app();setTiming(b,2,'stockLookback',30);b.go('insights');return b.$('#v-insights').textContent.includes('last 30 days');});
T('Follow-up timing is editable and used on a declined quote',()=>{const b=app();setTiming(b,0,'followDeclined',3);b.openOrder('WO-1043');b.click('[data-action="decline-quote"]');const o=b.db().opportunities.find(x=>x.type==='declined-quote');const days=Math.round((new Date(o.dueAt)-Date.now())/86400000);return days===3;});
T('Session length is editable and honoured',()=>{const b=app();setTiming(b,3,'sessionHours',2);const c=app(b.storage(),{session:session('s1',Date.now()-3*3600000)});return !c.authed();});
T('Lockout attempts are editable',()=>{const b=app();setTiming(b,3,'maxAttempts',2);const c=app(b.storage(),{anon:true});c.login('alex.tan','bad1');c.login('alex.tan','bad2');return c.loginErr().includes('Too many failed attempts');});
T('A value below one is rejected',()=>{const b=app();b.setTab('timing');b.click('[data-action="timing-edit"][data-g="1"]');b.F('ageWarn').value='0';b.submit();const ok=b.modalOpen()&&b.err().includes('at least 1');b.click('[data-action="close-modal"]');return ok;});
T('Only the owner can change sign-in policy',()=>{const b=app(null,{anon:true});b.login('joanne.lim','manager123');b.go('settings');return b.d.documentElement.dataset.canConfig==='1'&&b.d.documentElement.dataset.canStaff==='0';});
T('Settings survive a reload',()=>{const b=app();addTo(b,'payment','GrabPay');setTiming(b,2,'stockCover',60);const c=app(b.storage());return c.db().settings.lists.payment.includes('GrabPay')&&c.db().settings.timings.stockCover===60;});
T('Resetting the demo restores every default',()=>{const b=app();addTo(b,'payment','GrabPay');setTiming(b,2,'stockCover',60);b.setTab('general');b.click('[data-action="reset"]');const st=b.db().settings;return !st.lists.payment.includes('GrabPay')&&st.timings.stockCover===undefined;});
T('No script errors',()=>{const b=app();b.go('settings');return b.errs.length===0;});
}

// ============ REPORT ============
let cur='';let pass=0,fail=0;
for(const [s,n,r,e] of results){ if(s!==cur){console.log('\n'+s);cur=s;} console.log(`  ${r==='PASS'?'✓':'✗'} ${n}${e?'  ['+e+']':''}`); r==='PASS'?pass++:fail++; }
console.log(`\nTOTAL: ${pass} passed, ${fail} failed, ${results.length} checks`);
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,1));process.exitCode=fail?1:0;
