import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from '../src/infrastructure/sqlite/migrate.js';
import {createEngineeringService} from '../src/application/engineering.js';

function fixture(t){
  const db=new DatabaseSync(':memory:'); t.after(()=>db.close()); migrate(db);
  db.exec(`INSERT INTO companies VALUES('c1','شرکت یک'),('c2','شرکت دو');
    INSERT INTO projects(id,company_id,name,customer_name) VALUES('p1','c1','پروژه یک','مشتری'),('p2','c2','پروژه دو','مشتری');
    INSERT INTO pours VALUES('pour1','c1','p1','2026-09-10T08:00:00.000Z'),('pour2','c2','p2','2026-09-10T08:00:00.000Z');`);
  return {db,service:createEngineeringService(db,{companyId:'c1',actor:'کاربر تست'})};
}

test('mix design versions are sequential and company scoped',t=>{
  const {db,service}=fixture(t);
  service.createMixDesign({id:'m1',code:'C35-P','title':'طرح پمپ C35'});
  const v1=service.createMixVersion({id:'mv1',mixDesignId:'m1',targetStrengthMpa:42,maxWaterCementRatio:0.45,cementKgM3:390,waterKgM3:175});
  assert.equal(v1.revision,1);
  assert.throws(()=>service.createMixVersion({id:'mv3',mixDesignId:'m1',revision:3}),/به‌ترتیب/);
  const v2=service.createMixVersion({id:'mv2',mixDesignId:'m1'});
  assert.equal(v2.revision,2);
  db.prepare("INSERT INTO mix_designs(id,company_id,code,title) VALUES('foreign','c2','X','خارجی')").run();
  assert.throws(()=>service.createMixVersion({id:'bad',mixDesignId:'foreign'}),/متعلق به این شرکت/);
});

test('pour QC specification validates ownership and locks its referenced mix version',t=>{
  const {db,service}=fixture(t);
  service.createMixDesign({id:'m1',code:'C30','title':'طرح C30'});
  service.createMixVersion({id:'mv1',mixDesignId:'m1',revision:1,targetSlumpMm:100});
  service.createMixVersion({id:'mv2',mixDesignId:'m1',revision:2,targetSlumpMm:120});
  const saved=service.savePourSpecification({pourId:'pour1',projectId:'p1',mixDesignVersionId:'mv1',elementName:'فونداسیون',concreteClass:'C30',specifiedStrengthMpa:30,targetSlumpMm:110,plannedVolumeM3:75});
  assert.equal(saved.mixDesignVersionId,'mv1');
  let row=service.getPourSpecification('pour1');
  assert.equal(row.mix_code,'C30'); assert.equal(row.element_name,'فونداسیون');
  service.savePourSpecification({pourId:'pour1',projectId:'p1',mixDesignVersionId:'mv1',elementName:'ستون',concreteClass:'C30',specifiedStrengthMpa:30,targetSlumpMm:115,plannedVolumeM3:80});
  row=service.getPourSpecification('pour1');
  assert.equal(row.element_name,'ستون'); assert.equal(row.target_slump_mm,115); assert.equal(row.mix_design_version_id,'mv1');
  assert.throws(()=>service.savePourSpecification({pourId:'pour1',projectId:'p1',mixDesignVersionId:'mv2'}),/تثبیت شده/);
  assert.throws(()=>service.savePourSpecification({pourId:'pour1',projectId:'p1',mixDesignVersionId:null}),/تثبیت شده/);
  assert.throws(()=>service.savePourSpecification({pourId:'pour1',projectId:'p2'}),/پروژه فعال/);
  assert.throws(()=>service.getPourSpecification('pour2'),/متعلق به این شرکت/);
  assert.throws(()=>db.prepare("UPDATE mix_design_versions SET notes='x' WHERE id='mv1'").run());
});
