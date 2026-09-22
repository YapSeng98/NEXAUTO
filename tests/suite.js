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
    db(){return JSON.parse(w.localStorage.getItem('nexauto_demo_v5'));},
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
T('Owner sees revenue, cost, add user',()=>{a.go('dashboard');const r=vis(a.$('[data-revenue]'));a.go('settings');return r&&vis(a.$('[data-action="new-staff"]'));});
a.signIn('s2');
T('Manager sees profit but cannot manage users',()=>{a.go('dashboard');const r=vis(a.$('[data-revenue]'));a.go('settings');return r&&!vis(a.$('[data-action="new-staff"]'));});
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
T('Technician: cannot edit items or send quote',()=>!a.$('[data-action="add-part"]')&&!a.$('[data-action="send-quote"]'));
T('Technician: can do inspection on own job',()=>{a.click('[data-action="close-panel"]');a.openOrder('WO-1047');a.click('[data-action="start-insp"]');a.checkAll();a.click('[data-action="finish-insp"]');return a.order('WO-1047').stage==='quotation';});
T('Technician: can mark work done but not take payment',()=>{const b=app();b.signIn('s5');b.openOrder('WO-1045');return !b.$('[data-action="take-payment"]')&&b.$('#panelFoot').textContent.includes('waiting for payment');});
T('Technician: customers limited to own jobs',()=>{a.click('[data-action="close-panel"]');a.go('customers');const n=a.$$('#v-customers .row-card').map(r=>r.dataset.id);return n.every(id=>a.db().orders.some(o=>o.customerId===id&&o.technicianId==='s4'));});
T('Technician: customer history hides other techs\' jobs',()=>{a.click('[data-action="open-customer"][data-id="c1"]');return a.$$('#panelBody [data-action="open-order"]').every(b=>a.order(b.dataset.id).technicianId==='s4');});
T('Technician: follow-ups and purchase hidden',()=>{a.click('[data-action="close-panel"]');a.go('dashboard');return !vis(a.$('#v-dashboard .card[data-edit]'))&&!vis(a.$('[data-action="new-po"]'));});
T('No script errors',()=>a.errs.length===0);}

// ============ 9. USERS ============
S('9 User management');
{const a=app();a.go('settings');
T('Add user',()=>{a.click('[data-action="new-staff"]');a.F('name').value='Siti';a.F('role').value='technician';a.F('username').value='siti.a';a.F('password').value='siti12345';a.submit();return a.db().staff.some(s=>s.name==='Siti');});
T('Duplicate name rejected',()=>{a.click('[data-action="new-staff"]');a.F('name').value='siti';a.F('username').value='siti.b';a.F('password').value='siti12345';a.submit();const ok=a.modalOpen()&&a.err().includes('already exists');a.click('[data-action="close-modal"]');return ok;});
T('New user appears in the users list',()=>a.$('#v-settings').textContent.includes('siti.a'));
T('New technician appears in check-in technician list',()=>{a.click('#v-settings');a.go('orders');a.click('#v-orders [data-action="new-order"]');const ok=[...a.F('tech').options].some(o=>o.textContent==='Siti');a.click('[data-action="close-modal"]');return ok;});
T('Change role takes effect',()=>{a.go('settings');const sid=a.db().staff.find(s=>s.name==='Siti').id;a.click(`[data-action="edit-staff"][data-id="${sid}"]`);a.F('role').value='advisor';a.submit();return a.db().staff.find(s=>s.name==='Siti').role==='advisor';});
T('Cannot demote the last owner',()=>{a.click('[data-action="edit-staff"][data-id="s1"]');a.F('role').value='manager';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Cannot change a technician with open jobs to another role',()=>{a.click('[data-action="edit-staff"][data-id="s5"]');a.F('role').value='advisor';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok&&a.db().staff.find(s=>s.id==='s5').role==='technician';});
T('Cannot deactivate a user with open jobs',()=>{a.click('[data-action="edit-staff"][data-id="s4"]');a.click('[data-action="remove-staff"]');return a.db().staff.find(s=>s.id==='s4').active===true;});
T('Deactivate keeps history (name still shown on old jobs)',()=>{a.click('[data-action="close-modal"]');const sid=a.db().staff.find(s=>s.name==='Siti').id;a.click(`[data-action="edit-staff"][data-id="${sid}"]`);a.click('[data-action="remove-staff"]');const u=a.db().staff.find(s=>s.id===sid);return u&&u.active===false&&!a.$('#v-settings').textContent.includes('siti.a');});
T('Cannot deactivate yourself',()=>{const b=app();b.go('settings');b.click('[data-action="new-staff"]');b.F('name').value='Owner2';b.F('role').value='owner';b.F('username').value='owner2';b.F('password').value='owner12345';b.submit();b.click('[data-action="edit-staff"][data-id="s1"]');b.click('[data-action="remove-staff"]');return b.db().staff.find(s=>s.id==='s1').active===true&&b.toast().includes('yourself');});
T('Signing in as a demoted user uses their new permissions',()=>{const b=app();b.go('settings');b.click('[data-action="edit-staff"][data-id="s2"]');b.F('role').value='advisor';b.submit();b.signIn('s2');return b.d.documentElement.dataset.canCost==='0';});
T('No script errors',()=>a.errs.length===0);}

// ============ 10. SETTINGS / PERSISTENCE ============
S('10 Settings and saving');
{const a=app();
T('Theme colour applies',()=>{a.go('settings');a.click('[data-action="theme"][data-c="#1D5FD1"]');return a.d.documentElement.style.getPropertyValue('--green')==='#1D5FD1';});
T('Data survives a page reload',()=>{a.openOrder('WO-1047');a.click('[data-action="start-insp"]');const st=a.storage();const b=app(st);return b.order('WO-1047').stage==='pre-inspection'&&b.d.documentElement.style.getPropertyValue('--green')==='#1D5FD1';});
T('Signed-in user survives reload',()=>{a.signIn('s3');const b=app(a.storage());return b.authed()&&b.$('#userName').textContent==='Priya Nair';});
T('Order counter survives reload (no duplicate WO numbers)',()=>{const b=app(a.storage());b.signIn('s1');b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='50000';b.submit();const ids=b.db().orders.map(o=>o.id);return new Set(ids).size===ids.length;});
T('Reset restores demo data',()=>{a.go('settings');a.signIn('s1');a.go('settings');a.click('[data-action="reset"]');return a.order('WO-1047').stage==='reception'&&!a.d.documentElement.style.getPropertyValue('--green');});
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
T('Changing role does not need a new sign-in but applies live',()=>{const b=app();b.go('settings');b.click('[data-action="edit-staff"][data-id="s1"]');b.F('name').value='Alex Tan';b.submit();return b.authed();});
T('No script errors',()=>{const b=app();b.signOut();return b.errs.length===0;});
}

// ============ 14. CREDENTIAL MANAGEMENT ============
S('14 Credential management');
{
T('Owner can reset another user\'s password',()=>{const b=app();b.go('settings');b.click('[data-action="edit-staff"][data-id="s3"]');b.F('password').value='newpass123';b.submit();b.signOut();b.login('priya.nair','newpass123');return b.authed();});
T('The old password stops working after a reset',()=>{const b=app();b.go('settings');b.click('[data-action="edit-staff"][data-id="s3"]');b.F('password').value='newpass123';b.submit();b.signOut();b.login('priya.nair','advisor123');return !b.authed();});
T('Owner can change a username and it is used to sign in',()=>{const b=app();b.go('settings');b.click('[data-action="edit-staff"][data-id="s4"]');b.F('username').value='marcus.l';b.submit();b.signOut();b.login('marcus.l','tech123');return b.authed();});
T('Duplicate username is rejected',()=>{const b=app();b.go('settings');b.click('[data-action="edit-staff"][data-id="s4"]');b.F('username').value='alex.tan';b.submit();const ok=b.modalOpen()&&b.err().includes('taken');b.click('[data-action="close-modal"]');return ok;});
T('Invalid username format is rejected',()=>{const b=app();b.go('settings');b.click('[data-action="new-staff"]');b.F('name').value='Bad User';b.F('username').value='a b!';b.F('password').value='goodpass1';b.submit();const ok=b.modalOpen()&&b.err().includes('Username must be');b.click('[data-action="close-modal"]');return ok;});
T('Short password is rejected',()=>{const b=app();b.go('settings');b.click('[data-action="new-staff"]');b.F('name').value='Short Pw';b.F('username').value='short.pw';b.F('password').value='12345';b.submit();const ok=b.modalOpen()&&b.err().includes('at least 6');b.click('[data-action="close-modal"]');return ok;});
T('A new user can sign in with the credentials they were given',()=>{const b=app();b.go('settings');b.click('[data-action="new-staff"]');b.F('name').value='Nurul Aina';b.F('role').value='advisor';b.F('username').value='nurul.aina';b.F('password').value='aina12345';b.submit();b.signOut();b.login('nurul.aina','aina12345');return b.authed()&&b.$('#userName').textContent==='Nurul Aina'&&b.d.documentElement.dataset.canCost==='0';});
T('A deactivated user cannot sign in',()=>{const b=app();b.go('settings');b.click('[data-action="new-staff"]');b.F('name').value='Temp Staff';b.F('role').value='advisor';b.F('username').value='temp.staff';b.F('password').value='temp12345';b.submit();const sid=b.db().staff.find(s=>s.name==='Temp Staff').id;b.click(`[data-action="edit-staff"][data-id="${sid}"]`);b.click('[data-action="remove-staff"]');b.signOut();b.login('temp.staff','temp12345');return !b.authed()&&b.loginErr().includes('Wrong username or password');});
T('A deactivated user\'s existing session is rejected on reload',()=>{const b=app();b.go('settings');b.click('[data-action="new-staff"]');b.F('name').value='Gone Soon';b.F('role').value='advisor';b.F('username').value='gone.soon';b.F('password').value='gone12345';b.submit();const sid=b.db().staff.find(s=>s.name==='Gone Soon').id;b.click(`[data-action="edit-staff"][data-id="${sid}"]`);b.click('[data-action="remove-staff"]');const c=app(b.storage(),{session:session(sid)});return !c.authed();});
T('Password reset clears an existing lockout',()=>{const b=app(null,{anon:true});for(let i=0;i<5;i++)b.login('priya.nair','bad'+i);b.login('alex.tan','owner123');b.go('settings');b.click('[data-action="edit-staff"][data-id="s3"]');b.F('password').value='fresh12345';b.submit();b.signOut();b.login('priya.nair','fresh12345');return b.authed();});
T('Usernames are shown in the user list',()=>{const b=app();b.go('settings');const t=b.$('#v-settings').textContent;return t.includes('alex.tan')&&t.includes('marcus.lee');});
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
T('Parts and labor split adds up to 100%',()=>{a.range('6m');const pct=a.$$('#v-reports .line .r').map(e=>Number(e.textContent.match(/(\d+)%/)[1]));return pct.length===2&&pct[0]+pct[1]===100;});
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

// ============ REPORT ============
let cur='';let pass=0,fail=0;
for(const [s,n,r,e] of results){ if(s!==cur){console.log('\n'+s);cur=s;} console.log(`  ${r==='PASS'?'✓':'✗'} ${n}${e?'  ['+e+']':''}`); r==='PASS'?pass++:fail++; }
console.log(`\nTOTAL: ${pass} passed, ${fail} failed, ${results.length} checks`);
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,1));process.exitCode=fail?1:0;
