'use strict';
var creditData = function () {

var peopleList = [];
var storeList = [];
var peopleName_list = [];
var storeName_list = [];
var linkList = [];
var suspectStoreMeta = [];
var suspectStore= [];
var fraudStore = [];

var timeFormat = d3.time.format('%m/%d/%Y');

function processSuspectStore(){
	suspectStoreMeta = commonTranArray.map(function(d){
		var store = {};
		for(var n=0;n<d.length;n+=1){			
			store[d.keys[n]]=d._fields[n];
		}
		return store;
	});
}

function processSuspectTran(){
	susTranArray.forEach(function(d){
		var t = processTran(d);
		var peopleIndex = peopleName_list.indexOf(t.customer_name);
		if(peopleIndex!==-1){
			peopleList[peopleIndex].suspectTran.push(t);
			t.customer_id = peopleIndex;
		}
		t.suspectFraud = true;
		linkList.push(t);
		processStore(t, true);
	});
}

function processPeople(){
	fraudTranArray.forEach(function(d,n){	
		var t = processTran(d);
		t.fraud = true;
		var custom_name =  d._fields[0];	
		if(peopleName_list.indexOf(custom_name)===-1){
			var p = {};
			p.fraudAmount = 0;
			p.id = peopleList.length;
			var nameFiled = d.keys[0];
			p[nameFiled] = d._fields[0];
			p.fraudTran = [t];
			p.suspectTran = [];
			peopleList.push(p);
			peopleName_list.push(custom_name);
			p.fraudAmount+=t.amount;
		}else{
			var index = peopleName_list.indexOf(custom_name);
			var custom= peopleList[index];
			custom.fraudAmount+=t.amount;
			custom.fraudTran.push(t);
		}
		linkList.push(t);
		var store = processStore(t);
		if(store.victims.indexOf(custom_name)===-1){
			store.victims.push(custom_name);
		}  
	});
}

function processTran(d){
		var t = {};
		for(var i=0;i<d.length;i+=1){
			t[d.keys[i]]=d.keys[i]==='amount'?Number(d._fields[i]): d._fields[i];
		}
		var time = +timeFormat.parse(t.transaction_time);
		t.timeStamp = time;
		return t;
}

function processStore(tran, suspect){
 var storeName = tran.store_name;
 var storeIndex = storeName_list.indexOf(storeName);
 var store;
 if(storeIndex ===-1){
 	store = {};
 	store.id = storeList.length;
 	store.name = storeName;
 	store.fraud = tran.fraud||false;
 	store.suspectFraud = tran.suspectFraud||false;
 	//store.tran = [tran];
 	store.tran = [];
 	store.suspectTran = [];
 	store.victims = [];
 	storeName_list.push(storeName);
 	storeList.push(store);
 }else{
 	store = storeList[storeIndex];
 	if(tran.fraudTran){
 		store.fraud = true;
 	}
 	if(tran.suspectFraud){
 		store.suspectFraud = true;
 	}
 	//store.tran.push(tran);
 }
 if(suspect){
 	store.suspectTran.push(tran);
 }else{
 	store.tran.push(tran);
 }
 return store;	
}



processPeople();
processSuspectTran();
processSuspectStore();

peopleList.forEach(function(s){
	s.fraudTran.sort(function(a,b){
		return a.timeStamp - b.timeStamp;
	});
	s.suspectTran.sort(function(a,b){
		return a.timeStamp - b.timeStamp;
	});

});

fraudStore = storeList.filter(function(d){
	return d.fraud;
});
fraudStore.forEach(function(d){
	var amount = 0 ;
	d.tran.forEach(function(t){
		amount+=t.amount;
	});
	d.totalFraudAmount = amount;
});

suspectStore = storeList.filter(function(d){
	return d.suspectFraud;
});

suspectStore.forEach(function(d){
	var meta = suspectStoreMeta.filter(function(s){
		return s.suspicious_store ===d.name;
	});
	if(meta.length>0){
		d.suspectCount = meta[0].count;
		d.suspectVictims = meta[0].victims;
	}
});

suspectStore.sort(function(a,b){
	if(a.suspectCount.low >b.suspectCount.low){
		return 1;
	}
	if(a.suspectCount.low <b.suspectCount.low){
		return -1;
	}
   if(a.suspectCount.low ===b.suspectCount.low){
		return a.suspectTran.length-b.suspectTran.length;
	}
});
//processTime();

  return{
  	peopleList:peopleList,
    links:linkList,
    stores:storeList,
    suspectStore:suspectStore,
    fraudStore:fraudStore
  }
};

