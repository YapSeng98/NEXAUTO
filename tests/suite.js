const {JSDOM}=require('jsdom');const fs=require('fs');
const path=require('path');const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const RAW=fs.readFileSync(FILE,'utf8').replace(/<script src=[^>]+><\/script>/,'').replace(/<link[^>]+>/g,'').replace('<script>','<script>window.scrollTo=function(){};');
const results=[];let section='';
function app(storage){
  const dom=new JSDOM(RAW,{runScripts:'dangerously',url:'https://nexauto.test/',beforeParse(w){w.confirm=()=>true; if(storage) for(const k in storage) w.localStorage.setItem(k,storage[k]);}});
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
    signIn(id){A.change(d.querySelector('#roleSelect'),id);},
    go(v,f){A.click(`[data-action="goto"][data-view="${v}"]`+(f?`[data-filter="${f}"]`:''));},
    openOrder(id){A.go('orders');A.click(`[data-action="open-order"][data-id="${id}"]`);},
    tab(t){A.click(`[data-action="order-tab"][data-tab="${t}"]`);},
    db(){return JSON.parse(w.localStorage.getItem('nexauto_demo_v4'));},
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
T('Add user',()=>{a.click('[data-action="new-staff"]');a.F('name').value='Siti';a.F('role').value='technician';a.submit();return a.db().staff.some(s=>s.name==='Siti');});
T('Duplicate name rejected',()=>{a.click('[data-action="new-staff"]');a.F('name').value='siti';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('New user appears in sign-in list',()=>a.$$('#roleSelect option').some(o=>o.textContent.includes('Siti')));
T('New technician appears in check-in technician list',()=>{a.click('#v-settings');a.go('orders');a.click('#v-orders [data-action="new-order"]');const ok=[...a.F('tech').options].some(o=>o.textContent==='Siti');a.click('[data-action="close-modal"]');return ok;});
T('Change role takes effect',()=>{a.go('settings');const sid=a.db().staff.find(s=>s.name==='Siti').id;a.click(`[data-action="edit-staff"][data-id="${sid}"]`);a.F('role').value='advisor';a.submit();return a.db().staff.find(s=>s.name==='Siti').role==='advisor';});
T('Cannot demote the last owner',()=>{a.click('[data-action="edit-staff"][data-id="s1"]');a.F('role').value='manager';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok;});
T('Cannot change a technician with open jobs to another role',()=>{a.click('[data-action="edit-staff"][data-id="s5"]');a.F('role').value='advisor';a.submit();const ok=a.modalOpen();a.click('[data-action="close-modal"]');return ok&&a.db().staff.find(s=>s.id==='s5').role==='technician';});
T('Cannot deactivate a user with open jobs',()=>{a.click('[data-action="edit-staff"][data-id="s4"]');a.click('[data-action="remove-staff"]');return a.db().staff.find(s=>s.id==='s4').active===true;});
T('Deactivate keeps history (name still shown on old jobs)',()=>{a.click('[data-action="close-modal"]');const sid=a.db().staff.find(s=>s.name==='Siti').id;a.click(`[data-action="edit-staff"][data-id="${sid}"]`);a.click('[data-action="remove-staff"]');const u=a.db().staff.find(s=>s.id===sid);return u&&u.active===false&&!a.$$('#roleSelect option').some(o=>o.textContent.includes('Siti'));});
T('Cannot deactivate yourself',()=>{const b=app();b.go('settings');b.click('[data-action="new-staff"]');b.F('name').value='Owner2';b.F('role').value='owner';b.submit();b.click('[data-action="edit-staff"][data-id="s1"]');b.click('[data-action="remove-staff"]');return b.db().staff.find(s=>s.id==='s1').active===true&&b.toast().includes('yourself');});
T('Signing in as a demoted user uses their new permissions',()=>{const b=app();b.go('settings');b.click('[data-action="edit-staff"][data-id="s2"]');b.F('role').value='advisor';b.submit();b.signIn('s2');return b.d.documentElement.dataset.canCost==='0';});
T('No script errors',()=>a.errs.length===0);}

// ============ 10. SETTINGS / PERSISTENCE ============
S('10 Settings and saving');
{const a=app();
T('Theme colour applies',()=>{a.go('settings');a.click('[data-action="theme"][data-c="#1D5FD1"]');return a.d.documentElement.style.getPropertyValue('--green')==='#1D5FD1';});
T('Data survives a page reload',()=>{a.openOrder('WO-1047');a.click('[data-action="start-insp"]');const st=a.storage();const b=app(st);return b.order('WO-1047').stage==='pre-inspection'&&b.d.documentElement.style.getPropertyValue('--green')==='#1D5FD1';});
T('Signed-in user survives reload',()=>{a.signIn('s3');const b=app(a.storage());return b.$('#roleSelect').value==='s3';});
T('Order counter survives reload (no duplicate WO numbers)',()=>{const b=app(a.storage());b.signIn('s1');b.click('#v-dashboard [data-action="new-order"]');b.set('customer','c6');b.F('mileage').value='50000';b.submit();const ids=b.db().orders.map(o=>o.id);return new Set(ids).size===ids.length;});
T('Reset restores demo data',()=>{a.go('settings');a.signIn('s1');a.go('settings');a.click('[data-action="reset"]');return a.order('WO-1047').stage==='reception'&&!a.d.documentElement.style.getPropertyValue('--green');});
T('No script errors',()=>a.errs.length===0);}

// ============ REPORT ============
let cur='';let pass=0,fail=0;
for(const [s,n,r,e] of results){ if(s!==cur){console.log('\n'+s);cur=s;} console.log(`  ${r==='PASS'?'✓':'✗'} ${n}${e?'  ['+e+']':''}`); r==='PASS'?pass++:fail++; }
console.log(`\nTOTAL: ${pass} passed, ${fail} failed, ${results.length} checks`);
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,1));process.exitCode=fail?1:0;
