function runAnalytics(){
	MP.api.setCredentials(GlobalAuth.authKeys.api_key, GlobalAuth.authKeys.api_secret);
	loadMainChart();
}

function loadMainChart(){
	var eventGraph  = $('#graph').MPChart({chartType: 'bar'});
	MP.api.segment('Transaccion','descripcion', {from: moment().subtract(1, 'days'), unit: 'day'}).done(function(results) {
	    eventGraph.MPChart('setData', results);
	});
}