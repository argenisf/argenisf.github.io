const FUNDS_URL = `${SERVER_HOST}/funds`;
const FUNDS_UPDATE_URL = `${SERVER_HOST}/funds/update`;

(async function(){
    //check authentication before proceeding
    const user = await check_authentication();
    var funds_object = {};
    var bank_object = {};
    const btnSaveFunds = $('#btnSaveFunds');
    const btnSaveBank = $('#btnSaveBank');
    const tableBank = $('#tableBank');
    const tableFunds = $('#tableFunds');
    const resultsLogging = $('#resultsLogging');
    var savingBank = false;
    var savingFunds = false;
    
    function _log(msg){
        try{
            var message = msg;
            if(typeof(msg) == "object") message = JSON.stringify(msg);
            resultsLogging.html(`<code>${message}</code>`);
        }catch(e){
            resultsLogging.html(`<code>${e.toString()}</code>`);
        }
    }//end of log

    btnSaveFunds.click(function(e){
        e.preventDefault();
        if(savingFunds) return;
        savingFunds = true;
        btnSaveFunds.prop('disabled',true);
        update_funds_data().then(function(result){
            savingFunds = false;
            btnSaveFunds.prop('disabled',false);
            _log(result);
        });
    });

    btnSaveBank.click(function(e){
        e.preventDefault();
        if(savingBank) return;
        savingBank = true;
        btnSaveBank.prop('disabled',true);
        update_bank_data().then(function(result){
            savingBank = false;
            btnSaveBank.prop('disabled',false);
            _log(result);
        });
    });
    
    async function fetch_combined_funds(){
        const response = await send_http_request(`${FUNDS_URL}?combined=yes`,'GET');
        if(response.error == true) return;
        
        if('bank' in response.result) bank_object = response.result.bank;
        if('funds' in response.result) funds_object = response.result.funds; 

        load_bank_data_into_ui();
        load_funds_data_into_ui();
        return true;
    }//end of fetch_combined_funds

    function load_bank_data_into_ui(){
        var sum = 0;
        var keys = Object.keys(bank_object).sort();
        var html = '';
        var tr = '';

        keys.forEach(function(key){
            sum+= bank_object[key];
            tr = `<tr><td>${key}<td><td width="120">`;
            tr+= `<input class="bank-input" type="number" data-account="${key}" value="${bank_object[key]}" /></td></tr>`;
            html+= tr;
        });
        //Update header with sum
        $('#headerBank span').html(format_amount(sum));

        //Update table
        tableBank.find('tbody').html(html);
    }// end of load_bank_data_into_ui

    function load_funds_data_into_ui(){
        var sum = 0;
        var keys = Object.keys(funds_object).sort();
        var html = '';
        var tr = '';

        keys.forEach(function(key){
            sum+= funds_object[key];
            tr = `<tr><td>${key}<td><td width="120">`;
            tr+= `<input class="fund-input" type="number" data-category="${key}" value="${funds_object[key]}" /></td></tr>`;
            html+= tr;
        });
        //Update header with sum
        $('#headerFunds span').html(format_amount(sum));

        //Update table
        tableFunds.find('tbody').html(html);
    }// end of load_funds_data_into_ui

    async function update_bank_data(){
        var payload = prepare_bank_payload();
        if(payload === false) return "Error in bank values";
        var response = await send_http_request(FUNDS_UPDATE_URL, 'POST',payload);

        if('result' in response && response.result){
            bank_object = payload.bank;
            load_bank_data_into_ui();
        }
        return response;
    }//end update_bank_data

    async function update_funds_data(){
        var payload = prepare_funds_payload();
        if(payload === false) return "Error in fund values";
        var response = await send_http_request(FUNDS_UPDATE_URL, 'POST',payload);

        if('result' in response && response.result){
            funds_object = payload.funds;
            load_funds_data_into_ui();
        }
        return response;
    }//end update_funds_data

    function prepare_bank_payload(){
        var passed = true;
        var accounts = {};

        var inputs = tableBank.find(".bank-input");
        if(inputs.length == 0) return false;

        for(var i = 0; i < inputs.length; i++){
            var input = $(inputs[i]);
            var amount;
            var account_name = "";
            try{
                amount = parseFloat(input.val());
                account_name = input.data('account');
            }catch(e){
                passed = false;
            }
            if(account_name == "" || isNaN(amount)){
                passed = false;
            }else{
                accounts[account_name] = amount;
            }
        }

        if(Object.keys(accounts).length == 0 || !passed) return false;
        return {
            bank: accounts
        };
    }//end of prepare_bank_payload

    function prepare_funds_payload(){
        var passed = true;
        var categories = {};

        var inputs = tableFunds.find(".fund-input");
        if(inputs.length == 0) return false;

        for(var i = 0; i < inputs.length; i++){
            var input = $(inputs[i]);
            var amount;
            var category_name = "";
            try{
                amount = parseFloat(input.val());
                category_name = input.data('category');
            }catch(e){
                passed = false;
            }
            if(category_name == "" || isNaN(amount)){
                passed = false;
            }else{
                categories[category_name] = amount;
            }
        }

        if(Object.keys(categories).length == 0 || !passed) return false;
        return {
            funds: categories
        };
    }//end of prepare_funds_payload

    fetch_combined_funds();
    return true;
})();