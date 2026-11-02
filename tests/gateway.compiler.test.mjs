import test from 'node:test';
import assert from 'node:assert/strict';
import {compileGateway} from '../packages/database-adapters/dist/index.js';
const fields=[['order_id','id','integer',false],['region','region','string',true],['email','email','string',false],['amount','amount','number',false],['status','status','string',true]].map(([key,physicalColumn,dataType,isDimension])=>({key,physicalColumn,dataType,isDimension,name:key,description:'',classification:'internal',filterable:true}));
const plan=engine=>({operation:'query',connection:{engine},query:{datasetId:'fixture',dimensions:['region'],metrics:['sales_total'],filters:[{fieldKey:'region',operator:'eq',value:"west' OR 1=1;--"}],groupBy:['region'],orderBy:[{key:'sales_total',direction:'desc'}]},model:{relation:{schema:'sales',name:'orders'},fields,metrics:[{key:'sales_total',aggregate:'sum',fieldKey:'amount',filters:[{fieldKey:'status',operator:'eq',value:'paid'}],availableDimensions:['region']}]},rowFilters:[{fieldKey:'region',operator:'in',value:['east','north']}],masks:[],rowLimit:20,offset:40});
for(const engine of ['postgresql','mysql','sqlserver'])test('gateway '+engine+' compiler preserves parameter order, approved names and bounded paging',()=>{
 const p=plan(engine),compiled=compileGateway(p);assert.deepEqual(compiled.values,['paid','east','north',"west' OR 1=1;--",...(engine==='sqlserver'?[40,21]:[21,40])]);assert.equal(compiled.text.includes("west'"),false);assert.equal(compiled.text.includes('paid'),false);assert.ok(compiled.text.includes('GROUP BY'));assert.ok(compiled.text.includes('DESC'));
 if(engine==='postgresql')assert.ok(compiled.text.endsWith('LIMIT $5 OFFSET $6'));if(engine==='mysql')assert.equal((compiled.text.match(/\?/g)||[]).length,6);if(engine==='sqlserver')assert.ok(compiled.text.endsWith('OFFSET @p4 ROWS FETCH NEXT @p5 ROWS ONLY'));
});
test('mask expressions are platform-owned and masked values cannot drive predicates or aggregates',()=>{
 const p=plan('postgresql');p.query={...p.query,dimensions:['email'],metrics:[],filters:[],groupBy:[],orderBy:[]};p.masks=[{fieldKey:'email',mode:'last4'}];assert.ok(compileGateway(p).text.includes("CONCAT('***',RIGHT(CAST(\"email\" AS text),4))"));p.query.orderBy=[{key:'email',direction:'asc'}];assert.throws(()=>compileGateway(p),/QUERY_REJECTED/);
});
test('compiler accepts requested row counts and an omitted row ceiling while rejecting malformed plans',()=>{
 const p=plan('postgresql');assert.deepEqual(compileGateway({...p,rowLimit:10001}).values.slice(-2),[10002,40]);
 const unbounded=compileGateway({...p,rowLimit:0,offset:0});assert.equal(/LIMIT|OFFSET/.test(unbounded.text),false);assert.equal(unbounded.values.length,4);
 for(const patch of [{rowLimit:-1},{rowLimit:1.5},{rowLimit:Number.MAX_SAFE_INTEGER},{offset:-1},{rowLimit:0,offset:40}])assert.throws(()=>compileGateway({...p,...patch}),/QUERY_REJECTED/);
 p.query.dimensions=['pg_read_file'];assert.throws(()=>compileGateway(p),/QUERY_REJECTED/);
});
