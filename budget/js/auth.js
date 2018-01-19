// ----- Setting up shop  ------
var GlobalAuth = {
	initialized: false,
	authenticated: false,
	authKeys: {},
	authChallenge: ''
};

var baseServer = 'http://viruta.com.ve/budget/api.php?';

// ----- Setting up shop  ------

function initAuth(){
	if(!GlobalAuth.initialized){

		GlobalAuth.initialized = true;

		console.log('Contacting server: getting challenge');
		//get challenge from the server
		$.ajax(baseServer,{
			method: 'GET',
			dataType: 'json',
			success: authChallengeReceived,
			data: {action: 'init'}
		});

	}//checking if initialiazed
}//end of initAuth function

function authChallengeReceived(res){
	if(res.success){
		GlobalAuth.authChallenge = res.challenge;
	}
}//end of authChallengeReceived function

function getMPKeys(thePassword){
	if(!GlobalAuth.authenticated){
		console.log('Contacting server: getting keys');
		//get keys from the server
		$.ajax(baseServer,{
			method: 'GET',
			dataType: 'json',
			success: authKeysReceived,
			data: {
				action: 'credentials',
				value: GlobalAuth.authChallenge,
				pass: thePassword
			}
		});
	}
}// end of getMPKeys

function authKeysReceived(res){
	if(res.success){
		GlobalAuth.authKeys = res;
	}
}//end of authKeysReceived function

// ----- All ready, initiate  ------
initAuth();