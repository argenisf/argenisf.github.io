const loginForm = $('#loginForm');
const userSecretInput = $('#userSecret');
const btnSubmit = $('#btnSubmit');
const alert = $('#loginErrorMessage');
var processing = false;

loginForm.submit(function(e){
    e.preventDefault();
    if(validateString(userSecretInput.val()))
    doLogging();
});

btnSubmit.click(function(e){
    if(validateString(userSecretInput.val()))
    doLogging();
});

function toggleControls(){
    if(processing){
        //disable
        userSecretInput.prop( "disabled", true );
        btnSubmit.prop( "disabled", true );
    }else{
        //enable
        userSecretInput.prop( "disabled", false );
        btnSubmit.prop( "disabled", false );
    }
}//end of toggleControls

function doLogging(){
    if(processing) return;
    processing = true;
    toggleControls();

    const payload = {
        secret: userSecretInput.val(),
        device: get_device_id()
    };
    send_http_request(routes.login,'POST',payload).then(function(response){
        processing = false;
        toggleControls();
        try{
            if(!('token' in response && 'expiry' in response)){
                alert.show();
                return false;
            }

            const token_object = {
                token: response.token,
                expiry: response.expiry._seconds
            }
            set_auth_token(token_object);
            location.href = 'index.html';
        }catch(e){
            alert.show();
            return false;
        }
    });
}//end of doLogging