const ENV = 'dev';
var SERVER_HOST = 'http://localhost:8080';
if(ENV == 'prod') SERVER_HOST = 'https://budgetapp.theargis.com';

const routes = {
    base: `${SERVER_HOST}/`,
    login: `${SERVER_HOST}/login`,
    categories: `${SERVER_HOST}/categories`,
    transactions: `${SERVER_HOST}/transactions`,
    future: `${SERVER_HOST}/future`
};

const AUTH_PAGE = 'auth.html';
const AUTH_TOKEN_NAME = 'authentication_token';
const AUTH_DEVICE_NAME = 'authentication_device';
const AUTH_USER_OBJECT = 'authentication_user_object';

const CSV_FILE_NAME = 'csv_storage';
const DAY_IN_SECONDS = 24 * 3600;

var device_id;
var auth_token;

function get_time_in_seconds(val){
    if(!val) val = new Date();
    return parseInt(val.getTime()/1000);
}// end of get_time_in_seconds

function generate_random_chars(n){
    var s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array(n).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
}// end of generate_random_chars

function validateString(value){
    if(typeof(value)!= 'string') return false;
    if(value.length == 0) return false;
    return true;
}//end of validateString 

function validateDateString(str){
    if(!(validateString(str))) return false;
    try{
        return new Date(str+'T00:00:00').getTime() >= 1672531200000;
    }catch(e){
        return false;
    }
}//end of validateString 

function convertToNumber(val){
    if(typeof(val)== 'number') return val;
    if(typeof(val) != 'string') return false;
    if(val == '') return false;
    try{
        return parseFloat(val);
    }catch(e){
        return false;
    }
}//end of validateNumber

function get_auth_token(get_object = false){
    try{
        const token_object_str = localStorage.getItem(AUTH_TOKEN_NAME);
        if(token_object_str == null || token_object_str == undefined) return false;
        
        const token_object = JSON.parse(token_object_str);
        if(!('token' in token_object || 'expiry' in token_object)) return false;
        if(typeof(token_object.expiry)!= 'number' || token_object.expiry < get_time_in_seconds()) return false;
        if(typeof(token_object.token)!='string') return false;
        if(get_object) return token_object;
        return token_object.token;
    }catch(e){
        console.log('Error fetching auth details');
        console.log(e);
        return false;
    }
}//end of get_auth_token

function refresh_auth_token(auth_token,response){
    const expiry = response.expiry || response.token_expiry || auth_token.expiry || 0;
    set_auth_token({
        token: ('token' in response)?response.token:auth_token.token,
        expiry,
        last_check: get_time_in_seconds()
    });
}//end of refresh_auth_token

function set_auth_token(token_object){
    try{
        if(typeof(token_object!= 'string')) token_object = JSON.stringify(token_object);
        localStorage.setItem(AUTH_TOKEN_NAME,token_object);
    }catch(e){
        console.log('error storing token object');
    }
    return;
}// end of set_auth_token

function get_device_id(){
    var device_id = localStorage.getItem(AUTH_DEVICE_NAME);
    if(device_id == null || device_id == undefined) {
        device_id = `Web_${generate_random_chars(16)}`;
        localStorage.setItem(AUTH_DEVICE_NAME,device_id);
    }
    return device_id;
}//end of get_device_id

function set_user_object(user_object){
    try{
        if(typeof(user_object!= 'string')) user_object = JSON.stringify(user_object);
        localStorage.setItem(AUTH_USER_OBJECT,user_object);
    }catch(e){
        console.log('error storing user object');
    }
    return user_object;
}//end of set_user_object

function get_user_object(){
    const user_object = localStorage.getItem(AUTH_USER_OBJECT);
    if(typeof(user_object== 'string')) return JSON.parse(user_object);
    return false;
}//end of get_user_object

async function check_authentication(){
    device_id = get_device_id();
    if(device_id === false){
        location.href = AUTH_PAGE;
        return false;
    }
    var auth_token_object = get_auth_token(true);
    auth_token = auth_token_object?.token;

    //cached for an hour
    if(typeof(auth_token_object) == 'object' 
    && 'last_check' in auth_token_object
    && (auth_token_object.last_check+3600) > get_time_in_seconds()){
        return get_user_object();
    }

    const result = await send_http_request(routes.base);
    var success = false;
    if(typeof(result) == 'object' && 'error' in result && !result.error) success = true;
    if(success) {
        refresh_auth_token(auth_token_object, result.result);
        return set_user_object(result.result);
    }
        
    location.href = AUTH_PAGE;
    return false;
}//end of check_authentication

async function send_http_request(URL, method, payload){
    try{
        var fetch_params = {
            method: (method?.toString().toUpperCase() === 'POST')?'POST':'GET',
            mode: "cors",
            credentials: "include", 
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                "Authorization": 'Basic '+btoa(`${device_id}:${auth_token}`)
            }
        };
        if(fetch_params.method === 'POST' && payload) fetch_params.body =  JSON.stringify(payload);
        const response = await fetch(URL,fetch_params);
        return response.json();
    }catch(e){
        console.log(e);
        return false;
    }
}//send_auth_check

async function get_categories(){
    const result = await send_http_request(routes.categories);
    var success = false;
    if(typeof(result) !== 'object' || !('error' in result) && result.error == false) return [];
    
    return result.result;
}//get_categories

function format_for_select(categories){
    var html = '<option value="">--</option>';
    var groups = {};
    categories.forEach(function(cat){
        const group = cat.group_name;
        if(!(group in groups)){
            groups[group] = [cat.name];
        }else{
            groups[group].push(cat.name);
        }
    });

    Object.keys(groups).forEach(function(group){
        html+= `<optgroup label="${stylize_text(group)}">`;
        groups[group].forEach(function(cat){
            html+= `<option value="${cat}">${stylize_text(cat)}</option>`;
        });
        html+='</optgroup>';
    });

    return html;
}//end of format_for_select

function stylize_text(text){
    return text.replaceAll("_"," ");
}//end of stylize_text

function remove_item_at_position(arr, position) {
    if (position < 0 || position >= arr.length) {
        return arr;
    }
    return arr.slice().filter((_, index) => index !== position);
}

// --- Data formating --- //
function format_date(val){
    if(typeof(val) == 'string') return val;
    return new Date(val).toLocaleDateString('es-ES',{weekday:'long',month: 'short',day:'numeric'})
}//end of format_date
function format_amount(val){
    if(!(typeof(val)=='number')) return "€ 0.00";
    return `€ ${val.toLocaleString()}`;
}//end of format_date