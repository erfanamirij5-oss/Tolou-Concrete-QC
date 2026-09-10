import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createQcPartiesService} from '../src/application/qc-parties.js';

function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());migrate(db);
 db.exec(`INSERT INTO companies VALUES('c1','شرکت یک'),('c2','شرکت دو');
 INSERT INTO sampling_series(id,company_id,kind,title,purpose,sampled_at,sampler_name,entered_by) VALUES('s1','c1','internal','کنترل','QC','2026-09-01T08:00:00.000Z','الف','ب'),('s2','c2','internal','کنترل','QC','2026-09-01T08:00:00.000Z','الف','ب');
 INSERT INTO samples VALUES('sample1','s1',7,'2026-09-08T08:00:00.000Z'),('sample2','s2',7,'2026-09-08T08:00:00.000Z');`);
 return{db,service:createQcPartiesService(db,{companyId:'c1',actor:'کاربر نشست',clock:()=> '2026-09-10T12:00:00.000Z'})};
}

test('customers sources and laboratories stay company scoped',t=>{
 const {service}=fixture(t);
 service.createCustomer({id:'cust1',code:'C-1',name:'مشتری یک'});
 service.createConcreteSource({id:'src1',code:'S-1',name:'بچینگ مرکزی',sourceType:'internal'});
 service.createTestingLaboratory({id:'lab1',code:'L-1',name:'آزمایشگاه مرکزی',labType:'internal'});
 assert.equal(service.listCustomers().length,1);assert.equal(service.listConcreteSources()[0].source_type,'internal');assert.equal(service.listTestingLaboratories()[0].lab_type,'internal');
 assert.throws(()=>service.createCustomer({id:'cust2',code:'C-1',name:'تکراری'}));
});

test('external results require owned sample and owned active laboratory',t=>{
 const {db,service}=fixture(t);service.createTestingLaboratory({id:'lab1',code:'L-1',name:'آزمایشگاه بیرونی',labType:'external'});
 const result=service.registerExternalResult({id:'ext1',sampleId:'sample1',testingLaboratoryId:'lab1',externalEventId:'EV-100',strengthMpa:31.4,testedAt:'2026-09-08T08:00:00.000Z',notes:'گزارش دریافتی'});
 assert.equal(result.externalEventId,'EV-100');assert.equal(service.listExternalResults()[0].laboratory_name,'آزمایشگاه بیرونی');
 assert.equal(db.prepare("SELECT received_by FROM external_result_events WHERE id='ext1'").get().received_by,'کاربر نشست');
 assert.throws(()=>service.registerExternalResult({id:'ext2',sampleId:'sample2',testingLaboratoryId:'lab1',externalEventId:'EV-101'}),/نمونه متعلق/);
 assert.throws(()=>service.registerExternalResult({id:'ext3',sampleId:'sample1',testingLaboratoryId:'lab1',externalEventId:'EV-100'}));
});
