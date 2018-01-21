/* ****************************************
----- Setting up shop -----
**************************************** */

var GlobalAuth = {
	initialized: false,
	authenticated: false,
	authKeys: {},
	authChallenge: ''
};

var autoInit = false;

var baseServer = 'http://viruta.com.ve/budget/api.php?';

/* ****************************************
----- Ajax calls to get info -----
**************************************** */

function initAuth(){
	if(autoInit && !GlobalAuth.initialized){
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
		GlobalAuth.initialized = true;
		GlobalAuth.authChallenge = res.challenge;
		authFormInit();
	}
}//end of authChallengeReceived function

function authGetMPKeys(){
	if(GlobalAuth.initialized && !GlobalAuth.authenticated){
		var thePassword = $('#thePassword').val();

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
		GlobalAuth.authenticated = true;
		authFormProcessed(true);
		runAnalytics();
	}else{
		processingForm = false;
		authFormProcessed(false);
	}
}//end of authKeysReceived function

/* ****************************************
----- DOM Manipulation -----
**************************************** */

var authDiv = $('#AuthDiv'),
	authForm = $('#AuthForm'),
	contentDiv = $('#Contenido'),
	processingForm = false;

authForm.submit(function(e){
	e.preventDefault();
	if(!processingForm && GlobalAuth.initialized){
		processingForm = true;
		authFormProcessing();
		authGetMPKeys();
	}
});

function authFormInit(){
	authFormButtonShow();
}
function authFormProcessing(){
	authFormButtonHide();
	authFormAlertHide();
}
function authFormProcessed(success){
	if(success){
		authDiv.addClass('hidden');
		contentDiv.removeClass('hidden');
	}else{
		authFormButtonShow();
		authFormAlertShow();
	}
}

function authFormButtonShow(){
	authDiv.find('button').removeClass('hidden');
}
function authFormButtonHide(){
	authDiv.find('button').addClass('hidden');	
}
function authFormAlertShow(){
	authDiv.find('.alert').removeClass('hidden');
}
function authFormAlertHide(){
	authDiv.find('.alert').addClass('hidden');	
}

/* ****************************************
----- All ready, let's begin -----
**************************************** */
initAuth();