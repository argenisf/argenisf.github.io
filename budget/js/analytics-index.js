var eventGraph;

function runAnalytics(){
	MP.api.setCredentials(GlobalAuth.authKeys.api_key, GlobalAuth.authKeys.api_secret);
	eventGraph  = $('#graph').MPChart({chartType: 'bar',stacked: true});
	loadMainChart();
}

function loadMainChart(){
	
}