<?php
header("Access-Control-Allow-Origin: *");
error_reporting(0);

session_start(); // ready to go!

$curTime = time();
$salt = 'thi$i$the$ecretfor$alt';
$permittedDifference = 120;

$retArr = array(
	"success" => false
);

if(getVal('action') && (getVal('action') == "init" || getVal('action') == "credentials")){

	if(getVal('action') == "init"){
		if(isset($_SESSION['hasAuthenticated']) && $_SESSION['hasAuthenticated'] == "yes"){
			$retArr = getTheKeys();
			$challenge = enc_encrypt($curTime.$salt,$salt);
			$retArr['challenge'] = $challenge;
		}else{
			$challenge = enc_encrypt($curTime.$salt,$salt);
			$retArr['challenge'] = $challenge;
			$retArr['success'] = true;
			$retArr['action'] = 'init';
		}
	}

	if(getVal('action') == "credentials" && getVal('value') && getVal('pass') == "laqueseavecina"){
		$challenge = enc_decrypt(getVal('value'),$salt);
		$challenge = str_replace($salt, "", $challenge);

		if(is_numeric($challenge)){
			$nToCheck = intval($challenge);
			$txt = 'the ';
			$txt = $nToCheck . ' vs ' . $curTime;

			if($nToCheck >= ($curTime - $permittedDifference) && $nToCheck <=($curTime + $permittedDifference)){
				$retArr = getTheKeys();
				$_SESSION['hasAuthenticated'] = "yes";
			}

		}
	}

}

echo json_encode($retArr);

function getTheKeys(){
	$retArr = array();
	$retArr['token'] = '2e3a7de61c9ee93171a62724f01f317b';
	$retArr['api_key'] = '6d563855ccfe3efe878269ab447ceaaf';
	$retArr['api_secret'] = '9c46e2314c16935bc286d45945e6b743';
	$retArr['success'] = true;
	$retArr['action'] = 'credentials';
	return $retArr;
}

function getVal($name){
	$useGET = true;

	if($useGET && isset($_GET[$name])){
		return $_GET[$name];
	}

	if(!$useGET && isset($_POST[$name])){
		return $_POST[$name];
	}

	return false;
}

function enc_encrypt($string, $key) {
    $result = '';
    for($i = 0; $i < strlen($string); $i++) {
        $char = substr($string, $i, 1);
        $keychar = substr($key, ($i % strlen($key))-1, 1);
        $char = chr(ord($char) + ord($keychar));
        $result .= $char;
    }

    return base64_encode($result);
}

function enc_decrypt($string, $key) {
    $result = '';
    $string = base64_decode($string);

    for($i = 0; $i < strlen($string); $i++) {
        $char = substr($string, $i, 1);
        $keychar = substr($key, ($i % strlen($key))-1, 1);
        $char = chr(ord($char) - ord($keychar));
        $result .= $char;
    }

    return $result;
}